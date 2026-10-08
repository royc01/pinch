<template>
  <section class="growth-workbench">
    <header class="growth-workbench-head">
      <h3>{{ t('personalStats.growthTab') }}</h3>
      <small>{{ t('personalStats.growthGlobalScope') }}</small>
      <button type="button" @click="emit('open-manager')">{{ t('personalStats.rewardsPanelLink') }}</button>
    </header>
    <p v-if="loading" class="growth-empty" role="status">{{ t('personalStats.loadingRewards') }}</p>
    <div v-if="error" class="growth-load-error" role="alert"><span>{{ error }}</span><button type="button" :disabled="loading" @click="emit('refresh')">{{ t('personalStats.growthRetry') }}</button></div>
    <div class="growth-card-grid">
      <article class="growth-card growth-level-card">
        <header><strong>{{ t('personalStats.growthLevelTitle') }}</strong><small>{{ t('personalStats.totalLabel') }}</small></header>
        <div class="growth-level-value">Lv.{{ snapshot.level }}</div>
        <small>{{ formatTemplate('personalStats.growthTotalXp', { xp: snapshot.totalXp }) }}</small>
        <div class="growth-progress" role="progressbar" :aria-label="t('personalStats.growthLevelTitle')" :aria-valuenow="levelProgress" aria-valuemin="0" aria-valuemax="100"><span :style="{ width: `${levelProgress}%` }"></span></div>
        <small>{{ formatTemplate('rewardPanel.levelProgressTemplate', { current: snapshot.currentLevelXp, next: snapshot.nextLevelXp }) }}</small>
        <strong class="growth-level-next">{{ formatTemplate('personalStats.growthNextLevel', { xp: Math.max(0, snapshot.nextLevelXp - snapshot.currentLevelXp), level: snapshot.level + 1 }) }}</strong>
        <div class="growth-wallet"><span>{{ t('rewardPanel.availableCoins') }}</span><strong>{{ snapshot.availableCoins }}</strong></div>
      </article>

      <article class="growth-card growth-shop-card">
        <header><strong>{{ t('personalStats.growthShopTitle') }}</strong><small>{{ formatTemplate('personalStats.growthAffordableCount', { count: affordableCount }) }}</small></header>
        <div class="growth-shop-filter" role="group" :aria-label="t('personalStats.growthShopTitle')"><button type="button" :aria-pressed="!affordableOnly" @click="affordableOnly = false; expanded.shop = false">{{ t('personalStats.growthAll') }}</button><button type="button" :aria-pressed="affordableOnly" @click="affordableOnly = true; expanded.shop = false">{{ t('personalStats.growthAffordable') }}</button></div>
        <p v-if="shopSuccess" class="growth-success" role="status">{{ shopSuccess }}</p>
        <p v-if="shopError" class="growth-error" role="alert">{{ shopError }}</p>
        <p v-if="!shopItems.length" class="growth-empty">{{ t(affordableOnly ? 'personalStats.growthNoAffordable' : 'rewardPanel.emptyShop') }}</p>
        <div v-else class="growth-list">
          <div v-for="item in shopItems.slice(0, expanded.shop ? undefined : 5)" :key="item.id" class="growth-item growth-shop-item" :data-shop-item-id="item.id" :aria-busy="pendingItemId === item.id">
            <button type="button" class="growth-item-title" @click="emit('open-manager')"><EmojiIcon class="growth-icon" :value="item.icon" fallback="🎁" aria-hidden="true" /><span>{{ plain(item.title) }}</span></button>
            <small v-if="item.description" class="growth-item-description">{{ plain(item.description) }}</small>
            <div class="growth-item-footer"><small>{{ formatTemplate('personalStats.growthCoinPrice', { coins: item.cost }) }}<span v-if="snapshot.availableCoins < item.cost"> · {{ formatTemplate('personalStats.growthCoinsShort', { coins: item.cost - snapshot.availableCoins }) }}</span></small><button type="button" class="growth-redeem" :disabled="loading || !!pendingItemId || snapshot.availableCoins < item.cost" @click="void redeem(item)">{{ t(pendingItemId === item.id ? 'rewardPanel.redeeming' : 'rewardPanel.redeem') }}</button></div>
          </div>
        </div>
        <button v-if="shopItems.length > 5" type="button" class="growth-list-toggle" :aria-expanded="expanded.shop" @click="expanded.shop = !expanded.shop">{{ toggleLabel(expanded.shop, shopItems.length) }}</button>
      </article>

      <article class="growth-card growth-badges-card">
        <header><strong>{{ t('personalStats.growthBadgesTitle') }}</strong><small>{{ formatTemplate('personalStats.growthBadgeCount', { count: badges.length }) }}</small></header>
        <p v-if="!badges.length" class="growth-empty">{{ t('personalStats.growthNoBadges') }}</p>
        <div v-else class="growth-list">
          <button v-for="badge in badges.slice(0, expanded.badges ? undefined : 5)" :key="badge.id" type="button" class="growth-item growth-badge" :aria-expanded="detailBadgeIds.includes(badge.id)" @click="toggleBadge(badge.id)">
            <span class="growth-item-title"><EmojiIcon class="growth-icon" :value="badge.icon" fallback="🏅" aria-hidden="true" /><span>{{ plain(badge.title) }}</span></span>
            <small>{{ formatTemplate('personalStats.growthBadgeUnlocked', { date: dateLabel(badge.unlockedAt) }) }}</small>
            <small v-if="detailBadgeIds.includes(badge.id)" class="growth-item-description">{{ plain(badge.description) }}</small>
          </button>
        </div>
        <button v-if="badges.length > 5" type="button" class="growth-list-toggle" :aria-expanded="expanded.badges" @click="expanded.badges = !expanded.badges">{{ toggleLabel(expanded.badges, badges.length) }}</button>
      </article>

      <article class="growth-card growth-history-card">
        <header><strong>{{ t('personalStats.growthHistoryTitle') }}</strong><small>{{ t('personalStats.growthRetainedScope') }}</small></header>
        <label class="growth-source-filter"><span>{{ t('personalStats.growthSourceFilter') }}</span><select v-model="sourceFilter" @change="expanded.history = false"><option value="all">{{ t('personalStats.growthAll') }}</option><option v-for="source in sources" :key="source" :value="source">{{ sourceLabel(source) }}</option></select></label>
        <p v-if="!filteredEntries.length" class="growth-empty">{{ t('personalStats.noRewardLedger') }}</p>
        <div v-else class="growth-list">
          <button v-for="entry in filteredEntries.slice(0, expanded.history ? undefined : 5)" :key="entry.id" type="button" class="growth-item growth-history-item" :data-reward-entry-id="entry.id" :aria-expanded="detailEntryIds.includes(entry.id)" @click="toggleEntry(entry.id)">
            <strong class="growth-record-title">{{ entryTitle(entry) }}</strong>
            <span class="growth-item-footer"><small>{{ sourceLabel(entry.source) }} · {{ dateLabel(entry.createdAt) }}</small><strong>{{ rewardLabel(entry.xp, entry.coins) }}</strong></span>
            <small v-if="detailEntryIds.includes(entry.id)" class="growth-item-description">{{ entryDetail(entry) || t('personalStats.growthNoEntryDetail') }}</small>
          </button>
        </div>
        <button v-if="filteredEntries.length > 5" type="button" class="growth-list-toggle" :aria-expanded="expanded.history" @click="expanded.history = !expanded.history">{{ toggleLabel(expanded.history, filteredEntries.length) }}</button>
      </article>
    </div>

    <div class="growth-detail-panels">
      <section class="growth-card growth-period-card">
        <header class="growth-detail-head"><strong>{{ t('personalStats.growthPeriodTitle') }}</strong><small>{{ rangeLabel }} · {{ t('personalStats.growthRetainedScope') }}</small></header>
        <div class="growth-period-metrics"><div><small>{{ t('personalStats.growthEarnedXp') }}</small><strong>{{ period.xp }}</strong></div><div><small>{{ t('personalStats.growthEarnedCoins') }}</small><strong>{{ period.coins }}</strong></div><div><small>{{ t('personalStats.growthRewardEvents') }}</small><strong>{{ period.count }}</strong></div><div><small>{{ t('personalStats.growthActiveDays') }}</small><strong>{{ period.activeDays }}</strong></div></div>
        <div class="growth-source-list"><div v-for="source in period.sources" :key="source.source" class="growth-source-row"><span>{{ sourceLabel(source.source) }}</span><small>{{ formatTemplate('personalStats.growthSourceEvents', { count: source.count }) }}</small><strong>{{ rewardLabel(source.xp, source.coins) }}</strong></div></div>
      </section>
      <section class="growth-card growth-redemptions-card">
        <header class="growth-detail-head"><strong>{{ t('rewardPanel.recentRedemptions') }}</strong><small>{{ t('personalStats.growthRetainedScope') }}</small></header>
        <p v-if="!sortedRedemptions.length" class="growth-empty">{{ t('rewardPanel.emptyRedemptions') }}</p>
        <div v-else class="growth-list"><div v-for="entry in sortedRedemptions.slice(0, expanded.redemptions ? undefined : 5)" :key="entry.id" class="growth-item growth-redemption"><strong>{{ plain(entry.itemTitle) }}</strong><div class="growth-item-footer"><small>{{ dateLabel(entry.redeemedAt) }}</small><strong>{{ formatTemplate('personalStats.growthCoinsSpent', { coins: entry.cost }) }}</strong></div></div></div>
        <button v-if="sortedRedemptions.length > 5" type="button" class="growth-list-toggle" :aria-expanded="expanded.redemptions" @click="expanded.redemptions = !expanded.redemptions">{{ toggleLabel(expanded.redemptions, sortedRedemptions.length) }}</button>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import EmojiIcon from './EmojiIcon.vue';
