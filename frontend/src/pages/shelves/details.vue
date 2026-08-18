<template>
  <PageShell
    title="集盒详情"
    :action-text="canEdit ? (showEditor ? '收起' : '编辑') : ''"
    @action="toggleEditor"
  >
    <view
      v-if="loading"
      class="loading-state"
    >
      正在加载集盒…
    </view>
    <view
      v-else-if="loadError"
      class="load-error"
    >
      <text>{{ loadError }}</text>
      <button @tap="refresh">
        重试
      </button>
    </view>
    <EmptyState
      v-else-if="notFound"
      title="没有找到这个集盒"
      description="它可能已被删除，或者链接有误。"
      action-text="浏览集盒"
      @action="toShelves"
    />
    <template v-else-if="shelf">
      <SectionBlock>
        <view class="name">
          {{ shelf.title }}
        </view>
        <view class="definition">
          {{ shelf.description || '暂无简介' }}
        </view>
      </SectionBlock>

      <SectionBlock
        v-if="canEdit && showEditor"
        title="编辑集盒"
      >
        <input
          v-model="editDraft.title"
          class="field"
          maxlength="120"
          placeholder="集盒标题"
          :focus="editorFocused"
        >
        <textarea
          v-model="editDraft.description"
          class="field textarea"
          placeholder="集盒简介"
        />
        <button
          class="primary-button"
          :disabled="savingMeta"
          @tap="saveMetadata"
        >
          {{ savingMeta ? '保存中…' : '保存标题和简介' }}
        </button>

        <view class="search-block">
          <view class="editor-label">
            搜索并添加义项
          </view>
          <view class="search-row">
            <input
              v-model="flavorSearch"
              class="field search-field"
              confirm-type="search"
              placeholder="义项名称、释义或写法"
              @confirm="findFlavors"
            >
            <button
              class="small-button"
              @tap="findFlavors"
            >
              搜索
            </button>
          </view>
          <view
            v-for="candidate in flavorCandidates"
            :key="candidate.id"
            class="candidate"
          >
            <view class="candidate-copy">
              <text class="candidate-title">
                {{ candidate.name }}
              </text>
              <text class="candidate-description">
                {{ candidate.definition || '暂无释义' }}
              </text>
            </view>
            <button
              class="candidate-button"
              :disabled="contentBusy || hasFlavor(candidate.id)"
              @tap="changeContent('flavor', candidate.id, 'add')"
            >
              {{ hasFlavor(candidate.id) ? '已添加' : '添加' }}
            </button>
          </view>
        </view>

        <view class="search-block">
          <view class="editor-label">
            搜索并添加罐头
          </view>
          <view class="search-row">
            <input
              v-model="canSearch"
              class="field search-field"
              confirm-type="search"
              placeholder="罐头概念或铭牌文字"
              @confirm="findCans"
            >
            <button
              class="small-button"
              @tap="findCans"
            >
              搜索
            </button>
          </view>
          <view
            v-for="candidate in canCandidates"
            :key="candidate.id"
            class="candidate"
          >
            <view class="candidate-copy">
              <text class="candidate-title">
                {{ candidate.concept_text || `罐头 #${candidate.id}` }}
              </text>
              <text class="candidate-description">
                {{ candidate.submitted_dialect?.qualified_code || '未标方言点' }}
              </text>
            </view>
            <button
              class="candidate-button"
              :disabled="contentBusy || hasCan(candidate.id)"
              @tap="changeContent('can', candidate.id, 'add')"
            >
              {{ hasCan(candidate.id) ? '已添加' : '添加' }}
            </button>
          </view>
        </view>
      </SectionBlock>

      <SectionBlock
        title="义项"
        :empty="!shelf.flavors.length"
        empty-title="暂无义项"
      >
        <view
          v-for="flavor in shelf.flavors"
          :key="flavor.id"
          class="content-row"
        >
          <view class="content-card">
            <EntityCard
              type="义项"
              :title="flavor.name"
              :description="flavor.definition || '暂无释义'"
              :item="flavor"
              @open="toFlavor(flavor.id)"
            />
          </view>
          <button
            v-if="canEdit && showEditor"
            class="remove-button"
            :disabled="contentBusy"
            @tap="changeContent('flavor', flavor.id, 'remove')"
          >
            移除
          </button>
        </view>
      </SectionBlock>

      <SectionBlock
        title="罐头"
        :empty="!shelf.cans.length"
        empty-title="暂无罐头"
      >
        <view
          v-for="can in shelf.cans"
          :key="can.id"
          class="content-row can-row"
        >
          <view class="content-card">
            <CanCard
              :can="can"
              @open="toCan"
            />
          </view>
          <button
            v-if="canEdit && showEditor"
            class="remove-button"
            :disabled="contentBusy"
            @tap="changeContent('can', can.id, 'remove')"
          >
            移除
          </button>
        </view>
      </SectionBlock>
    </template>
  </PageShell>
