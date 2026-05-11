<template>
  <div v-if="show" ref="rewardPagePanelRef" class="reward-page-panel">
    <div class="reward-page-header">
      <div class="reward-page-header-content">
        <div class="reward-page-title">{{ t('rewardsOverview') }}</div>
        <button type="button" class="icon-button" :title="t('close')" :aria-label="t('close')" @click="emit('close')">
          <Icon name="close" width="16" height="16" class="icon" />
        </button>
      </div>
    </div>

    <div class="reward-section">
      <div class="reward-header">
        <h3 class="reward-title">{{ t('rewardsOverview') }}</h3>
        <div class="reward-level-chip">Lv {{ rewardSnapshot.level }}</div>
      </div>
      <div class="reward-grid">
        <div class="reward-card">
          <div class="reward-card-value">{{ rewardSnapshot.totalXp }}</div>
          <div class="reward-card-label">{{ t('totalXp') }}</div>
        </div>
        <div class="reward-card">
          <div class="reward-card-value">{{ rewardSnapshot.availableCoins }}</div>
          <div class="reward-card-label">{{ t('availableCoins') }}</div>
        </div>
        <div class="reward-card">
          <div class="reward-card-value">{{ rewardSnapshot.badges.length }}</div>
          <div class="reward-card-label">{{ t('badgesCount') }}</div>
        </div>
      </div>
      <div class="reward-progress">
        <div class="reward-progress-bar">
          <span :style="{ width: `${rewardSnapshot.levelProgressPercent}%` }"></span>
        </div>
          {{ t('currentLevelXp', { current: rewardSnapshot.currentLevelXp, next: rewardSnapshot.nextLevelXp }) }}
      </div>
      <div v-if="rewardSnapshot.badges.length > 0" class="reward-badges">
        <div v-for="badge in rewardSnapshot.badges" :key="badge.id" class="reward-badge">
          <span class="reward-badge-icon">{{ badge.icon || 'RG' }}</span>
          <span class="reward-badge-title">{{ badge.title }}</span>
        </div>
      </div>
      <div class="reward-history">
        <div class="reward-history-header">{{ t('recentRewards') }}</div>
        <div v-if="rewardSnapshot.recentEntries.length === 0" class="reward-history-empty">
          {{ t('noRewardsYet') }}
        </div>
        <div v-else class="reward-history-list">
            <div
              v-for="entry in rewardSnapshot.recentEntries"
              :key="entry.id"
              class="reward-history-item"
              :class="{ 'is-highlighted': entry.id === highlightEntryId }"
              :data-reward-entry-id="entry.id"
            >
            <div class="reward-history-main">
              <div class="reward-history-item-title">{{ entry.title }}</div>
              <div v-if="entry.detail" class="reward-history-item-detail">{{ entry.detail }}</div>
            </div>
            <div class="reward-history-points">
              +{{ entry.xp }} {{ t('xp') }}<span v-if="entry.coins > 0"> · +{{ entry.coins }} {{ t('coins') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="shop-section">
      <div class="shop-header">
        <div>
          <h3 class="shop-title">{{ t('rewardsShop') }}</h3>
           <div class="shop-subtitle">{{ t('rewardsShopSubtitle') }}</div>
        </div>
          <button type="button" class="shop-add-btn" @click="openCreateShopItem">
            {{ isShopFormVisible && !editingShopItemId ? t('collapseForm') : t('addReward') }}
          </button>
      </div>

      <div v-if="shopMessage" class="shop-feedback is-success">{{ shopMessage }}</div>
      <div v-if="shopError" class="shop-feedback is-error">{{ shopError }}</div>

      <div v-if="isShopFormVisible && !editingShopItemId" class="shop-form">
        <div class="shop-form-grid">
          <label class="shop-field">
            <span>{{ t('rewardName') }}</span>
            <input v-model="shopForm.title" type="text" maxlength="30" :placeholder="t('rewardNamePlaceholder')" />
          </label>
          <label class="shop-field shop-field-cost">
            <span>{{ t('price') }}</span>
            <input v-model.number="shopForm.cost" type="number" min="1" max="999" />
          </label>
          <label class="shop-field shop-field-icon">
            <span>{{ t('icon') }}</span>
            <button
              type="button"
              class="shop-icon-picker-btn"
               :aria-label="t('switchItemIcon')"
               :title="t('switchItemIcon')"
              @click="openShopIconPicker($event)"
            >
              <span class="shop-icon-picker-display">{{ shopForm.icon || '🎁' }}</span>
            </button>
          </label>
        </div>
        <label class="shop-field">
          <span>{{ t('description') }}</span>
          <textarea v-model="shopForm.description" rows="3" maxlength="120" :placeholder="t('rewardDescriptionPlaceholder')"></textarea>
        </label>
        <div class="shop-form-actions">
          <button type="button" class="shop-form-btn primary" :disabled="shopFormSaving" @click="submitShopForm">
             {{ shopFormSaving ? t('saving') : (editingShopItemId ? t('saveChanges') : t('addReward')) }}
          </button>
          <button type="button" class="shop-form-btn" :disabled="shopFormSaving" @click="resetShopForm">
            {{ t('cancel') }}
          </button>
        </div>
      </div>

      <div v-if="rewardSnapshot.shopItems.length === 0" class="shop-empty">
        {{ t('noShopItemsYet') }}
      </div>
      <div v-else class="shop-grid">
        <div v-for="item in rewardSnapshot.shopItems" :key="item.id" class="shop-card-wrapper">
          <div class="shop-card">
            <div class="shop-card-head">
              <div class="shop-card-icon">{{ item.icon || '🎁' }}</div>
              <div class="shop-card-main">
                <div class="shop-card-title">{{ item.title }}</div>
                <div v-if="item.description" class="shop-card-description">{{ item.description }}</div>
              </div>
               <div class="shop-card-cost">{{ item.cost }} {{ t('coins') }}</div>
            </div>
            <div class="shop-card-actions">
              <button
                type="button"
                class="shop-card-btn primary"
                :disabled="shopActionLoadingId === item.id || rewardSnapshot.availableCoins < item.cost"
                @click="handleRedeem(item)"
              >
                 {{
                  shopActionLoadingId === item.id
                    ? t('redeeming')
                    : (rewardSnapshot.availableCoins >= item.cost ? t('redeem') : t('insufficientCoins'))
                }}
              </button>
              <button type="button" class="shop-card-btn" :disabled="shopActionLoadingId === item.id" @click="startEditShopItem(item)">
                 {{ t('edit') }}
              </button>
              <button type="button" class="shop-card-btn ghost" :disabled="shopActionLoadingId === item.id" @click="handleDeleteShopItem(item)">
                 {{ t('delete') }}
              </button>
            </div>
          </div>
          <div v-if="editingShopItemId === item.id" class="shop-form shop-form-inline">
            <div class="shop-form-grid">
              <label class="shop-field">
                <span>{{ t('rewardName') }}</span>
                <input v-model="shopForm.title" type="text" maxlength="30" :placeholder="t('rewardNamePlaceholder')" />
              </label>
              <label class="shop-field shop-field-cost">
                <span>{{ t('price') }}</span>
                <input v-model.number="shopForm.cost" type="number" min="1" max="999" />
              </label>
              <label class="shop-field shop-field-icon">
                <span>{{ t('icon') }}</span>
                <button
                  type="button"
                  class="shop-icon-picker-btn"
                  :aria-label="t('switchItemIcon')"
                  :title="t('switchItemIcon')"
                  @click="openShopIconPicker($event)"
                >
                  <span class="shop-icon-picker-display">{{ shopForm.icon || '🎁' }}</span>
                </button>
              </label>
            </div>
            <label class="shop-field">
              <span>{{ t('description') }}</span>
              <textarea v-model="shopForm.description" rows="3" maxlength="120" :placeholder="t('rewardDescriptionPlaceholder')"></textarea>
            </label>
            <div class="shop-form-actions">
              <button type="button" class="shop-form-btn primary" :disabled="shopFormSaving" @click="submitShopForm">
                 {{ shopFormSaving ? t('saving') : t('saveChanges') }}
              </button>
              <button type="button" class="shop-form-btn" :disabled="shopFormSaving" @click="resetShopForm">
                 {{ t('cancel') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="shop-redemption-history">
         <div class="shop-redemption-header">{{ t('recentRedemptions') }}</div>
        <div v-if="rewardSnapshot.recentRedemptions.length === 0" class="shop-redemption-empty">
          {{ t('noRedemptionsYet') }}
        </div>
        <div v-else class="shop-redemption-list">
          <div v-for="redemption in rewardSnapshot.recentRedemptions" :key="redemption.id" class="shop-redemption-item">
            <div class="shop-redemption-main">
              <div class="shop-redemption-title">{{ redemption.itemTitle }}</div>
              <div class="shop-redemption-time">{{ formatRedeemedAt(redemption.redeemedAt) }}</div>
            </div>
             <div class="shop-redemption-cost">-{{ redemption.cost }} {{ t('coins') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { t } from '@/utils/i18n';
import { openEmoji } from 'siyuan';
import {
  addRewardShopItem,
  deleteRewardShopItem,
  redeemRewardShopItem,
  updateRewardShopItem,
  type RewardShopItem,
  type RewardSnapshot
} from '@/rewardRepository';
import Icon from './Icon.vue';

interface Props {
  show: boolean;
  rewardSnapshot: RewardSnapshot;
  highlightEntryId?: string;
}

const props = withDefaults(defineProps<Props>(), {
  highlightEntryId: ''
});
const emit = defineEmits<{
  close: [];
}>();

const rewardPagePanelRef = ref<HTMLElement | null>(null);
const isShopFormVisible = ref(false);
const editingShopItemId = ref('');
const shopFormSaving = ref(false);
const shopActionLoadingId = ref('');
const shopMessage = ref('');
const shopError = ref('');
const shopForm = ref({
  title: '',
  description: '',
  cost: 20,
  icon: ''
});

function clearShopMessages(): void {
  shopMessage.value = '';
  shopError.value = '';
}

function resetShopForm(): void {
  isShopFormVisible.value = false;
  editingShopItemId.value = '';
  shopForm.value = {
    title: '',
    description: '',
    cost: 20,
    icon: ''
  };
}

function normalizeEmojiValue(value: string): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) {
    return '';
  }
  if (raw.includes('.') || raw.includes('/')) {
    return raw;
  }
  const hexPattern = /^[0-9a-fA-F]+(-[0-9a-fA-F]+)*$/;
  if (hexPattern.test(raw)) {
    const codePoints = raw.split('-').map(part => parseInt(part, 16));
    if (codePoints.every(point => Number.isFinite(point))) {
      try {
        return String.fromCodePoint(...codePoints);
      } catch {
        return raw;
      }
    }
  }
  return raw;
}

function openShopIconPicker(event: MouseEvent): void {
  const target = event.currentTarget as HTMLElement | null;
  const rect = target ? target.getBoundingClientRect() : null;
  const position = rect
    ? { x: Math.round(rect.left), y: Math.round(rect.bottom) }
    : { x: event.clientX, y: event.clientY };
  openEmoji({
    position,
    selectedCB: (emoji: string) => {
      shopForm.value.icon = normalizeEmojiValue(emoji);
    },
    hideDynamicIcon: true,
    hideCustomIcon: true
  });
}

function openCreateShopItem(): void {
  clearShopMessages();
  if (isShopFormVisible.value && !editingShopItemId.value) {
    resetShopForm();
    return;
  }
  editingShopItemId.value = '';
  shopForm.value = {
    title: '',
    description: '',
    cost: 20,
    icon: ''
  };
  isShopFormVisible.value = true;
}

function startEditShopItem(item: RewardShopItem): void {
  clearShopMessages();
  editingShopItemId.value = item.id;
  shopForm.value = {
    title: item.title,
    description: item.description || '',
    cost: item.cost,
    icon: item.icon || ''
  };
  isShopFormVisible.value = true;
}

async function submitShopForm(): Promise<void> {
  clearShopMessages();
  shopFormSaving.value = true;

  try {
    if (editingShopItemId.value) {
      await updateRewardShopItem(editingShopItemId.value, shopForm.value);
      shopMessage.value = t('rewardItemUpdated');
    } else {
      await addRewardShopItem(shopForm.value);
      shopMessage.value = t('rewardItemAdded');
    }
    resetShopForm();
  } catch (error) {
    shopError.value = error instanceof Error ? error.message : t('saveRewardItemFailed');
  } finally {
    shopFormSaving.value = false;
  }
}

async function handleRedeem(item: RewardShopItem): Promise<void> {
  clearShopMessages();
  if (!confirm(t('confirmRedeem', { cost: item.cost, title: item.title }))) {
    return;
  }

  shopActionLoadingId.value = item.id;
  try {
    await redeemRewardShopItem(item.id);
    shopMessage.value = t('redeemedSuccess', { title: item.title });
  } catch (error) {
    shopError.value = error instanceof Error ? error.message : t('redemptionFailed');
  } finally {
    shopActionLoadingId.value = '';
  }
}

async function handleDeleteShopItem(item: RewardShopItem): Promise<void> {
  clearShopMessages();
  if (!confirm(t('confirmDeleteRewardItem', { title: item.title }))) {
    return;
  }

  shopActionLoadingId.value = item.id;
  try {
    await deleteRewardShopItem(item.id);
    if (editingShopItemId.value === item.id) {
      resetShopForm();
    }
    shopMessage.value = t('rewardItemDeleted');
  } catch (error) {
    shopError.value = error instanceof Error ? error.message : t('deletionFailed');
  } finally {
    shopActionLoadingId.value = '';
  }
}

function formatRedeemedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
}

function scrollToHighlightedEntry(): void {
  if (!props.show || !props.highlightEntryId) {
    return;
  }

  void nextTick(() => {
    const items = rewardPagePanelRef.value?.querySelectorAll<HTMLElement>('[data-reward-entry-id]');
    if (!items || items.length === 0) {
      return;
    }
    const target = Array.from(items).find(item => item.dataset.rewardEntryId === props.highlightEntryId);
    target?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  });
}

watch([() => props.show, () => props.highlightEntryId, () => props.rewardSnapshot.recentEntries.length], ([visible]) => {
  if (!visible) {
    clearShopMessages();
    resetShopForm();
    return;
  }
  scrollToHighlightedEntry();
});
</script>

<style scoped>
.reward-page-panel {
  position: absolute;
  inset: 0;
  z-index: 2;
  box-sizing: border-box;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px;
  --s: 20px;
  --c1: #f18671;
  --c2: #f98f7a;
  --_g: radial-gradient(calc(var(--s) / 2), var(--c1) 97%, #0000);
  background:
    var(--_g), var(--_g) calc(2 * var(--s)) calc(2 * var(--s)),
    repeating-conic-gradient(from 45deg, #0000 0 25%, var(--c2) 0 50%) calc(-0.707 * var(--s)) calc(-0.707 * var(--s)),
    repeating-linear-gradient(135deg, var(--c1) calc(var(--s) / -2) calc(var(--s) / 2), var(--c2) 0 calc(2.328 * var(--s)));
  background-size: calc(4 * var(--s)) calc(4 * var(--s));
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.reward-page-panel::-webkit-scrollbar {
  display: none;
}

.reward-history-item.is-highlighted {
  box-shadow: 0 0 0 2px rgb(255 255 255 / 0.92), 0 16px 30px rgb(242 161 111 / 0.18);
  border-radius: 14px;
  background: rgb(255 255 255 / 0.68);
}

.reward-page-header {
  display: flex;
  flex-direction: column;
  padding-bottom: 10px;
}

.reward-page-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.reward-page-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--b3-theme-background);
}

.reward-section,
.shop-section {
  padding: 16px;
  border-radius: 18px;
  background: var(--b3-theme-background);
  box-shadow: 0 10px 24px rgb(27 92 67 / 0.08);
}

.reward-header,
.shop-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.reward-title,
.shop-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--b3-theme-on-background);
}

.shop-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #7b706b;
  line-height: 1.5;
}

.reward-level-chip {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgb(249 143 122 / 0.12);
  color: #9d5a40;
  font-size: 12px;
  font-weight: 700;
}

.reward-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 12px;
}

