<template>
  <AppShell
    title="主题集盒"
    active="box"
    action-text="创建"
    @action="openCreate"
  >
    <view class="search-row">
      <BaseField
        v-model="search"
        name="shelf-search"
        label=""
        placeholder="搜索集盒名称"
        aria-role="searchbox"
        aria-label="搜索集盒"
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
      v-if="showCreate"
      class="create-card"
    >
      <view class="form-title">
        新建集盒
      </view>
      <BaseForm
        :data="draft"
        :show-error-message="false"
      >
        <BaseField
          v-model="draft.title"
          name="title"
          label="标题"
          maxlength="120"
          placeholder="标题（必填）"
          required
          :focus="createTitleFocused"
          :disabled="creating"
        />
        <BaseField
          v-model="draft.description"
          name="description"
          label="简介"
          type="textarea"
          placeholder="简介（选填）"
          :disabled="creating"
        />
      </BaseForm>
      <view
        v-if="createError"
        class="field-error"
      >
        {{ createError }}
      </view>
      <view class="form-actions">
        <BaseButton
          variant="light"
          text="取消"
          :disabled="creating"
          @click="closeCreate"
        />
        <BaseButton
          text="创建集盒"
          :disabled="creating"
          :loading="creating"
          @click="submitCreate"
        />
      </view>
    </view>

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
      v-else-if="loadError"
      class="error-state"
    >
      <text>{{ loadError }}</text>
      <BaseButton
        variant="danger-ghost"
        size="small"
        text="重试"
        @click="refresh"
      />
    </view>
    <template v-else>
      <EntityCard
        v-for="item in shelves"
        :key="item.id"
        type="集盒"
        :title="item.title"
        :description="item.description || '暂无简介'"
        :meta="shelfMeta(item)"
        :item="item"
        @open="toDetail(item.id)"
      />
      <SectionBlock
        v-if="!shelves.length"
        :empty="true"
        empty-title="还没有集盒"
        empty-description="创建一个集盒，按主题收纳义项和精选罐头。"
        empty-action-text="创建第一个集盒"
        @empty-action="openCreate"
      />
    </template>
  </AppShell>
</template>

<script>
import AppShell from '@/components/AppShell.vue';
import BaseButton from '@/components/BaseButton.vue';
import BaseField from '@/components/BaseField.vue';
import BaseForm from '@/components/BaseForm.vue';
import EntityCard from '@/components/EntityCard.vue';
import SectionBlock from '@/components/SectionBlock.vue';
import { requireAuth } from '@/services/authGuard';
import { createShelf, listShelves } from '@/services/guantou';
import { goShelfDetail } from '@/services/navigation';

export function createShelfSlug(userId, now = Date.now(), random = Math.random()) {
  const owner = Number(userId) || 0;
  const nonce = Math.floor(random * 0xFFFFFF).toString(36).padStart(5, '0');
  return `user-${owner}-${Number(now).toString(36)}-${nonce}`;
}

function blankDraft() {
  return { title: '', description: '' };
}

export default {
  components: {
    AppShell,
    BaseButton,
    BaseField,
    BaseForm,
    EntityCard,
    SectionBlock,
  },
  data() {
    return {
      createError: '',
      createTitleFocused: false,
      creating: false,
      draft: blankDraft(),
      loadError: '',
      loading: false,
      search: '',
      shelves: [],
      showCreate: false,
    };
  },
  onLoad() {
    this.refresh();
  },
  methods: {
    async refresh() {
      this.loading = true;
      this.loadError = '';
      try {
        const response = await listShelves({ search: this.search.trim() });
        this.shelves = response.results || response || [];
      } catch (error) {
        this.loadError = '集盒加载没有成功，请稍后再试。';
      } finally {
        this.loading = false;
      }
    },
    openCreate() {
      if (!requireAuth('shelf_create', { page: 'shelf_index' })) return;
      this.showCreate = true;
      this.createError = '';
      // #ifdef H5
      this.createTitleFocused = true;
      // #endif
    },
    closeCreate() {
      this.showCreate = false;
      this.createTitleFocused = false;
      this.createError = '';
      this.draft = blankDraft();
    },
    async submitCreate() {
      const title = this.draft.title.trim();
      if (!title) {
        this.createError = '请填写集盒标题';
        return;
      }
      this.creating = true;
      this.createError = '';
      try {
        const shelf = await createShelf({
          title,
          description: this.draft.description.trim(),
          slug: createShelfSlug(uni.getStorageSync('id')),
          shelf_type: 'user',
        });
        this.shelves = [shelf, ...this.shelves.filter((item) => item.id !== shelf.id)];
        this.closeCreate();
        uni.showToast({ title: '集盒已创建', icon: 'success' });
        this.toDetail(shelf.id);
      } catch (error) {
        this.createError = error.data?.title?.message
          || error.data?.slug?.message
          || error.message
          || '创建失败，请重试';
      } finally {
        this.creating = false;
      }
    },
    shelfMeta(item) {
      return `${(item.flavors || []).length} 个义项 · ${(item.cans || []).length} 个罐头`;
    },
    toDetail(id) {
      goShelfDetail(id);
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

.create-card {
  margin-bottom: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--surface-color);
}

.form-title {
  margin-bottom: var(--space-2);
  font-size: 30rpx;
  font-weight: 700;
}

.field-error {
  margin-bottom: 14rpx;
  color: var(--danger-color);
  font-size: var(--font-size-xs);
}

.form-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.form-actions :deep(.t-button) {
  width: 100%;
  margin: 0;
  font-size: var(--font-size-sm);
  transition:
    transform 180ms ease,
    opacity 180ms ease;
}

.form-actions :deep(.t-button:active) {
  opacity: 0.82;
  transform: scale(0.99);
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

@keyframes skeleton-pulse {
  0%,
  100% { opacity: 0.45; }
  50% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .form-actions :deep(.t-button) {
    transition: none;
  }
  .skeleton-line,
  .skeleton-text {
    animation: none;
  }
}
</style>
