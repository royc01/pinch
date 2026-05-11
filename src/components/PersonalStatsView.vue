<template>
  <div class="personal-stats-view">
    <section class="stats-hero">
      <div class="stats-hero-copy">
        <h2>{{ t('personalStats') }}</h2>
        <p>
          {{ t('currentlyFocusing', { scope: taskScopeLabel, range: selectedRangeLabel }) }}
        </p>

        <div class="range-switch" role="tablist" :aria-label="t('statsTimeRange')">
          <button
            v-for="option in rangeOptions"
            :key="option.value"
            type="button"
            class="range-chip"
            :class="{ active: selectedRange === option.value }"
            @click="selectedRange = option.value"
          >
            {{ option.label }}
          </button>
        </div>

        <div class="insight-list">
          <article
            v-for="insight in insightCards"
            :key="insight.id"
            class="insight-card"
            :class="insight.tone"
          >
            <svg
              v-if="insight.tone === 'positive' || insight.tone === 'warning'"
              class="insight-card-icon"
              :class="insight.tone"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                :d="
                  insight.tone === 'positive'
                    ? 'M21.92,6.62a1,1,0,0,0-.54-.54A1,1,0,0,0,21,6H16a1,1,0,0,0,0,2h2.59L13,13.59l-3.29-3.3a1,1,0,0,0-1.42,0l-6,6a1,1,0,0,0,0,1.42,1,1,0,0,0,1.42,0L9,12.41l3.29,3.3a1,1,0,0,0,1.42,0L20,9.41V12a1,1,0,0,0,2,0V7A1,1,0,0,0,21.92,6.62Z'
                    : 'M21,11a1,1,0,0,0-1,1v2.59l-6.29-6.3a1,1,0,0,0-1.42,0L9,11.59,3.71,6.29A1,1,0,0,0,2.29,7.71l6,6a1,1,0,0,0,1.42,0L13,10.41,18.59,16H16a1,1,0,0,0,0,2h5a1,1,0,0,0,.38-.08,1,1,0,0,0,.54-.54A1,1,0,0,0,22,17V12A1,1,0,0,0,21,11Z'
                "
              />
            </svg>
            <div class="insight-title">{{ insight.title }}</div>
            <div class="insight-text">{{ insight.text }}</div>
          </article>
        </div>
      </div>

      <div class="stats-hero-grid">
        <article
          v-for="tile in overviewTiles"
          :key="tile.label"
          class="hero-tile"
          :class="tile.tone"
        >
          <div class="hero-tile-label">{{ tile.label }}</div>
          <div class="hero-tile-value">{{ tile.value }}</div>
          <div class="hero-tile-meta">{{ tile.meta }}</div>
        </article>
      </div>
    </section>

    <div class="stats-board">
      <section class="stats-panel tasks-panel" :class="{ 'is-collapsed': !panelOpenState.tasks }">
        <div class="panel-head">
          <div class="task-panel-head-copy">
            <div class="task-panel-head-top">
              <h3>{{ t('taskReview') }}</h3>
              <div class="status-pills task-status-pills">
                <button
                  v-for="item in taskStatusSummary"
                  :key="item.label"
                  type="button"
                  class="status-pill"
                  :class="item.tone"
                  :disabled="!item.payload || item.count === 0"
                  @click="item.payload ? handleDrilldown(item.payload) : undefined"
                >
                  {{ item.label }} {{ item.count }}
                </button>
              </div>
            </div>
            <p>{{ t('reviewHint', { scope: taskScopeLabel }) }}</p>
          </div>
          <div class="panel-head-actions">
            <span class="panel-chip">{{ taskFlowDeltaLabel }}</span>
            <button
              type="button"
              class="panel-toggle-btn"
              :aria-expanded="panelOpenState.tasks"
              @click="togglePanel('tasks')"
            >
              {{ panelOpenState.tasks ? t('collapse') : t('expand') }}
            </button>
          </div>
        </div>

        <div v-show="panelOpenState.tasks" class="panel-body">
          <div v-if="taskTotalCount === 0" class="panel-empty">{{ t('noTaskDataInRange') }}</div>
          <template v-else>
          <div class="mini-stat-grid review-mini-grid">
            <article class="mini-stat-card">
              <span class="mini-stat-label">{{ t('addedInRange', { range: selectedRangeShortLabel }) }}</span>
              <strong class="mini-stat-value">{{ taskCreatedInRangeCount }}</strong>
            </article>
            <article class="mini-stat-card">
              <span class="mini-stat-label">{{ t('completedInRange', { range: selectedRangeShortLabel }) }}</span>
              <strong class="mini-stat-value">{{ taskCompletedInRangeCount }}</strong>
            </article>
            <article class="mini-stat-card">
              <span class="mini-stat-label">{{ t('activeBacklog') }}</span>
              <strong class="mini-stat-value">{{ activeBacklogCount }}</strong>
            </article>
            <article class="mini-stat-card">
              <span class="mini-stat-label">{{ t('overdue') }}</span>
              <strong class="mini-stat-value">{{ overdueTaskCount }}</strong>
            </article>
          </div>

          <div class="review-grid">
            <button
              v-for="action in taskReviewActions"
              :key="action.label"
              type="button"
              class="review-action"
              :disabled="action.disabled"
              @click="handleDrilldown(action.payload)"
            >
              <span class="review-action-label">{{ action.label }}</span>
              <strong class="review-action-value">{{ action.value }}</strong>
              <span class="review-action-meta">{{ action.meta }}</span>
            </button>
          </div>

          <div class="trend-stack">
            <div class="list-block-head">
              <span>{{ t('taskTrendLabel', { range: selectedRangeLabel }) }}</span>
              <span class="list-block-subtle">{{ t('added') }} / {{ t('completed') }}</span>
            </div>

            <div class="task-trend-layout">
              <div class="task-trend-desktop">
              <div class="task-trend-chart">
                <div class="task-trend-chart-head">
                  <div class="task-trend-chart-legend">
                    <span
                      v-for="series in taskTrendDesktopSeries"
                      :key="series.key"
                      class="task-trend-legend-item"
                    >
                      <span class="task-trend-legend-swatch" :class="series.key"></span>
                      <span>{{ series.label }}</span>
                      <strong>{{ series.total }}</strong>
                    </span>
                  </div>
                </div>

                <div class="task-trend-chart-shell">
                  <div class="task-trend-chart-axis">
                    <span
                      v-for="tick in taskTrendDesktopTicks"
                      :key="`task-trend-tick-${tick.value}`"
                    >
                      {{ tick.value }}
                    </span>
                  </div>

                  <div class="task-trend-chart-body">
                    <div class="task-trend-chart-plot">
                      <svg
                      class="task-trend-chart-svg"
                      :viewBox="taskTrendDesktopViewBox"
                      preserveAspectRatio="none"
                      role="img"
                      :aria-label="t('addedVsCompletedTrend')"
                    >
                      <line
                        v-for="tick in taskTrendDesktopTicks"
                        :key="`task-trend-grid-${tick.value}`"
                        class="task-trend-grid-line"
                        x1="0"
                        :y1="tick.y"
                        x2="100"
                        :y2="tick.y"
                      />
                      <path
                        v-for="series in taskTrendDesktopSeries"
                        :key="`task-trend-area-${series.key}`"
                        class="task-trend-area"
                        :class="series.key"
                        :d="series.areaPath"
                      />
                      <path
                        v-for="series in taskTrendDesktopSeries"
                        :key="`task-trend-line-${series.key}`"
                        class="task-trend-line"
                        :class="series.key"
                        :d="series.linePath"
                      />
                      <g
                        v-for="series in taskTrendDesktopSeries"
                        :key="`task-trend-points-${series.key}`"
                      >
                        <circle
                          v-for="point in series.points"
                          :key="`${series.key}-${point.key}`"
                          class="task-trend-point"
                          :class="series.key"
                          :cx="point.x"
                          :cy="point.y"
                          r="1.8"
                        >
                          <title>{{ `${point.label}：${series.label} ${point.count}` }}</title>
                        </circle>
                      </g>
                    </svg>

                    <div class="task-trend-point-layer">
                      <template
                        v-for="series in taskTrendDesktopSeries"
                        :key="`task-trend-points-${series.key}`"
                      >
                        <span
                          v-for="point in series.points"
                          :key="`${series.key}-${point.key}-dot`"
                          class="task-trend-dot"
                          :class="series.key"
                          :style="getTaskTrendPointStyle(point)"
                          :title="`${point.label}・・{series.label} ${point.count}`"
                        ></span>
                      </template>
                    </div>
                    </div>

                        <div class="task-trend-chart-labels" :style="taskTrendColumnsStyle">
                          <div
                            v-for="point in taskTrendDesktopAxisPoints"
                            :key="point.key"
                            class="task-trend-chart-label"
                            :title="t('trendPointTooltip', { label: point.label, created: point.created, completed: point.completed })"
                          >
                            <small>{{ point.label }}</small>
                            <div class="task-trend-chart-values">
                              <span class="task-trend-chart-value created">{{ point.created }}</span>
                              <span class="task-trend-chart-value completed">{{ point.completed }}</span>
                            </div>
                          </div>
                        </div>
                  </div>
                </div>
              </div>
              </div>

              <div class="review-detail-block review-detail-wide task-trend-sidecard">
                <div class="list-block-head">
                  <span>{{ t('comparisonVsLastPeriod') }}</span>
                  <span class="list-block-subtle">{{ t('basedOnComparison') }}</span>
                </div>
                <div class="comparison-grid">
                  <article
                    v-for="item in taskPeriodComparisonCards"
                    :key="item.label"
                    class="comparison-card"
                  >
                    <div class="comparison-label">{{ item.label }}</div>
                    <div class="comparison-value">{{ item.currentValue }}</div>
                    <div class="comparison-meta">{{ item.previousValue }}</div>
                    <div class="comparison-detail">{{ item.detail }}</div>
                    <span class="comparison-delta" :class="item.tone">{{ item.deltaLabel }}</span>
                  </article>
                </div>
              </div>
            </div>

            <div class="task-trend-mobile">
              <div class="mobile-trend-switch" role="tablist" :aria-label="t('taskTrendMetrics')">
                <button
                  v-for="series in taskTrendSections"
                  :key="`mobile-${series.key}`"
                  type="button"
                  class="mobile-trend-chip"
                  :class="{ active: mobileTaskTrendKey === series.key }"
                  :aria-selected="mobileTaskTrendKey === series.key"
                  @click="mobileTaskTrendKey = series.key"
                >
                  {{ series.label }}
                </button>
              </div>

              <div class="mobile-trend-card">
                <div class="mobile-trend-card-head">
                  <span>{{ activeTaskTrendSection.label }}</span>
                  <span class="list-block-subtle">{{ t('viewByPage', { range: selectedRangeShortLabel }) }}</span>
                </div>
                <div class="trend-row mobile-trend-row">
                  <div class="trend-row-bars mobile-trend-bars" :style="taskTrendColumnsStyle">
                    <div
                      v-for="point in activeTaskTrendSection.points"
                      :key="`mobile-${activeTaskTrendSection.key}-${point.key}`"
                      class="trend-row-bar"
                      :title="`${point.label}：${activeTaskTrendSection.label} ${point.count}`"
                    >
                      <span
                        class="trend-row-fill"
                        :class="activeTaskTrendSection.fillClass"
                        :style="getBarStyle(point.count, taskTrendMax)"
                      ></span>
                      <small>{{ point.label }}</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="review-detail-grid">
            <div v-if="false" class="review-detail-block review-detail-wide">
              <div class="list-block-head">
                <span>{{ t('comparisonVsLastPeriod') }}</span>
                <span class="list-block-subtle">{{ t('vsLastPeriod') }}</span>
              </div>
              <div class="comparison-grid">
                <article
                  v-for="item in taskPeriodComparisonCards"
                  :key="item.label"
                  class="comparison-card"
                >
                  <div class="comparison-label">{{ item.label }}</div>
                  <div class="comparison-value">{{ item.currentValue }}</div>
                  <div class="comparison-meta">{{ item.previousValue }}</div>
                  <div class="comparison-detail">{{ item.detail }}</div>
                  <span class="comparison-delta" :class="item.tone">{{ item.deltaLabel }}</span>
                </article>
              </div>
            </div>

            <div class="review-detail-block">
              <div class="list-block-head">
                <span>{{ t('overdueDistribution') }}</span>
                <span class="list-block-subtle">{{ t('tasksOverdue', { count: overdueTaskCount }) }}</span>
              </div>
              <div v-if="overdueDistribution.every(bucket => bucket.count === 0)" class="inline-empty">
                {{ t('noOverdueTasks') }}
              </div>
              <div v-else class="bucket-list">
                <div
                  v-for="bucket in overdueDistribution"
                  :key="bucket.key"
                  class="bucket-item"
                >
                  <div class="bucket-item-head">
                    <span>{{ bucket.label }}</span>
                    <strong>{{ bucket.count }}</strong>
                  </div>
                  <div class="progress-track compact">
                    <span
                      class="progress-fill overdue"
                      :style="{ width: `${bucket.count > 0 ? Math.max(6, Math.round((bucket.count / overdueDistributionMax) * 100)) : 0}%` }"
                    ></span>
                  </div>
                </div>
              </div>
            </div>

            <div class="review-detail-block">
              <div class="list-block-head">
                <span>{{ t('longestStuckTasks') }}</span>
                <span class="list-block-subtle">{{ t('sortByRecentUpdate') }}</span>
              </div>
              <div v-if="longestStuckTasks.length === 0" class="inline-empty">
                {{ t('noStuckTasks') }}
              </div>
              <div v-else class="stuck-list">
                <button
                  v-for="entry in longestStuckTasks"
                  :key="entry.task.id"
                  type="button"
                  class="stuck-item"
                  @click="handleOpenTask(entry.task)"
                >
                  <div class="stuck-main">
                    <div class="stuck-title">{{ entry.title }}</div>
                    <div class="stuck-meta">
                      {{ entry.sourceLabel }} · {{ t('daysUnupdated', { count: entry.daysSinceUpdate }) }}
                      <span v-if="entry.overdueDays > 0"> · {{ t('daysOverdue', { count: entry.overdueDays }) }}</span>
                    </div>
                  </div>
                  <span class="stuck-badge">{{ entry.statusLabel }}</span>
                </button>
              </div>
            </div>

            <div class="review-detail-block">
              <div class="list-block-head">
                <span>{{ t('completionRateByTag') }}</span>
                <span class="list-block-subtle">{{ t('currentTaskPool') }}</span>
              </div>
              <div v-if="tagCompletionRates.length === 0" class="inline-empty">
                {{ t('noTasksWithTags') }}
              </div>
              <div v-else class="rate-list">
                <div
                  v-for="item in tagCompletionRates"
                  :key="item.key"
                  class="rate-item"
                >
                  <div class="rate-item-head">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.rate }}%</strong>
                  </div>
                  <div class="progress-track compact">
                    <span class="progress-fill rate" :style="{ width: `${item.rate > 0 ? Math.max(6, item.rate) : 0}%` }"></span>
                  </div>
                  <div class="rate-item-meta">{{ t('tasksCompletedCount', { completed: item.completed, total: item.total }) }}</div>
                </div>
              </div>
            </div>

            <div class="review-detail-block">
              <div class="list-block-head">
                <span>{{ t('completionRateBySource') }}</span>
                <span class="list-block-subtle">{{ t('currentTaskPool') }}</span>
              </div>
              <div v-if="sourceCompletionRates.length === 0" class="inline-empty">
                {{ t('noSourceToStats') }}
              </div>
              <div v-else class="rate-list">
                <div
                  v-for="item in sourceCompletionRates"
                  :key="item.key"
                  class="rate-item"
                >
                  <div class="rate-item-head">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.rate }}%</strong>
                  </div>
                  <div class="progress-track compact">
                    <span class="progress-fill source" :style="{ width: `${item.rate > 0 ? Math.max(6, item.rate) : 0}%` }"></span>
                  </div>
                  <div class="rate-item-meta">{{ t('tasksCompletedCount', { completed: item.completed, total: item.total }) }}</div>
                </div>
              </div>
            </div>
          </div>
          </template>
        </div>
      </section>

      <section class="stats-panel habits-panel" :class="{ 'is-collapsed': !panelOpenState.habits }">
        <div class="panel-head">
          <div class="panel-head-copy">
            <div class="panel-head-top">
              <h3>{{ t('habits') }}</h3>
              <div class="panel-head-actions">
                <button
                  type="button"
                  class="panel-link-btn"
                  @click="handleOpenDetail({ target: 'habit-total' })"
                >
                  {{ t('habitOverview') }}
                </button>
                <span class="panel-chip">{{ selectedRangeShortLabel }}</span>
                <button
                  type="button"
                  class="panel-toggle-btn"
                  :aria-expanded="panelOpenState.habits"
                  @click="togglePanel('habits')"
                >
                  {{ panelOpenState.habits ? t('collapse') : t('expand') }}
                </button>
              </div>
            </div>
            <p>{{ t('habitReviewHint') }}</p>
          </div>
        </div>

        <div v-show="panelOpenState.habits" class="panel-body">
          <div v-if="habitsLoading" class="panel-empty">{{ t('loadingData') }}</div>
          <template v-else>
          <div v-if="totalHabitsCount === 0" class="panel-empty">{{ t('noHabitsCreated') }}</div>
          <template v-else>
            <div class="mini-stat-grid">
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('activeHabits') }}</span>
                <strong class="mini-stat-value">{{ activeHabitsCount }}</strong>
              </article>
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('habitCompletionsInRange', { range: selectedRangeShortLabel }) }}</span>
                <strong class="mini-stat-value">{{ habitCompletionsInRange }}</strong>
              </article>
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('longestStreak') }}</span>
                <strong class="mini-stat-value">{{ t('daysCountLabel', { count: longestHabitRangeStreak }) }}</strong>
              </article>
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('completionRate') }}</span>
                <strong class="mini-stat-value">{{ habitCompletionRateInRange }}%</strong>
              </article>
            </div>

            <div class="trend-block">
              <div class="list-block-head">
                <span>{{ t('habitTrendLabel', { range: selectedRangeLabel }) }}</span>
                <span class="list-block-subtle">{{ t('groupByCompletions') }}</span>
              </div>
              <div class="trend-bars">
                <div
                  v-for="point in habitTrend"
                  :key="point.key"
                  class="trend-bar-item"
                  :title="t('habitTrendTooltip', { label: point.label, count: point.count })"
                >
                  <span class="trend-bar">
                    <span class="trend-bar-fill habit" :style="getBarStyle(point.count, habitTrendMax)"></span>
                  </span>
                  <span class="trend-bar-value">{{ point.count }}</span>
                  <span class="trend-bar-label">{{ point.label }}</span>
                </div>
              </div>
            </div>

            <div class="list-block">
              <div class="list-block-head">
                <span>{{ t('bestPerformers') }}</span>
                <span class="list-block-subtle">{{ t('sortByCompletionsAndRate') }}</span>
              </div>
              <div class="rank-list">
                <button
                  v-for="habit in topHabits"
                  :key="habit.id"
                  class="rank-item"
                  type="button"
                  @click="handleOpenDetail({ target: 'habit-detail', habitId: habit.id })"
                >
                  <div class="rank-main">
                    <span class="rank-emoji">{{ habit.emoji || '📝' }}</span>
                    <div>
                      <div class="rank-title">{{ habit.name }}</div>
                      <div class="rank-meta">{{ t('completionsAndRate', { count: habit.completions, rate: habit.rate }) }}</div>
                    </div>
                  </div>
                  <span class="rank-badge">{{ t('daysCountLabel', { count: habit.streak }) }}</span>
                </button>
              </div>
            </div>
          </template>
          </template>
        </div>
      </section>

      <section class="stats-panel focus-panel" :class="{ 'is-collapsed': !panelOpenState.focus }">
        <div class="panel-head">
          <div class="panel-head-copy">
            <div class="panel-head-top">
              <h3>{{ t('focus') }}</h3>
              <div class="panel-head-actions">
                <span class="panel-chip">{{ selectedRangeShortLabel }}</span>
                <button
                  type="button"
                  class="panel-toggle-btn"
                  :aria-expanded="panelOpenState.focus"
                  @click="togglePanel('focus')"
                >
                  {{ panelOpenState.focus ? t('collapse') : t('expand') }}
                </button>
              </div>
            </div>
            <p>{{ t('focusReviewHint') }}</p>
          </div>
        </div>

        <div v-show="panelOpenState.focus" class="panel-body">
          <div v-if="focusLoading" class="panel-empty">{{ t('loadingData') }}</div>
          <template v-else>
          <div v-if="focusSessionsInRange === 0" class="panel-empty">{{ t('noFocusSessionsInRange') }}</div>
          <template v-else>
            <div class="mini-stat-grid">
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('focusDurationInRange', { range: selectedRangeShortLabel }) }}</span>
                <strong class="mini-stat-value">{{ formatMinutes(focusMinutesInRange) }}</strong>
              </article>
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('focusSessionsInRangeLabel', { range: selectedRangeShortLabel }) }}</span>
                <strong class="mini-stat-value">{{ focusSessionsInRange }}</strong>
              </article>
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('activeDays') }}</span>
                <strong class="mini-stat-value">{{ focusActiveDaysInRange }}</strong>
              </article>
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('averagePerSession') }}</span>
                <strong class="mini-stat-value">{{ formatMinutes(focusAverageMinutesPerSession) }}</strong>
              </article>
            </div>

             <div class="trend-block">
                <div class="list-block-head">
                  <span>{{ t('focusTrendLabel', { range: selectedRangeLabel }) }}</span>
                  <span class="list-block-subtle">{{ t('groupByMinutes') }}</span>
                </div>
              <div class="trend-bars">
                <div
                  v-for="point in focusTrend"
                  :key="point.key"
                  class="trend-bar-item"
                  :title="t('focusTrendTooltip', { label: point.label, count: point.count })"
                >
                  <span class="trend-bar">
                    <span class="trend-bar-fill focus" :style="getBarStyle(point.count, focusTrendMax)"></span>
                 </span>
                 <span class="trend-bar-value">{{ point.count }}</span>
                 <span class="trend-bar-label">{{ point.label }}</span>
               </div>
             </div>
           </div>

            <div class="review-detail-grid focus-association-grid">
              <div class="review-detail-block">
                <div class="list-block-head">
                  <span>{{ t('topHabitFocus') }}</span>
                  <span class="list-block-subtle">{{ t('itemsCount', { count: focusTopHabits.length }) }}</span>
                </div>
                <div v-if="focusTopHabits.length === 0" class="inline-empty">
                  {{ t('noHabitFocusInRange') }}
                </div>
                <div v-else class="rate-list">
                  <button
                    v-for="item in focusTopHabits"
                    :key="item.key"
                    type="button"
                    class="focus-target-item"
                    :disabled="!canOpenFocusTarget(item)"
                    @click="handleOpenFocusTarget(item)"
                  >
                    <div class="focus-target-main">
                      <div class="focus-target-title">
                        <span v-if="item.emoji" class="focus-target-emoji">{{ item.emoji }}</span>
                        <span>{{ item.name }}</span>
                      </div>
                      <div class="focus-target-meta">{{ t('sessionsCount', { count: item.sessions }) }}</div>
                    </div>
                    <div class="focus-target-side">
                      <strong class="focus-target-badge">{{ formatMinutes(item.minutes) }}</strong>
                      <div class="progress-track compact">
                        <span
                          class="progress-fill focus-target"
                          :style="{ width: `${Math.max(6, Math.round((item.minutes / focusTargetMinutesMax) * 100))}%` }"
                        ></span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div class="review-detail-block">
                <div class="list-block-head">
                  <span>{{ t('topTaskFocus') }}</span>
                  <span class="list-block-subtle">{{ t('itemsCount', { count: focusTopTasks.length }) }}</span>
                </div>
                <div v-if="focusTopTasks.length === 0" class="inline-empty">
                  {{ t('noTaskFocusInRange') }}
                </div>
                <div v-else class="rate-list">
                  <button
                    v-for="item in focusTopTasks"
                    :key="item.key"
                    type="button"
                    class="focus-target-item"
                    :disabled="!canOpenFocusTarget(item)"
                    @click="handleOpenFocusTarget(item)"
                  >
                    <div class="focus-target-main">
                      <div class="focus-target-title">{{ item.name }}</div>
                      <div class="focus-target-meta">{{ t('sessionsCount', { count: item.sessions }) }}</div>
                    </div>
                    <div class="focus-target-side">
                      <strong class="focus-target-badge">{{ formatMinutes(item.minutes) }}</strong>
                      <div class="progress-track compact">
                        <span
                          class="progress-fill focus-target"
                          :style="{ width: `${Math.max(6, Math.round((item.minutes / focusTargetMinutesMax) * 100))}%` }"
                        ></span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </template>
          </template>
        </div>
      </section>

      <section class="stats-panel rewards-panel" :class="{ 'is-collapsed': !panelOpenState.rewards }">
        <div class="panel-head">
          <div class="panel-head-copy">
            <div class="panel-head-top">
              <h3>{{ t('rewards') }}</h3>
              <div class="panel-head-actions">
                <button
                  type="button"
                  class="panel-link-btn"
                  @click="handleOpenDetail({ target: 'reward' })"
                >
                  {{ t('rewardPanel') }}
                </button>
                <span class="panel-chip">{{ t('cumulative') }}</span>
                <button
                  type="button"
                  class="panel-toggle-btn"
                  :aria-expanded="panelOpenState.rewards"
                  @click="togglePanel('rewards')"
                >
                  {{ panelOpenState.rewards ? t('collapse') : t('expand') }}
                </button>
              </div>
            </div>
            <p>{{ t('rewardReviewHint') }}</p>
          </div>
        </div>

        <div v-show="panelOpenState.rewards" class="panel-body">
          <div v-if="rewardsLoading" class="panel-empty">{{ t('loadingData') }}</div>
          <template v-else>
          <div v-if="rewardSnapshot.ledgerCount === 0" class="panel-empty">{{ t('noRewardHistory') }}</div>
          <template v-else>
            <div class="mini-stat-grid">
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('totalFragments') }}</span>
                <strong class="mini-stat-value">{{ rewardSnapshot.totalXp }}</strong>
              </article>
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('availableCoins') }}</span>
                <strong class="mini-stat-value">{{ rewardSnapshot.availableCoins }}</strong>
              </article>
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('badges') }}</span>
                <strong class="mini-stat-value">{{ rewardSnapshot.badges.length }}</strong>
              </article>
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('rewardHistory') }}</span>
                <strong class="mini-stat-value">{{ rewardSnapshot.ledgerCount }}</strong>
              </article>
            </div>

              <div class="progress-block">
                <div class="list-block-head">
                  <span>{{ t('levelProgress') }}</span>
                  <span class="list-block-subtle">{{ t('fragmentsProgress', { current: rewardSnapshot.currentLevelXp, next: rewardSnapshot.nextLevelXp }) }}</span>
                </div>
                <div class="progress-track">
                  <span class="progress-fill reward" :style="{ width: `${rewardSnapshot.levelProgressPercent}%` }"></span>
              </div>
            </div>

            <div class="list-block">
              <div class="list-block-head">
                <span>{{ t('recentRewards') }}</span>
                <span class="list-block-subtle">{{ t('recentEntriesCount', { count: rewardSnapshot.recentEntries.length }) }}</span>
              </div>
              <div class="event-list">
                <button
                  v-for="entry in rewardSnapshot.recentEntries.slice(0, 4)"
                  :key="entry.id"
                  class="event-item"
                  type="button"
                  @click="handleOpenDetail({ target: 'reward', rewardEntryId: entry.id })"
                >
                  <div>
                    <div class="event-title">{{ entry.title }}</div>
                    <div class="event-meta">{{ getRewardSourceText(entry.source) }}</div>
                  </div>
                  <span class="event-points">{{ t('xpFragments', { count: entry.xp }) }}</span>
                </button>
              </div>
            </div>
          </template>
          </template>
        </div>
      </section>

      <section class="stats-panel goals-panel" :class="{ 'is-collapsed': !panelOpenState.goals }">
        <div class="panel-head">
          <div class="panel-head-copy">
            <div class="panel-head-top">
              <h3>{{ t('goals') }}</h3>
              <div class="panel-head-actions">
                <button
                  type="button"
                  class="panel-link-btn"
                  @click="handleOpenDetail({ target: 'goal' })"
                >
                  {{ t('goalPanel') }}
                </button>
                <span class="panel-chip">{{ t('completedGoalsCount', { completed: completedGoalCount, total: goalItems.length }) }}</span>
                <button
                  type="button"
                  class="panel-toggle-btn"
                  :aria-expanded="panelOpenState.goals"
                  @click="togglePanel('goals')"
                >
                  {{ panelOpenState.goals ? t('collapse') : t('expand') }}
                </button>
              </div>
            </div>
            <p>{{ t('goalGlobalViewHint') }}</p>
          </div>
        </div>

        <div v-show="panelOpenState.goals" class="panel-body">
          <div v-if="goalItems.length === 0" class="panel-empty">{{ t('noGoalsCreated') }}</div>
          <template v-else>
          <div class="mini-stat-grid">
            <article class="mini-stat-card">
              <span class="mini-stat-label">{{ t('inProgress') }}</span>
              <strong class="mini-stat-value">{{ inProgressGoalCount }}</strong>
            </article>
            <article class="mini-stat-card">
              <span class="mini-stat-label">{{ t('completed') }}</span>
              <strong class="mini-stat-value">{{ completedGoalCount }}</strong>
            </article>
            <article class="mini-stat-card">
              <span class="mini-stat-label">{{ t('toBeStarted') }}</span>
              <strong class="mini-stat-value">{{ emptyGoalCount }}</strong>
            </article>
            <article class="mini-stat-card">
              <span class="mini-stat-label">{{ t('averageProgress') }}</span>
              <strong class="mini-stat-value">{{ averageGoalProgress }}%</strong>
            </article>
          </div>

          <div class="goal-list">
            <button
              v-for="goal in featuredGoals"
              :key="goal.id"
              class="goal-item"
              type="button"
              @click="void handleOpenGoalKanban(goal)"
            >
              <div class="goal-item-head">
                <div>
                  <div class="goal-item-title">{{ goal.name }}</div>
                  <div class="goal-item-meta">{{ getGoalStatusText(goal.status) }}</div>
                </div>
                <span class="goal-item-value">{{ goal.progressPercent }}%</span>
              </div>
              <div class="progress-track">
                <span class="progress-fill goal" :style="{ width: `${goal.progressPercent}%` }"></span>
              </div>
              <div class="goal-item-foot">
                <span>{{ t('tasksCountLabel', { count: goal.completedTasks }) }}/{{ goal.totalTasks }}</span>
                <span>{{ t('docsCountLabel', { count: goal.documentCount }) }}</span>
              </div>
            </button>
          </div>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { t } from '@/utils/i18n';
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';
import {
  getFocusTimerData,
  getHabits,
  openBlockById,
  type DailyFocusRecord,
  type FocusSessionRecord,
  type Habit,
  type Task
} from '@/api';
import type { GoalListItem } from '@/composables/useGoals';
import { getWeekStart, getWeeklyTarget } from '@/composables/useHabitUtils';
import { createEmptyRewardSnapshot, getRewardSnapshot, type RewardSnapshot, type RewardSource } from '@/rewardRepository';
import { eventBus, Events } from '@/utils/eventBus';
import { openTaskViewByRequest } from '@/main';
import { buildGoalDocumentSource } from '@/utils/documentGroupSource';