.reward-card {
  padding: 12px;
  border-radius: 16px;
  text-align: center;
  background: linear-gradient(135deg, rgb(255 247 236), rgb(255 238 213));
}

.reward-card-value {
  font-size: 24px;
  font-weight: 700;
  color: #8f533e;
}

.reward-card-label {
  margin-top: 4px;
  font-size: 12px;
  color: #9a6a5d;
}

.reward-progress {
  margin-bottom: 14px;
}

.reward-progress-bar {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(111 126 122 / 0.12);
}

.reward-progress-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background:#f98f7a;
}

.reward-progress-text {
  margin-top: 8px;
  font-size: 12px;
  color: #6e5d57;
}

.reward-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.reward-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff7ec, #ffeed5);
  color: #8f533e;
  font-size: 12px;
  font-weight: 600;
}

.reward-badge-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  border-radius: 999px;
  font-size: 14px;
}

.reward-history,
.shop-redemption-history {
  padding-top: 12px;
  border-top: 1px solid rgb(42 147 106 / 0.12);
}

.reward-history-header,
.shop-redemption-header {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--b3-theme-on-background);
}

.reward-history-empty,
.shop-empty,
.shop-redemption-empty {
  font-size: 12px;
  color: #7b706b;
}

.reward-history-list,
.shop-redemption-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reward-history-item,
.shop-redemption-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.reward-history-main,
.shop-redemption-main,
.shop-card-main {
  min-width: 0;
}

