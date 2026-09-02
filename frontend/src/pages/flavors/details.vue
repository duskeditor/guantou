<template>
  <PageShell title="义项详情">
    <view
      v-if="loading"
      class="state"
    >
      正在加载义项…
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
    <template v-else-if="flavor">
      <SectionBlock>
        <view class="name">
          {{ flavor.name }}
        </view>
        <view class="definition">
          {{ flavor.definition }}
        </view>
        <view
          v-if="flavorIds.length > 1"
          class="aggregate-note"
        >
          此页合并了 {{ flavorIds.length }} 个同名义项；新增内容会先选择具体义项。
        </view>
      </SectionBlock>

      <SectionBlock
        title="读音变体"
        :empty="!flavor.pronunciations.length"
        empty-title="暂无读音变体"
      >
        <view
          v-for="pronunciation in visiblePronunciations"
          :key="pronunciation.id"
          class="variant"
        >
          <text>{{ pronunciation.dialect ? pronunciation.dialect.qualified_code : '未标方言点' }}</text>
          <text>{{ pronunciationLabel(pronunciation) }}</text>
        </view>
        <button
          v-if="flavor.pronunciations.length > 2"
          class="writing-toggle"
          @tap="showAllPronunciations = !showAllPronunciations"
        >
          {{ showAllPronunciations ? '收起' : `展开剩余 ${flavor.pronunciations.length - 2} 个读音` }}
        </button>
      </SectionBlock>

      <SectionBlock
        title="写法"
        :empty="!flavor.package_links.length"
        empty-title="暂无关联写法"
      >
        <text
          v-for="link in flavor.package_links"
          :key="link.id"
          class="tag"
          @tap="toPackage(link.package.id)"
        >
          {{ link.package.text }}
        </text>
      </SectionBlock>

      <SectionBlock title="相关罐头">
        <CanList
          :fetcher="fetchRelatedCans"
          :scroll="false"
          empty-title="还没有相关罐头"
          empty-description="可以用自己的方言为这个义项补录一版。"
          empty-action-text="补录乡音"
          @open="toCan"
          @empty-action="toCreateForFlavor()"
        />
      </SectionBlock>

      <view class="detail-actions">
        <button
          class="primary-button"
          @tap="toCreateForFlavor()"
        >
          用我的方言录一版
        </button>
        <button
          class="secondary-button"
          @tap="toCreatePronunciation()"
        >
          添加词典读音
        </button>
      </view>
      <view class="action-spacer" />
    </template>
    <EmptyState
      v-else
      title="没有找到这个义项"
      description="可以回到义项图鉴重新选择。"
      action-text="浏览义项"
      @action="toFlavors"
    />
  </PageShell>
</template>

<script>
import CanList from '@/components/CanList.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageShell from '@/components/PageShell.vue';
import SectionBlock from '@/components/SectionBlock.vue';
import { requireAuth } from '@/services/authGuard';
import { getFlavor, listCans, listFlavors } from '@/services/guantou';
import {
  goAtlas,
  goCanDetail,
  goCreateCan,
  goPackageDetail,
  goPronunciationCreate,
} from '@/services/navigation';

export function formatPronunciationLabel(pronunciation) {
  const base = pronunciation.base_romanization;
  const surface = pronunciation.surface_romanization;
  if (base && surface && base !== surface) {
    return `本调 ${base} → 变调 ${surface}`;
  }
  return surface || base || pronunciation.ipa || '未标音';
}

function uniqueById(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function uniqueIds(items) {
  const seen = new Set();
  return (items || []).reduce((ids, value) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) return ids;
    seen.add(id);
    ids.push(id);
    return ids;
  }, []);
}

