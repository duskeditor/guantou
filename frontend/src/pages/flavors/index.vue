<template>
  <AppShell
    :title="atlasTitle"
    active="atlas"
    :action-text="switchActionText"
    @action="switchAtlas"
    @action-suffix="toSearch"
    @scrolltolower="loadMore"
  >
    <template #action-suffix>
      <text class="header-search-icon">
        ⌕
      </text>
    </template>
    <view class="search-row">
      <BaseField
        v-model="search"
        name="atlas-search"
        label=""
        :placeholder="searchPlaceholder"
        aria-role="searchbox"
        aria-label="搜索"
        confirm-type="search"
        clearable
        @enter="refresh"
      />
      <BaseButton
        class="search-button"
        size="small"
        text="搜索"
        @click="refresh"
      />
    </view>

    <template v-if="showPackages">
      <view
        class="picker-field"
        @tap="packageTypePickerVisible = true"
      >
        类型 · {{ packageTypeOptions[packageTypeIndex].label }}
      </view>
      <TPicker
        :visible="packageTypePickerVisible"
        :value="[packageType]"
        title="选择写法类型"
        @change="onPackageTypeChange"
        @close="packageTypePickerVisible = false"
      >
        <TPickerItem :options="packageTypeOptions" />
      </TPicker>
    </template>

    <view
      v-if="loading"
      class="skeleton-list"
    >
      <view
        v-for="index in 6"
        :key="index"
        class="skeleton-card"
      >
        <view class="skeleton-line skeleton-line--title" />
        <view class="skeleton-line skeleton-line--body" />
        <view class="skeleton-line skeleton-line--meta" />
        <text class="skeleton-text">
          正在加载卡片…
        </text>
      </view>
    </view>
    <view
      v-else-if="loadError && (!showPackages || !packages.length)"
      class="error-state"
    >
      <text>{{ loadError }}</text>
      <BaseButton
        class="state-retry"
        variant="danger-ghost"
        size="small"
        text="重试"
        @click="refresh"
      />
    </view>
    <template v-else-if="!showPackages">
      <view
        v-for="item in groupedFlavors"
        :key="item.id"
        class="flavor-result"
        @tap="toDetail(item.id)"
      >
        <view class="flavor-result__type">
          义项
        </view>
        <view class="flavor-result__head">
          <view class="flavor-result__title">
            {{ item.name }}
          </view>
          <view
            v-if="item.package_links.length > 1"
            class="flavor-result__count"
          >
            等 {{ item.package_links.length - 1 }} 个写法
          </view>
        </view>
        <view class="flavor-result__definition">
          {{ item.definition }}
        </view>
        <view class="flavor-result__sources">
          <text
            v-for="pronunciation in visibleFlavorPronunciations(item)"
            :key="`${item.id}-${pronunciation.id}`"
            class="flavor-result__source"
          >
            {{ pronunciation.dialect?.qualified_code || '未标方言点' }}
          </text>
          <text
            v-if="item.pronunciations.length > 2"
            class="flavor-result__more"
          >
            等 {{ remainingSourceCount(item) }} 个来源地
          </text>
        </view>
      </view>
      <SectionBlock
        v-if="!groupedFlavors.length"
        :empty="true"
        empty-title="还没有义项"
        empty-description="可以先从搜索或装罐流程里沉淀第一批义项。"
      />
    </template>
    <template v-else>
      <view
        v-if="loadError"
        class="error-state package-load-more-error"
      >
        <text>{{ loadError }}</text>
        <BaseButton
          class="state-retry"
          variant="danger-ghost"
          size="small"
          text="重试"
          @click="refreshPackages"
        />
      </view>
      <EntityCard
        v-for="item in packages"
        :key="item.id"
        type="写法"
        :title="item.text"
        :description="packageTypeLabel(item.package_type)"
        :meta="`${(item.flavors || []).length} 个关联义项`"
        :item="item"
        @open="toPackageDetail(item.id)"
      />

      <SectionBlock
        v-if="showPackageEmpty"
        :empty="true"
        empty-title="没有找到写法"
        empty-description="换个关键词或类型看看，也可以切换到义项图鉴继续浏览。"
        empty-action-text="浏览全部"
        @empty-action="resetPackageFilters"
      />
      <uni-load-more
        v-if="packages.length"
        :status="loadingStatus"
      />
    </template>
  </AppShell>
</template>

<script>
import AppShell from '@/components/AppShell.vue';
import BaseButton from '@/components/BaseButton.vue';
import BaseField from '@/components/BaseField.vue';
import EntityCard from '@/components/EntityCard.vue';
import SectionBlock from '@/components/SectionBlock.vue';
import TPicker from '@tdesign/uniapp/picker/picker.vue';
import TPickerItem from '@tdesign/uniapp/picker-item/picker-item.vue';
import { listFlavors, listPackages } from '@/services/guantou';
import {
  goFlavorDetail,
  goPackageDetail,
  openPage,
  ROUTES,
} from '@/services/navigation';

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

