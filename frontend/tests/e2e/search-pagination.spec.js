import { expect, test } from '@playwright/test';

function canResult(id) {
  return {
    id,
    concept_text: `阿长测试 ${id}`,
    duration_ms: 1000,
    nameplate_count: 0,
    nameplate_total: 0,
    nameplate_previews: [],
    recorder: { id: 1, username: 'tester', nickname: '测试员', avatar: '' },
    submitted_dialect: { qualified_code: '测试方言' },
    status: 'verified',
    like_count: 0,
    comment_count: 0,
    use_count: 0,
    liked_by_me: false,
    views: 0,
  };
}

test('search pagination returns the result scroller to the top', async ({ page }) => {
  await page.route('**/search/hot/**', (route) => route.fulfill({ json: [] }));
  await page.route(/\/search\/(?:\?.*)?$/, (route) => route.fulfill({
    json: {
      keyword: '阿长测试', cans: [], nameplates: [], flavors: [], packages: [],
    },
  }));
  await page.route(/\/(nameplates|flavors|packages)\/?(?:\?.*)?$/, (route) => route.fulfill({
    json: {
      count: 0, next: null, previous: null, results: [],
    },
  }));
  await page.route(/\/cans\/?(?:\?.*)?$/, (route) => {
    const requestUrl = new URL(route.request().url());
    const resultPage = Number(requestUrl.searchParams.get('page') || 1);
    const offset = (resultPage - 1) * 20;
    return route.fulfill({
      json: {
        count: 30,
        next: resultPage === 1 ? '/cans/?page=2' : null,
        previous: resultPage === 2 ? '/cans/?page=1' : null,
        results: Array.from(
          { length: resultPage === 1 ? 20 : 10 },
          (_, index) => canResult(offset + index + 1),
        ),
      },
    });
  });

  await page.goto('/pages/search');
  const searchbox = page.getByRole('searchbox');
  await expect(searchbox).toHaveCount(1);
  await searchbox.fill('阿长测试');
  await searchbox.press('Enter');
  await expect(page.getByText('第 1 / 2 页 · 共 30 条')).toBeVisible();

  const resultScroller = page.locator('.shell-scroll');
  await resultScroller.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event('scroll'));
  });
  await page.locator('uni-button[aria-label="下一页"]').click();

  await expect(page.getByText('第 2 / 2 页 · 共 30 条')).toBeVisible();
  await expect.poll(() => resultScroller.evaluate((element) => element.scrollTop)).toBeLessThan(10);
});
