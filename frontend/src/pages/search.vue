<template>
  <PageShell
    title="搜索"
    :scroll="true"
    :scroll-reset-key="resultScrollKey"
  >
    <template #before>
      <view class="search-controls">
        <view class="search-row">
          <BaseField
            v-model="keywords"
            name="search"
            label=""
            placeholder="搜索罐头、铭牌、义项、写法"
            aria-role="searchbox"
            aria-label="搜索"
            confirm-type="search"
            clearable
            focus
            @change="onKeywordInput"
            @enter="submitSearch"
          />
          <BaseButton
            class="search-button"
            size="small"
            text="搜索"
            @click="submitSearch"
          />
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
      </view>
    </template>

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
        v-else-if="activePage.loading"
        class="result-skeleton-list"
        :aria-label="`正在预加载${activeTabLabel}卡片`"
      >
        <view
          v-for="index in 6"
          :key="index"
          class="result-skeleton-card"
        >
          <view class="result-skeleton-line result-skeleton-line--title" />
          <view class="result-skeleton-line result-skeleton-line--body" />
          <view class="result-skeleton-line result-skeleton-line--meta" />
          <text class="result-skeleton-text">
            正在加载{{ activeTabLabel }}卡片…
          </text>
        </view>
      </view>
      <BaseLoading
        v-else-if="searchLoading"
        text="正在搜索…"
      />
      <template v-else-if="hasVisibleResults">
        <SectionBlock
          v-if="showCans"
        >
          <CanCard
            v-for="item in visibleItems('cans')"
            :key="`can-${item.id}`"
            :can="item"
            @open="openCan"
          />
        </SectionBlock>

        <SectionBlock
          v-if="showNameplates"
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
        </SectionBlock>

        <SectionBlock
          v-if="showFlavors"
        >
          <view
            v-for="item in visibleItems('flavors')"
            :key="`flavor-${item.id}`"
            class="flavor-result"
            @tap="openItem({ ...item, scope: 'flavors' })"
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
          </view>
        </SectionBlock>

        <SectionBlock
          v-if="showPackages"
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
        </SectionBlock>

        <view class="result-pagination">
          <text class="result-page-summary">
            第 {{ activePage.page }} / {{ activePageCount }} 页 · 共 {{ activePage.count }} 条
          </text>
          <view class="result-page-actions">
            <BaseButton
              variant="ghost"
              size="small"
              text="上一页"
              :disabled="!activePage.previous || activePage.loading"
              @click="changeResultPage(activePage.page - 1)"
            />
            <BaseButton
              size="small"
              text="下一页"
              :disabled="!activePage.next || activePage.loading"
              @click="changeResultPage(activePage.page + 1)"
            />
          </view>
          <view
            v-if="activePage.error"
            class="result-page-error"
          >
            {{ activePage.error }}
          </view>
          <view
            v-else-if="!activePage.next"
            class="result-page-end"
          >
            已经到底了
          </view>
        </view>
      </template>
      <SectionBlock
        v-else
        :empty="true"
        empty-title="这个栏目暂时没有结果"
        empty-description="换个写法试试，或者切换到其他类型看看。"
        :empty-action-text="activeTab === 'cans' ? '装一罐' : '查看罐头'"
        @empty-action="activeTab === 'cans' ? toCreateCan() : selectTab('cans')"
      />
    </view>
  </PageShell>
</template>

