<template>
  <view class="app-shell immersive-shell">
    <view class="app-shell__header">
      <view>
        <view class="app-shell__brand">
          乡声集盒 · FIELD ARCHIVE
        </view>
        <view class="app-shell__title">
          {{ title }}
        </view>
      </view>
      <view class="app-shell__actions">
        <BaseButton
          v-if="actionText"
          size="small"
          variant="light"
          :text="actionText"
          @click="$emit('action')"
        />
        <view
          v-if="$slots['action-suffix']"
          class="app-shell__action-suffix"
          @tap="$emit('action-suffix')"
        >
          <slot name="action-suffix" />
        </view>
      </view>
    </view>
    <scroll-view
      v-if="scroll"
      scroll-y
      class="app-shell__scroll"
      @scrolltolower="$emit('scrolltolower')"
    >
      <view class="app-shell__content">
        <slot />
      </view>
      <view class="app-shell__footer">
        把乡音装进罐头，让每张铭牌都有来处。
      </view>
    </scroll-view>
    <view
      v-else
      class="app-shell__content app-shell__content--fixed"
    >
      <slot />
    </view>
    <HomeTabBar :active="active" />
    <FeedbackHost />
  </view>
</template>

<script>
import BaseButton from '@/components/BaseButton.vue';
import FeedbackHost from '@/components/FeedbackHost.vue';
import HomeTabBar from '@/components/home/HomeTabBar.vue';

export default {
  name: 'AppShell',
  components: {
    BaseButton, FeedbackHost, HomeTabBar,
  },
  props: {
    title: { type: String, required: true },
    active: { type: String, required: true },
    actionText: { type: String, default: '' },
    scroll: { type: Boolean, default: true },
  },
  emits: ['action', 'action-suffix', 'scrolltolower'],
};
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: linear-gradient(
    180deg,
    var(--accent-subtle-color) 0%,
    var(--page-color) 38%,
    var(--surface-subtle-color) 100%
  );
  color: var(--text-color);
}
.app-shell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  padding: calc(28rpx + env(safe-area-inset-top)) 30rpx 28rpx;
  background: linear-gradient(
    145deg,
    var(--immersive-bg-color),
    var(--immersive-bg-strong-color)
  );
  color: var(--on-immersive-color);
  box-shadow: 0 12rpx 40rpx var(--immersive-veil-color);
}
.app-shell__brand {
  color: var(--immersive-accent-color);
  font-size: 18rpx;
  font-weight: 900;
  letter-spacing: 4rpx;
}
.app-shell__title {
  margin-top: 8rpx;
  font-family: STSong, SimSun, serif;
  font-size: 42rpx;
  font-weight: 900;
  letter-spacing: 2rpx;
}

.app-shell__action-suffix {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 52rpx;
  color: var(--on-immersive-color);
  font-size: 38rpx;
}

.app-shell__actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-left: auto;
}
.app-shell__scroll { height: calc(100vh - 116rpx - env(safe-area-inset-top)); }
.app-shell__content {
  min-height: calc(100vh - 300rpx);
  padding: 28rpx 28rpx 170rpx;
  box-sizing: border-box;
}
.app-shell__content--fixed { padding-bottom: 170rpx; }
.app-shell__footer {
  padding: 36rpx 30rpx 180rpx;
  color: var(--muted-color);
  text-align: center;
  font-family: STSong, SimSun, serif;
  font-size: 21rpx;
  letter-spacing: 2rpx;
}
</style>
