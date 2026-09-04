import { mount } from '@vue/test-utils';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import PageShell from '@/components/PageShell.vue';
import BaseButton from '@/components/BaseButton.vue';
import FeedbackHost from '@/components/FeedbackHost.vue';

describe('PageShell', () => {
  beforeEach(() => {
    global.uni = {
      $emit: vi.fn(),
      $off: vi.fn(),
      $on: vi.fn(),
      getStorageSync: vi.fn(() => 'light'),
      getSystemInfoSync: vi.fn(() => ({ theme: 'light' })),
      navigateBack: vi.fn(),
    };
  });

  it('keeps the title in the center grid column when back is hidden', () => {
    const wrapper = mount(PageShell, {
      props: {
        title: '乡声集盒',
        showBack: false,
      },
      global: {
        stubs: { 'scroll-view': { template: '<div><slot /></div>' } },
      },
      slots: { default: '<div>content</div>' },
    });

    const topbar = wrapper.find('.shell-topbar');
    expect(topbar.find('.shell-back').exists()).toBe(false);
    expect(topbar.find('.shell-back-placeholder').exists()).toBe(true);
    expect(topbar.find('.shell-title').text()).toBe('乡声集盒');
    expect(wrapper.findComponent(FeedbackHost).exists()).toBe(true);
    wrapper.unmount();
  });

  it('uses the shared button contract for topbar actions', () => {
    const wrapper = mount(PageShell, {
      props: { title: '编辑', actionText: '保存' },
      global: {
        stubs: { 'scroll-view': { template: '<div><slot /></div>' } },
      },
    });
    const action = wrapper.getComponent(BaseButton);
    expect(action.props('text')).toBe('保存');
    action.vm.$emit('click');
    expect(wrapper.emitted('action')).toHaveLength(1);
    wrapper.unmount();
  });

  it('keeps the before slot outside the independent scroll area', () => {
    const wrapper = mount(PageShell, {
      props: { title: '搜索' },
      global: {
        stubs: { 'scroll-view': { template: '<div><slot /></div>' } },
      },
      slots: {
        before: '<div class="fixed-controls">搜索控件</div>',
        default: '<div class="results">搜索结果</div>',
      },
    });

    expect(wrapper.classes()).toContain('page-shell--scroll');
    expect(wrapper.get('.fixed-controls').element.parentElement)
      .toBe(wrapper.get('.page-shell').element);
    expect(wrapper.get('.shell-scroll').find('.fixed-controls').exists()).toBe(false);
    expect(wrapper.get('.shell-scroll').find('.results').exists()).toBe(true);
    wrapper.unmount();
  });

  it('resets the internal scroll view when the reset key changes', async () => {
    const wrapper = mount(PageShell, {
      props: { title: '搜索', scrollResetKey: 0 },
      global: {
        stubs: { 'scroll-view': { template: '<div><slot /></div>' } },
      },
    });

    await wrapper.setProps({ scrollResetKey: 1 });
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.contentScrollTop).toBe(0);
    wrapper.unmount();
  });

  it('applies a theme update without browser-only globals', async () => {
    uni.getStorageSync.mockReturnValue('light');
    uni.getSystemInfoSync.mockReturnValue({ theme: 'light' });
    const wrapper = mount(PageShell, {
      props: { title: '主题' },
      global: {
        stubs: { 'scroll-view': { template: '<div><slot /></div>' } },
      },
    });

    wrapper.vm.handleThemeChange({ preference: 'dark', resolved: 'dark' });
    await wrapper.vm.$nextTick();

    expect(wrapper.classes()).toContain('theme-dark');
    wrapper.unmount();
    expect(uni.$off).toHaveBeenCalled();
  });
});
