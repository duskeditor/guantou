<template>
  <PageShell
    title="义项图鉴"
    :scroll="true"
    action-text="浏览写法"
    @action="toPackages"
  >
    <view class="search-row">
      <input
        v-model="search"
        class="search"
        placeholder="搜索义项、释义、写法"
        @confirm="refresh"
      >
      <button
        class="small-button"
        @tap="refresh"
      >
        搜索
      </button>
    </view>
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
    <template v-else>
      <EntityCard
        v-for="item in flavors"
        :key="item.id"
        type="义项"
        :title="item.name"
        :description="item.definition"
        :meta="flavorMeta(item)"
        :item="item"
        @open="toDetail(item.id)"
      />
      <SectionBlock
        v-if="!flavors.length"
        :empty="true"
        empty-title="还没有义项"
        empty-description="可以先从搜索或装罐流程里沉淀第一批义项。"
      />
    </template>
  </PageShell>
</template>

<script>
import EntityCard from '@/components/EntityCard.vue';
import PageShell from '@/components/PageShell.vue';
import SectionBlock from '@/components/SectionBlock.vue';
import { listFlavors } from '@/services/guantou';

export default {
  components: {
    EntityCard,
    PageShell,
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
  methods: {
    async refresh() {
      this.loading = !this.flavors.length;
      this.loadError = '';
      try {
        const res = await listFlavors({ search: this.search.trim() });
        this.flavors = res.results || res || [];
      } catch (error) {
        this.loadError = '义项加载失败，请重试';
      } finally {
        this.loading = false;
      }
    },
    flavorMeta(item) {
      return `${(item.pronunciations || []).length} 个读音 · ${(item.package_links || []).length} 个写法`;
    },
    toDetail(id) {
      uni.navigateTo({ url: `/pages/flavors/details?id=${id}` });
    },
    toPackages() {
      uni.navigateTo({ url: '/pages/packages/index' });
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

.search {
  box-sizing: border-box;
  min-height: 96rpx;
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
  padding: 0 var(--space-3);
  line-height: 96rpx;
}

.small-button {
  margin: 0;
  min-height: 96rpx;
  line-height: 96rpx;
  border-radius: var(--radius-pill);
  background: var(--accent-color);
  color: var(--on-accent-color);
  font-size: var(--font-size-sm);
}

.small-button::after {
  border: 0;
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