import { formatTemplate, useI18n } from '@/composables/useI18n';
import { getLocalizedRewardEntryTitle, getLocalizedRewardEntryDetail, redeemRewardShopItem, type RewardSnapshot, type RewardLedgerEntry, type RewardRedemption, type RewardSource, type RewardShopItem } from '@/rewardRepository';
import { getTaskTitlePlainText } from '@/utils/taskHtml';
import { sortGrowthEntries, sortGrowthRedemptions, summarizeGrowthPeriod } from '@/utils/personalStatsGrowth';
import { formatSummaryDateKey } from '@/utils/personalStatsSummary';

const props = defineProps<{ snapshot: RewardSnapshot; entries: RewardLedgerEntry[]; redemptions: RewardRedemption[]; loading: boolean; error: string; rangeLabel: string; startKey: string; endExclusiveKey: string }>();
const emit = defineEmits<{ (event: 'open-manager'): void; (event: 'refresh'): void }>();
const { t } = useI18n();
const plain = getTaskTitlePlainText;
const expanded = ref({ shop: false, badges: false, history: false, redemptions: false });
const sources: RewardSource[] = ['habit', 'task', 'focus', 'system'];
const sourceFilter = ref<'all' | RewardSource>('all');
const affordableOnly = ref(false);
const detailBadgeIds = ref<string[]>([]);
const detailEntryIds = ref<string[]>([]);
const pendingItemId = ref('');
const shopSuccess = ref('');
const shopError = ref('');
const levelProgress = computed(() => Math.max(0, Math.min(100, props.snapshot.levelProgressPercent)));
const affordableCount = computed(() => (props.snapshot.shopItems || []).filter(item => item.cost <= props.snapshot.availableCoins).length);
const shopItems = computed(() => [...(props.snapshot.shopItems || [])].filter(item => !affordableOnly.value || item.cost <= props.snapshot.availableCoins)
  .sort((left, right) => Number(right.cost <= props.snapshot.availableCoins) - Number(left.cost <= props.snapshot.availableCoins) || left.cost - right.cost || left.id.localeCompare(right.id)));