</template>

<script>
import CanCard from '@/components/CanCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import EntityCard from '@/components/EntityCard.vue';
import PageShell from '@/components/PageShell.vue';
import SectionBlock from '@/components/SectionBlock.vue';
import { requireAuth } from '@/services/authGuard';
import {
  getShelf,
  listCans,
  listFlavors,
  updateShelf,
} from '@/services/guantou';

export function shelfCollectionIds(items, targetId, mode) {
  const ids = (items || []).map((item) => Number(item.id));
  const normalizedId = Number(targetId);
  if (mode === 'remove') return ids.filter((id) => id !== normalizedId);
  return [...new Set(ids.concat(normalizedId))];
}

function currentUser() {
  const app = typeof getApp === 'function' ? getApp() : null;
  return {
    id: app?.globalData?.userInfo?.id || uni.getStorageSync('id') || null,
    is_staff: Boolean(app?.globalData?.userInfo?.is_staff),
  };
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
      canCandidates: [],
      canSearch: '',
      contentBusy: false,
      currentUser: currentUser(),
      editDraft: { title: '', description: '' },
      editorFocused: false,
      flavorCandidates: [],
      flavorSearch: '',
      id: 0,
      loadError: '',
      loading: false,
      notFound: false,
      savingMeta: false,
      shelf: null,
      showEditor: false,
    };
  },
  computed: {
    canEdit() {
      if (!this.shelf || !this.currentUser.id) return false;
      return this.currentUser.is_staff
        || Number(this.shelf.creator?.id) === Number(this.currentUser.id);
    },
  },
  async onLoad(options) {
    this.id = Number(options.id);
    await this.refresh();
  },
  onShow() {
    this.currentUser = currentUser();
  },
  methods: {
    async refresh() {
      this.loading = !this.shelf;
      this.loadError = '';
      this.notFound = false;
      try {
        this.shelf = await getShelf(this.id);
        this.editDraft = {
          title: this.shelf.title,
          description: this.shelf.description || '',
        };
      } catch (error) {
        if (Number(error.statusCode) === 404) {
          this.shelf = null;
          this.notFound = true;
        } else {
          this.loadError = '集盒加载失败，请重试';
        }
      } finally {
        this.loading = false;
      }
    },
    toggleEditor() {
      if (!requireAuth('shelf_edit', { shelfId: this.id })) return;
      if (!this.canEdit) return;
      this.showEditor = !this.showEditor;
      // #ifdef H5
      this.editorFocused = this.showEditor;
      // #endif
    },
    async saveMetadata() {
      const title = this.editDraft.title.trim();
      if (!title) {
        uni.showToast({ title: '请填写集盒标题', icon: 'none' });
        return;
      }
      this.savingMeta = true;
      try {
        this.shelf = await updateShelf(this.id, {
          title,
          description: this.editDraft.description.trim(),
        });
        uni.showToast({ title: '集盒已保存', icon: 'success' });
      } catch (error) {
        uni.showToast({ title: error.message || '保存失败', icon: 'none' });
      } finally {
        this.savingMeta = false;
      }
    },
    async findFlavors() {
      const keyword = this.flavorSearch.trim();
      if (!keyword) return;
      try {
        const response = await listFlavors({ search: keyword, page_size: 20 });
        this.flavorCandidates = response.results || response || [];
      } catch (error) {
        uni.showToast({ title: '义项搜索失败', icon: 'none' });
      }
    },
    async findCans() {
      const keyword = this.canSearch.trim();
      if (!keyword) return;
      try {
        const response = await listCans({ search: keyword, page_size: 20 });
        this.canCandidates = response.results || response || [];
      } catch (error) {
        uni.showToast({ title: '罐头搜索失败', icon: 'none' });
      }
    },
    hasFlavor(id) {
      return this.shelf.flavors.some((item) => Number(item.id) === Number(id));
    },
    hasCan(id) {
      return this.shelf.cans.some((item) => Number(item.id) === Number(id));
    },
    async changeContent(kind, id, mode) {
      if (this.contentBusy || !this.canEdit) return;
      this.contentBusy = true;
      try {
        const latest = await getShelf(this.id);
        const collection = kind === 'flavor' ? latest.flavors : latest.cans;
        const field = kind === 'flavor' ? 'flavor_ids' : 'can_ids';
        this.shelf = await updateShelf(this.id, {
          [field]: shelfCollectionIds(collection, id, mode),
        });
        uni.showToast({
          title: mode === 'add' ? '已添加' : '已移除',
          icon: 'success',
        });
      } catch (error) {
        uni.showToast({ title: error.message || '集盒更新失败', icon: 'none' });
      } finally {
        this.contentBusy = false;
      }
    },
    toFlavor(id) {
      uni.navigateTo({ url: `/pages/flavors/details?id=${id}` });
    },
    toCan(id) {
      uni.navigateTo({ url: `/pages/cans/details?id=${id}` });
    },
    toShelves() {
      uni.navigateTo({ url: '/pages/shelves/index' });
    },
  },
};
</script>

