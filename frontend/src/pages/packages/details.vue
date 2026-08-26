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
          v-for="flavor in groupedFlavors"
          :key="flavor.id"
          type="义项"
          :title="flavor.name"
          :description="flavor.definition || '暂无释义'"
          :meta="flavorGroupMeta(flavor)"
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
import { goFlavorDetail, goPackageList } from '@/services/navigation';

const packageTypeLabels = {
  orthodox: '正字',
  loan: '借字',
  popular: '俗写',
  phonetic: '拟音',
  romanization: '罗马字',
  uncertain: '不确定',
};

function flavorGroupKey(item) {
  return `${String(item.name || '').trim()}||${String(item.definition || '').trim()}`;
}

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
    groupedFlavors() {
      const groups = new Map();
      (this.pkg?.flavors || []).forEach((flavor) => {
        const key = flavorGroupKey(flavor);
        if (!groups.has(key)) {
          groups.set(key, {
            id: flavor.id,
            name: flavor.name,
            definition: flavor.definition,
            mandarin: [],
          });
        }
        const group = groups.get(key);
        group.mandarin = [...new Set(group.mandarin.concat(flavor.mandarin || []))];
      });
      return [...groups.values()];
    },
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
        this.loadError = '写法加载没有成功，请稍后再试。';
      } finally {
        this.loading = false;
      }
    },
    flavorGroupMeta(flavor) {
      return (flavor.mandarin || []).join(' / ') || '未填写普通话概念';
    },
    mandarinText(flavor) {
      return (flavor.mandarin || []).join(' / ') || '未填写普通话概念';
    },
    toFlavor(id) {
      goFlavorDetail(id);
    },
    toPackages() {
      goPackageList();
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
</style>