type StatsRangeKey = 'today' | '7d' | '30d' | 'month';
type StatsPanelKey = 'tasks' | 'habits' | 'focus' | 'rewards' | 'goals';
type StatsDueFilterKey = 'overdue' | 'today' | 'next7Days' | 'noDueDate';
type StatsUpdatedFilterKey = 'today' | 'thisWeek' | 'thisMonth';
type TaskTrendMetricKey = 'created' | 'completed' | 'archived';

interface StatsDrilldownPayload {
  title: string;
  target?: 'table' | 'archive-table';
  statuses?: Task['status'][];
  due?: StatsDueFilterKey;
  updated?: StatsUpdatedFilterKey;
  includeCompleted?: boolean;
}

interface StatsDetailPayload {
  target: 'habit-total' | 'habit-detail' | 'reward' | 'goal';
  habitId?: string;
  goalId?: string;
  rewardEntryId?: string;
}

interface TrendPoint {
  key: string;
  label: string;
  count: number;
}

interface DatePoint {
  key: string;
  label: string;
}

interface DateBin {
  key: string;
  label: string;
  dayKeys: string[];
}

interface RangeWindow {
  key: StatsRangeKey;
  label: string;
  shortLabel: string;
  start: Date;
  endExclusive: Date;
  startKey: string;
  endExclusiveKey: string;
  dayCount: number;
}