<script>
import CanCard from '@/components/CanCard.vue';
import BaseButton from '@/components/BaseButton.vue';
import BaseField from '@/components/BaseField.vue';
import BaseLoading from '@/components/BaseLoading.vue';
import EmptyState from '@/components/EmptyState.vue';
import EntityCard from '@/components/EntityCard.vue';
import PageShell from '@/components/PageShell.vue';
import SectionBlock from '@/components/SectionBlock.vue';
import { APP_NAME } from '@/const/branding';
import {
  listCans,
  listFlavors,
  listHotSearches,
  listNameplates,
  listPackages,
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
const RESULT_PAGE_SIZE = 20;
const RESULT_SKELETON_MIN_MS = 400;
const RESULT_SECTIONS = ['cans', 'nameplates', 'flavors', 'packages'];
const RESULT_FETCHERS = {
  cans: listCans,
  nameplates: listNameplates,
  flavors: listFlavors,
  packages: listPackages,
};

function waitForResultSkeleton() {
  return new Promise((resolve) => {
    setTimeout(resolve, RESULT_SKELETON_MIN_MS);
  });
}

function emptyPageState() {
  return {
    count: 0,
    error: '',
    loading: false,
    next: null,
    page: 1,
    previous: null,
  };
}

function emptyResultPages() {
  return RESULT_SECTIONS.reduce((pages, section) => ({
    ...pages,
    [section]: emptyPageState(),
  }), {});
}

function pageStateFromResponse(response, page = 1) {
  const results = response.results || response || [];
  return {
    count: Number(response.count ?? results.length),
    error: '',
    loading: false,
    next: response.next || null,
    page,
    previous: response.previous || null,
  };
}

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
    BaseButton,
    BaseField,
    BaseLoading,
    EmptyState,
    EntityCard,
    PageShell,
    SectionBlock,
  },
  data() {
    return {
      activeTab: 'cans',
      expandedFlavorPronunciations: [],
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
      searchRequestId: 0,
      searchError: '',
      results: emptyResults(),
      resultPages: emptyResultPages(),
      resultScrollKey: 0,
      resultRequestIds: RESULT_SECTIONS.reduce((ids, section) => ({
        ...ids,
        [section]: 0,
      }), {}),
      tabs: [
        { label: '罐头', value: 'cans' },
        { label: '铭牌', value: 'nameplates' },
        { label: '义项', value: 'flavors' },
        { label: '写法', value: 'packages' },
      ],
    };
  },
  computed: {
    activeTabLabel() {
      return this.tabs.find((tab) => tab.value === this.activeTab)?.label || '';
    },
    activePage() {
      return this.resultPages[this.activeTab] || emptyPageState();
    },
    activePageCount() {
      return Math.max(1, Math.ceil(this.activePage.count / RESULT_PAGE_SIZE));
    },
    totalResults() {
      return (this.results.flavors || []).length
        + (this.results.packages || []).length
        + (this.results.nameplates || []).length
        + (this.results.cans || []).length;
    },
    showCans() {
      return this.activeTab === 'cans' && this.results.cans.length;
    },
    showFlavors() {
      return this.activeTab === 'flavors' && this.results.flavors.length;
    },
    showPackages() {
      return this.activeTab === 'packages' && this.results.packages.length;
    },
    showNameplates() {
      return this.activeTab === 'nameplates' && (this.results.nameplates || []).length;
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
            flavor_ids: [flavor.id],
            pronunciations: [],
            package_links: [],
          });
        }
        const group = groups.get(key);
        if (!group.flavor_ids.includes(flavor.id)) group.flavor_ids.push(flavor.id);
        group.pronunciations = uniqueById(group.pronunciations.concat(flavor.pronunciations || []));
        group.package_links = uniqueById(group.package_links.concat(flavor.package_links || []));
      });
      return [...groups.values()];
    },
    hasVisibleResults() {
      return this.showCans || this.showFlavors || this.showPackages || this.showNameplates;
    },
  },
  onLoad(option = {}) {
    this.loadHistory();
    this.loadHotTags();
    if (RESULT_SECTIONS.includes(option.tab)) {
      this.activeTab = option.tab;
    }
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
      const requestId = this.searchRequestId + 1;
      this.searchRequestId = requestId;
      this.resultRequestIds = RESULT_SECTIONS.reduce((ids, section) => ({
        ...ids,
        [section]: this.resultRequestIds[section] + 1,
      }), {});
      this.suggestRequestId += 1;
      this.clearSuggestTimer();
      this.searchLoading = true;
      this.resultPages = RESULT_SECTIONS.reduce((pages, section) => ({
        ...pages,
        [section]: { ...emptyPageState(), loading: true },
      }), {});
      this.searchError = '';
      this.results = emptyResults();
      this.hasSearched = true;
      try {
        const responses = await Promise.all([
          searchGuantou(search, { limit: RESULT_PAGE_SIZE }),
          ...RESULT_SECTIONS.map((section) => RESULT_FETCHERS[section]({
            search,
            page: 1,
            page_size: RESULT_PAGE_SIZE,
          })),
          waitForResultSkeleton(),
        ]);
        if (requestId !== this.searchRequestId) return;
        const pageResponses = responses.slice(1, 1 + RESULT_SECTIONS.length);
        this.results = RESULT_SECTIONS.reduce((results, section, index) => ({
          ...results,
          [section]: pageResponses[index].results || pageResponses[index] || [],
        }), {});
        this.resultPages = RESULT_SECTIONS.reduce((pages, section, index) => ({
          ...pages,
          [section]: pageStateFromResponse(pageResponses[index]),
        }), {});
        this.suggestions = [];
        this.lastSearchedKeyword = search;
        this.recordHistory(search);
      } catch (error) {
        if (requestId === this.searchRequestId) {
          this.searchError = '网络开小差了，请稍后再试。';
        }
      } finally {
        if (requestId === this.searchRequestId) {
          this.searchLoading = false;
          this.resultPages = RESULT_SECTIONS.reduce((pages, section) => ({
            ...pages,
            [section]: { ...this.resultPages[section], loading: false },
          }), {});
        }
      }
    },
    async changeResultPage(page) {
      const section = this.activeTab;
      const state = this.resultPages[section];
      const targetPage = Number(page);
      const pageCount = Math.max(1, Math.ceil(state.count / RESULT_PAGE_SIZE));
      if (
        state.loading
        || !Number.isInteger(targetPage)
        || targetPage < 1
        || targetPage > pageCount
      ) return;
      const keyword = this.lastSearchedKeyword || this.keywords.trim();
      if (!keyword) return;
      const requestId = this.resultRequestIds[section] + 1;
      this.resultRequestIds[section] = requestId;
      this.resultPages = {
        ...this.resultPages,
        [section]: { ...state, error: '', loading: true },
      };
      this.scrollToResults();
      try {
        const [response] = await Promise.all([
          RESULT_FETCHERS[section]({
            search: keyword,
            page: targetPage,
            page_size: RESULT_PAGE_SIZE,
          }),
          waitForResultSkeleton(),
        ]);
        if (requestId !== this.resultRequestIds[section]) return;
        this.results = {
          ...this.results,
          [section]: response.results || response || [],
        };
        this.resultPages = {
          ...this.resultPages,
          [section]: pageStateFromResponse(response, targetPage),
        };
      } catch (error) {
        if (requestId === this.resultRequestIds[section]) {
          this.resultPages = {
            ...this.resultPages,
            [section]: {
              ...this.resultPages[section],
              error: '这一页加载失败，请重试。',
            },
          };
        }
      } finally {
        if (requestId === this.resultRequestIds[section]) {
          this.resultPages = {
            ...this.resultPages,
            [section]: { ...this.resultPages[section], loading: false },
          };
        }
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
    scrollToResults() {
      this.resultScrollKey += 1;
    },
    onKeywordInput(value) {
      const keyword = String(value?.detail?.value ?? value ?? '').trim();
      this.keywords = String(value?.detail?.value ?? value ?? '').trim();
      if (!keyword) {
        this.clearSuggestTimer();
        this.suggestRequestId += 1;
        this.suggestions = [];
        RESULT_SECTIONS.forEach((section) => {
          this.resultRequestIds[section] += 1;
        });
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
        return this.groupedFlavors;
      }
      return this.results[section] || [];
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
    pronunciationText(pronunciation) {
      return pronunciation.surface_romanization
        || pronunciation.base_romanization
        || pronunciation.ipa
        || '未标音';
    },
    visibleFlavorPronunciations(item) {
      if (
        (item.pronunciations || []).length > 2
        && !this.expandedFlavorPronunciations.includes(item.id)
      ) {
        return (item.pronunciations || []).slice(0, 2);
      }
      return item.pronunciations || [];
    },
    toggleFlavorPronunciations(item) {
      if (this.expandedFlavorPronunciations.includes(item.id)) {
        this.expandedFlavorPronunciations = this.expandedFlavorPronunciations.filter(
          (id) => id !== item.id,
        );
      } else {
        this.expandedFlavorPronunciations = [
          ...this.expandedFlavorPronunciations,
          item.id,
        ];
      }
    },
    flavorPronunciationToggleText(item) {
      if (this.expandedFlavorPronunciations.includes(item.id)) return '收起';
      return `展开剩余 ${item.pronunciations.length - 2} 个读音`;
    },
    visiblePackageTexts(item) {
      const links = (item.package_links || []);
      const visible = links.length > 2 ? links.slice(0, 2) : links;
      return visible
        .map((link) => link.package?.text || `写法 ${link.package?.id}`)
        .join('、');
    },
    packageTexts(item) {
      return (item.package_links || [])
        .map((link) => link.package?.text || `写法 ${link.package?.id}`)
        .join('、');
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
      if (item.scope === 'flavors') {
        const ids = item.flavor_ids || [item.id];
        openPage(`/pages/flavors/details?id=${ids[0]}&ids=${ids.join(',')}`);
        return;
      }
      const urls = {
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
.search-controls {
  flex: 0 0 auto;
  padding: 28rpx 28rpx var(--space-2);
  border-bottom: 1px solid var(--border-color);
  background: var(--page-color);
  box-sizing: border-box;
}

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

.search-row :deep(.base-button.t-button) {
  min-height: 80rpx;
}

.search-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
  margin-bottom: 0;
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

.result-skeleton-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.result-skeleton-card {
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--surface-color);
}

.result-skeleton-line {
  height: 24rpx;
  margin-bottom: var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--surface-subtle-color);
  animation: result-skeleton-pulse 1.2s ease-in-out infinite;
}

.result-skeleton-line--title {
  width: 42%;
  height: 32rpx;
}

.result-skeleton-line--body {
  width: 76%;
}

.result-skeleton-line--meta {
  width: 58%;
}

.result-skeleton-text {
  color: var(--muted-color);
  font-size: var(--font-size-xs);
  animation: result-skeleton-pulse 1.2s ease-in-out infinite;
}

.result-pagination {
  margin-bottom: var(--space-3);
  padding: var(--space-3);
  border-top: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--surface-color);
  text-align: center;
}

.result-page-summary,
.result-page-end,
.result-page-error {
  display: block;
  color: var(--muted-color);
  font-size: var(--font-size-xs);
}

.result-page-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  margin: var(--space-2) 0;
}

.result-page-error {
  color: var(--danger-color);
}

.result-page-end {
  padding: var(--space-1) 0;
}

@keyframes result-skeleton-pulse {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
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

.flavor-result__meta {
  margin-top: 14rpx;
}

.flavor-result__pronunciation {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  padding: 10rpx 0;
  color: var(--muted-color);
  font-size: var(--font-size-xs);
  border-bottom: 1px solid var(--border-color);
}

.flavor-result__writings {
  margin-top: 12rpx;
  color: var(--accent-color);
  font-size: var(--font-size-xs);
}

.flavor-result__more {
  margin-top: 8rpx;
  color: var(--muted-color);
  font-size: var(--font-size-xs);
}

.flavor-more-button {
  width: 100%;
  margin: 10rpx 0 0;
  padding: 0 var(--space-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  background: var(--surface-subtle-color);
  color: var(--accent-color);
  font-size: var(--font-size-xs);
  line-height: 56rpx;
  transition:
    transform 180ms ease,
    opacity 180ms ease;
}

.flavor-more-button:active {
  opacity: 0.82;
  transform: scale(0.99);
}

.flavor-more-button::after {
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

@media (prefers-reduced-motion: reduce) {
  .search-input,
  .search-button,
  .expand-button,
  .tab,
  .tag {
    transition: none;
  }
  .result-skeleton-line,
  .result-skeleton-text {
    animation: none;
  }
}
</style>
