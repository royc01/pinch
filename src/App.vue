<template>
  <div class="plugin-app-main">
    <HabitTracker />
  </div>
</template>

<script setup lang="ts">
import HabitTracker from './components/HabitTracker.vue';
</script>


<!-- 局部样式 -->
<style lang="scss" scoped>
.plugin-app-main {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}
</style>

<!-- 全局样式 -->
<style lang="scss">


.row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
</style>