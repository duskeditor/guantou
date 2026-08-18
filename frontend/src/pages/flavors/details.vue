<template>
  <PageShell title="义项详情">
    <view
      v-if="loading"
      class="state"
    >
      正在加载义项…
    </view>
    <view
      v-else-if="loadError"
      class="state error"
    >
      <text>{{ loadError }}</text>
      <button
        class="state-retry"
        @tap="refresh"
      >
        重试
      </button>
    </view>
    <template v-else-if="flavor">
      <SectionBlock>
        <view class="name">
          {{ flavor.name }}
        </view>
        <view class="definition">
          {{ flavor.definition }}
        </view>
        <button
          class="primary-button"
          @tap="toCreateForFlavor"
        >
          用我的方言录一版
        </button>
        <button
          class="secondary-button"
          @tap="toCreatePronunciation"
        >
          添加词典读音
        </button>
      </SectionBlock>

      <SectionBlock
        title="写法"
        :empty="!flavor.package_links.length"
        empty-title="暂无关联写法"
      >
        <text
          v-for="link in flavor.package_links"
          :key="link.id"
          class="tag"
          @tap="toPackage(link.package.id)"
        >
          {{ link.package.text }}
        </text>
      </SectionBlock>

      <SectionBlock
        title="读音变体"
        :empty="!flavor.pronunciations.length"
        empty-title="暂无读音变体"
      >
        <view
          v-for="pronunciation in flavor.pronunciations"
          :key="pronunciation.id"
          class="variant"
        >
          <text>{{ pronunciation.dialect ? pronunciation.dialect.qualified_code : '未标方言点' }}</text>
          <text>{{ pronunciationLabel(pronunciation) }}</text>
        </view>
      </SectionBlock>

      <SectionBlock title="相关罐头">
        <CanList
          :fetcher="listCans"
          :query="{ flavor_id: id }"
          :scroll="false"
          empty-title="还没有相关罐头"
          empty-description="可以用自己的方言为这个义项补录一版。"
          empty-action-text="补录乡音"
          @open="toCan"
          @empty-action="toCreateForFlavor"
        />
      </SectionBlock>
    </template>
    <EmptyState
      v-else
      title="没有找到这个义项"
      description="可以回到义项图鉴重新选择。"
      action-text="浏览义项"
      @action="toFlavors"
    />
  </PageShell>
</template>

<script>
import CanList from '@/components/CanList.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageShell from '@/components/PageShell.vue';
import SectionBlock from '@/components/SectionBlock.vue';
import { requireAuth } from '@/services/authGuard';
import { getFlavor, listCans } from '@/services/guantou';

export function formatPronunciationLabel(pronunciation) {
  const base = pronunciation.base_romanization;
  const surface = pronunciation.surface_romanization;
  if (base && surface && base !== surface) {
    return `本调 ${base} → 变调 ${surface}`;
  }
  return surface || base || pronunciation.ipa || '未标音';
}

export default {
  components: {
    CanList,
    EmptyState,
    PageShell,
    SectionBlock,
  },
  data() {
    return {
      flavor: null,
      id: 0,
      loadError: '',
      loading: false,
    };
  },
  async onLoad(options) {
    this.id = options.id;
    await this.refresh();
  },
  async onShow() {
    if (this.id && this.flavor) await this.refresh();
  },
  methods: {
    listCans,
    pronunciationLabel: formatPronunciationLabel,
    async refresh() {
      this.loading = !this.flavor;
      this.loadError = '';
      try {
        this.flavor = await getFlavor(this.id);
      } catch (error) {
        this.loadError = '义项加载失败，请重试';
      } finally {
        this.loading = false;
      }
    },
    toCan(id) {
      uni.navigateTo({ url: `/pages/cans/details?id=${id}` });
    },
    toPackage(id) {
      uni.navigateTo({ url: `/pages/packages/details?id=${id}` });
    },
    toFlavors() {
      uni.navigateTo({ url: '/pages/flavors/index' });
    },
    toCreateForFlavor() {
      if (!requireAuth('record_can', {
        page: 'flavor_detail',
        flavorId: this.id,
        flavorName: this.flavor.name,
      })) return;
      uni.navigateTo({
        url: `/pages/cans/create?flavor=${this.id}&flavor_name=${encodeURIComponent(this.flavor.name)}`,
      });
    },
    toCreatePronunciation() {
      if (!requireAuth('pronunciation_create', {
        page: 'flavor_detail',
        flavorId: this.id,
      })) return;
      uni.navigateTo({
        url: `/pages/pronunciations/create?flavor_id=${this.id}`,
      });
    },
  },
};
</script>

<style scoped>
.name {
  font-size: 42rpx;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.definition {
  margin-top: 14rpx;
  color: var(--text-secondary-color);
  line-height: 1.5;
}

.tag {
  display: inline-block;
  margin: 0 12rpx 12rpx 0;
  background: var(--accent-subtle-color);
  color: var(--accent-color);
  border-radius: var(--radius-pill);
  padding: 8rpx 18rpx;
}

.primary-button {
  margin-top: 24rpx;
  background: var(--accent-color);
  color: var(--on-accent-color);
  border-radius: var(--radius-sm);
}

.secondary-button {
  margin-top: 14rpx;
  border: 1px solid var(--accent-color);
  background: var(--surface-color);
  color: var(--accent-color);
  border-radius: var(--radius-sm);
}

.variant {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
  padding: 16rpx 0;
  border-bottom: 1px solid var(--border-color);
}

.state {
  padding: var(--space-5) var(--space-3);
  color: var(--muted-color);
  text-align: center;
}

.state.error {
  color: var(--danger-color);
}

.state-retry {
  margin: var(--space-2) auto 0;
  padding: 0 var(--space-3);
  background: transparent;
  color: var(--accent-color);
  font-size: var(--font-size-sm);
}

.state-retry::after {
  border: 0;
}
</style>