interface HabitRangeSummary {
  id: string;
  name: string;
  emoji?: string;
  completions: number;
  target: number;
  rate: number;
  streak: number;
  createdAt: string;
}

interface InsightCard {
  id: string;
  title: string;
  text: string;
  tone: 'positive' | 'warning' | 'neutral';
}

interface TaskPeriodComparisonCard {
  label: string;
  currentValue: string;
  previousValue: string;
  deltaLabel: string;
  detail: string;
  tone: 'up' | 'down' | 'flat';
}

interface OverdueBucket {
  key: string;
  label: string;
  count: number;
}

interface StuckTaskEntry {
  task: Task;
  title: string;
  sourceLabel: string;
  daysSinceUpdate: number;
  overdueDays: number;
  statusLabel: string;
}

interface CompletionRateItem {
  key: string;
  label: string;
  total: number;
  completed: number;
  rate: number;
}

interface FocusTargetSummary {
  key: string;
  type: 'habit' | 'task';
  targetId?: string;
  targetBlockId?: string;
  name: string;
  emoji?: string;
  minutes: number;
  sessions: number;
}

type StatsPanelState = Record<StatsPanelKey, boolean>;

interface TaskTrendSection {
  key: TaskTrendMetricKey;
  label: string;
  fillClass: TaskTrendMetricKey;
  points: TrendPoint[];
}

type DesktopTaskTrendKey = Extract<TaskTrendMetricKey, 'created' | 'completed'>;

interface TaskTrendDesktopPoint extends TrendPoint {
  x: number;
  y: number;
}

interface TaskTrendDesktopSeries {
  key: DesktopTaskTrendKey;
  label: string;
  total: number;
  points: TaskTrendDesktopPoint[];
  linePath: string;
  areaPath: string;
}

interface TaskTrendDesktopTick {
  value: number;
  y: number;
}

interface TaskTrendDesktopAxisPoint {
  key: string;
  label: string;
  created: number;
  completed: number;
}

const TASK_TREND_CHART_VIEWBOX_WIDTH = 100;
const TASK_TREND_CHART_VIEWBOX_HEIGHT = 72;

const STATS_RANGE_STORAGE_KEY = 'pinch.personal-stats.range';
const STATS_PANEL_STATE_STORAGE_KEY = 'pinch.personal-stats.panels';
const statsPanelKeys: StatsPanelKey[] = ['tasks', 'habits', 'focus', 'rewards', 'goals'];

const props = withDefaults(defineProps<{
  tasks: Task[];
  goalItems: GoalListItem[];
  sourceLabel?: string;
  documentLabel?: string;
}>(), {
  sourceLabel: t('all'),
  documentLabel: t('all')
});

const emit = defineEmits<{
  (event: 'drilldown', payload: StatsDrilldownPayload): void;
  (event: 'open-detail', payload: StatsDetailPayload): void;
}>();

const rangeOptions: Array<{ value: StatsRangeKey; label: string }> = [
  { value: 'today', label: t('statRangeToday') },
  { value: '7d', label: t('statRange7d') },
  { value: '30d', label: t('statRange30d') },
  { value: 'month', label: t('statRangeMonth') }
];

const selectedRange = ref<StatsRangeKey>(loadSavedStatsRange());
const panelOpenState = ref<StatsPanelState>(loadSavedPanelState());
const mobileTaskTrendKey = ref<TaskTrendMetricKey>('created');
const habits = shallowRef<Habit[]>([]);
const focusRecords = shallowRef<DailyFocusRecord[]>([]);
const focusSessionRecords = shallowRef<FocusSessionRecord[]>([]);
const habitsLoading = ref(false);
const focusLoading = ref(false);
const rewardsLoading = ref(false);
const rewardSnapshot = ref<RewardSnapshot>(createEmptyRewardSnapshot());

const taskScopeLabel = computed(() =>
  props.documentLabel && props.documentLabel !== t('all')
    ? `${props.sourceLabel} / ${props.documentLabel}`
    : props.sourceLabel || t('all')
);