function flavorGroupKey(item) {
  return `${String(item.name || '').trim()}||${String(item.definition || '').trim()}`;
}

function uniqueById(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export default {
  components: {
    AppShell,
    BaseButton,
    BaseField,
    EntityCard,
    SectionBlock,
    TPicker,
    TPickerItem,
  },
  data() {
    return {
      activeAtlas: 'flavors',
      flavors: [],
      loadError: '',
      loading: false,
      loadingStatus: 'more',
      packageType: '',
      packageTypePickerVisible: false,
      packageTypeOptions: PACKAGE_TYPES,
      packages: [],
      page: 1,
      search: '',
    };
  },
  onLoad(options = {}) {
    this.activeAtlas = options.view === 'packages' ? 'packages' : 'flavors';
    this.refresh();
  },
  computed: {
    atlasTitle() {
      return this.showPackages ? '写法图鉴' : '义项图鉴';
    },
    groupedFlavors() {
      const groups = new Map();
      this.flavors.forEach((flavor) => {
        const key = flavorGroupKey(flavor);
        if (!groups.has(key)) {
          groups.set(key, {
            id: flavor.id,
            name: flavor.name,
            definition: flavor.definition,
            pronunciations: [],
            package_links: [],
          });
        }
        const group = groups.get(key);
        group.pronunciations = uniqueById(
          group.pronunciations.concat(flavor.pronunciations || []),
        );
        group.package_links = uniqueById(
          group.package_links.concat(flavor.package_links || []),
        );
      });
      return [...groups.values()];
    },
    packageTypeIndex() {
      const index = this.packageTypeOptions.findIndex(
        (item) => item.value === this.packageType,
      );
      return index < 0 ? 0 : index;
    },
    searchPlaceholder() {
      return this.showPackages ? '搜索字、词或罗马字' : '搜索义项、释义、写法';
    },
    showPackageEmpty() {
      return !this.loading && !this.loadError && !this.packages.length;
    },
    showPackages() {
      return this.activeAtlas === 'packages';
    },
    switchActionText() {
      return this.showPackages ? '切换为义项图鉴' : '切换为写法图鉴';
    },
  },
  methods: {
    async refresh() {
      if (this.showPackages) {
        await this.refreshPackages();
        return;
      }
      await this.refreshFlavors();
    },
    async refreshFlavors() {
      this.loading = true;
      this.loadError = '';
      try {
        const res = await listFlavors({ search: this.search.trim() });
        this.flavors = res.results || res || [];
      } catch (error) {
        this.loadError = '义项加载没有成功，请稍后再试。';
      } finally {
        this.loading = false;
      }
    },
    async refreshPackages() {
      this.page = 1;
      this.loadError = '';
      this.loading = true;
      this.loadingStatus = 'loading';
      try {
        const response = await listPackages(
          packageListParams(this.search, this.packageType, this.page),
        );
        this.packages = response.results || response || [];
        this.loadingStatus = response.next ? 'more' : 'noMore';
      } catch (error) {
        this.loadError = '写法加载没有成功，请稍后再试。';
        this.loadingStatus = 'more';
      } finally {
        this.loading = false;
      }
    },
    async loadMore() {
      if (!this.showPackages || this.loadingStatus !== 'more') return;
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
        this.loadError = '加载更多没有成功，请稍后再试。';
        this.loadingStatus = 'more';
      }
    },
    flavorGroupMeta(item) {
      const pronunciations = item.pronunciations || [];
      const visiblePronunciations = pronunciations.slice(0, 2);
      const parts = visiblePronunciations.map((pronunciation) => {
        const dialect = pronunciation.dialect?.qualified_code || '未标方言点';
        const reading = pronunciation.surface_romanization
          || pronunciation.base_romanization
          || pronunciation.ipa
          || '未标音';
        return `${dialect} ${reading}`;
      });
      const summary = parts.length ? parts.join(' · ') : '';
      const readingMore = pronunciations.length > 2
        ? `等 ${pronunciations.length} 个读音`
        : '';
      const writeCount = (item.package_links || []).length;
      return [summary, readingMore, writeCount ? `${writeCount} 个写法` : '']
        .filter(Boolean)
        .join(' · ');
    },
    visibleFlavorPronunciations(item) {
      const pronunciations = item.pronunciations || [];
      return pronunciations.length > 2 ? pronunciations.slice(0, 2) : pronunciations;
    },
    remainingSourceCount(item) {
      const visibleCount = this.visibleFlavorPronunciations(item).length;
      return Math.max(0, item.pronunciations.length - visibleCount);
    },
    pronunciationText(pronunciation) {
      return pronunciation.surface_romanization
        || pronunciation.base_romanization
        || pronunciation.ipa
        || '未标音';
    },
    packageTexts(item) {
      return (item.package_links || [])
        .map((link) => link.package?.text || `写法 ${link.package?.id}`)
        .join('、');
    },
    toDetail(id) {
      goFlavorDetail(id);
    },
    packageTypeLabel(value) {
      return this.packageTypeOptions.find((item) => item.value === value)?.label || value;
    },
    onPackageTypeChange(event) {
      const value = event?.detail?.value || event?.value || [];
      const selected = Array.isArray(value) ? value[0] : value;
      this.packageType = typeof selected === 'object' ? selected.value : selected || '';
      this.packageTypePickerVisible = false;
      this.refreshPackages();
    },
    resetPackageFilters() {
      this.search = '';
      this.packageType = '';
      this.refreshPackages();
    },
    switchAtlas() {
      const params = this.showPackages ? {} : { view: 'packages' };
      openPage(ROUTES.atlas, params, { replace: true });
    },
    toPackageDetail(id) {
      goPackageDetail(id);
    },
    toSearch() {
      openPage(ROUTES.search, { tab: this.showPackages ? 'packages' : 'flavors' });
    },
  },
};
</script>

