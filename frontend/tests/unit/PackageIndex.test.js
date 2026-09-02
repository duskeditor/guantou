import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { flushPromises, shallowMount } from '@vue/test-utils';

vi.mock('@/services/guantou', () => ({
  listFlavors: vi.fn(),
  listPackages: vi.fn(),
}));

const guantou = await import('@/services/guantou');
const {
  default: AtlasIndex,
  packageListParams,
} = await import('@/pages/flavors/index.vue');
const { default: LegacyPackageIndex } = await import('@/pages/packages/index.vue');

describe('package index', () => {
  beforeEach(() => {
    global.uni = {
      navigateTo: vi.fn(),
      redirectTo: vi.fn(),
      reLaunch: vi.fn(),
    };
    guantou.listPackages.mockReset();
    guantou.listPackages.mockResolvedValue({ results: [], next: null });
  });

  it('builds standard pagination filters without empty query values', () => {
    expect(packageListParams(' 行 ', 'orthodox', 3)).toEqual({
      page: 3,
      search: '行',
      package_type: 'orthodox',
    });
    expect(packageListParams('', '', 1)).toEqual({ page: 1 });
  });

  it('loads the writing atlas in the shared flavor index route', async () => {
    const wrapper = shallowMount(AtlasIndex, {
      global: {
        stubs: {
          picker: true,
          'uni-load-more': true,
        },
      },
    });

    wrapper.vm.$options.onLoad.call(wrapper.vm, { view: 'packages' });
    await flushPromises();

    expect(wrapper.vm.atlasTitle).toBe('写法图鉴');
    expect(wrapper.vm.switchActionText).toBe('切换为义项图鉴');
    expect(guantou.listPackages).toHaveBeenCalledWith({ page: 1 });

    wrapper.vm.switchAtlas();
    expect(uni.redirectTo).toHaveBeenCalledWith({ url: '/pages/flavors/index' });
    wrapper.unmount();
  });

  it('redirects the legacy writing atlas URL to the shared route', () => {
    LegacyPackageIndex.onLoad();

    expect(uni.redirectTo).toHaveBeenCalledWith({
      url: '/pages/flavors/index?view=packages',
    });
  });
});
