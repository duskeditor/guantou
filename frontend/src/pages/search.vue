<template>
  <PageShell
    title="搜索"
    :scroll="true"
  >
    <view class="search-row">
      <input
        :value="keywords"
        class="search-input"
        placeholder="搜索义项、写法、罐头"
        :focus="true"
        confirm-type="search"
        @input="onKeywordInput"
        @confirm="submitSearch"
      >
      <button
        class="search-button"
        @tap="submitSearch"
      >
        搜索
      </button>
    </view>

    <view class="search-tabs">
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="tab"
        :class="{ active: activeTab === tab.value }"
        @tap="selectTab(tab.value)"
      >
        {{ tab.label }}
      </view>
    </view>

    <view v-if="!hasSearched">
      <SectionBlock
        v-if="suggestions.length"
        title="联想"
      >
        <EntityCard
          v-for="item in suggestions"
          :key="`${item.scope}-${item.id}`"
          :type="item.type"
          :title="item.title"
          :description="item.description"
          :meta="item.meta"
          :item="item"
          @open="openItem"
        />
      </SectionBlock>

      <view
        v-if="hotTags.length"
        class="quick-section"
      >
        <view class="quick-title">
          热门搜索
        </view>
        <view class="tag-row">
          <text
            v-for="tag in hotTags"
            :key="tag"
            class="tag"
            @tap="pickKeyword(tag)"
          >
            {{ tag }}
          </text>
        </view>
      </view>

      <view
        v-if="historyList.length"
        class="quick-section"
      >
        <view class="quick-title">
          搜索历史
        </view>
        <view class="tag-row">
          <text
            v-for="item in historyList"
            :key="item"
            class="tag"
            @tap="pickKeyword(item)"
          >
            {{ item }}
          </text>
        </view>
      </view>

      <EmptyState
        v-if="!historyList.length && !suggestions.length"
        title="输入一个概念或写法"
        description="比如月亮、行、杀，也可以直接搜某张铭牌。"
      />
    </view>

    <view v-else>
      <EmptyState
        v-if="searchError"
        title="搜索没有成功"
        :description="searchError"
        action-text="再试一次"
        @action="submitSearch"
      />
      <view
        v-else-if="searchLoading"
        class="skeleton-list"
      >
        <view
          v-for="index in 3"
          :key="index"
          class="skeleton-card"
        />
      </view>
      <template v-else-if="hasVisibleResults">
        <SectionBlock
          v-if="showCans"
          title="罐头"
        >
          <CanCard
            v-for="item in visibleItems('cans')"
            :key="`can-${item.id}`"
            :can="item"
            @open="openCan"
          />
          <button
            v-if="hasMore('cans')"
            class="expand-button"
            @tap="toggleSection('cans')"
          >
            {{ expandedSections.cans ? '收起' : `展开剩余 ${remainingCount('cans')} 条` }}
          </button>
        </SectionBlock>

        <SectionBlock
          v-if="showFlavors"
          title="义项"
        >
          <EntityCard
            v-for="item in visibleItems('flavors')"
            :key="`flavor-${item.id}`"
            type="义项"
            :title="item.name"
            :description="item.definition"
            :meta="flavorGroupMeta(item)"
            :item="{ ...item, scope: 'flavors' }"
            @open="openItem"
          />
          <button
            v-if="hasMore('flavors')"
            class="expand-button"
            @tap="toggleSection('flavors')"
          >
            {{ expandedSections.flavors ? '收起' : `展开剩余 ${remainingCount('flavors')} 条` }}
          </button>
        </SectionBlock>

        <SectionBlock
          v-if="showPackages"
          title="写法"
        >
          <EntityCard
            v-for="item in visibleItems('packages')"
            :key="`package-${item.id}`"
            type="写法"
            :title="item.text"
            description="查看这个写法关联的义项"
            :meta="packageMeta(item)"
            :item="{ ...item, scope: 'packages' }"
            @open="openItem"
          />
          <button
            v-if="hasMore('packages')"
            class="expand-button"
            @tap="toggleSection('packages')"
          >
            {{ expandedSections.packages ? '收起' : `展开剩余 ${remainingCount('packages')} 条` }}
          </button>
        </SectionBlock>

        <SectionBlock
          v-if="showNameplates"
          title="铭牌"
        >
          <EntityCard
            v-for="item in visibleItems('nameplates')"
            :key="`nameplate-${item.id}`"
            type="铭牌"
            :title="item.display_text || item.text_content || '未命名铭牌'"
            :description="item.definition || item.flavor?.definition || '暂无释义'"
            :meta="nameplateMeta(item)"
            :item="{ ...item, scope: 'nameplates' }"
            @open="openItem"
          />
          <button
            v-if="hasMore('nameplates')"
            class="expand-button"
            @tap="toggleSection('nameplates')"
          >
            {{ expandedSections.nameplates ? '收起' : `展开剩余 ${remainingCount('nameplates')} 条` }}
          </button>
        </SectionBlock>
      </template>
      <SectionBlock
        v-else
        :empty="true"
        empty-title="这个栏目暂时没有结果"
        :empty-description="activeTab === 'all' ? '换个写法试试，或者先装一罐。' : '可以切换到全部看看其他类型的结果。'"
        :empty-action-text="activeTab === 'all' ? '装一罐' : '查看全部'"
        @empty-action="activeTab === 'all' ? toCreateCan() : selectTab('all')"
      />
    </view>
  </PageShell>