<style scoped>
.search-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.search-row :deep(.base-field) {
  --td-form-item-vertical-padding: 0;
}

.header-search-icon {
  color: var(--on-immersive-color);
  font-size: 38rpx;
  line-height: 1;
}

.picker-field {
  min-height: 96rpx;
  margin-bottom: var(--space-3);
  padding: 0 22rpx;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background: var(--surface-color);
  color: var(--text-secondary-color);
  font-size: var(--font-size-base);
  line-height: 96rpx;
}

.search-button {
  min-height: 80rpx;
  margin: 0;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--accent-color);
  color: var(--on-accent-color);
  font-size: var(--font-size-sm);
  transition:
    transform 180ms ease,
    opacity 180ms ease,
    background-color 180ms ease;
}

.search-button:active {
  opacity: 0.82;
  transform: scale(0.98);
}

.search-button::after {
  border: 0;
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-card {
  min-height: 170rpx;
  padding: var(--space-3);
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--surface-color);
}

.skeleton-line {
  height: 24rpx;
  margin-bottom: var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--surface-subtle-color);
  animation: skeleton-pulse 1.2s ease-in-out infinite;
}

.skeleton-line--title { width: 42%; height: 32rpx; }
.skeleton-line--body { width: 76%; }
.skeleton-line--meta { width: 58%; }

.skeleton-text {
  color: var(--muted-color);
  font-size: var(--font-size-xs);
  animation: skeleton-pulse 1.2s ease-in-out infinite;
}

.error-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--danger-subtle-color);
  color: var(--danger-color);
}

.package-load-more-error {
  margin-bottom: var(--space-2);
}

.flavor-result {
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--surface-color);
  margin-bottom: 18rpx;
  transition:
    transform 180ms ease,
    opacity 180ms ease,
    background-color 180ms ease;
}

.flavor-result:active {
  opacity: 0.82;
  transform: scale(0.99);
}

.flavor-result__type {
  color: var(--accent-color);
  font-size: var(--font-size-xs);
  margin-bottom: var(--space-1);
}

.flavor-result__head {
  display: flex;
  align-items: baseline;
  justify-content: flex-start;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.flavor-result__title {
  flex: 0 1 auto;
  font-size: 34rpx;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.flavor-result__count {
  flex: 0 0 auto;
  color: var(--muted-color);
  font-size: var(--font-size-xs);
}

.flavor-result__definition {
  margin-top: 10rpx;
  color: var(--text-secondary-color);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.flavor-result__sources {
  display: flex;
  flex-wrap: nowrap;
  overflow: hidden;
  gap: var(--space-2);
  margin-top: 14rpx;
}

.flavor-result__source {
  flex: 0 0 auto;
  min-width: 0;
  overflow: hidden;
  color: var(--muted-color);
  font-size: var(--font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flavor-result__sources .flavor-result__more {
  margin-top: 0;
}

.flavor-result__more {
  display: inline-block;
  margin-top: 8rpx;
  color: var(--muted-color);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.flavor-result__writings {
  margin-top: 12rpx;
  color: var(--accent-color);
  font-size: var(--font-size-xs);
}

.state-retry {
  margin: 0;
  padding: 0 var(--space-3);
  background: transparent;
  color: var(--danger-color);
  font-size: var(--font-size-sm);
}

.state-retry::after {
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
  .search-button {
    transition: none;
  }
  .skeleton-line,
  .skeleton-text {
    animation: none;
  }
}
</style>
