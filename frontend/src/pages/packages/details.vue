<template>
  <PageShell title="写法详情">
    <view
      v-if="loading"
      class="state"
    >
      正在加载写法…
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
    <template v-else-if="pkg">
      <SectionBlock>
        <view class="name">
          {{ pkg.text }}
        </view>
        <view class="definition">
          {{ packageTypeText }}
        </view>
      </SectionBlock>

      <SectionBlock
        title="关联义项"
        :empty="!pkg.flavors.length"
        empty-title="暂无关联义项"
      >
        <EntityCard
          v-for="flavor in pkg.flavors"
          :key="flavor.id"
          type="义项"
          :title="flavor.name"
          :description="flavor.definition || '暂无释义'"
          :meta="mandarinText(flavor)"
          :item="flavor"
          @open="toFlavor(flavor.id)"
        />
      </SectionBlock>
    </template>
    <EmptyState
      v-else
      title="没有找到这个写法"
      description="可以回到写法图鉴重新选择。"
      action-text="浏览写法"
      @action="toPackages"
    />
  </PageShell>
</template>

<script>
import EmptyState from '@/components/EmptyState.vue';
import EntityCard from '@/components/EntityCard.vue';
import PageShell from '@/components/PageShell.vue';
import SectionBlock from '@/components/SectionBlock.vue';
import { getPackage } from '@/services/guantou';

const packageTypeLabels = {
  orthodox: '正字',
  loan: '借字',
  popular: '俗写',
  phonetic: '拟音',
  romanization: '罗马字',
  uncertain: '不确定',
};

export default {
  components: {
    EmptyState,
    EntityCard,
    PageShell,
    SectionBlock,
  },
  data() {
    return {
      id: 0,
      loadError: '',
      loading: false,
      pkg: null,
    };
  },
  computed: {
    packageTypeText() {
      if (!this.pkg) return '';
      return packageTypeLabels[this.pkg.package_type] || this.pkg.package_type;
    },
  },
  async onLoad(options) {
    this.id = options.id;
    await this.refresh();
  },
  methods: {
    async refresh() {
      this.loading = !this.pkg;
      this.loadError = '';
      try {
        this.pkg = await getPackage(this.id);
      } catch (error) {
        this.loadError = '写法加载失败，请重试';
      } finally {
        this.loading = false;
      }
    },
    mandarinText(flavor) {
      return (flavor.mandarin || []).join(' / ') || '未填写普通话概念';
    },
    toFlavor(id) {
      uni.navigateTo({ url: `/pages/flavors/details?id=${id}` });
    },
    toPackages() {
      uni.navigateTo({ url: '/pages/packages/index' });
    },
  },
};
</script>

<style scoped>
.name {
  font-size: 48rpx;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.definition {
  margin-top: 14rpx;
  color: var(--text-secondary-color);
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