const todayKey = computed(() => formatLocalDateKey(startOfDay(new Date())));
const currentRange = computed(() => buildCurrentRangeWindow(selectedRange.value));
const previousRange = computed(() => buildPreviousRangeWindow(currentRange.value));
const rangeDays = computed(() => buildDatePoints(currentRange.value.start, currentRange.value.endExclusive));
const rangeBins = computed(() => buildDateBins(rangeDays.value, 8));

const selectedRangeLabel = computed(() => currentRange.value.label);
const selectedRangeShortLabel = computed(() => currentRange.value.shortLabel);

const scopedTasks = computed(() =>
  props.tasks.filter(task => task.type === 'block' && task.isVirtual !== true)
);
const liveScopedTasks = computed(() =>
  scopedTasks.value.filter(task => task.archived !== true)
);
const taskTotalCount = computed(() => scopedTasks.value.length);
const activeBacklogCount = computed(() =>
  liveScopedTasks.value.filter(task =>
    task.status === 'pending'
    || task.status === 'in-progress'
    || task.status === 'delayed'
  ).length
);
const overdueTaskCount = computed(() =>
  liveScopedTasks.value.filter(task =>
    task.status !== 'completed'
    && task.status !== 'cancelled'
    && typeof task.dueDate === 'string'
    && task.dueDate < todayKey.value
  ).length
);
const archivedTaskCount = computed(() =>
  scopedTasks.value.filter(task => task.archived === true).length
);

const taskCreatedInRangeCount = computed(() =>
  countTasksByField(scopedTasks.value, 'createdAt', currentRange.value)
);
const taskCompletedInRangeCount = computed(() =>
  countTasksByField(scopedTasks.value, 'completedAt', currentRange.value)
);
const taskCreatedPreviousCount = computed(() =>
  countTasksByField(scopedTasks.value, 'createdAt', previousRange.value)
);
const taskCompletedPreviousCount = computed(() =>
  countTasksByField(scopedTasks.value, 'completedAt', previousRange.value)
);
const taskFlowDelta = computed(() => taskCompletedInRangeCount.value - taskCreatedInRangeCount.value);
const taskFlowDeltaLabel = computed(() => {
  const prefix = taskFlowDelta.value > 0 ? '+' : '';
  return t('netChange', { prefix, count: Math.abs(taskFlowDelta.value) });
});

const taskStatusSummary = computed(() => [
  {
    label: t('pendingTask'),
    count: liveScopedTasks.value.filter(task => task.status === 'pending').length,
    tone: 'pending',
    payload: {
      title: t('pendingTask'),
      target: 'table',
      statuses: ['pending']
    } satisfies StatsDrilldownPayload
  },
  {
    label: t('inProgressTask'),
    count: liveScopedTasks.value.filter(task => task.status === 'in-progress').length,
    tone: 'progress',
    payload: {
      title: t('inProgressTask'),
      target: 'table',
      statuses: ['in-progress']
    } satisfies StatsDrilldownPayload
  },
  {
    label: t('delayedTask'),
    count: liveScopedTasks.value.filter(task => task.status === 'delayed').length,
    tone: 'delayed',
    payload: {
      title: t('delayedTask'),
      target: 'table',
      statuses: ['delayed']
    } satisfies StatsDrilldownPayload
  },
  {
    label: t('completedTask'),
    count: liveScopedTasks.value.filter(task => task.status === 'completed').length,
    tone: 'completed',
    payload: {
      title: t('completedTask'),
      target: 'table',
      statuses: ['completed'],
      includeCompleted: true
    } satisfies StatsDrilldownPayload
  },
  {
    label: t('cancelledTask'),
    count: liveScopedTasks.value.filter(task => task.status === 'cancelled').length,
    tone: 'cancelled',
    payload: {
      title: t('cancelledTask'),
      target: 'table',
      statuses: ['cancelled']
    } satisfies StatsDrilldownPayload
  }
]);

const taskReviewActions = computed(() => [
  {
    label: t('reviewBacklog'),
    value: activeBacklogCount.value,
    meta: t('backlogHint'),
    disabled: activeBacklogCount.value === 0,
    payload: {
      title: t('reviewBacklog'),
      target: 'table',
      statuses: ['pending', 'in-progress', 'delayed']
    } satisfies StatsDrilldownPayload
  },
  {
    label: t('reviewCompleted'),
    value: liveScopedTasks.value.filter(task => task.status === 'completed').length,
    meta: t('jumpToTableFilter'),
    disabled: liveScopedTasks.value.every(task => task.status !== 'completed'),
    payload: {
      title: t('reviewCompleted'),
      target: 'table',
      statuses: ['completed'],
      includeCompleted: true
    } satisfies StatsDrilldownPayload
  },
  {
    label: t('reviewOverdue'),
    value: overdueTaskCount.value,
    meta: t('handlePriorityRisk'),
    disabled: overdueTaskCount.value === 0,
    payload: {
      title: t('reviewOverdue'),
      target: 'table',
      due: 'overdue'
    } satisfies StatsDrilldownPayload
  },
  {
    label: t('reviewArchived'),
    value: archivedTaskCount.value,
    meta: t('switchToArchiveView'),
    disabled: archivedTaskCount.value === 0,
    payload: {
      title: t('reviewArchived'),
      target: 'archive-table'
    } satisfies StatsDrilldownPayload
  }
]);

const taskCreatedTrend = computed(() => buildTaskTrendSeries(scopedTasks.value, 'createdAt', rangeBins.value));
const taskCompletedTrend = computed(() => buildTaskTrendSeries(scopedTasks.value, 'completedAt', rangeBins.value));
const taskArchivedTrend = computed(() => buildTaskTrendSeries(scopedTasks.value, 'archivedAt', rangeBins.value));
const taskTrendDesktopMax = computed(() =>
  Math.max(
    1,
    ...taskCreatedTrend.value.map(point => point.count),
    ...taskCompletedTrend.value.map(point => point.count)
  )
);
const taskTrendDesktopSeries = computed<TaskTrendDesktopSeries[]>(() => {
  const sourceSeries: Array<{
    key: DesktopTaskTrendKey;
    label: string;
    points: TrendPoint[];
  }> = [
    {
      key: 'created',
      label: t('addedLabel'),
      points: taskCreatedTrend.value
    },
    {
      key: 'completed',
      label: t('completedLabel'),
      points: taskCompletedTrend.value
    }
  ];

  return sourceSeries.map((series) => {
    const chartPoints = series.points.map((point, index, list) => ({
      ...point,
      x: getTaskTrendChartX(index, list.length),
      y: getTaskTrendChartY(point.count, taskTrendDesktopMax.value)
    }));

    return {
      key: series.key,
      label: series.label,
      total: series.points.reduce((sum, point) => sum + point.count, 0),
      points: chartPoints,
      linePath: buildTaskTrendLinePath(chartPoints),
      areaPath: buildTaskTrendAreaPath(chartPoints)
    };
  });
});
const taskTrendSections = computed<TaskTrendSection[]>(() => [
  {
    key: 'created',
    label: t('addedLabel'),
    fillClass: 'created',
    points: taskCreatedTrend.value
  },
  {
    key: 'completed',
    label: t('completedLabel'),
    fillClass: 'completed',
    points: taskCompletedTrend.value
  },
  {
    key: 'archived',
    label: t('archivedLabel'),
    fillClass: 'archived',
    points: taskArchivedTrend.value
  }
]);
const activeTaskTrendSection = computed<TaskTrendSection>(() =>
  taskTrendSections.value.find(section => section.key === mobileTaskTrendKey.value)
  ?? taskTrendSections.value[0]
  ?? {
    key: 'created',
    label: t('addedLabel'),
    fillClass: 'created',
    points: []
  }
);
const taskTrendMax = computed(() =>
  Math.max(
    1,
    ...taskCreatedTrend.value.map(point => point.count),
    ...taskCompletedTrend.value.map(point => point.count),
    ...taskArchivedTrend.value.map(point => point.count)
  )
);
const taskTrendColumnsStyle = computed<Record<string, string>>(() => ({
  '--trend-columns': String(Math.max(1, rangeBins.value.length))
}));
const taskTrendDesktopAxisPoints = computed<TaskTrendDesktopAxisPoint[]>(() =>
  rangeBins.value.map((bin, index) => ({
    key: bin.key,
    label: bin.label,
    created: taskCreatedTrend.value[index]?.count ?? 0,
    completed: taskCompletedTrend.value[index]?.count ?? 0
  }))
);
const taskTrendDesktopTicks = computed<TaskTrendDesktopTick[]>(() => {
  const max = taskTrendDesktopMax.value;
  const values = Array.from(new Set([max, Math.ceil(max * 0.66), Math.ceil(max * 0.33), 0]))
    .sort((left, right) => right - left);

  return values.map(value => ({
    value,
    y: getTaskTrendChartY(value, max)
  }));
});
const taskTrendDesktopViewBox = '0 0 100 72';
const taskPeriodComparisonCards = computed<TaskPeriodComparisonCard[]>(() => [
  buildTaskPeriodComparisonCard(t('addedLabel'), taskCreatedInRangeCount.value, taskCreatedPreviousCount.value),
  buildTaskPeriodComparisonCard(t('completedLabel'), taskCompletedInRangeCount.value, taskCompletedPreviousCount.value)
]);

const overdueDistribution = computed<OverdueBucket[]>(() => {
  const buckets = [
    { key: '1', label: t('overdueN', { days: 1 }), min: 1, max: 1 },
    { key: '2-3', label: t('overdueRange', { range: '2-3' }), min: 2, max: 3 },
    { key: '4-7', label: t('overdueRange', { range: '4-7' }), min: 4, max: 7 },
    { key: '8-14', label: t('overdueRange', { range: '8-14' }), min: 8, max: 14 },
    { key: '15+', label: t('overdue15Plus'), min: 15, max: Number.POSITIVE_INFINITY }
  ];

  return buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    count: liveScopedTasks.value.filter(task => {
      const overdueDays = getTaskOverdueDays(task, todayKey.value);
      return overdueDays >= bucket.min && overdueDays <= bucket.max;
    }).length
  }));
});
const overdueDistributionMax = computed(() =>
  Math.max(1, ...overdueDistribution.value.map(bucket => bucket.count))
);

const longestStuckTasks = computed<StuckTaskEntry[]>(() =>
  liveScopedTasks.value
    .map((task) => {
      const daysSinceUpdate = getTaskDaysSinceUpdate(task, todayKey.value);
      const overdueDays = getTaskOverdueDays(task, todayKey.value);
      return {
        task,
        title: getTaskDisplayTitle(task),
        sourceLabel: getTaskSourceLabel(task),
        daysSinceUpdate,
        overdueDays,
        statusLabel: getTaskStatusText(task.status)
      };
    })
    .filter(entry =>
      (entry.task.status === 'pending' || entry.task.status === 'in-progress' || entry.task.status === 'delayed')
      && (entry.daysSinceUpdate > 0 || entry.overdueDays > 0)
    )
    .sort((left, right) => {
      if (right.daysSinceUpdate !== left.daysSinceUpdate) {
        return right.daysSinceUpdate - left.daysSinceUpdate;
      }
      if (right.overdueDays !== left.overdueDays) {
        return right.overdueDays - left.overdueDays;
      }
      return left.title.localeCompare(right.title, 'zh-CN');
    })
    .slice(0, 5)
);

const tagCompletionRates = computed<CompletionRateItem[]>(() =>
  buildCompletionRateItems(scopedTasks.value, (task) => {
    const tags = Array.isArray(task.tags) ? task.tags.filter(tag => tag.trim().length > 0) : [];
    if (tags.length === 0) {
      return [{ key: '__untagged__', label: t('untagged') }];
    }
    return tags.map(tag => ({ key: tag.trim(), label: tag.trim() }));
  })
    .sort((left, right) => {
      if (right.total !== left.total) {
        return right.total - left.total;
      }
      if (right.rate !== left.rate) {
        return right.rate - left.rate;
      }
      return left.label.localeCompare(right.label, 'zh-CN');
    })
    .slice(0, 5)
);

const sourceCompletionRates = computed<CompletionRateItem[]>(() =>
  buildCompletionRateItems(scopedTasks.value, (task) => [{
    key: getTaskSourceKey(task),
    label: getTaskSourceLabel(task)
  }])
    .sort((left, right) => {
      if (right.total !== left.total) {
        return right.total - left.total;
      }
      if (right.rate !== left.rate) {
        return right.rate - left.rate;
      }
      return left.label.localeCompare(right.label, 'zh-CN');
    })
    .slice(0, 5)
);

