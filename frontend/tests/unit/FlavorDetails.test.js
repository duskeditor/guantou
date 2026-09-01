/* global globalThis */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import FlavorDetails from '@/pages/flavors/details.vue';
import { getFlavor, listCans, listFlavors } from '@/services/guantou';
import { requireAuth } from '@/services/authGuard';
import {
  goCreateCan,
  goPronunciationCreate,
} from '@/services/navigation';

vi.mock('@/services/guantou', () => ({
  getFlavor: vi.fn(),
  listCans: vi.fn(),
  listFlavors: vi.fn(),
}));
vi.mock('@/services/authGuard', () => ({
  requireAuth: vi.fn(() => true),
}));
vi.mock('@/services/navigation', () => ({
  ROUTES: { home: '/pages/index' },
  goAtlas: vi.fn(),
  goBack: vi.fn(),
  goCanDetail: vi.fn(),
  goCreateCan: vi.fn(),
  goPackageDetail: vi.fn(),
  goPronunciationCreate: vi.fn(),
}));

function pageContext(overrides = {}) {
  return {
    ...FlavorDetails.data(),
    ...FlavorDetails.methods,
    ...overrides,
  };
}

const primaryFlavor = {
  id: 1,
  name: '月亮',
  definition: '夜空中的天然卫星',
  pronunciations: [],
  package_links: [],
};

const secondaryFlavor = {
  id: 2,
  name: '月亮',
  definition: '夜空中的天然卫星',
  pronunciations: [],
  package_links: [],
};

describe('flavor details aggregate behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.uni = {
      showActionSheet: vi.fn(),
      showToast: vi.fn(),
    };
  });

  afterEach(() => {
    delete globalThis.uni;
  });

  it('includes a can owned only by the second auto-discovered flavor', async () => {
    const page = pageContext({ id: primaryFlavor.id });
    getFlavor.mockResolvedValueOnce(primaryFlavor);
    listFlavors.mockResolvedValue({ results: [primaryFlavor, secondaryFlavor] });

    await page.refresh();

    listCans.mockImplementation(({ flavor_id: flavorId }) => Promise.resolve({
      results: [{ id: flavorId === primaryFlavor.id ? 101 : 202 }],
      next: null,
    }));
    const response = await page.fetchRelatedCans({ page: 1 });

    expect(page.flavor.flavor_ids).toEqual([1, 2]);
    expect(listCans).toHaveBeenNthCalledWith(1, { page: 1, flavor_id: 1 });
    expect(listCans).toHaveBeenNthCalledWith(2, { page: 1, flavor_id: 2 });
    expect(response.results.map((item) => item.id)).toEqual([101, 202]);
  });

  it('uses the explicit aggregate ids passed from search navigation', async () => {
    const page = pageContext({ id: 1, ids: [1, 2] });
    getFlavor
      .mockResolvedValueOnce(primaryFlavor)
      .mockResolvedValueOnce(secondaryFlavor);

    await page.refresh();

    listCans.mockImplementation(({ flavor_id: flavorId }) => Promise.resolve({
      results: [{ id: flavorId === 2 ? 202 : 101 }],
      next: null,
    }));
    const response = await page.fetchRelatedCans({ page: 1 });

    expect(listFlavors).not.toHaveBeenCalled();
    expect(response.results.map((item) => item.id)).toEqual([101, 202]);
  });

  it('asks for a concrete flavor before either aggregate create action', () => {
    const page = pageContext({
      id: 1,
      flavor: {
        ...primaryFlavor,
        flavor_ids: [1, 2],
        flavor_variants: [{ id: 1 }, { id: 2 }],
      },
    });
    const { showActionSheet } = globalThis.uni;

    page.toCreateForFlavor();
    expect(showActionSheet).toHaveBeenCalledTimes(1);
    const recordOptions = showActionSheet.mock.calls[0][0];
    expect(recordOptions.itemList).toEqual(['月亮（义项 #1 · 第 1 个）', '月亮（义项 #2 · 第 2 个）']);
    recordOptions.success({ tapIndex: 1 });
    expect(requireAuth).toHaveBeenCalledWith('record_can', {
      page: 'flavor_detail',
      flavorId: 2,
      flavorName: '月亮',
    });
    expect(goCreateCan).toHaveBeenCalledWith({ flavor: 2, flavor_name: '月亮' });

    showActionSheet.mockClear();
    requireAuth.mockClear();
    page.toCreatePronunciation();
    expect(showActionSheet).toHaveBeenCalledTimes(1);
    const pronunciationOptions = showActionSheet.mock.calls[0][0];
    pronunciationOptions.success({ tapIndex: 1 });
    expect(requireAuth).toHaveBeenCalledWith('pronunciation_create', {
      page: 'flavor_detail',
      flavorId: 2,
    });
    expect(goPronunciationCreate).toHaveBeenCalledWith(2);
  });
});
