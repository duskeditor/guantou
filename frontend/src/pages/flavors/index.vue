<template>
  <AppShell
    title="义项图鉴"
    active="atlas"
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
  </AppShell>
</template>

<script>
import AppShell from '@/components/AppShell.vue';
import EntityCard from '@/components/EntityCard.vue';
import SectionBlock from '@/components/SectionBlock.vue';
import { listFlavors } from '@/services/guantou';
import { goFlavorDetail, goPackageList } from '@/services/navigation';

export default {
  components: {
    AppShell,
    EntityCard,
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
        this.loadError = '义项加载没有成功，请稍后再试。';
      } finally {
        this.loading = false;
      }
    },
    flavorMeta(item) {
      return `${(item.pronunciations || []).length} 个读音 · ${(item.package_links || []).length} 个写法`;
    },
    toDetail(id) {
      goFlavorDetail(id);
    },
    toPackages() {
      goPackageList();
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

.search,
.small-button {
  min-height: 96rpx;
  line-height: 96rpx;
}

.search {
  box-sizing: border-box;
  padding: 0 var(--space-3);
  background: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-pill);
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