const totalHabitsCount = computed(() => habits.value.length);
const activeHabitsCount = computed(() =>
  habits.value.filter(habit => habit.isPaused !== true).length
);
const habitRangeSummaries = computed(() =>
  habits.value.map(habit => summarizeHabitInRange(habit, currentRange.value, rangeDays.value))
);
const previousHabitRangeSummaries = computed(() =>
  habits.value.map(habit => summarizeHabitInRange(habit, previousRange.value, buildDatePoints(previousRange.value.start, previousRange.value.endExclusive)))
);
const habitCompletionsInRange = computed(() =>
  habitRangeSummaries.value.reduce((sum, summary) => sum + summary.completions, 0)
);
const habitCompletionsPrevious = computed(() =>
  previousHabitRangeSummaries.value.reduce((sum, summary) => sum + summary.completions, 0)
);
const habitCompletionRateInRange = computed(() =>
  safePercent(
    habitRangeSummaries.value.reduce((sum, summary) => sum + summary.completions, 0),
    habitRangeSummaries.value.reduce((sum, summary) => sum + summary.target, 0)
  )
);
const longestHabitRangeStreak = computed(() =>
  Math.max(0, ...habitRangeSummaries.value.map(summary => summary.streak))
);
const topHabits = computed(() =>
  [...habitRangeSummaries.value]
    .filter(summary => summary.completions > 0)
    .sort((left, right) => {
      if (right.completions !== left.completions) {
        return right.completions - left.completions;
      }
      if (right.rate !== left.rate) {
        return right.rate - left.rate;
      }
      return right.createdAt.localeCompare(left.createdAt);
    })
    .slice(0, 4)
);
const habitTrend = computed(() => buildHabitTrendSeries(habits.value, rangeBins.value));
const habitTrendMax = computed(() =>
  Math.max(1, ...habitTrend.value.map(point => point.count))
);

const focusMinutesInRange = computed(() =>
  sumFocusRecordField(focusRecords.value, currentRange.value, 'minutes')
);
const focusSessionsInRange = computed(() =>
  sumFocusRecordField(focusRecords.value, currentRange.value, 'sessions')
);
const focusMinutesPrevious = computed(() =>
  sumFocusRecordField(focusRecords.value, previousRange.value, 'minutes')
);
const focusActiveDaysInRange = computed(() =>
  focusRecords.value.filter(record =>
    isDateKeyInRange(record.date, currentRange.value) && record.minutes > 0
  ).length
);
const focusAverageMinutesPerSession = computed(() => {
  if (focusSessionsInRange.value <= 0) {
    return 0;
  }
  return Math.round(focusMinutesInRange.value / focusSessionsInRange.value);
});
const focusTrend = computed(() => buildFocusTrendSeries(focusRecords.value, rangeBins.value));
const focusTrendMax = computed(() =>
  Math.max(1, ...focusTrend.value.map(point => point.count))
);
const focusTrackedSessionsInRange = computed(() =>
  focusSessionRecords.value.filter(record => isDateKeyInRange(record.date, currentRange.value))
);
const focusTopHabits = computed(() =>
  buildFocusTargetSummaries(focusTrackedSessionsInRange.value, 'habit')
);
const focusTopTasks = computed(() =>
  buildFocusTargetSummaries(focusTrackedSessionsInRange.value, 'task')
);
const focusTargetMinutesMax = computed(() =>
  Math.max(
    1,
    ...focusTopHabits.value.map(item => item.minutes),
    ...focusTopTasks.value.map(item => item.minutes)
  )
);

const completedGoalCount = computed(() =>
  props.goalItems.filter(goal => goal.status === 'completed').length
);
const inProgressGoalCount = computed(() =>
  props.goalItems.filter(goal => goal.status === 'in-progress').length
);
const emptyGoalCount = computed(() =>
  props.goalItems.filter(goal => goal.status === 'empty').length
);
const averageGoalProgress = computed(() => {
  if (props.goalItems.length === 0) {
    return 0;
  }
  const total = props.goalItems.reduce((sum, goal) => sum + goal.progressPercent, 0);
  return Math.round(total / props.goalItems.length);
});
const featuredGoals = computed(() =>
  [...props.goalItems]
    .sort((left, right) => {
      const leftPriority = getGoalPriority(left);
      const rightPriority = getGoalPriority(right);
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      if (right.progressPercent !== left.progressPercent) {
        return right.progressPercent - left.progressPercent;
      }
      return left.name.localeCompare(right.name, 'zh-CN');
    })
    .slice(0, 4)
);

const overviewTiles = computed(() => [
  {
    label: t('tasksCompletedRange', { range: selectedRangeShortLabel.value }),
    value: String(taskCompletedInRangeCount.value),
    meta: t('prevCurrentMeta', { prev: taskCompletedPreviousCount.value, current: taskCompletedInRangeCount.value }),
    tone: 'tone-complete'
  },
  {
    label: t('focusDurationRange', { range: selectedRangeShortLabel.value }),
    value: formatMinutes(focusMinutesInRange.value),
    meta: focusSessionsInRange.value > 0 ? t('countSessions', { count: focusSessionsInRange.value }) : t('noFocusRecords'),
    tone: 'tone-focus'
  },
  {
    label: t('habitCheckinsRange', { range: selectedRangeShortLabel.value }),
    value: `${habitCompletionRateInRange.value}%`,
    meta: habitCompletionRateInRange.value > 0 ? t('completionRatePercent', { rate: habitCompletionRateInRange.value }) : t('noCheckinsThisPeriod'),
    tone: 'tone-habit'
  },
  {
    label: t('availableCoins'),
    value: String(rewardSnapshot.value.availableCoins),
    meta: t('levelTotalFragments', { level: rewardSnapshot.value.level, xp: rewardSnapshot.value.totalXp }),
    tone: 'tone-reward'
  }
]);

const insightCards = computed<InsightCard[]>(() => {
  const cards: InsightCard[] = [];
  const totalInRange = taskCreatedInRangeCount.value + taskCompletedInRangeCount.value + focusMinutesInRange.value + habitCompletionsInRange.value;

  if (totalInRange === 0) {
    cards.push({
      id: 'quiet',
      title: t('quietPeriodTitle'),
      text: t('quietPeriodText'),
      tone: 'neutral'
    });
  }

  if (taskCreatedInRangeCount.value > taskCompletedInRangeCount.value + 5) {
    cards.push({
      id: 'backlog-growth',
      title: t('taskPoolGrowingTitle'),
      text: t('taskPoolGrowingText', { range: selectedRangeShortLabel.value, count: taskCreatedInRangeCount.value - taskCompletedInRangeCount.value }),
      tone: 'warning'
    });
  } else if (taskCompletedInRangeCount.value > taskCreatedInRangeCount.value + 5) {
    cards.push({
      id: 'backlog-clear',
      title: t('clearingBacklogTitle'),
      text: t('clearingBacklogText', { range: selectedRangeShortLabel.value, count: taskCompletedInRangeCount.value - taskCreatedInRangeCount.value }),
      tone: 'positive'
    });
  }

  const focusDelta = focusMinutesInRange.value - focusMinutesPrevious.value;
  if (focusDelta > 30) {
    cards.push({
      id: 'focus-up',
      title: t('focusIncreasingTitle'),
      text: t('focusIncreasingText', { range: selectedRangeShortLabel.value, time: formatMinutes(focusDelta) }),
      tone: 'positive'
    });
  } else if (focusDelta < -30) {
    cards.push({
      id: 'focus-down',
      title: t('focusDecreasingTitle'),
      text: t('focusDecreasingText', { range: selectedRangeShortLabel.value, time: formatMinutes(Math.abs(focusDelta)) }),
      tone: 'warning'
    });
  }

  const habitDelta = habitCompletionsInRange.value - habitCompletionsPrevious.value;
  if (habitDelta > 3) {
    cards.push({
      id: 'habit-up',
      title: t('habitSteadierTitle'),
      text: t('habitSteadierText', { range: selectedRangeShortLabel.value, count: habitDelta }),
      tone: 'positive'
    });
  } else if (habitDelta < -3) {
    cards.push({
      id: 'habit-down',
      title: t('habitDecreasingTitle'),
      text: t('habitDecreasingText', { range: selectedRangeShortLabel.value, count: Math.abs(habitDelta) }),
      tone: 'warning'
    });
  }

  if (overdueTaskCount.value > 0) {
    cards.push({
      id: 'overdue',
      title: t('overdueTasksTitle'),
      text: t('overdueTasksText', { count: overdueTaskCount.value }),
      tone: 'warning'
    });
  }

  if (cards.length === 0) {
    cards.push({
      id: 'stable',
      title: t('rhythmStableTitle'),
      text: t('rhythmStableText'),
      tone: 'neutral'
    });
  }

  return cards.slice(0, 3);
});

async function loadHabitData(): Promise<void> {
  habitsLoading.value = true;
  try {
    const nextHabits = await getHabits();
    habits.value = Array.isArray(nextHabits) ? nextHabits : [];
  } finally {
    habitsLoading.value = false;
  }
}

async function loadFocusData(): Promise<void> {
  focusLoading.value = true;
  try {
    const data = await getFocusTimerData();
    focusRecords.value = Array.isArray(data.dailyRecords) ? data.dailyRecords : [];
    focusSessionRecords.value = Array.isArray(data.sessionRecords) ? data.sessionRecords : [];
  } finally {
    focusLoading.value = false;
  }
}

async function loadRewardData(forceRefresh: boolean = false): Promise<void> {
  rewardsLoading.value = true;
  try {
    rewardSnapshot.value = await getRewardSnapshot(forceRefresh);
  } finally {
    rewardsLoading.value = false;
  }
}

function handleFocusSession(): void {
  void loadFocusData();
}

function handleDrilldown(payload: StatsDrilldownPayload): void {
  emit('drilldown', payload);
}

function handleOpenDetail(payload: StatsDetailPayload): void {
  emit('open-detail', payload);
}

async function handleOpenGoalKanban(goal: GoalListItem): Promise<void> {
  await openTaskViewByRequest({
    view: 'kanban',
    source: buildGoalDocumentSource(goal.id),
    documentId: 'all'
  });
}

function togglePanel(panel: StatsPanelKey): void {
  panelOpenState.value[panel] = !panelOpenState.value[panel];
}

async function handleOpenTask(task: Task): Promise<void> {
  if (!task.blockId) {
    return;
  }
  await openBlockById(task.blockId, { focus: true });
}

function canOpenFocusTarget(target: FocusTargetSummary): boolean {
  if (target.type === 'habit') {
    return typeof target.targetId === 'string' && target.targetId.length > 0;
  }
  return typeof target.targetBlockId === 'string' && target.targetBlockId.length > 0;
}

async function handleOpenFocusTarget(target: FocusTargetSummary): Promise<void> {
  if (!canOpenFocusTarget(target)) {
    return;
  }

  if (target.type === 'habit' && target.targetId) {
    handleOpenDetail({ target: 'habit-detail', habitId: target.targetId });
    return;
  }

  if (target.targetBlockId) {
    await openBlockById(target.targetBlockId, { focus: true });
  }
}

let unsubscribeHabitUpdates: (() => void) | null = null;
let unsubscribeRewardUpdates: (() => void) | null = null;

watch(selectedRange, (value) => {
  saveSelectedRange(value);
});

watch(panelOpenState, (value) => {
  savePanelState(value);
}, { deep: true });

onMounted(() => {
  unsubscribeHabitUpdates = eventBus.on(Events.HABITS_UPDATED, (payload?: { habits?: Habit[] }) => {
    if (Array.isArray(payload?.habits)) {
      habits.value = [...payload.habits];
      habitsLoading.value = false;
      return;
    }
    void loadHabitData();
  });
  unsubscribeRewardUpdates = eventBus.on(Events.REWARDS_UPDATED, (payload?: { snapshot?: RewardSnapshot }) => {
    if (payload?.snapshot) {
      rewardSnapshot.value = payload.snapshot;
      return;
    }
    void loadRewardData(true);
  });
  if (typeof window !== 'undefined') {
    window.addEventListener('pinch-focus-session', handleFocusSession);
  }
  void loadHabitData();
  void loadFocusData();
  void loadRewardData(true);
});