.reward-history-item-title,
.shop-redemption-title,
.shop-card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.reward-history-item-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reward-history-item-detail,
.shop-redemption-time,
.shop-card-description {
  margin-top: 2px;
  font-size: 12px;
  color: #7b706b;
}

.reward-history-points,
.shop-redemption-cost,
.shop-card-cost {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  color: #b86f35;
}

.shop-add-btn,
.shop-form-btn,
.shop-card-btn {
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease, background-color 0.15s ease;
}

.shop-add-btn {
  padding: 8px 12px;
  border-radius: 12px;
  background: #f98f7a;
  color: white;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.shop-feedback {
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 12px;
}

.shop-feedback.is-success {
  background: rgb(42 147 106 / 0.1);
  color: #23674e;
}

.shop-feedback.is-error {
  background: rgb(215 80 73 / 0.1);
  color: #9d443b;
}

.shop-form {
  margin-bottom: 14px;
  padding: 14px;
  border-radius: 16px;
  background: rgb(247 249 248);
}

.shop-form-inline {
  margin-top: 12px;
  margin-bottom: 0;
  border: 1px solid rgb(249 143 122 / 0.24);
  box-shadow: 0 4px 12px rgb(249 143 122 / 0.08);
}

.shop-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) 60px 40px;
  gap: 8px;
}