</template>

<script>
import CanCard from '@/components/CanCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import EntityCard from '@/components/EntityCard.vue';
import PageShell from '@/components/PageShell.vue';
import SectionBlock from '@/components/SectionBlock.vue';
import { APP_NAME } from '@/const/branding';
import {
  listHotSearches,
  searchGuantou,
  suggestGuantou,
} from '@/services/guantou';
import {
  goCanDetail,
  goCreateCan,
  goNameplateDetail,
  openPage,
} from '@/services/navigation';
import { defaultMessage } from '@/services/shareMessages';

const SUGGEST_DEBOUNCE_MS = 300;

function emptyResults() {
  return {
    flavors: [],
    packages: [],
    nameplates: [],
    cans: [],
  };
}

function flattenSuggestions(response) {
  const scopeByType = {
    flavor: 'flavors',
    package: 'packages',
    nameplate: 'nameplates',
  };
  const labelByType = {
    flavor: '义项',
    package: '写法',
    nameplate: '铭牌',
  };
  return (response.suggestions || []).map((item) => ({
    id: item.id,
    scope: scopeByType[item.type],
    type: labelByType[item.type],
    title: item.text,
    description: item.sub,
    meta: '',
  }));
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
    CanCard,
    EmptyState,
    EntityCard,
    PageShell,
    SectionBlock,
  },
  data() {
    return {
      activeTab: 'all',
      expandedSections: {
        cans: false,
        flavors: false,
        nameplates: false,
        packages: false,
      },
      hasSearched: false,
      hotTags: [],
      hotTagsLoaded: false,
      historyList: [],
      keywords: '',
      lastSearchedKeyword: '',
      suggestions: [],
      suggestRequestId: 0,
      suggestTimer: null,
      searchLoading: false,
      searchError: '',
      results: emptyResults(),
      tabs: [
        { label: '全部', value: 'all' },
        { label: '罐头', value: 'cans' },
        { label: '义项', value: 'flavors' },
        { label: '写法', value: 'packages' },
      ],
    };
  },
  computed: {
    totalResults() {
      return (this.results.flavors || []).length
        + (this.results.packages || []).length
        + (this.results.nameplates || []).length
        + (this.results.cans || []).length;
    },
    showCans() {
      return this.results.cans.length
        && (this.activeTab === 'all' || this.activeTab === 'cans');
    },
    showFlavors() {
      return this.results.flavors.length
        && (this.activeTab === 'all' || this.activeTab === 'flavors');
    },
    showPackages() {
      return this.results.packages.length
        && (this.activeTab === 'all' || this.activeTab === 'packages');
    },
    showNameplates() {
      return this.activeTab === 'all' && this.results.nameplates.length;
    },
    groupedFlavors() {
      const groups = new Map();
      (this.results.flavors || []).forEach((flavor) => {
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
        group.pronunciations = uniqueById(group.pronunciations.concat(flavor.pronunciations || []));
        group.package_links = uniqueById(group.package_links.concat(flavor.package_links || []));
      });
      return [...groups.values()];
    },
    hasVisibleResults() {
      return this.showCans || this.showFlavors || this.showPackages || this.showNameplates;
    },
  },
  onLoad(option) {
    this.loadHistory();
    this.loadHotTags();
    if (option.keywords || option.key) {
      this.keywords = option.keywords || option.key;
      this.search(this.keywords);
    }
  },
  onUnload() {
    this.clearSuggestTimer();
  },
  onShareAppMessage() {
    return {
      title: `${APP_NAME}：${this.keywords || '搜索'}`,
      path: `/pages/search?keywords=${this.keywords}`,
      ...defaultMessage(),
    };
  },
  methods: {
    clearSuggestTimer() {
      if (!this.suggestTimer) return;
      clearTimeout(this.suggestTimer);
      this.suggestTimer = null;
    },
    async loadHotTags() {
      if (this.hotTagsLoaded) return;
      this.hotTagsLoaded = true;
      try {
        const terms = await listHotSearches({ limit: 8 });
        this.hotTags = (terms || []).map((item) => item.keyword).filter(Boolean);
      } catch (error) {
        this.hotTags = [];
      }
    },
    async search(keyword = this.keywords) {
      const search = String(keyword || '').trim();
      if (!search) {
        uni.showToast({ title: '请输入搜索内容', icon: 'none' });
        return;
      }
      this.keywords = search;
      this.suggestRequestId += 1;
      this.clearSuggestTimer();
      this.searchLoading = true;
      this.searchError = '';
      this.results = emptyResults();
      this.hasSearched = true;
      try {
        this.results = await searchGuantou(search);
        this.suggestions = [];
        this.lastSearchedKeyword = search;
        this.recordHistory(search);
      } catch (error) {
        this.searchError = '网络开小差了，请稍后再试。';
      } finally {
        this.searchLoading = false;
      }
    },
    async suggest(keyword) {
      if (this.hasSearched) return;
      const requestId = this.suggestRequestId + 1;
      this.suggestRequestId = requestId;
      try {
        const results = await suggestGuantou(keyword, { limit: 5 });
        if (requestId !== this.suggestRequestId || this.hasSearched) return;
        this.suggestions = flattenSuggestions(results);
      } catch (error) {
        if (requestId === this.suggestRequestId) this.suggestions = [];
      }
    },
    onKeywordInput(value) {
      const keyword = String(value?.detail?.value ?? value ?? '').trim();
      this.keywords = String(value?.detail?.value ?? value ?? '').trim();
      if (!keyword) {
        this.clearSuggestTimer();
        this.suggestRequestId += 1;
        this.suggestions = [];
      } else {
        this.queueSuggest(keyword);
      }
      if (!this.hasSearched || keyword === this.lastSearchedKeyword) return;
      this.suggestRequestId += 1;
      this.hasSearched = false;
      this.searchError = '';
      this.results = emptyResults();
    },
    queueSuggest(value) {
      this.clearSuggestTimer();
      const keyword = String(value || '').trim();
      if (!keyword) return;
      this.suggestTimer = setTimeout(() => {
        this.suggest(keyword);
      }, SUGGEST_DEBOUNCE_MS);
    },
    submitSearch() {
      this.search(this.keywords);
    },
    pickKeyword(keyword) {
      this.keywords = keyword;
      this.search(keyword);
    },
    selectTab(tab) {
      this.activeTab = tab;
    },
    visibleItems(section) {
      if (section === 'flavors') {
        if (this.activeTab !== 'all' || this.expandedSections.flavors) {
          return this.groupedFlavors;
        }
        return this.groupedFlavors.slice(0, 1);
      }
      if (this.activeTab !== 'all' || this.expandedSections[section]) {
        return this.results[section] || [];
      }
      return (this.results[section] || []).slice(0, 1);
    },
    hasMore(section) {
      if (section === 'flavors') {
        return this.activeTab === 'all' && this.groupedFlavors.length > 1;
      }
      return this.activeTab === 'all' && (this.results[section] || []).length > 1;
    },
    remainingCount(section) {
      if (section === 'flavors') {
        return Math.max(0, this.groupedFlavors.length - 1);
      }
      return Math.max(0, (this.results[section] || []).length - 1);
    },
    toggleSection(section) {
      this.expandedSections[section] = !this.expandedSections[section];
    },
    loadHistory() {
      try {
        this.historyList = JSON.parse(uni.getStorageSync('search_history') || '[]').slice(0, 8);
      } catch (error) {
        this.historyList = [];
      }
    },
    recordHistory(keyword) {
      this.historyList = [
        keyword,
        ...this.historyList.filter((item) => item !== keyword),
      ].slice(0, 8);
      uni.setStorage({
        key: 'search_history',
        data: JSON.stringify(this.historyList),
      });
    },
    flavorMeta(item) {
      return `${(item.pronunciations || []).length} 个读音 · ${(item.package_links || []).length} 个写法`;
    },
    flavorGroupMeta(item) {
      const parts = (item.pronunciations || []).map((pronunciation) => {
        const dialect = pronunciation.dialect?.qualified_code || '未标方言点';
        const reading = pronunciation.surface_romanization
          || pronunciation.base_romanization
          || pronunciation.ipa
          || '未标音';
        return `${dialect} ${reading}`;
      });
      const summary = parts.length ? parts.join(' · ') : '';
      const writeCount = (item.package_links || []).length;
      return [summary, writeCount ? `${writeCount} 个写法` : ''].filter(Boolean).join(' · ');
    },
    packageMeta(item) {
      return `${(item.flavors || []).length} 个义项 · ${item.package_type || 'uncertain'}`;
    },
    nameplateMeta(item) {
      const parts = [];
      if (item.dialect?.qualified_code) parts.push(item.dialect.qualified_code);
      if (
        item.pronunciation?.surface_romanization
        || item.pronunciation?.base_romanization
        || item.pronunciation?.ipa
      ) {
        parts.push(
          item.pronunciation.surface_romanization
          || item.pronunciation.base_romanization
          || item.pronunciation.ipa,
        );
      }
      if (item.package?.text) parts.push(`写法 ${item.package.text}`);
      return parts.join(' · ') || '铭牌证据';
    },
    openCan(id) {
      goCanDetail(id);
    },
    openItem(item) {
      if (item.scope === 'cans') {
        this.openCan(item.id);
        return;
      }
      if (item.scope === 'nameplates') {
        goNameplateDetail(item.id);
        return;
      }
      const urls = {
        flavors: `/pages/flavors/details?id=${item.id}`,
        packages: `/pages/packages/details?id=${item.id}`,
      };
      openPage(urls[item.scope]);
    },
    toCreateCan() {
      goCreateCan();
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

.search-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.tab {
  padding: 14rpx 0;
  border-radius: var(--radius-pill);
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  color: var(--text-secondary-color);
  text-align: center;
  font-size: var(--font-size-sm);
  transition:
    transform 180ms ease,
    opacity 180ms ease,
    background-color 180ms ease,
    color 180ms ease;
}

.tab.active {
  background: var(--accent-color);
  border-color: var(--accent-color);
  color: var(--on-accent-color);
  font-weight: 700;
}

.tab:active {
  opacity: 0.8;
  transform: scale(0.97);
}

.search-input,
.search-button {
  min-height: 96rpx;
  line-height: 96rpx;
  transition:
    transform 180ms ease,
    opacity 180ms ease,
    background-color 180ms ease;
}

.search-input {
  box-sizing: border-box;
  padding: 0 var(--space-3);
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-base);
}

.search-button {
  margin: 0;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--accent-color);
  color: var(--on-accent-color);
  font-size: var(--font-size-sm);
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
  height: 170rpx;
  border-radius: var(--radius-md);
  background: var(--surface-subtle-color);
  animation: skeleton-pulse 1.2s ease-in-out infinite;
}

.expand-button {
  width: 100%;
  margin: var(--space-2) 0 0;
  padding: 0 var(--space-3);
  border: 1px solid var(--accent-color);
  border-radius: var(--radius-pill);
  background: var(--accent-color);
  color: var(--on-accent-color);
  font-size: var(--font-size-sm);
  line-height: 64rpx;
  transition:
    transform 180ms ease,
    opacity 180ms ease,
    background-color 180ms ease;
}

.expand-button:active {
  opacity: 0.82;
  transform: scale(0.99);
}

.expand-button::after {
  border: 0;
}

.quick-section {
  margin-bottom: var(--space-4);
}

.quick-title {
  margin-bottom: var(--space-2);
  color: var(--text-secondary-color);
  font-weight: 700;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tag {
  padding: 12rpx 20rpx;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  color: var(--accent-color);
  font-size: var(--font-size-sm);
  transition:
    transform 180ms ease,
    opacity 180ms ease,
    background-color 180ms ease;
}

.tag:active {
  opacity: 0.78;
  transform: scale(0.97);
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
  .search-input,
  .search-button,
  .expand-button,
  .tab,
  .tag {
    transition: none;
  }
  .skeleton-card {
    animation: none;
  }
}
</style>