onUnmounted(() => {
  unsubscribeHabitUpdates?.();
  unsubscribeRewardUpdates?.();
  if (typeof window !== 'undefined') {
    window.removeEventListener('pinch-focus-session', handleFocusSession);
  }
});

function createDefaultPanelState(): StatsPanelState {
  return {
    tasks: true,
    habits: true,
    focus: true,
    rewards: true,
    goals: true
  };
}

function normalizeStatsRangeKey(value: unknown): StatsRangeKey {
  return value === 'today' || value === '7d' || value === '30d' || value === 'month'
    ? value
    : '7d';
}

function loadSavedStatsRange(): StatsRangeKey {
  if (typeof window === 'undefined') {
    return '7d';
  }
  try {
    return normalizeStatsRangeKey(window.localStorage.getItem(STATS_RANGE_STORAGE_KEY));
  } catch {
    return '7d';
  }
}

function saveSelectedRange(value: StatsRangeKey): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STATS_RANGE_STORAGE_KEY, value);
  } catch {
    // Ignore storage failures and keep the UI responsive.
  }
}

function loadSavedPanelState(): StatsPanelState {
  const defaults = createDefaultPanelState();
  if (typeof window === 'undefined') {
    return defaults;
  }
  try {
    const raw = window.localStorage.getItem(STATS_PANEL_STATE_STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<Record<StatsPanelKey, boolean>> | null;
    if (!parsed || typeof parsed !== 'object') {
      return defaults;
    }
    const nextState = createDefaultPanelState();
    statsPanelKeys.forEach((key) => {
      if (typeof parsed[key] === 'boolean') {
        nextState[key] = parsed[key] as boolean;
      }
    });
    return nextState;
  } catch {
    return defaults;
  }
}

function savePanelState(value: StatsPanelState): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const snapshot = createDefaultPanelState();
    statsPanelKeys.forEach((key) => {
      snapshot[key] = value[key];
    });
    window.localStorage.setItem(STATS_PANEL_STATE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage failures and keep the UI responsive.
  }
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const plainDateMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (plainDateMatch) {
    const [, year, month, day] = plainDateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function toLocalDateKey(value: string | undefined): string {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return '';
  }
  return formatLocalDateKey(startOfDay(parsed));
}

function diffDayCount(start: Date, endExclusive: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((endExclusive.getTime() - start.getTime()) / millisecondsPerDay));
}

function buildCurrentRangeWindow(key: StatsRangeKey): RangeWindow {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  if (key === 'today') {
    return buildRangeWindow(key, t('today'), t('today'), today, tomorrow);
  }

  if (key === '30d') {
    return buildRangeWindow(key, t('last30Days'), t('last30Days'), addDays(today, -29), tomorrow);
  }

  if (key === 'month') {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return buildRangeWindow(key, t('thisMonth'), t('thisMonth'), monthStart, tomorrow);
  }

  return buildRangeWindow(key, t('last7Days'), t('last7Days'), addDays(today, -6), tomorrow);
}

function buildPreviousRangeWindow(current: RangeWindow): RangeWindow {
  const endExclusive = new Date(current.start);
  const start = addDays(endExclusive, -current.dayCount);
  return buildRangeWindow(current.key, t('previousPeriod'), t('previousPeriod'), start, endExclusive);
}

function buildRangeWindow(
  key: StatsRangeKey,
  label: string,
  shortLabel: string,
  start: Date,
  endExclusive: Date
): RangeWindow {
  return {
    key,
    label,
    shortLabel,
    start,
    endExclusive,
    startKey: formatLocalDateKey(start),
    endExclusiveKey: formatLocalDateKey(endExclusive),
    dayCount: diffDayCount(start, endExclusive)
  };
}

function buildDatePoints(start: Date, endExclusive: Date): DatePoint[] {
  const points: DatePoint[] = [];
  const cursor = new Date(start);
  while (cursor < endExclusive) {
    points.push({
      key: formatLocalDateKey(cursor),
      label: `${cursor.getMonth() + 1}/${cursor.getDate()}`
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return points;
}

function buildDateBins(points: DatePoint[], maxBins: number): DateBin[] {
  if (points.length === 0) {
    return [];
  }
  const chunkSize = Math.max(1, Math.ceil(points.length / maxBins));
  const bins: DateBin[] = [];

  for (let index = 0; index < points.length; index += chunkSize) {
    const chunk = points.slice(index, index + chunkSize);
    if (chunk.length === 0) {
      continue;
    }
    bins.push({
      key: `${chunk[0].key}-${chunk[chunk.length - 1].key}`,
      label: chunk.length === 1
        ? chunk[0].label
        : `${chunk[0].label}-${chunk[chunk.length - 1].label}`,
      dayKeys: chunk.map(point => point.key)
    });
  }

  return bins;
}

function isDateKeyInRange(dateKey: string | undefined, range: RangeWindow): boolean {
  if (!dateKey) {
    return false;
  }
  return dateKey >= range.startKey && dateKey < range.endExclusiveKey;
}

function countTasksByField(tasks: Task[], field: 'createdAt' | 'completedAt' | 'archivedAt', range: RangeWindow): number {
  return tasks.reduce((count, task) => {
    const key = field === 'archivedAt' ? toLocalDateKey(task.archivedAt) : toLocalDateKey(task[field]);
    return count + (isDateKeyInRange(key, range) ? 1 : 0);
  }, 0);
}

function buildTaskTrendSeries(tasks: Task[], field: 'createdAt' | 'completedAt' | 'archivedAt', bins: DateBin[]): TrendPoint[] {
  const counts = new Array<number>(bins.length).fill(0);
  const lookup = buildBinLookup(bins);

  tasks.forEach((task) => {
    const key = field === 'archivedAt' ? toLocalDateKey(task.archivedAt) : toLocalDateKey(task[field]);
    const index = key ? lookup.get(key) : undefined;
    if (index === undefined) {
      return;
    }
    counts[index] += 1;
  });

  return bins.map((bin, index) => ({
    key: bin.key,
    label: bin.label,
    count: counts[index]
  }));
}

function sumFocusRecordField(records: DailyFocusRecord[], range: RangeWindow, field: 'minutes' | 'sessions'): number {
  return records.reduce((sum, record) => {
    if (!isDateKeyInRange(record.date, range)) {
      return sum;
    }
    return sum + (field === 'minutes' ? record.minutes : record.sessions);
  }, 0);
}

function buildFocusTargetSummaries(
  records: FocusSessionRecord[],
  type: 'habit' | 'task'
): FocusTargetSummary[] {
  const summaryMap = new Map<string, FocusTargetSummary>();

  records.forEach((record) => {
    if (record.targetType !== type) {
      return;
    }

    const fallbackName = type === 'habit' ? t('unnamedHabit') : t('unnamedTask');
    const name = typeof record.targetName === 'string' && record.targetName.trim().length > 0
      ? record.targetName.trim()
      : fallbackName;
    const key = record.targetId
      || record.targetBlockId
      || `${type}:${name}`;
    const current = summaryMap.get(key);

    if (current) {
      current.minutes += record.minutes;
      current.sessions += 1;
      if (!current.targetId && record.targetId) {
        current.targetId = record.targetId;
      }
      if (!current.targetBlockId && record.targetBlockId) {
        current.targetBlockId = record.targetBlockId;
      }
      if (!current.emoji && record.targetEmoji) {
        current.emoji = record.targetEmoji;
      }
      return;
    }

    summaryMap.set(key, {
      key,
      type,
      targetId: record.targetId,
      targetBlockId: record.targetBlockId,
      name,
      emoji: record.targetEmoji,
      minutes: record.minutes,
      sessions: 1
    });
  });

  return [...summaryMap.values()]
    .sort((left, right) => {
      if (right.minutes !== left.minutes) {
        return right.minutes - left.minutes;
      }
      if (right.sessions !== left.sessions) {
        return right.sessions - left.sessions;
      }
      return left.name.localeCompare(right.name, 'zh-CN');
    })
    .slice(0, 4);
}

function buildFocusTrendSeries(records: DailyFocusRecord[], bins: DateBin[]): TrendPoint[] {
  const counts = new Array<number>(bins.length).fill(0);
  const lookup = buildBinLookup(bins);

  records.forEach((record) => {
    const index = lookup.get(record.date);
    if (index === undefined) {
      return;
    }
    counts[index] += record.minutes;
  });

  return bins.map((bin, index) => ({
    key: bin.key,
    label: bin.label,
    count: counts[index]
  }));
}

function buildBinLookup(bins: DateBin[]): Map<string, number> {
  const lookup = new Map<string, number>();
  bins.forEach((bin, index) => {
    bin.dayKeys.forEach((dayKey) => {
      lookup.set(dayKey, index);
    });
  });
  return lookup;
}

function summarizeHabitInRange(habit: Habit, range: RangeWindow, dayPoints: DatePoint[]): HabitRangeSummary {
  const completionMap = new Map<string, number>();
  const targetMap = new Map<string, number>();

  habit.calendar.forEach((entry) => {
    if (!isDateKeyInRange(entry.date, range)) {
      return;
    }
    const completedCount = getHabitEntryCompletionCount(entry);
    const targetCount = getHabitEntryTargetCount(habit, entry);
    completionMap.set(entry.date, completedCount);
    targetMap.set(entry.date, targetCount);
  });

  const activeDayPoints = dayPoints.filter(day => isHabitActiveOnDay(habit, day.key));
  let completions = 0;
  let streak = 0;
  let longest = 0;

  activeDayPoints.forEach((day) => {
    const dayCompletion = completionMap.get(day.key) || 0;
    completions += dayCompletion;
    if (dayCompletion > 0) {
      streak += 1;
      longest = Math.max(longest, streak);
      return;
    }
    streak = 0;
  });
  const target = getHabitRangeTargetCount(habit, activeDayPoints, targetMap);

  return {
    id: habit.id,
    name: habit.name,
    emoji: habit.emoji,
    completions,
    target,
    rate: safePercent(completions, target),
    streak: longest,
    createdAt: habit.createdAt
  };
}

function getHabitEntryCompletionCount(entry: Habit['calendar'][number]): number {
  if (typeof entry.completedCount === 'number' && Number.isFinite(entry.completedCount)) {
    return entry.completedCount;
  }
  return entry.completed ? 1 : 0;
}

function getHabitEntryTargetCount(habit: Habit, entry: Habit['calendar'][number]): number {
  if (typeof entry.targetCount === 'number' && Number.isFinite(entry.targetCount) && entry.targetCount > 0) {
    return entry.targetCount;
  }
  return getHabitDefaultTargetCount(habit);
}

function getHabitDefaultTargetCount(habit: Habit): number {
  if (typeof habit.timesPerDay === 'number' && Number.isFinite(habit.timesPerDay) && habit.timesPerDay > 0) {
    return habit.timesPerDay;
  }
  return 1;
}

function isHabitActiveOnDay(habit: Habit, dayKey: string): boolean {
  const createdAtKey = toLocalDateKey(habit.createdAt);
  return !createdAtKey || dayKey >= createdAtKey;
}

function getHabitRangeTargetCount(
  habit: Habit,
  activeDayPoints: DatePoint[],
  targetMap: Map<string, number>
): number {
  if (activeDayPoints.length === 0) {
    return 0;
  }

  if (habit.frequency.startsWith('weekly')) {
    const coveredWeeks = new Set<string>();
    activeDayPoints.forEach((day) => {
      const parsed = parseDateValue(day.key);
      if (!parsed) {
        return;
      }
      coveredWeeks.add(formatLocalDateKey(getWeekStart(parsed)));
    });
    return coveredWeeks.size * getWeeklyTarget(habit.frequency);
  }

  return activeDayPoints.reduce((sum, day) => (
    sum + (targetMap.get(day.key) || getHabitDefaultTargetCount(habit))
  ), 0);
}

function buildHabitTrendSeries(habitsList: Habit[], bins: DateBin[]): TrendPoint[] {
  const counts = new Array<number>(bins.length).fill(0);
  const lookup = buildBinLookup(bins);

  habitsList.forEach((habit) => {
    habit.calendar.forEach((entry) => {
      const index = lookup.get(entry.date);
      if (index === undefined) {
        return;
      }
      counts[index] += getHabitEntryCompletionCount(entry);
    });
  });

  return bins.map((bin, index) => ({
    key: bin.key,
    label: bin.label,
    count: counts[index]
  }));
}

function getGoalPriority(goal: GoalListItem): number {
  if (goal.status === 'in-progress') {
    return 0;
  }
  if (goal.status === 'completed') {
    return 1;
  }
  return 2;
}

function getGoalStatusText(status: GoalListItem['status']): string {
  if (status === 'completed') {
    return t('statusCompleted');
  }
  if (status === 'in-progress') {
    return t('statusInProgress');
  }
  return t('statusPendingStart');
}

function getRewardSourceText(source: RewardSource): string {
  if (source === 'habit') {
    return t('typeHabit');
  }
  if (source === 'task') {
    return t('typeTask');
  }
  if (source === 'focus') {
    return t('typeFocus');
  }
  return t('typeSystem');
}

function buildTaskPeriodComparisonCard(label: string, current: number, previous: number): TaskPeriodComparisonCard {
  const delta = current - previous;
  const magnitude = Math.abs(delta);
  const tone = delta === 0 ? 'flat' : (delta > 0 ? 'up' : 'down');
  const base = Math.max(1, Math.abs(previous));
  const percent = previous === 0 ? null : Math.round((magnitude / base) * 100);
  const deltaLabel = delta === 0
    ? t('equal')
    : percent === null
      ? `${delta > 0 ? '+' : '-'}${magnitude} ${t('deltaTasks', { delta: '' }).trim()}`
      : `${delta > 0 ? '+' : '-'}${percent}%`;

  let detail = '';
  if (delta === 0) {
    detail = t('consistentWithPrev');
  } else if (previous === 0) {
    detail = t('prevZeroCurrent', { current });
  } else {
    detail = `${delta > 0 ? t('increasedBy') : t('decreasedBy')} ${magnitude} ${t('deltaTasks', { delta: '' }).trim()}`;
  }

  return {
    label,
    currentValue: String(current),
    previousValue: t('prevPeriodValue', { value: previous }),
    deltaLabel: t('periodComparison', { label: deltaLabel }),
    detail,
    tone
  };
}

function getTaskOverdueDays(task: Task, currentDayKey: string): number {
  if (task.archived === true || task.status === 'completed' || task.status === 'cancelled') {
    return 0;
  }
  const dueKey = normalizeDateKey(task.dueDate);
  if (!dueKey || dueKey >= currentDayKey) {
    return 0;
  }
  return getDayDifference(currentDayKey, dueKey);
}

function getTaskDaysSinceUpdate(task: Task, currentDayKey: string): number {
  const activityKey = normalizeDateKey(task.updatedAt) || normalizeDateKey(task.createdAt);
  if (!activityKey) {
    return 0;
  }
  return getDayDifference(currentDayKey, activityKey);
}

function getTaskDisplayTitle(task: Task): string {
  const title = stripMarkupText(task.title || '').trim();
  return title || t('unnamedTask');
}

function getTaskStatusText(status: Task['status']): string {
  if (status === 'in-progress') {
    return t('statusInProgress');
  }
  if (status === 'delayed') {
    return t('statusOverdue');
  }
  if (status === 'completed') {
    return t('statusCompleted');
  }
  if (status === 'cancelled') {
    return t('statusCancelled');
  }
  return t('statusPending');
}

function buildCompletionRateItems(
  tasks: Task[],
  resolveBuckets: (task: Task) => Array<{ key: string; label: string }>
): CompletionRateItem[] {
  const bucketMap = new Map<string, CompletionRateItem>();

  tasks.forEach((task) => {
    const buckets = resolveBuckets(task)
      .filter(bucket => bucket.key.trim().length > 0)
      .map(bucket => ({
        key: bucket.key.trim(),
        label: bucket.label.trim()
      }));

    buckets.forEach((bucket) => {
      const current = bucketMap.get(bucket.key) || {
        key: bucket.key,
        label: bucket.label,
        total: 0,
        completed: 0,
        rate: 0
      };
      current.total += 1;
      if (task.status === 'completed') {
        current.completed += 1;
      }
      current.rate = safePercent(current.completed, current.total);
      bucketMap.set(bucket.key, current);
    });
  });

  return [...bucketMap.values()];
}

function getTaskSourceKey(task: Task): string {
  const rawPath = stripMarkupText(task.hPath || '').trim();
  if (rawPath) {
    return rawPath;
  }
  const notebookId = typeof task.notebookId === 'string' ? task.notebookId.trim() : '';
  if (notebookId) {
    return notebookId;
  }
  return t('docNotLocated');
}

function getTaskSourceLabel(task: Task): string {
  return compactPathLabel(getTaskSourceKey(task));
}

function compactPathLabel(value: string): string {
  const segments = value
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return value;
  }
  if (segments.length === 1) {
    return segments[0];
  }
  if (segments.length === 2) {
    return `${segments[0]} / ${segments[1]}`;
  }
  return `${segments[0]} / ${segments[segments.length - 1]}`;
}

function stripMarkupText(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDateKey(value: string | undefined): string {
  return toLocalDateKey(value);
}

function getDayDifference(laterKey: string, earlierKey: string): number {
  const later = parseDateValue(laterKey);
  const earlier = parseDateValue(earlierKey);
  if (!later || !earlier) {
    return 0;
  }
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.floor((startOfDay(later).getTime() - startOfDay(earlier).getTime()) / millisecondsPerDay));
}

function safePercent(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round((numerator / denominator) * 100)));
}

