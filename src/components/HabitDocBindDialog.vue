<template>
  <div v-if="show" class="doc-bind-overlay" @click.self="emit('close')">
    <div class="doc-bind-dialog" @click.stop>
      <div class="doc-bind-header">
        <div class="doc-bind-title">绑定备注文档</div>
        <button type="button" class="icon-button" @click="emit('close')">
          <Icon name="close" width="14" height="14" class="icon" />
        </button>
      </div>
      <div class="doc-bind-body">
        <div class="doc-bind-label">文档 ID</div>
        <input
          :value="docIdInput"
          class="doc-bind-input"
          placeholder="请输入文档 ID，例如 20260222123000-abcdefg"
          @input="handleInput"
        />
      </div>
      <div class="doc-bind-actions">
        <SyButton class="doc-bind-btn plain" @click="emit('close')">取消</SyButton>
        <SyButton class="doc-bind-btn plain" @click="emit('clear')">清除绑定</SyButton>
        <SyButton class="doc-bind-btn confirm" @click="emit('confirm')">保存绑定</SyButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SyButton from '@/components/SiyuanTheme/SyButton.vue';
import Icon from '@/components/Icon.vue';

interface Props {
  show: boolean;
  docIdInput: string;
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
  clear: [];
  confirm: [];
  'update:docIdInput': [value: string];
}>();

function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement | null;
  emit('update:docIdInput', target?.value ?? '');
}
</script>

<style scoped>
.doc-bind-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
}

.doc-bind-dialog {
  width: min(420px, calc(100% - 24px));
  background: var(--b3-theme-background);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.doc-bind-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
}

.doc-bind-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.doc-bind-body {
  padding: 14px;
}

.doc-bind-label {
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  margin-bottom: 8px;
}

.doc-bind-input {
  width: 100%;
  height: 34px;
  border: 1px solid var(--b3-border-color);
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  border-radius: 6px;
  padding: 0 10px;
  box-sizing: border-box;
  outline: none;
}

.doc-bind-input:focus {
  border-color: var(--b3-theme-primary);
}

.doc-bind-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 12px 14px;
}

.doc-bind-btn.plain {
  background: var(--b3-list-hover);
  border: none;
  border-radius: 20px;
  padding: 4px 10px;
}

.doc-bind-btn.confirm {
  background: #f98f7a;
  color: #fff;
  border: none;
  border-radius: 20px;
  padding: 4px 10px;
}

.icon-button {
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-button .icon {
  width: 16px;
  height: 16px;
  color: var(--b3-theme-background);
  fill: var(--b3-theme-background);
}

.icon-button:hover {
  background-color: var(--b3-list-hover);
  border-radius: 4px;
}
</style>