const badges = computed(() => [...props.snapshot.badges].sort((left, right) => (Date.parse(right.unlockedAt) || 0) - (Date.parse(left.unlockedAt) || 0) || left.id.localeCompare(right.id)));
const filteredEntries = computed(() => sortGrowthEntries(props.entries).filter(entry => sourceFilter.value === 'all' || sourceFilter.value === entry.source));
const sortedRedemptions = computed(() => sortGrowthRedemptions(props.redemptions));
const period = computed(() => summarizeGrowthPeriod(props.entries, props.startKey, props.endExclusiveKey));
function sourceLabel(source: RewardSource): string { return t({ habit: 'personalStats.rewardSourceHabit', task: 'personalStats.rewardSourceTask', focus: 'personalStats.rewardSourceFocus', system: 'personalStats.rewardSourceSystem' }[source]); }
function rewardLabel(xp: number, coins: number): string { return `+${xp} ${t('habitTracker.rewardXp')} · +${coins} ${t('habitTracker.rewardCoins')}`; }
function toggleLabel(isExpanded: boolean, count: number): string { return isExpanded ? t('personalStats.collapseCardList') : formatTemplate('personalStats.expandCardListTemplate', { count }); }
function toggleBadge(id: string): void { detailBadgeIds.value = detailBadgeIds.value.includes(id) ? detailBadgeIds.value.filter(item => item !== id) : [...detailBadgeIds.value, id]; }
function toggleEntry(id: string): void { detailEntryIds.value = detailEntryIds.value.includes(id) ? detailEntryIds.value.filter(item => item !== id) : [...detailEntryIds.value, id]; }
function entryTitle(entry: RewardLedgerEntry): string { return plain(getLocalizedRewardEntryTitle(entry) || entry.title); }
function entryDetail(entry: RewardLedgerEntry): string { return plain(getLocalizedRewardEntryDetail(entry) || entry.detail || ''); }
function dateLabel(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? t('personalStats.growthUnknownDate') : `${formatSummaryDateKey(date)} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}
async function redeem(item: RewardShopItem): Promise<void> {
  if (pendingItemId.value || props.loading || props.snapshot.availableCoins < item.cost) return;
  if (!window.confirm(formatTemplate('rewardPanel.redeemConfirmTemplate', { cost: item.cost, title: plain(item.title) }))) return;
  pendingItemId.value = item.id;
  shopSuccess.value = '';
  shopError.value = '';
  try {
    const result = await redeemRewardShopItem(item.id, item.cost);
    shopSuccess.value = formatTemplate('rewardPanel.itemRedeemedTemplate', { title: plain(result.redemption.itemTitle) });
  } catch (error) {
    shopError.value = error instanceof Error ? plain(error.message) : t('rewardPanel.redeemFailed');
    emit('refresh');
  } finally { pendingItemId.value = ''; }
}
</script>

<style scoped>
.growth-workbench { container: growth-workbench / inline-size; }
.growth-workbench-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; margin-bottom: 12px; }
.growth-workbench-head h3 { margin: 0; font-size: 15px; }
.growth-workbench-head > button { margin-left: auto; }
small { color: var(--b3-theme-on-surface-light); font-size: 11px; line-height: 1.5; }
.growth-card-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); align-items: start; gap: 10px; }
.growth-card { display: flex; flex-direction: column; gap: 8px; min-width: 0; padding: 10px; border-radius: 6px; background: var(--b3-list-hover); }
.growth-card > header { display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
.growth-card > header strong { font-weight: 500; }
.growth-level-value { font-size: 26px; font-weight: 600; }
.growth-progress { height: 5px; border-radius: 5px; overflow: hidden; background: var(--b3-theme-background); }
.growth-progress > span { display: block; height: 100%; background: var(--pinch-color1, var(--b3-theme-primary)); }
.growth-level-next { font-size: 12px; font-weight: 500; }
.growth-wallet { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 4px; font-size: 12px; }
.growth-wallet > strong { font-size: 18px; }
.growth-list { display: flex; flex-direction: column; gap: 8px; }
.growth-item { min-width: 0; padding: 8px 10px; border: 0; border-radius: 10px; color: var(--b3-theme-on-background); background: var(--b3-theme-background); box-shadow: var(--pinch-shadow); transition: box-shadow .2s; }
.growth-item:hover { box-shadow: 0 2px 8px rgba(0, 0, 0, .1); }
.growth-item-title { display: flex; align-items: flex-start; gap: 6px; padding: 0; border: 0; color: inherit; background: transparent; font: inherit; font-size: 13px; font-weight: 600; text-align: left; }
.growth-item-title > span:last-child, .growth-record-title { min-width: 0; overflow-wrap: anywhere; }
.growth-icon { flex-shrink: 0; width: 16px; height: 16px; margin-top: 1px; }
.growth-item-description { display: block; margin-top: 4px; overflow-wrap: anywhere; }
.growth-item-footer { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 8px; margin-top: 6px; }
.growth-item-footer > small { flex: 1; min-width: 0; }
.growth-item-footer > strong { font-size: 11px; white-space: nowrap; }
.growth-badge, .growth-history-item { display: flex; flex-direction: column; gap: 4px; text-align: left; font: inherit; }
.growth-record-title, .growth-redemption > strong { font-size: 13px; }
.growth-shop-filter { display: flex; flex-wrap: wrap; gap: 4px; }
.growth-shop-filter [aria-pressed="true"] { color: var(--b3-theme-primary); border-color: var(--b3-theme-primary); }
.growth-source-filter { display: flex; align-items: center; gap: 6px; font-size: 11px; }
.growth-source-filter > select { flex: 1; min-width: 0; }
.growth-workbench-head > button, .growth-item-footer > button, .growth-shop-filter > button, .growth-source-filter > select, .growth-load-error > button { padding: 3px 6px; border: 1px solid var(--b3-border-color); border-radius: 4px; color: var(--b3-theme-on-background); background: var(--b3-theme-background); font: inherit; font-size: 11px; line-height: 1.4; white-space: nowrap; }
button { cursor: pointer; }
button:disabled { cursor: default; opacity: .5; }
button:focus-visible, select:focus-visible { outline: 2px solid var(--pinch-color1, var(--b3-theme-primary)); outline-offset: 2px; }
.growth-empty { margin: 0; padding: 6px 0; color: var(--b3-theme-on-surface-light); font-size: 12px; }
.growth-error, .growth-load-error { color: var(--b3-theme-error); font-size: 12px; }
.growth-error, .growth-success { margin: 0; overflow-wrap: anywhere; }
.growth-success { font-size: 12px; }
.growth-load-error { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.growth-list-toggle { padding: 4px 6px; border: 0; border-radius: 6px; color: var(--b3-theme-on-background); background: var(--b3-list-hover); font: inherit; font-size: 12px; }
.growth-detail-panels { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 12px; margin-top: 14px; }
.growth-card > .growth-detail-head { flex-direction: row; align-items: baseline; flex-wrap: wrap; gap: 6px 12px; }
.growth-period-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
.growth-period-metrics > div { display: flex; flex-direction: column; gap: 4px; padding: 8px; border-radius: 10px; background: var(--b3-theme-background); box-shadow: var(--pinch-shadow); }
.growth-period-metrics strong { font-size: 18px; }
.growth-source-list { display: flex; flex-direction: column; gap: 8px; }
.growth-source-row { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 12px; font-size: 12px; }
.growth-source-row > strong { margin-left: auto; font-size: 11px; }
@container growth-workbench (max-width: 1120px) { .growth-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@container growth-workbench (max-width: 900px) { .growth-detail-panels { grid-template-columns: 1fr; } }
@container growth-workbench (max-width: 640px) { .growth-card-grid { grid-template-columns: 1fr; } .growth-period-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