function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return '0m';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  if (remain === 0) {
    return `${hours}h`;
  }
  return `${hours}h${remain}m`;
}

function getBarStyle(count: number, max: number): Record<string, string> {
  const safeMax = Math.max(1, max);
  const height = count <= 0 ? 10 : Math.max(10, Math.round((count / safeMax) * 100));
  return {
    height: `${height}%`
  };
}

function getTaskTrendChartX(index: number, total: number): number {
  const paddingX = 6;
  if (total <= 1) {
    return TASK_TREND_CHART_VIEWBOX_WIDTH / 2;
  }
  const usableWidth = TASK_TREND_CHART_VIEWBOX_WIDTH - paddingX * 2;
  return paddingX + (usableWidth * index) / (total - 1);
}

function getTaskTrendChartY(count: number, max: number): number {
  const paddingTop = 6;
  const paddingBottom = 10;
  const safeMax = Math.max(1, max);
  const usableHeight = TASK_TREND_CHART_VIEWBOX_HEIGHT - paddingTop - paddingBottom;
  return TASK_TREND_CHART_VIEWBOX_HEIGHT - paddingBottom - (Math.max(0, count) / safeMax) * usableHeight;
}

function getTaskTrendPointStyle(point: TaskTrendDesktopPoint): Record<string, string> {
  return {
    left: `${(point.x / TASK_TREND_CHART_VIEWBOX_WIDTH) * 100}%`,
    top: `${(point.y / TASK_TREND_CHART_VIEWBOX_HEIGHT) * 100}%`
  };
}

function buildTaskTrendLinePath(points: TaskTrendDesktopPoint[]): string {
  if (points.length === 0) {
    return '';
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    path += ` L ${point.x} ${point.y}`;
  }
  return path;
}

