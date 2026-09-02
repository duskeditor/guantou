<template>
  <view class="atlas-redirect">
    正在打开写法图鉴…
  </view>
</template>

<script>
import { goPackageList } from '@/services/navigation';

export default {
  onLoad() {
    goPackageList({ replace: true });
  },
};
</script>

<style scoped>
.atlas-redirect {
  min-height: 100vh;
  padding-top: 160rpx;
  box-sizing: border-box;
  background: var(--page-color);
  color: var(--muted-color);
  text-align: center;
}
</style>
