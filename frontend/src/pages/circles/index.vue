<template>
  <PageShell title="方言圈广场">
    <view class="search-row">
      <BaseField
        v-model="search"
        name="circle-search"
        label=""
        placeholder="搜索方言圈"
        aria-role="searchbox"
        aria-label="搜索方言圈"
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
    <view
      v-if="loading"
      class="result-skeleton-list"
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
          正在加载卡片…
        </text>
      </view>
    </view>
    <view
      v-else-if="error"
      class="state error"
      hover-class="state--pressed"
      @tap="refresh"
    >
      {{ error }}，点此重试
    </view>
    <template v-else>
      <view
        v-for="circle in circles"
        :key="circle.id"
        class="circle-card"
        hover-class="card--pressed"
        @tap="toDetail(circle.id)"
      >
        <view class="circle-copy">
          <view class="circle-title">
            {{ circle.name }}
          </view>
          <view class="circle-description">
            {{ circle.description || `一起记录${circle.dialect.name}乡音。` }}
          </view>
          <view class="circle-meta">
            {{ circle.member_count }} 位成员 · {{ circle.can_count }} 个公开罐头
          </view>
        </view>
        <button
          :class="['join-button', { joined: circle.is_member }]"
          hover-class="join-button--pressed"
          @tap.stop="toggleMembership(circle)"
        >
          {{ circle.is_member ? '已加入' : '加入' }}
        </button>
      </view>
      <EmptyState
        v-if="!circles.length"
        title="还没有匹配的方言圈"
        description="可以换个关键词，或先去图鉴和公开罐头逛逛。"
        action-text="去发现"
        @action="toDiscovery"
      />
    </template>
  </PageShell>
</template>

<script>
import BaseButton from '@/components/BaseButton.vue';
import BaseField from '@/components/BaseField.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageShell from '@/components/PageShell.vue';
import { requireAuth } from '@/services/authGuard';
import { goCircleDetail, goDiscovery } from '@/services/navigation';
import {
  joinCircle, leaveCircle, listCircles,
} from '@/services/guantou';

export default {
  components: {
    BaseButton, BaseField, EmptyState, PageShell,
  },
  data() {
    return {
      circles: [], error: '', loading: false, search: '',
    };
  },
  onLoad() {
    this.refresh();
  },
  methods: {
    async refresh() {
      this.loading = true;
      this.error = '';
      try {
        const response = await listCircles({ search: this.search.trim() });
        this.circles = response.results || response || [];
      } catch (error) {
        this.error = error.message || '方言圈加载失败';
      } finally {
        this.loading = false;
      }
    },
    async toggleMembership(circle) {
      if (!requireAuth('circle_join', { page: 'circle_index', circleId: circle.id })) return;
      const result = circle.is_member
        ? await leaveCircle(circle.id)
        : await joinCircle(circle.id);
      this.circles = this.circles.map((item) => (item.id === circle.id
        ? { ...item, ...result }
        : item));
    },
    toDetail(id) {
      goCircleDetail(id);
    },
    toDiscovery() {
      goDiscovery();
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

.search-button {
  min-height: 80rpx;
  margin: 0;
  padding: 0 var(--space-3);
}

.result-skeleton-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.result-skeleton-card {
  min-height: 170rpx;
  padding: var(--space-3);
  box-sizing: border-box;
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

.result-skeleton-line--title { width: 42%; height: 32rpx; }
.result-skeleton-line--body { width: 76%; }
.result-skeleton-line--meta { width: 58%; }

.result-skeleton-text {
  color: var(--muted-color);
  font-size: var(--font-size-xs);
  animation: result-skeleton-pulse 1.2s ease-in-out infinite;
}

@keyframes result-skeleton-pulse {
  0%,
  100% { opacity: 0.45; }
  50% { opacity: 1; }
}

.circle-card {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--surface-color);
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.circle-copy {
  min-width: 0;
  flex: 1;
}

.circle-title {
  color: var(--text-color);
  font-size: var(--font-size-lg);
  font-weight: 800;
}

.circle-description {
  margin-top: var(--space-1);
  color: var(--text-secondary-color);
  line-height: 1.5;
}

.circle-meta {
  margin-top: var(--space-2);
  color: var(--muted-color);
  font-size: var(--font-size-xs);
}

.join-button {
  width: auto;
  margin: 0;
  padding: 0 var(--space-3);
  border-radius: var(--radius-pill);
  background: var(--accent-color);
  color: var(--on-accent-color);
  font-size: var(--font-size-sm);
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.join-button.joined {
  background: var(--surface-subtle-color);
  color: var(--text-secondary-color);
}

.join-button::after {
  border: 0;
}

.join-button--pressed {
  transform: scale(0.98);
  opacity: 0.9;
}

.state {
  padding: 70rpx var(--space-3);
  color: var(--muted-color);
  text-align: center;
  transition: opacity 0.15s ease;
}

.state.error {
  color: var(--danger-color);
}

.state--pressed,
.card--pressed {
  opacity: 0.7;
}

.card--pressed {
  transform: scale(0.99);
}

@media (prefers-reduced-motion: reduce) {
  .search-button,
  .circle-card,
  .join-button,
  .state {
    transition: none;
  }
}
</style>