function buildTaskTrendAreaPath(points: TaskTrendDesktopPoint[]): string {
  if (points.length === 0) {
    return '';
  }

  const baselineY = getTaskTrendChartY(0, 1);
  const first = points[0];
  const last = points[points.length - 1];
  return `${buildTaskTrendLinePath(points)} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}
</script>

<style scoped lang="scss">
.personal-stats-view {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 10px;
  box-sizing: border-box;
}

.stats-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
  border-radius: 22px;
  background: var(--b3-theme-background);
  border: 1px solid var(--b3-list-hover);
  box-shadow: 0 18px 40px #26394d14;
  }

.stats-hero-copy {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-hero-copy h2 {
  margin: 0;
  font-size: 32px;
  line-height: 1.08;
  color: var(--b3-theme-on-background);
}

.stats-hero-copy p {
  margin: 0;
  max-width: 560px;
  line-height: 1.7;
  color: var(--b3-theme-on-surface);
}

.range-switch {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 100%;
  min-width: 0;
  padding-bottom: 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.range-switch::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.range-chip,
.panel-toggle-btn {
  border: 1px solid transparent;
  background: var(--b3-theme-on-background);
  color: var(--b3-theme-background);
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.range-chip:hover,
.panel-toggle-btn:hover,.panel-toggle-btn[aria-expanded="true"]:hover{
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  border-color: var(--b3-border-color);
}

.range-chip.active,
.panel-toggle-btn[aria-expanded="true"] {
  background: var(--b3-list-hover);
  color: var(--b3-theme-on-background);
  border-color: var(--b3-border-color);
}

.insight-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.insight-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 86px;
  padding: 14px 16px;
  border-radius: 18px;
  background: var(--b3-theme-background);
}

.insight-card.positive {
  border: 3px dashed var(--pinch-color5);
}

.insight-card.warning {
  border: 3px dashed var(--pinch-color10);
}

.insight-card.neutral {
  border: 3px dashed var(--pinch-color1);
}

.insight-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--b3-theme-on-background);
}

.insight-card-icon {
  position: absolute;
  top: 8px;
  right: 12px;
  width: 30px;
  height: 30px;
  opacity: 0.9;
  pointer-events: none;
}

.insight-card-icon.positive {
  fill: var(--pinch-color5);
}

.insight-card-icon.warning {
  fill: var(--pinch-color10);
}

.insight-text {
  font-size: 12px;
  line-height: 1.6;
  color: var(--b3-theme-on-surface);
}

.stats-hero-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-self: end;
}

.hero-tile {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 90px;
  padding: 16px;
  border-radius: 18px;
  color: var(--b3-theme-on-background);
}

.hero-tile.tone-complete {
  background:  var(--pinch-background5);
}

.hero-tile.tone-focus {
  background: var(--pinch-background7);
}

.hero-tile.tone-habit {
  background: var(--pinch-background3);
}

.hero-tile.tone-reward {
  background:var(--pinch-background4);
}

.hero-tile-label {
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.hero-tile-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.05;
}

.hero-tile-meta {
  margin-top: auto;
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.stats-board {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.stats-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 320px;
  padding: 18px;
  border-radius: 22px;
  background: var(--b3-theme-background);
  border: 1px solid var(--b3-list-hover);
  box-shadow: 0 18px 40px rgb(38 57 77 / 0.08);
}

.stats-panel.is-collapsed {
  min-height: 0;
  gap: 12px;
}

.tasks-panel {
  grid-column: 1 / -1;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.panel-head-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.panel-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-link-btn {
  padding: 6px 12px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  color: var(--b3-theme-on-background);
  background: var(--b3-list-hover);
  border: 1px solid transparent;
}

.panel-link-btn:hover {
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
  border-color: var(--b3-border-color);
}

.panel-head h3 {
  margin: 0;
  font-size: 18px;
  color: var(--b3-theme-on-background);
}

.panel-head-copy {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.task-panel-head-copy {
  flex: 1 1 auto;
  min-width: 0;
}

.panel-head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.task-panel-head-top {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.task-status-pills {
  min-width: 0;
}

.panel-head p {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--b3-theme-on-surface-light);
}

.panel-chip {
  flex: 0 0 auto;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--b3-theme-on-background);
  background: var(--b3-list-hover);
}

.mini-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.review-mini-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.mini-stat-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-radius: 16px;
  background: var(--b3-list-hover);
}

.mini-stat-label {
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.mini-stat-value {
  font-size: 22px;
  line-height: 1.15;
  color: var(--b3-theme-on-background);
}

.panel-empty {
  display: grid;
  place-items: center;
  flex: 1;
  min-height: 220px;
  padding: 18px;
  text-align: center;
  border-radius: 18px;
  color: var(--b3-theme-on-surface-light);
  background: var(--b3-list-hover);
}

.review-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.review-action {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid transparent;
  border-radius: 18px;
  cursor: pointer;
  text-align: left;
  color: var(--b3-theme-on-background);
  background: var(--pinch-background1);
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.review-action:hover:not(:disabled) {
  border-color: var(--pinch-color1);
}

.review-action:disabled {
  cursor: default;
  opacity: 0.58;
}

.review-action-label {
  font-size: 13px;
  color: var(--b3-theme-on-surface-light);
}

.review-action-value {
  font-size: 24px;
  line-height: 1.05;
}

.review-action-meta {
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.review-detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.focus-association-grid {
  grid-template-columns: 1fr;
}

.review-detail-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: var(--b3-list-hover);;
}

.review-detail-wide {
  grid-column: 1 / -1;
}

.task-trend-sidecard.review-detail-wide {
  grid-column: auto;
}

.task-trend-sidecard {
  min-width: 0;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  overflow: hidden;
}

.task-trend-sidecard .comparison-grid {
  grid-template-columns: 1fr;
  flex: 1 1 auto;
  min-height: 0;
  align-content: start;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.comparison-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 110px;
  padding: 18px 14px 14px;
  border-radius: 16px;
  background: var(--b3-theme-background);
}

.comparison-label {
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.comparison-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.05;
  color: var(--b3-theme-on-background);
}

.comparison-meta,
.comparison-detail,
.rate-item-meta,
.stuck-meta {
  font-size: 12px;
  line-height: 1.5;
  color: var(--b3-theme-on-surface-light);
}

.comparison-delta {
  position: absolute;
  bottom: 14px;
  right: 14px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.comparison-delta.up {
  color: #17633f;
  background: rgb(44 160 98 / 0.14);
}

.comparison-delta.down {
  color: #9f4f1e;
  background: rgb(233 140 62 / 0.16);
}

.comparison-delta.flat {
  color: var(--b3-theme-on-surface);
  background: rgb(38 57 77 / 0.08);
}

.inline-empty {
  padding: 12px 0;
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.bucket-list,
.rate-list,
.stuck-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bucket-item,
.rate-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--b3-theme-background);
  padding: 8px;
  border-radius: 16px;
  box-shadow: #0000000f 0 1px 5px;
}

.bucket-item-head,
.rate-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: var(--b3-theme-on-background);
}

.progress-track.compact {
  height: 10px;
}

.progress-fill.overdue {
  height: 100%;
  background: var(--pinch-color10);
}

.progress-fill.rate {
  height: 100%;
  background:  var(--pinch-color7);
}

.progress-fill.source {
  height: 100%;
  background: var(--pinch-color8);
}

.stuck-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  appearance: none;
  background: var(--b3-theme-background);
  transition: transform 120ms ease, box-shadow 120ms ease;
  box-shadow: #0000000f 0 1px 5px;
}

.stuck-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgb(38 57 77 / 0.12);
}

.stuck-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stuck-title {
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.stuck-badge {
  flex: 0 0 auto;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--b3-theme-on-background);
  background: color-mix(in srgb, var(--pinch-background3) 46%, white 54%);
}

.list-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.list-block-subtle {
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.list-block,
.trend-block,
.progress-block,
.trend-stack,
.task-trend-desktop {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-trend-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(300px, 0.9fr);
  height: 350px;
  gap: 12px;
  align-items: stretch;
}

.task-trend-layout > .task-trend-desktop {
  height: 100%;
  max-height: none;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.task-trend-mobile {
  display: none;
  flex-direction: column;
  gap: 12px;
}

.rank-list,
.event-list,
.goal-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rank-item,
.event-item,
.goal-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  border-radius: 16px;
  text-align: left;
  font: inherit;
  color: inherit;
  appearance: none;
  background: var(--b3-list-hover);;
}

.rank-item,
.event-item,
.goal-item {
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.rank-item:hover,
.event-item:hover,
.goal-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgb(38 57 77 / 0.12);
}

.rank-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.rank-emoji {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgb(255 255 255 / 0.72);
}

.rank-title,
.event-title,
.goal-item-title {
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.rank-meta,
.event-meta,
.goal-item-meta,
.goal-item-foot {
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.rank-badge,
.event-points {
  flex: 0 0 auto;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: var(--b3-theme-background);
  color: var(--b3-theme-on-background);
}

.status-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-pill {
  padding: 6px 10px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  background: color-mix(in srgb, var(--pinch-background1) 48%, white 52%);
  color: var(--b3-theme-on-background);
}

.status-pill:disabled {
  cursor: default;
  opacity: 0.58;
}

.status-pill.pending {
  background: color-mix(in srgb, var(--pinch-background3) 58%, white 42%);
}

.status-pill.progress {
  background: color-mix(in srgb, var(--pinch-background7) 56%, white 44%);
}

.status-pill.delayed {
  background: color-mix(in srgb, var(--pinch-background10) 52%, white 48%);
}

.status-pill.completed {
  background: color-mix(in srgb, var(--pinch-background5) 52%, white 48%);
}

.status-pill.cancelled {
  background: var(--b3-list-hover);
}

.trend-bars {
  display: flex;
  align-items: end;
  gap: 10px;
  min-height: 140px;
  padding: 14px 10px 0;
  border-radius: 18px;
  background: var(--b3-list-hover);
}

.trend-bar-item {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.trend-bar {
  position: relative;
  display: flex;
  align-items: end;
  width: 100%;
  max-width: 28px;
  height: 88px;
  padding: 4px;
  border-radius: 999px;
  background: var(--b3-theme-background);
}

.trend-bar-fill,
.trend-row-fill,
.progress-fill {
  display: block;
  width: 100%;
  border-radius: inherit;
}

.trend-bar-fill.focus {
  background: var(--pinch-color7);
}

.trend-bar-fill.habit {
  background: var(--pinch-color5);
}

.trend-bar-value {
  font-size: 12px;
  color: var(--b3-theme-on-background);
}

.trend-bar-label {
  font-size: 11px;
  height: 40px;
  color: var(--b3-theme-on-surface-light);
}

.trend-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 12px;
  align-items: end;
}

.trend-row-label {
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.trend-row-bars {
  display: grid;
  grid-template-columns: repeat(var(--trend-columns), minmax(0, 1fr));
  gap: 8px;
  align-items: end;
  min-height: 86px;
}

.trend-row-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.trend-row-bar small {
  font-size: 10px;
  color: var(--b3-theme-on-surface-light);
}

.trend-row-fill {
  width: 100%;
  max-width: 26px;
  min-height: 8px;
  border-radius: 999px 999px 10px 10px;
}

.trend-row-fill.created {
  background: var(--pinch-color8);
}

.trend-row-fill.completed {
  background: var(--pinch-color5);
}

.trend-row-fill.archived {
  background: var(--pinch-color2);
}

.task-trend-chart {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 14px;
  min-height: 0;
  min-width: 0;
  padding: 14px;
  box-sizing: border-box;
  border-radius: 18px;
  background: var(--b3-list-hover);
  overflow: hidden;
}

.task-trend-chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.task-trend-chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.task-trend-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: var(--b3-theme-on-background);
  background: var(--b3-theme-background);
}

.task-trend-legend-swatch {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.task-trend-legend-swatch.created {
  background: var(--pinch-color8);
}

.task-trend-legend-swatch.completed {
  background: var(--pinch-color5);
}

.task-trend-chart-shell {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.task-trend-chart-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  padding: 4px 0 28px;
  font-size: 11px;
  color: var(--b3-theme-on-surface-light);
}

.task-trend-chart-body {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 10px;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.task-trend-chart-plot {
  position: relative;
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  overflow: hidden;
}

.task-trend-chart-svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.task-trend-point-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.task-trend-grid-line {
  stroke: color-mix(in srgb, var(--b3-theme-on-surface-light) 18%, transparent);
  stroke-width: 0.75;
}

.task-trend-area {
  stroke: none;
}

.task-trend-area.created {
  fill: color-mix(in srgb, var(--pinch-color8) 14%, transparent);
}

.task-trend-area.completed {
  fill: color-mix(in srgb, var(--pinch-color5) 14%, transparent);
}

.task-trend-line {
  fill: none;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.task-trend-line.created {
  stroke: var(--pinch-color8);
}

.task-trend-line.completed {
  stroke: var(--pinch-color5);
}

.task-trend-point {
  display: none;
  fill: white;
  stroke-width: 1.35;
}

.task-trend-dot {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 1.5px solid transparent;
  border-radius: 50%;
  box-sizing: border-box;
  fill: white;
  background: white;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}

.task-trend-point.created {
  stroke: var(--pinch-color8);
}

.task-trend-point.completed {
  stroke: var(--pinch-color5);
}

.task-trend-dot.created {
  border-color: var(--pinch-color8);
}

.task-trend-dot.completed {
  border-color: var(--pinch-color5);
}

.task-trend-dot:hover {
  box-shadow: 0 0 0 3px rgb(255 255 255 / 0.58);
}

.task-trend-chart-labels {
  display: grid;
  grid-template-columns: repeat(var(--trend-columns), minmax(0, 1fr));
  gap: 8px;
}

.task-trend-chart-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  text-align: center;
}

.task-trend-chart-label small {
  font-size: 10px;
  color: var(--b3-theme-on-surface-light);
}

.task-trend-chart-values {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}

.task-trend-chart-value {
  font-size: 11px;
  font-weight: 600;
}

.task-trend-chart-value.created {
  color: var(--pinch-color8);
}

.task-trend-chart-value.completed {
  color: var(--pinch-color5);
}

.mobile-trend-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mobile-trend-chip {
  padding: 6px 12px;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  color: var(--b3-theme-on-background);
  background: var(--b3-theme-background);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.88);
}

.mobile-trend-chip.active {
  color: white;
  background: linear-gradient(135deg, var(--pinch-color7), color-mix(in srgb, var(--pinch-color6) 72%, white 28%));
}

.mobile-trend-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: var(--b3-list-hover);
}

.mobile-trend-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: var(--b3-theme-on-background);
}

.mobile-trend-row {
  grid-template-columns: 1fr;
}

.progress-track {
  position: relative;
  width: 100%;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--pinch-background1) 56%, white 44%);
}

.progress-fill.reward {
  height: 100%;
  background: var(--pinch-color4);
}

.progress-fill.goal {
  height: 100%;
  background: var(--pinch-color7);
}

.progress-fill.focus-target {
  height: 100%;
  background: var(--pinch-color8);
}

.goal-item {
  flex-direction: column;
  align-items: stretch;
}

.focus-target-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  border-radius: 16px;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  appearance: none;
  background: var(--b3-theme-background);
  transition: transform 120ms ease, box-shadow 120ms ease;
}

.focus-target-item:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgb(38 57 77 / 0.12);
}

.focus-target-item:disabled {
  cursor: default;
  opacity: 0.72;
}

.focus-target-main,
.focus-target-side {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.focus-target-side {
  flex: 0 0 124px;
  align-items: flex-end;
}

.focus-target-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-weight: 600;
  color: var(--b3-theme-on-background);
}

.focus-target-title > span:last-child,
.focus-target-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.focus-target-emoji {
  flex: 0 0 auto;
}

.focus-target-meta {
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.focus-target-badge {
  font-size: 12px;
  color: var(--b3-theme-on-background);
}

.goal-item-head,
.goal-item-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.goal-item-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--b3-theme-on-background);
}

@media (max-width: 1560px) {
  .stats-board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1080px) {
  .stats-hero,
  .stats-board {
    grid-template-columns: 1fr;
  }

  .task-trend-layout {
    grid-template-columns: 1fr;
    height: auto;
  }

  .task-trend-layout > .task-trend-desktop {
    height: auto;
    max-height: none;
    overflow: visible;
  }

  .task-trend-sidecard {
    height: auto;
    overflow: visible;
  }

  .tasks-panel {
    grid-column: auto;
  }

  .insight-list,
  .review-grid,
  .review-mini-grid,
  .review-detail-grid,
  .comparison-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .personal-stats-view {
    padding: 10px;
  }

  .stats-hero {
    padding: 18px;
  }

  .stats-hero-grid,
  .mini-stat-grid,
  .review-grid,
  .insight-list,
  .review-mini-grid,
  .review-detail-grid,
  .comparison-grid {
    grid-template-columns: 1fr;
  }

  .panel-head,
  .list-block-head,
  .mobile-trend-card-head,
  .goal-item-head,
  .goal-item-foot {
    flex-direction: column;
    align-items: flex-start;
  }

  .panel-head-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .trend-bars {
    gap: 12px;
    overflow-x: auto;
    scroll-snap-type: x proximity;
  }

  .trend-bar-item {
    flex: 0 0 48px;
    min-width: 48px;
    scroll-snap-align: start;
  }

  .task-trend-desktop {
    display: none;
  }

  .task-trend-mobile {
    display: flex;
  }

  .trend-row {
    grid-template-columns: 1fr;
  }

  .mobile-trend-bars {
    gap: 10px;
  }
}
</style>