.shop-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}

.shop-field span {
  font-size: 12px;
  font-weight: 600;
  color: #5f6664;
}

.shop-field input,
.shop-field textarea,
.shop-icon-picker-btn {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid rgb(95 102 100 / 0.16);
  border-radius: 12px;
  background: white;
  color: var(--b3-theme-on-background);
  outline: none;
}

.shop-field input:focus,
.shop-field textarea:focus,
.shop-icon-picker-btn:focus {
  border-color: rgb(42 147 106 / 0.46);
}

.shop-icon-picker-btn {
  min-height: 42px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.shop-icon-picker-display {
  font-size: 18px;
  line-height: 1;
}

.shop-form-actions,
.shop-card-actions {
  display: flex;
  gap: 8px;
}

.shop-form-btn,
.shop-card-btn {
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  font-weight: 700;
}

.shop-form-btn.primary {
  background: #f98f7a;
  color: var(--b3-theme-background);
}

.shop-card-btn.primary {
  background: #f98f7a;
  color: var(--b3-theme-background);
}

.shop-card-btn.ghost {
  background: rgb(215 80 73 / 0.1);
  color: #9d443b;
}

.shop-form-btn:disabled,
.shop-card-btn:disabled,
.shop-add-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}

.shop-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.shop-card-wrapper {
  display: flex;
  flex-direction: column;
}

.shop-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgb(255 248 240), rgb(255 242 232));
  border: 1px solid rgb(249 143 122 / 0.12);
}

.shop-card-head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.shop-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgb(255 255 255 / 0.72);
  color: #96553c;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

.shop-card-description {
  line-height: 1.5;
}

.icon-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-button .icon {
  color: var(--b3-theme-background);
}

@media (max-width: 720px) {
  .reward-page-panel .reward-grid,
  .reward-page-panel .shop-grid,
  .reward-page-panel .shop-form-grid {
    grid-template-columns: 1fr;
  }

  .reward-page-panel .shop-header,
  .reward-page-panel .shop-card-head,
  .reward-page-panel .shop-card-actions,
  .reward-page-panel .shop-redemption-item,
  .reward-page-panel .reward-history-item {
    flex-direction: column;
    align-items: stretch;
  }

  .reward-page-panel .shop-card-cost,
  .reward-page-panel .shop-redemption-cost,
  .reward-page-panel .reward-history-points {
    align-self: flex-start;
  }
}
</style>
