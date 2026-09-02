import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

vi.mock('@/services/guantou', () => ({
  getNameplate: vi.fn(),
  listCans: vi.fn(),
  listFlavors: vi.fn(),
  listHotSearches: vi.fn(),
  listNameplates: vi.fn(),
  listPackages: vi.fn(),
  searchGuantou: vi.fn(),
  suggestGuantou: vi.fn(),
}));

const {
  listCans,
  listFlavors,
  listHotSearches,
  listNameplates,
  listPackages,
  searchGuantou,
  suggestGuantou,
} = await import('@/services/guantou');
const SearchPage = (await import('@/pages/search.vue')).default;

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function pageContext() {
  const data = SearchPage.data();
  return {
    ...data,
    ...SearchPage.methods,
  };
}

describe('search page orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.uni = {
      setStorage: vi.fn(),
      showToast: vi.fn(),
    };
  });

  it('loads real hot terms once and silently falls back to an empty list', async () => {
    const page = pageContext();
    listHotSearches.mockResolvedValueOnce([
      { keyword: '月亮', rank: 1 },
      { keyword: '行', rank: 2 },
    ]);

    await page.loadHotTags();
    await page.loadHotTags();

    expect(page.hotTags).toEqual(['月亮', '行']);
    expect(listHotSearches).toHaveBeenCalledTimes(1);

    const failedPage = pageContext();
    listHotSearches.mockRejectedValueOnce(new Error('offline'));
    await failedPage.loadHotTags();
    expect(failedPage.hotTags).toEqual([]);
  });

  it('uses four concrete result tabs without a redundant all category', () => {
    const page = pageContext();

    expect(page.activeTab).toBe('cans');
    expect(page.tabs).toEqual([
      { label: '罐头', value: 'cans' },
      { label: '铭牌', value: 'nameplates' },
      { label: '义项', value: 'flavors' },
      { label: '写法', value: 'packages' },
    ]);
    expect(page.tabs.some((tab) => tab.value === 'all')).toBe(false);
  });

  it('shows only the selected result category', () => {
    const results = {
      cans: [{ id: 1 }],
      nameplates: [{ id: 2 }],
      flavors: [{ id: 3 }],
      packages: [{ id: 4 }],
    };
    const { computed } = SearchPage;
    const context = { activeTab: 'nameplates', results };

    expect(computed.showNameplates.call(context)).toBe(1);
    expect(computed.showCans.call(context)).toBe(false);
    expect(computed.showFlavors.call(context)).toBe(false);
    expect(computed.showPackages.call(context)).toBe(false);
  });

  it('loads can search results in pages of twenty and reaches the end', async () => {
    const firstPage = Array.from({ length: 20 }, (_, index) => ({ id: index + 1 }));
    const secondPage = Array.from({ length: 10 }, (_, index) => ({ id: index + 21 }));
    searchGuantou.mockResolvedValue({
      cans: [], flavors: [], nameplates: [], packages: [],
    });
    listFlavors.mockResolvedValue({
      count: 0, next: null, previous: null, results: [],
    });
    listNameplates.mockResolvedValue({
      count: 0, next: null, previous: null, results: [],
    });
    listPackages.mockResolvedValue({
      count: 0, next: null, previous: null, results: [],
    });
    listCans
      .mockResolvedValueOnce({
        count: 30,
        next: 'http://test/cans?page=2',
        previous: null,
        results: firstPage,
      })
      .mockResolvedValueOnce({
        count: 30,
        next: null,
        previous: 'http://test/cans?page=1',
        results: secondPage,
      });
    const page = pageContext();

    await page.search('阿长测试');

    expect(listCans).toHaveBeenNthCalledWith(1, {
      search: '阿长测试', page: 1, page_size: 20,
    });
    [listNameplates, listFlavors, listPackages].forEach((fetcher) => {
      expect(fetcher).toHaveBeenCalledWith(expect.objectContaining({
        page: 1,
        page_size: 20,
      }));
    });
    expect(page.results.cans).toHaveLength(20);
    expect(page.resultPages.cans.count).toBe(30);
    expect(page.resultPages.cans.next).toBeTruthy();

    await page.changeResultPage(2);

    expect(listCans).toHaveBeenNthCalledWith(2, {
      search: '阿长测试', page: 2, page_size: 20,
    });
    expect(page.results.cans).toHaveLength(10);
    expect(page.resultPages.cans.page).toBe(2);
    expect(page.resultPages.cans.next).toBeNull();
  });

  it('discards stale suggestion responses after faster input wins', async () => {
    const first = deferred();
    const second = deferred();
    suggestGuantou
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const page = pageContext();

    const firstRequest = page.suggest('月');
    const secondRequest = page.suggest('月亮');
    second.resolve({
      suggestions: [{
        type: 'flavor', id: 2, text: '月亮', sub: '义项',
      }],
    });
    await secondRequest;
    first.resolve({
      suggestions: [{
        type: 'package', id: 1, text: '月', sub: '写法',
      }],
    });
    await firstRequest;

    expect(page.suggestions).toHaveLength(1);
    expect(page.suggestions[0]).toMatchObject({ title: '月亮', scope: 'flavors' });
  });
});
