<template>
  <AppShell
    title="义项图鉴"
    active="atlas"
    action-text="切换为写法图鉴"
    @action="toPackages"
    @action-suffix="toSearch"
  >
    <template #action-suffix>
      <text class="header-search-icon">
        ⌕
      </text>
    </template>
    <view class="search-row">
      <view class="search-field">
        <input
          v-model="search"
          class="search"
          placeholder="搜索义项、释义、写法"
          @confirm="refresh"
        >
      </view>
      <button
        class="small-button"
        @tap="refresh"
      >
        搜索
      </button>
    </view>

    <view
      v-if="loading"
      class="skeleton-list"
    >
      <view
        v-for="index in 3"
        :key="index"
        class="skeleton-card"
      />
    </view>
    <view
      v-else-if="loadError"
      class="error-state"
    >
      <text>{{ loadError }}</text>
      <button
        class="state-retry"
        @tap="refresh"
      >
        重试
      </button>
    </view>
    <template v-else>
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
  </AppShell>
</template>

<script>
import AppShell from '@/components/AppShell.vue';
import SectionBlock from '@/components/SectionBlock.vue';
import { listFlavors } from '@/services/guantou';
import { goFlavorDetail, goPackageList, goSearch } from '@/services/navigation';

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
    SectionBlock,
  },
  data() {
    return {
      flavors: [],
      loadError: '',
      loading: false,
      search: '',
    };
  },
  onLoad() {
    this.refresh();
  },
  computed: {
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
  },
  methods: {
    async refresh() {
      this.loading = !this.flavors.length;
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
    toPackages() {
      goPackageList();
    },
    toSearch() {
      goSearch();
    },
  },
};
</script>

<style scoped>
.search-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.search-field {
  display: flex;
  align-items: center;
  min-height: 96rpx;
  padding: 0 var(--space-3);
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  box-sizing: border-box;
}

.header-search-icon {
  color: var(--on-immersive-color);
  font-size: 38rpx;
  line-height: 1;
}

.search,
.small-button {
  min-height: 96rpx;
  line-height: 96rpx;
}

.search {
  min-width: 0;
  flex: 1;
  padding: 0 var(--space-3);
  background: transparent;
  border: 0;
  font-size: var(--font-size-base);
}

.small-button {
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
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--danger-subtle-color);
  color: var(--danger-color);
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
  .small-button {
    transition: none;
  }
  .skeleton-card {
    animation: none;
  }
}
</style>