<style scoped>
.name {
  font-size: 42rpx;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.definition {
  margin-top: 14rpx;
  color: var(--text-secondary-color);
  line-height: 1.5;
}

.field {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: var(--space-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 18rpx;
  background: var(--surface-color);
}

.textarea {
  min-height: 130rpx;
}

.primary-button,
.small-button {
  margin: 0;
  background: var(--accent-color);
  color: var(--on-accent-color);
  font-size: var(--font-size-sm);
}

.primary-button {
  width: 100%;
}

.search-block {
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-color);
}

.editor-label {
  margin-bottom: 14rpx;
  font-size: 27rpx;
  font-weight: 700;
}

.search-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-2);
}

.search-field {
  margin-bottom: 0;
  min-height: 96rpx;
  padding-top: 0;
  padding-bottom: 0;
  line-height: 96rpx;
}

.small-button {
  min-height: 96rpx;
  line-height: 96rpx;
}

.candidate {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: 14rpx;
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  background: var(--surface-subtle-color);
}

.candidate-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.candidate-title {
  font-weight: 700;
}

.candidate-description {
  margin-top: 6rpx;
  color: var(--muted-color);
  font-size: 23rpx;
}

.candidate-button,
.remove-button {
  flex: 0 0 auto;
  margin: 0;
  font-size: 23rpx;
}

.candidate-button {
  color: var(--accent-color);
}

.content-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.content-card {
  min-width: 0;
  flex: 1;
}

.remove-button {
  color: var(--danger-color);
}

.loading-state {
  padding: var(--space-5) 0;
  text-align: center;
  color: var(--muted-color);
}

.load-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  border-radius: var(--radius-sm);
  background: var(--danger-subtle-color);
  color: var(--danger-color);
}

.load-error button {
  margin: 0;
  background: transparent;
  color: var(--danger-color);
  font-size: var(--font-size-xs);
}

.load-error button::after {
  border: 0;
}

/* #ifdef H5 */
.search-block {
  scroll-margin-top: 110rpx;
}
/* #endif */

/* #ifndef H5 */
.field {
  font-size: 28rpx;
}
/* #endif */
</style>