export default {
  components: {
    CanList,
    EmptyState,
    PageShell,
    SectionBlock,
  },
  data() {
    return {
      flavor: null,
      id: 0,
      ids: [],
      loadError: '',
      loading: false,
      showAllPronunciations: false,
    };
  },
  computed: {
    flavorIds() {
      return this.getFlavorIds();
    },
    visiblePronunciations() {
      const pronunciations = this.flavor?.pronunciations || [];
      if (this.showAllPronunciations || pronunciations.length <= 2) {
        return pronunciations;
      }
      return pronunciations.slice(0, 2);
    },
  },
  async onLoad(options) {
    this.id = options.id;
    this.ids = String(options.ids || '')
      .split(',')
      .map((value) => Number(value))
      .filter(Boolean);
    await this.refresh();
  },
  async onShow() {
    if (this.id && this.flavor) await this.refresh();
  },
  methods: {
    pronunciationLabel: formatPronunciationLabel,
    getFlavorIds() {
      if (this.flavor?.flavor_ids?.length) return uniqueIds(this.flavor.flavor_ids);
      if (this.ids?.length) return uniqueIds(this.ids);
      return uniqueIds([this.id]);
    },
    async refresh() {
      this.loading = !this.flavor;
      this.loadError = '';
      try {
        const primary = await getFlavor(this.id);
        if (this.ids.length > 1) {
          const variants = await Promise.all(
            this.ids.filter((id) => Number(id) !== Number(this.id)).map((id) => getFlavor(id)),
          );
          this.flavor = this.mergeFlavors([primary, ...variants]);
          return;
        }
        const response = await listFlavors({ search: primary.name });
        const variants = (response.results || response || []).filter((item) => (
          String(item.name || '').trim() === String(primary.name || '').trim()
          && String(item.definition || '').trim() === String(primary.definition || '').trim()
        ));
        this.flavor = this.mergeFlavors([primary, ...variants]);
      } catch (error) {
        this.loadError = '义项加载没有成功，请稍后再试。';
      } finally {
        this.loading = false;
      }
    },
    mergeFlavors(items) {
      const validItems = (items || []).filter((item) => item && item.id);
      const pronunciations = [];
      const packageLinks = [];
      validItems.forEach((item) => {
        pronunciations.push(...(item.pronunciations || []));
        packageLinks.push(...(item.package_links || []));
      });
      const flavorIds = uniqueIds(validItems.map((item) => item.id));
      const flavorVariants = flavorIds.map((id) => {
        const item = validItems.find((candidate) => Number(candidate.id) === id);
        return {
          id,
          geo_scope: item?.geo_scope || '',
          created_by: item?.created_by || null,
        };
      });
      return {
        ...(validItems[0] || {}),
        flavor_ids: flavorIds,
        flavor_variants: flavorVariants,
        pronunciations: uniqueById(pronunciations),
        package_links: uniqueById(packageLinks),
      };
    },
    async fetchRelatedCans(params = {}) {
      const flavorIds = this.getFlavorIds();
      const responses = await Promise.all(
        flavorIds.map((flavorId) => listCans({ ...params, flavor_id: flavorId })),
      );
      const results = responses.reduce(
        (items, response) => items.concat(response.results || response || []),
        [],
      );
      return {
        results: uniqueById(results),
        // Each aggregate page fans out to every flavor; pagination cursors cannot
        // be represented by a single CanList cursor, so keep this view bounded.
        next: null,
      };
    },
    flavorTargetLabel(id, index) {
      const variant = (this.flavor?.flavor_variants || []).find(
        (item) => Number(item.id) === Number(id),
      );
      const context = variant?.geo_scope
        || variant?.created_by?.nickname
        || variant?.created_by?.username;
      const descriptor = context ? ` · ${context}` : '';
      return `${this.flavor?.name || '义项'}（义项 #${id}${descriptor || ` · 第 ${index + 1} 个`}）`;
    },
    selectFlavorTarget(onSelected) {
      if (typeof onSelected !== 'function') return;
      const flavorIds = this.getFlavorIds();
      if (flavorIds.length <= 1) {
        if (flavorIds[0]) onSelected(flavorIds[0]);
        return;
      }
      if (typeof uni === 'undefined' || typeof uni.showActionSheet !== 'function') {
        if (typeof uni !== 'undefined' && typeof uni.showToast === 'function') {
          uni.showToast({ title: '请选择具体义项后再操作', icon: 'none' });
        }
        return;
      }
      // For larger aggregates reserve two slots for previous/next navigation;
      // four flavor entries keeps every WeChat request at six items or fewer.
      const pageSize = flavorIds.length > 6 ? 4 : 6;
      const showPage = (page) => {
        const pageCount = Math.ceil(flavorIds.length / pageSize);
        const start = page * pageSize;
        const pageIds = flavorIds.slice(start, start + pageSize);
        const itemList = pageIds.map((id, index) => this.flavorTargetLabel(id, start + index));
        const hasPrevious = page > 0;
        const hasNext = page < pageCount - 1;
        // Keep every request within WeChat's six-item limit. Navigation entries
        // consume slots so that any number of aggregate flavors can be reached.
        if (hasPrevious) itemList.unshift('上一页');
        if (hasNext) itemList.push('下一页');
        uni.showActionSheet({
          itemList,
          success: ({ tapIndex }) => {
            const index = Number(tapIndex);
            if (hasPrevious && index === 0) {
              showPage(page - 1);
              return;
            }
            const flavorIndex = start + index - (hasPrevious ? 1 : 0);
            if (hasNext && index === itemList.length - 1) {
              showPage(page + 1);
              return;
            }
            const selectedId = flavorIds[flavorIndex];
            if (selectedId) onSelected(selectedId);
          },
          fail: () => {
            if (typeof uni.showToast === 'function') {
              uni.showToast({ title: '请选择具体义项后再操作', icon: 'none' });
            }
          },
        });
      };
      showPage(0);
    },
    resolveFlavorTarget(targetId, onSelected) {
      if (typeof onSelected !== 'function') return;
      const flavorIds = this.getFlavorIds();
      const normalizedId = Number(targetId);
      if (Number.isInteger(normalizedId) && flavorIds.includes(normalizedId)) {
        onSelected(normalizedId);
        return;
      }
      this.selectFlavorTarget(onSelected);
    },
    toCan(id) {
      goCanDetail(id);
    },
    toPackage(id) {
      goPackageDetail(id);
    },
    toFlavors() {
      goAtlas();
    },
    toCreateForFlavor(targetId) {
      this.resolveFlavorTarget(targetId, (selectedId) => {
        if (!requireAuth('record_can', {
          page: 'flavor_detail',
          flavorId: selectedId,
          flavorName: this.flavor.name,
        })) return;
        goCreateCan({ flavor: selectedId, flavor_name: this.flavor.name });
      });
    },
    toCreatePronunciation(targetId) {
      this.resolveFlavorTarget(targetId, (selectedId) => {
        if (!requireAuth('pronunciation_create', {
          page: 'flavor_detail',
          flavorId: selectedId,
        })) return;
        goPronunciationCreate(selectedId);
      });
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

.aggregate-note {
  margin-top: var(--space-2);
  color: var(--muted-color);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

.tag {
  display: inline-block;
  margin: 0 12rpx 12rpx 0;
  padding: 8rpx 18rpx;
  background: var(--accent-subtle-color);
  color: var(--accent-color);
  border-radius: var(--radius-pill);
  transition:
    transform 180ms ease,
    opacity 180ms ease;
}

.tag:active {
  opacity: 0.78;
  transform: scale(0.97);
}

.writing-toggle {
  width: 100%;
  margin: 8rpx 0 0;
  padding: 0 var(--space-3);
  border: 1px solid var(--accent-color);
  border-radius: var(--radius-pill);
  background: var(--accent-color);
  color: var(--on-accent-color);
  font-size: var(--font-size-sm);
  line-height: 64rpx;
}

.writing-toggle::after {
  border: 0;
}

.primary-button,
.secondary-button {
  width: 100%;
  min-height: 76rpx;
  font-size: var(--font-size-sm);
  border-radius: var(--radius-sm);
  transition:
    transform 180ms ease,
    opacity 180ms ease;
}

.detail-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  padding: var(--space-2) 28rpx calc(var(--space-2) + env(safe-area-inset-bottom));
  background: var(--surface-color);
  border-top: 1px solid var(--border-color);
  box-sizing: border-box;
}

.detail-actions button {
  margin: 0;
  min-height: 88rpx;
  font-size: var(--font-size-sm);
  line-height: normal;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-spacer {
  height: 150rpx;
}

.primary-button {
  background: var(--accent-color);
  color: var(--on-accent-color);
}

.secondary-button {
  border: 1px solid var(--accent-color);
  background: var(--surface-color);
  color: var(--accent-color);
}

.primary-button:active,
.secondary-button:active {
  opacity: 0.82;
  transform: scale(0.99);
}

.variant {
  display: flex;
  align-items: baseline;
  justify-content: flex-start;
  gap: 20rpx;
  padding: 16rpx 0;
  border-bottom: 1px solid var(--border-color);
}

.state {
  padding: var(--space-5) var(--space-3);
  color: var(--muted-color);
  text-align: center;
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

@media (prefers-reduced-motion: reduce) {
  .tag,
  .primary-button,
  .secondary-button {
    transition: none;
  }
}
</style>
