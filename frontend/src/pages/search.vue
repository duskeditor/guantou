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

    <view v-if="!hasSearched">
      <SectionBlock
        v-if="suggestions.length"
        title="联想"
        :empty="!suggestions.length"
        empty-title="暂无联想"
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
        title="搜索失败"
        :description="searchError"
        action-text="重新搜索"
        @action="submitSearch"
      />
      <view
        v-else-if="searchLoading"
        class="search-status"
      >
        正在搜索…
      </view>
      <template v-else-if="totalResults">
        <SectionBlock
          v-if="results.flavors.length"
          title="义项"
        >
          <EntityCard
            v-for="item in results.flavors"
            :key="`flavor-${item.id}`"
            type="义项"
            :title="item.name"
            :description="item.definition"
            :meta="flavorMeta(item)"
            :item="{ ...item, scope: 'flavors' }"
            @open="openItem"
          />
        </SectionBlock>

        <SectionBlock
          v-if="results.packages.length"
          title="写法"
        >
          <EntityCard
            v-for="item in results.packages"
            :key="`package-${item.id}`"
            type="写法"
            :title="item.text"
            description="查看这个写法关联的义项"
            :meta="packageMeta(item)"
            :item="{ ...item, scope: 'packages' }"
            @open="openItem"
          />
        </SectionBlock>

        <SectionBlock
          v-if="results.cans.length"
          title="罐头"
        >
          <CanCard
            v-for="item in results.cans"
            :key="`can-${item.id}`"
            :can="item"
            @open="openCan"
          />
        </SectionBlock>
      </template>
      <SectionBlock
        v-else
        :empty="true"
        empty-title="没有找到结果"
        empty-description="换个写法试试，或者先装一罐。"
        empty-action-text="装一罐"
        @empty-action="toCreateCan"
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
  getNameplate,
  listHotSearches,
  searchGuantou,
  suggestGuantou,
} from '@/services/guantou';
import { defaultMessage } from '@/services/shareMessages';

const SUGGEST_DEBOUNCE_MS = 300;

function emptyResults() {
  return {
    flavors: [],
    packages: [],
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
    };
  },
  computed: {
    totalResults() {
      return (this.results.flavors || []).length
        + (this.results.packages || []).length
        + (this.results.cans || []).length;
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
        this.searchError = '搜索失败，请稍后重试';
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
    packageMeta(item) {
      return `${(item.flavors || []).length} 个义项 · ${item.package_type || 'uncertain'}`;
    },
    openCan(id) {
      uni.navigateTo({ url: `/pages/cans/details?id=${id}` });
    },
    async openItem(item) {
      if (item.scope === 'cans') {
        this.openCan(item.id);
        return;
      }
      if (item.scope === 'nameplates') {
        const nameplate = await getNameplate(item.id);
        this.openCan(nameplate.can.id);
        return;
      }
      const urls = {
        flavors: `/pages/flavors/details?id=${item.id}`,
        packages: `/pages/packages/details?id=${item.id}`,
      };
      uni.navigateTo({ url: urls[item.scope] });
    },
    toCreateCan() {
      uni.navigateTo({ url: '/pages/cans/create' });
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

.search-input {
  box-sizing: border-box;
  min-height: 96rpx;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 0 var(--space-3);
  font-size: var(--font-size-base);
  line-height: 96rpx;
}

.search-button {
  margin: 0;
  min-height: 96rpx;
  line-height: 96rpx;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--accent-color);
  color: var(--on-accent-color);
  font-size: var(--font-size-sm);
}

.search-button::after {
  border: 0;
}

.search-status {
  padding: var(--space-5) var(--space-4);
  color: var(--muted-color);
  text-align: center;
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
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  color: var(--accent-color);
  padding: 12rpx 20rpx;
  font-size: var(--font-size-sm);
}
</style>
