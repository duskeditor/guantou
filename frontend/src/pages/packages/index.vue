<template>
  <PageShell
    title="写法图鉴"
    :scroll="true"
    @scrolltolower="loadMore"
  >
    <view class="filters">
      <view class="search-row">
        <input
          v-model="search"
          class="search-input"
          confirm-type="search"
          placeholder="搜索字、词或罗马字"
          @confirm="refresh"
        >
        <button
          class="small-button"
          @tap="refresh"
        >
          搜索
        </button>
      </view>
      <picker
        :range="packageTypeOptions"
        range-key="label"
        :value="packageTypeIndex"
        @change="onPackageTypeChange"
      >
        <view class="picker-field">
          类型 · {{ packageTypeOptions[packageTypeIndex].label }}
        </view>
      </picker>
    </view>

    <view
      v-if="initialLoading"
      class="skeleton-list"
    >
      <view
        v-for="index in 3"
        :key="index"
        class="skeleton-card"
      />
    </view>

    <view
      v-if="errorMessage"
      class="error-state"
    >
      <text>{{ errorMessage }}</text>
      <button
        class="error-retry"
        @tap="refresh"
      >
        重试
      </button>
    </view>

    <EntityCard
      v-for="item in packages"
      :key="item.id"
      type="写法"
      :title="item.text"
      :description="packageTypeLabel(item.package_type)"
      :meta="`${(item.flavors || []).length} 个关联义项`"
      :item="item"
      @open="toDetail(item.id)"
    />

    <SectionBlock
      v-if="showEmpty"
      :empty="true"
      empty-title="没有找到写法"
      empty-description="换个关键词或类型看看，也可以回到义项图鉴继续浏览。"
      empty-action-text="浏览全部"
      @empty-action="resetFilters"
    />
    <uni-load-more
      v-if="packages.length"
      :status="loadingStatus"
    />
  </PageShell>
</template>

<script>
import EntityCard from '@/components/EntityCard.vue';
import PageShell from '@/components/PageShell.vue';
import SectionBlock from '@/components/SectionBlock.vue';
import { listPackages } from '@/services/guantou';
import { goPackageDetail } from '@/services/navigation';

export const PACKAGE_TYPES = [
  { value: '', label: '全部写法' },
  { value: 'orthodox', label: '正字' },
  { value: 'loan', label: '借字' },
  { value: 'popular', label: '俗写' },
  { value: 'phonetic', label: '拟音' },
  { value: 'romanization', label: '罗马字' },
  { value: 'uncertain', label: '不确定' },
];

export function packageListParams(search, packageType, page = 1) {
  const params = { page };
  const keyword = String(search || '').trim();
  if (keyword) params.search = keyword;
  if (packageType) params.package_type = packageType;
  return params;
}

export default {
  components: {
    EntityCard,
    PageShell,
    SectionBlock,
  },
  data() {
    return {
      errorMessage: '',
      initialLoading: false,
      loadingStatus: 'more',
      packageType: '',
      packageTypeOptions: PACKAGE_TYPES,
      packages: [],
      page: 1,
      search: '',
    };
  },
  computed: {
    packageTypeIndex() {
      const index = this.packageTypeOptions.findIndex(
        (item) => item.value === this.packageType,
      );
      return index < 0 ? 0 : index;
    },
    showEmpty() {
      return !this.initialLoading && !this.errorMessage && !this.packages.length;
    },
  },
  onLoad() {
    this.refresh();
  },
  methods: {
    packageTypeLabel(value) {
      return this.packageTypeOptions.find((item) => item.value === value)?.label || value;
    },
    async refresh() {
      this.page = 1;
      this.errorMessage = '';
      this.initialLoading = !this.packages.length;
      this.loadingStatus = 'loading';
      try {
        const response = await listPackages(
          packageListParams(this.search, this.packageType, this.page),
        );
        this.packages = response.results || response || [];
        this.loadingStatus = response.next ? 'more' : 'noMore';
      } catch (error) {
        this.errorMessage = '写法加载没有成功，请稍后再试。';
        this.loadingStatus = 'more';
      } finally {
        this.initialLoading = false;
      }
    },
    async loadMore() {
      if (this.loadingStatus !== 'more') return;
      const nextPage = this.page + 1;
      this.loadingStatus = 'loading';
      try {
        const response = await listPackages(
          packageListParams(this.search, this.packageType, nextPage),
        );
        this.page = nextPage;
        const knownIds = new Set(this.packages.map((item) => item.id));
        const additions = (response.results || response || []).filter(
          (item) => !knownIds.has(item.id),
        );
        this.packages = this.packages.concat(additions);
        this.loadingStatus = response.next ? 'more' : 'noMore';
      } catch (error) {
        this.errorMessage = '加载更多没有成功，请稍后再试。';
        this.loadingStatus = 'more';
      }
    },
    onPackageTypeChange(event) {
      this.packageType = this.packageTypeOptions[Number(event.detail.value)]?.value || '';
      this.refresh();
    },
    resetFilters() {
      this.search = '';
      this.packageType = '';
      this.refresh();
    },
    toDetail(id) {
      goPackageDetail(id);
    },
  },
};
</script>

<style scoped>
.filters {
  margin-bottom: var(--space-3);
}

.search-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-2);
}

.search-input,
.picker-field,
.small-button {
  min-height: 96rpx;
}

.search-input,
.picker-field {
  box-sizing: border-box;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
}

.search-input {
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  line-height: 96rpx;
}

.picker-field {
  margin-top: var(--space-2);
  padding: 0 22rpx;
  border-radius: var(--radius-sm);
  color: var(--text-secondary-color);
  line-height: 96rpx;
}

.small-button {
  margin: 0;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--accent-color);
  color: var(--on-accent-color);
  font-size: var(--font-size-sm);
  line-height: 96rpx;
  transition:
    transform 180ms ease,
    opacity 180ms ease,
    background-color 180ms ease;
}

.small-button:active {
  opacity: 0.82;
  transform: scale(0.98);
}

.small-button::after {
  border: 0;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-card {
  height: 170rpx;
  border-radius: var(--radius-md);
  background: var(--surface-subtle-color);
  animation: skeleton-pulse 1.2s ease-in-out infinite;
}

.error-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--danger-subtle-color);
  color: var(--danger-color);
}

.error-retry {
  margin: 0;
  padding: 0 var(--space-3);
  background: transparent;
  color: var(--danger-color);
  font-size: var(--font-size-sm);
}

.error-retry::after {
  border: 0;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .small-button {
    transition: none;
  }
  .skeleton-card {
    animation: none;
  }
}
</style>
