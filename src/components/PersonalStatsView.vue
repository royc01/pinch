<template>
  <div class="personal-stats-view" @keydown.esc="handleOverviewEditorEscape">
    <div class="personal-stats-main">
    <header class="stats-toolbar">
      <div class="stats-toolbar-copy">
        <h2>{{ greetingTitle }}</h2>
        <p :title="dailyQuoteSubtitle">{{ dailyQuoteSubtitle }}</p>
      </div>

      <div v-if="activeStatsTab !== 'summary'" class="range-switch ariaLabel" role="tablist" :aria-label="t('personalStats.rangeSwitchAria')">
        <button
          v-for="option in rangeOptions"
          :key="option.value"
          type="button"
          class="range-chip"
          :class="{ active: selectedRange === option.value }"
          :aria-selected="selectedRange === option.value"
          @click="selectedRange = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </header>

    <nav class="stats-tabs" role="tablist" :aria-label="t('personalStats.viewTabsAria')">
      <button
        v-for="tab in statsTabs"
        :key="tab.value"
        type="button"
        role="tab"
        :aria-selected="activeStatsTab === tab.value"
        :class="{ active: activeStatsTab === tab.value }"
        @click="activeStatsTab = tab.value"
      >
        {{ tab.label }}
      </button>
      <div v-if="activeStatsTab === 'overview'" class="stats-tabs-actions">
        <button
          type="button"
          class="overview-customize-btn"
          ref="overviewCustomizeButton"
          :aria-expanded="showOverviewCustomizer"
          @click="showOverviewCustomizer ? cancelOverviewEditing() : beginOverviewEditing()"
        >
          {{ t(showOverviewCustomizer ? 'personalStats.editingCards' : 'personalStats.customizeCards') }}
        </button>
      </div>
    </nav>

    <section v-if="activeStatsTab === 'overview'" class="overview-dashboard">
      <div class="overview-kpi-grid">
        <article
          v-for="tile in overviewTiles"
          :key="tile.id"
          class="overview-kpi"
          :class="tile.tone"
          :data-card-id="tile.id"
        >
          <div class="overview-kpi-head">
            <span>{{ tile.label }}</span>
            <span class="metric-scope">{{ tile.scope }}</span>
          </div>
          <strong>{{ tile.value }}</strong>
          <span class="overview-kpi-meta" :class="tile.direction">{{ tile.meta }}</span>
        </article>
      </div>

      <TransitionGroup v-if="visibleOptionalOverviewCardIds.length" tag="div" name="overview-card" :css="false" class="overview-cards-grid" @dragover="handleOverviewGridDragOver" @drop="handleOverviewDrop">
        <template v-for="cardId in visibleOptionalOverviewCardIds" :key="cardId">
          <section v-if="cardId === 'activity'" class="overview-section activity-overview" data-card-id="activity" v-bind="overviewDropBindings(cardId)">
            <OverviewCardEditorControls v-if="showOverviewCustomizer" v-bind="overviewEditorBindings(cardId)" />
            <header class="overview-section-head">
              <div>
                <h3>{{ t('personalStats.overviewActivityTitle') }}</h3>
                <p>{{ t('personalStats.overviewActivitySummary') }}</p>
              </div>
              <span class="metric-scope">{{ selectedRangeShortLabel }}</span>
            </header>

            <div class="overview-trend-list">
              <div v-for="series in overviewTrendSeries" :key="series.key" class="overview-trend-row">
                <div class="overview-trend-meta">
                  <span>{{ series.label }}</span>
                  <strong>{{ series.total }}</strong>
                </div>
                <div class="overview-spark-bars" :style="taskTrendColumnsStyle" :aria-label="series.ariaLabel">
                  <span
                    v-for="point in series.points"
                    :key="point.key"
                    class="overview-spark-column ariaLabel"
                    :aria-label="point.ariaLabel"
                  >
                    <span
                      class="overview-spark-fill"
                      :class="series.tone"
                      :style="getOverviewBarStyle(point.count, series.max)"
                    ></span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section v-else-if="cardId === 'attention'" class="overview-section attention-overview" data-card-id="attention" v-bind="overviewDropBindings(cardId)">
            <OverviewCardEditorControls v-if="showOverviewCustomizer" v-bind="overviewEditorBindings(cardId)" />
            <header class="overview-section-head">
              <div>
                <h3>{{ t('personalStats.overviewAttentionTitle') }}</h3>
                <p>{{ t('personalStats.overviewAttentionSummary') }}</p>
              </div>
              <span v-if="overviewAttentionItems.length" class="attention-count">
                {{ overviewAttentionItems.length }}
              </span>
            </header>

            <div v-if="overviewAttentionItems.length" class="attention-list">
              <button
                v-for="item in overviewAttentionItems"
                :key="item.key"
                type="button"
                class="attention-item"
                :class="item.tone"
                @click="handleOverviewAttention(item)"
              >
                <span class="attention-indicator"></span>
                <span class="attention-copy">
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.detail }}</span>
                </span>
                <span class="attention-value">{{ item.value }}</span>
              </button>
            </div>
            <div v-else class="attention-empty">
              <strong>{{ t('personalStats.overviewStableTitle') }}</strong>
              <span>{{ t('personalStats.overviewStableText') }}</span>
            </div>
          </section>

          <article v-else-if="cardId === 'today-actions'" class="overview-detail-card today-actions-card" data-card-id="today-actions" v-bind="overviewDropBindings(cardId)">
            <OverviewCardEditorControls v-if="showOverviewCustomizer" v-bind="overviewEditorBindings(cardId)" />
            <header class="overview-detail-card-head">
              <h3>{{ t('personalStats.todayActionsTitle') }}</h3>
              <span class="metric-scope">{{ t('personalStats.todayScope') }}</span>
            </header>
            <div class="overview-detail-metrics three-columns">
              <div>
                <span>{{ t('personalStats.todayTodo') }}</span>
                <strong>{{ todayOpenTasks.length }}</strong>
              </div>
              <div>
                <span>{{ t('personalStats.todayCompleted') }}</span>
                <strong>{{ todayCompletedTaskCount }}</strong>
              </div>
              <div>
                <span>{{ t('personalStats.todayAvailableTime') }}</span>
                <strong>{{ todayRemainingTimeLabel }}</strong>
              </div>
            </div>
            <div v-if="overviewActionTasks.length" class="overview-context-list today-task-list">
              <span class="overview-context-label">{{ t(todayOpenTasks.length ? 'personalStats.nextTasks' : 'personalStats.overdueTasksToHandle') }}</span>
              <button v-for="task in overviewActionTasks" :key="task.id" type="button" class="overview-highlight-row" :disabled="!task.blockId" @click="void handleOpenTask(task)">
                <span><strong :title="getTaskDisplayTitle(task)">{{ getTaskDisplayTitle(task) }}</strong><small>{{ task.dueDate === todayKey ? (task.dueTime || t('personalStats.todayScope')) : task.dueDate }}</small></span>
                <small>{{ getTaskFocusEstimateMinutes(task) > 0 ? formatMinutes(getTaskFocusEstimateMinutes(task)) : t('personalStats.notEstimated') }}</small>
              </button>
            </div>
            <div v-else class="overview-inline-empty">{{ t('personalStats.noTodayTasks') }}</div>
            <button type="button" class="overview-primary-action today-actions-button" @click="handleTodayAction">
              {{ todayActionLabel }}
            </button>
          </article>

          <article v-else-if="cardId === 'upcoming-deadlines'" class="overview-detail-card upcoming-deadlines-card" data-card-id="upcoming-deadlines" v-bind="overviewDropBindings(cardId)">
            <OverviewCardEditorControls v-if="showOverviewCustomizer" v-bind="overviewEditorBindings(cardId)" />
            <header class="overview-detail-card-head">
              <h3>{{ t('personalStats.overviewCardUpcomingDeadlines') }}</h3>
              <span class="metric-scope">{{ t('personalStats.upcomingDeadlineScope') }}</span>
            </header>
            <div class="overview-context-meta">{{ formatTemplate('personalStats.upcomingDeadlineCountTemplate', { count: upcomingDeadlineTasks.length }) }}</div>
            <div v-if="upcomingDeadlineTasks.length" class="overview-context-list upcoming-deadline-list">
              <button v-for="entry in upcomingDeadlineTasks.slice(0, expandedOverviewLists.includes(cardId) ? undefined : 3)" :key="entry.task.id" type="button" class="overview-highlight-row" :disabled="!entry.task.blockId" @click="void handleOpenTask(entry.task)">
                <span><strong :title="getTaskDisplayTitle(entry.task)">{{ getTaskDisplayTitle(entry.task) }}</strong><small>{{ entry.task.dueDate }} {{ entry.task.dueTime || '' }}</small></span>
                <small>{{ formatTemplate('personalStats.goalDaysRemainingTemplate', { days: entry.daysRemaining }) }}</small>
              </button>
            </div>
            <div v-else class="overview-inline-empty">{{ t('personalStats.noUpcomingDeadlines') }}</div>
            <button v-if="upcomingDeadlineTasks.length > 3" type="button" class="overview-link-action overview-list-toggle" :aria-expanded="expandedOverviewLists.includes(cardId)" @click="toggleOverviewList(cardId)">{{ getOverviewListToggleLabel(cardId, upcomingDeadlineTasks.length) }}</button>
          </article>

          <article v-else-if="cardId === 'stagnant-tasks'" class="overview-detail-card stagnant-tasks-card" data-card-id="stagnant-tasks" v-bind="overviewDropBindings(cardId)">
            <OverviewCardEditorControls v-if="showOverviewCustomizer" v-bind="overviewEditorBindings(cardId)" />
            <header class="overview-detail-card-head">
              <h3>{{ t('personalStats.overviewCardStagnantTasks') }}</h3>
              <span class="metric-scope">{{ t('personalStats.stagnantTaskScope') }}</span>
            </header>
            <div class="overview-context-meta">{{ formatTemplate('personalStats.stagnantTaskCountTemplate', { count: stagnantTasks.length }) }}</div>
            <div v-if="stagnantTasks.length" class="overview-context-list stagnant-task-list">
              <button v-for="entry in stagnantTasks.slice(0, expandedOverviewLists.includes(cardId) ? undefined : 3)" :key="entry.task.id" type="button" class="overview-highlight-row" :disabled="!entry.task.blockId" @click="void handleOpenTask(entry.task)">
                <span><strong :title="getTaskDisplayTitle(entry.task)">{{ getTaskDisplayTitle(entry.task) }}</strong><small>{{ getTaskStatusText(entry.task.status) }}</small></span>
                <small>{{ formatTemplate('personalStats.stagnantTaskDaysTemplate', { days: entry.daysSinceUpdate }) }}</small>
              </button>
            </div>
            <div v-else class="overview-inline-empty">{{ t('personalStats.noStagnantTasks') }}</div>
            <button v-if="stagnantTasks.length > 3" type="button" class="overview-link-action overview-list-toggle" :aria-expanded="expandedOverviewLists.includes(cardId)" @click="toggleOverviewList(cardId)">{{ getOverviewListToggleLabel(cardId, stagnantTasks.length) }}</button>
          </article>

          <article v-else-if="cardId === 'today-habits'" class="overview-detail-card today-habits-card" data-card-id="today-habits" v-bind="overviewDropBindings(cardId)">
            <OverviewCardEditorControls v-if="showOverviewCustomizer" v-bind="overviewEditorBindings(cardId)" />
            <header class="overview-detail-card-head">
              <h3>{{ t('personalStats.overviewCardTodayHabits') }}</h3>
              <span class="metric-scope">{{ t('personalStats.todayScope') }}</span>
            </header>
            <div class="overview-context-meta">{{ formatTemplate('personalStats.todayHabitCountTemplate', { count: pendingTodayHabits.length }) }}</div>
            <div v-if="pendingTodayHabits.length" class="overview-context-list today-habit-list">
              <button v-for="entry in pendingTodayHabits.slice(0, expandedOverviewLists.includes(cardId) ? undefined : 3)" :key="entry.habit.id" type="button" class="overview-highlight-row" @click="handleOpenDetail({ target: 'habit-detail', habitId: entry.habit.id })">
                <span><strong :title="entry.habit.name">{{ entry.habit.name }}</strong><small>{{ formatTemplate('personalStats.todayHabitProgressTemplate', { completed: entry.completed, total: entry.target }) }}</small></span>
                <small>{{ t('personalStats.goToHabitCheckin') }}</small>
              </button>
            </div>
            <div v-else class="overview-inline-empty">{{ t('personalStats.noPendingTodayHabits') }}</div>
            <button v-if="pendingTodayHabits.length > 3" type="button" class="overview-link-action overview-list-toggle" :aria-expanded="expandedOverviewLists.includes(cardId)" @click="toggleOverviewList(cardId)">{{ getOverviewListToggleLabel(cardId, pendingTodayHabits.length) }}</button>
          </article>

          <article v-else-if="cardId === 'unscheduled-tasks'" class="overview-detail-card unscheduled-tasks-card" data-card-id="unscheduled-tasks" v-bind="overviewDropBindings(cardId)">
            <OverviewCardEditorControls v-if="showOverviewCustomizer" v-bind="overviewEditorBindings(cardId)" />
            <header class="overview-detail-card-head">
              <h3>{{ t('personalStats.overviewCardUnscheduledTasks') }}</h3>
              <span class="metric-scope">{{ t('personalStats.currentScope') }}</span>
            </header>
            <div class="overview-context-meta">{{ formatTemplate('personalStats.unscheduledTaskCountTemplate', { count: unscheduledTasks.length }) }}</div>
            <div v-if="unscheduledTasks.length" class="overview-context-list unscheduled-task-list">
              <button v-for="task in unscheduledTasks.slice(0, expandedOverviewLists.includes(cardId) ? undefined : 3)" :key="task.id" type="button" class="overview-highlight-row" :disabled="!task.blockId" @click="void handleOpenTask(task)">
                <span><strong :title="getTaskDisplayTitle(task)">{{ getTaskDisplayTitle(task) }}</strong><small>{{ getTaskStatusText(task.status) }}</small></span>
                <small>{{ t('personalStats.scheduleTask') }}</small>
              </button>
            </div>
            <div v-else class="overview-inline-empty">{{ t('personalStats.noUnscheduledTasks') }}</div>
            <button v-if="unscheduledTasks.length > 3" type="button" class="overview-link-action overview-list-toggle" :aria-expanded="expandedOverviewLists.includes(cardId)" @click="toggleOverviewList(cardId)">{{ getOverviewListToggleLabel(cardId, unscheduledTasks.length) }}</button>
          </article>

          <article v-else-if="cardId === 'estimate-vs-actual'" class="overview-detail-card estimate-vs-actual-card" data-card-id="estimate-vs-actual" v-bind="overviewDropBindings(cardId)">
            <OverviewCardEditorControls v-if="showOverviewCustomizer" v-bind="overviewEditorBindings(cardId)" />
            <header class="overview-detail-card-head">
              <h3>{{ t('personalStats.overviewCardEstimateVsActual') }}</h3>
              <span class="metric-scope">{{ selectedRangeShortLabel }}</span>
            </header>
            <p class="overview-card-explanation">{{ t('personalStats.estimateComparisonScope') }}</p>
            <div class="overview-context-meta">{{ formatTemplate('personalStats.estimateComparisonCountTemplate', { count: taskEstimateComparison.entries.length, total: taskEstimateComparison.total }) }}</div>
            <div v-if="taskEstimateComparison.entries.length" class="overview-detail-metrics two-columns">
              <div><span>{{ t('personalStats.estimatedTime') }}</span><strong>{{ formatMinutes(taskEstimateComparison.estimatedMinutes) }}</strong></div>
              <div><span>{{ t('personalStats.linkedFocusTime') }}</span><strong>{{ formatMinutes(taskEstimateComparison.actualMinutes) }}</strong></div>
            </div>
            <div v-if="taskEstimateComparison.entries.length" class="overview-context-meta">{{ estimateComparisonDeviationLabel }}</div>
            <div v-if="taskEstimateComparison.missingEstimate || taskEstimateComparison.missingFocus" class="overview-context-meta">
              <span v-if="taskEstimateComparison.missingEstimate">{{ formatTemplate('personalStats.missingEstimateCountTemplate', { count: taskEstimateComparison.missingEstimate }) }}</span>
              <span v-if="taskEstimateComparison.missingFocus">{{ formatTemplate('personalStats.missingFocusCountTemplate', { count: taskEstimateComparison.missingFocus }) }}</span>
            </div>
            <div v-if="taskEstimateComparison.entries.length" class="overview-context-list estimate-comparison-list">
              <button v-for="entry in taskEstimateComparison.entries.slice(0, expandedOverviewLists.includes(cardId) ? undefined : 3)" :key="entry.task.id" type="button" class="overview-highlight-row" :disabled="!entry.task.blockId" @click="void handleOpenTask(entry.task)">
                <span><strong :title="getTaskDisplayTitle(entry.task)">{{ getTaskDisplayTitle(entry.task) }}</strong><small>{{ formatTemplate('personalStats.estimateComparisonRowTemplate', { estimated: formatMinutes(entry.estimatedMinutes), actual: formatMinutes(entry.actualMinutes) }) }}</small></span>
                <small>{{ getEstimateDifferenceLabel(entry.actualMinutes - entry.estimatedMinutes) }}</small>
              </button>
            </div>
            <div v-else class="overview-inline-empty">{{ t(taskEstimateComparison.total ? 'personalStats.noComparableTaskEstimates' : 'personalStats.noCompletedTasksForEstimates') }}</div>
            <button v-if="taskEstimateComparison.entries.length > 3" type="button" class="overview-link-action overview-list-toggle" :aria-expanded="expandedOverviewLists.includes(cardId)" @click="toggleOverviewList(cardId)">{{ getOverviewListToggleLabel(cardId, taskEstimateComparison.entries.length) }}</button>
          </article>

          <article v-else-if="cardId === 'goal-progress-detail'" class="overview-detail-card goal-progress-detail-card" data-card-id="goal-progress-detail" v-bind="overviewDropBindings(cardId)">
            <OverviewCardEditorControls v-if="showOverviewCustomizer" v-bind="overviewEditorBindings(cardId)" />
            <header class="overview-detail-card-head">
              <h3>{{ t('personalStats.goalProgressDetailTitle') }}</h3>
              <button type="button" class="overview-link-action" @click="activeStatsTab = 'goals'">{{ t('personalStats.viewDetails') }}</button>
            </header>
            <div class="overview-detail-metrics two-columns">
              <div>
                <span>{{ t('personalStats.inProgressGoals') }}</span>
                <strong>{{ inProgressGoalCount }}</strong>
              </div>
              <div>
                <span>{{ t('personalStats.averageProgress') }}</span>
                <strong>{{ activeGoalAverageProgress }}%</strong>
              </div>
            </div>
            <div class="overview-context-meta">
              <span>{{ t('personalStats.goalStatusPending') }} <strong>{{ emptyGoalCount }}</strong></span>
              <span>{{ t('taskManager.statusCompleted') }} <strong>{{ completedGoalCount }}</strong></span>
            </div>
            <div class="overview-summary-progress" role="progressbar" :aria-valuenow="activeGoalAverageProgress" aria-valuemin="0" aria-valuemax="100" :aria-label="formatTemplate('personalStats.goalProgressAriaTemplate', { progress: activeGoalAverageProgress })"><span :style="{ width: `${activeGoalAverageProgress}%` }"></span></div>
            <button
              v-if="lowestProgressGoal"
              type="button"
              class="overview-highlight-row"
              @click="handleOpenDetail({ target: 'goal', goalId: lowestProgressGoal.id })"
            >
              <span>
                <small>{{ t('personalStats.lowestProgressGoal') }}</small>
                <strong>{{ lowestProgressGoal.name }}</strong>
              </span>
              <span class="overview-highlight-value">
                <strong>{{ lowestProgressGoal.progressPercent }}%</strong>
                <small>{{ lowestProgressGoalDeadlineLabel }}</small>
              </span>
            </button>
            <div v-else class="overview-inline-empty">{{ t('personalStats.noActiveGoals') }}</div>
          </article>

          <article v-else-if="cardId === 'habit-rhythm'" class="overview-detail-card habit-rhythm-card" data-card-id="habit-rhythm" v-bind="overviewDropBindings(cardId)">
            <OverviewCardEditorControls v-if="showOverviewCustomizer" v-bind="overviewEditorBindings(cardId)" />
            <header class="overview-detail-card-head">
              <h3>{{ t('personalStats.habitRhythmTitle') }}</h3>
              <button type="button" class="overview-link-action" @click="activeStatsTab = 'rhythm'">{{ t('personalStats.viewDetails') }}</button>
            </header>
            <div class="overview-detail-metrics three-columns">
              <div>
                <span>{{ t('personalStats.currentLongestStreak') }}</span>
                <strong>{{ getDayCountLabel(currentLongestHabitStreak) }}</strong>
              </div>
              <div>
                <span>{{ t('personalStats.periodActiveDays') }}</span>
                <strong>{{ getDayCountLabel(habitActiveDaysInRange) }}</strong>
              </div>
              <div>
                <span>{{ t('personalStats.latestInterruption') }}</span>
                <strong>{{ latestHabitInterruptionLabel }}</strong>
              </div>
            </div>
            <div class="overview-context-meta">
              <span>{{ t('personalStats.activeHabits') }} <strong>{{ activeHabitsCount }}</strong></span>
              <span>{{ t('personalStats.habitCheckins') }} <strong>{{ habitCompletionsInRange }}</strong></span>
              <span class="metric-scope">{{ selectedRangeShortLabel }}</span>
            </div>
            <div
              class="habit-heat-strip"
              :style="{ '--heat-columns': habitHeatStrip.length }"
              :aria-label="t('personalStats.habitHeatStripAria')"
            >
              <span
                v-for="point in habitHeatStrip"
                :key="point.key"
                class="habit-heat-cell ariaLabel"
                :class="`level-${point.level}`"
                :aria-label="point.ariaLabel"
              ></span>
            </div>
            <div v-if="overviewHabitSummaries.length" class="overview-context-list habit-execution-list">
              <button v-for="habit in overviewHabitSummaries" :key="habit.id" type="button" class="overview-highlight-row" @click="handleOpenDetail({ target: 'habit-detail', habitId: habit.id })">
                <span><strong :title="habit.name">{{ habit.name }}</strong><small>{{ formatTemplate('personalStats.completionRateMetaTemplate', { completed: habit.completions, total: habit.target }) }}</small></span>
                <span class="overview-highlight-value"><strong>{{ habit.rate }}%</strong></span>
              </button>
            </div>
            <div v-else class="overview-inline-empty">{{ t('personalStats.noScheduledHabits') }}</div>
          </article>

          <article v-else-if="cardId === 'recent-activity'" class="overview-detail-card recent-activity-card" data-card-id="recent-activity" v-bind="overviewDropBindings(cardId)">
            <OverviewCardEditorControls v-if="showOverviewCustomizer" v-bind="overviewEditorBindings(cardId)" />
            <header class="overview-detail-card-head">
              <h3>{{ t('personalStats.recentActivityTitle') }}</h3>
              <span class="metric-scope">{{ t('personalStats.latestActivity') }}</span>
            </header>
            <div v-if="recentOverviewActivities.length" class="recent-activity-list">
              <button
                v-for="activity in recentOverviewActivities"
                :key="activity.key"
                type="button"
                class="recent-activity-row"
                :disabled="!activity.actionable"
                @click="handleRecentActivity(activity)"
              >
                <span class="recent-activity-kind" :class="activity.kind">{{ activity.kindLabel }}</span>
                <span class="recent-activity-copy">
                  <strong>{{ activity.title }}</strong>
                  <small>{{ activity.timeLabel }}</small>
                </span>
              </button>
            </div>
            <div v-else class="overview-inline-empty">{{ t('personalStats.noRecentActivity') }}</div>
          </article>

          <article v-else-if="cardId === 'focus-summary'" class="overview-summary-card focus-summary-card" data-card-id="focus-summary" v-bind="overviewDropBindings(cardId)">
            <OverviewCardEditorControls v-if="showOverviewCustomizer" v-bind="overviewEditorBindings(cardId)" />
            <header>
              <h3>{{ t('personalStats.overviewFocusSummaryTitle') }}</h3>
              <button type="button" @click="activeStatsTab = 'rhythm'">{{ t('personalStats.viewDetails') }}</button>
            </header>
            <div class="overview-detail-metrics two-columns">
              <div><span>{{ t('personalStats.focusSessions') }}</span><strong>{{ focusSessionsInRange }}</strong></div>
              <div><span>{{ t('personalStats.focusAveragePerSession') }}</span><strong>{{ formatMinutes(focusAverageMinutesPerSession) }}</strong></div>
            </div>
            <div class="overview-context-meta">
              <span>{{ t('personalStats.focusActiveDays') }} <strong>{{ focusActiveDaysInRange }}</strong></span>
              <span class="metric-scope">{{ selectedRangeShortLabel }}</span>
            </div>
            <div v-if="overviewFocusTargets.length" class="overview-context-list focus-allocation-list">
              <span class="overview-context-label">{{ t('personalStats.focusAllocation') }}</span>
              <button v-for="target in overviewFocusTargets" :key="target.key" type="button" class="overview-highlight-row" :disabled="!canOpenFocusTarget(target)" @click="void handleOpenFocusTarget(target)">
                <span><strong :title="target.name">{{ target.name }}</strong><small>{{ getFocusTargetMeta(target.sessions) }}</small></span>
                <span class="overview-highlight-value"><strong>{{ formatMinutes(target.minutes) }}</strong></span>
              </button>
            </div>
            <div v-else class="overview-inline-empty">{{ t(focusSessionsInRange > 0 ? 'personalStats.noLinkedFocusTargets' : 'personalStats.noFocusInRange') }}</div>
          </article>

          <article v-else-if="cardId === 'growth-summary'" class="overview-summary-card growth-summary-card" data-card-id="growth-summary" v-bind="overviewDropBindings(cardId)">
            <OverviewCardEditorControls v-if="showOverviewCustomizer" v-bind="overviewEditorBindings(cardId)" />
            <header>
              <h3>{{ t('personalStats.overviewGrowthSummaryTitle') }}</h3>
              <button type="button" @click="activeStatsTab = 'growth'">{{ t('personalStats.viewDetails') }}</button>
            </header>
            <div class="overview-summary-value">Lv {{ rewardSnapshot.level }}</div>
            <p>{{ rewardSnapshot.totalXp }} XP · {{ rewardSnapshot.availableCoins }} {{ t('rewardPanel.availableCoins') }}</p>
            <div class="overview-summary-progress" role="progressbar" :aria-valuenow="rewardSnapshot.levelProgressPercent" aria-valuemin="0" aria-valuemax="100" :aria-label="getRewardLevelProgressLabel(rewardSnapshot.currentLevelXp, rewardSnapshot.nextLevelXp)"><span :style="{ width: `${rewardSnapshot.levelProgressPercent}%` }"></span></div>
            <div class="overview-context-meta"><span>{{ getRewardLevelProgressLabel(rewardSnapshot.currentLevelXp, rewardSnapshot.nextLevelXp) }}</span></div>
            <div class="overview-summary-stats"><span>{{ t('rewardPanel.badgeCount') }} <strong>{{ rewardSnapshot.badges.length }}</strong></span></div>
          </article>
        </template>
      </TransitionGroup>

      <div v-if="!hasVisibleOverviewCards" class="overview-empty-selection">
        <p>{{ t('personalStats.noCardsSelected') }}</p>
        <div class="overview-customizer-actions">
          <button type="button" class="overview-customize-btn" @click="beginOverviewEditing">{{ t('personalStats.addCards') }}</button>
          <button type="button" class="overview-customizer-reset" @click="resetOverviewCards">{{ t('personalStats.resetCards') }}</button>
        </div>
      </div>
    </section>

    <div v-else class="stats-board">
      <StatsSummaryView
        v-if="activeStatsTab === 'summary'"
        :tasks="scopedTasks"
        :habits="habits"
        :focus-records="focusRecords"
        :focus-session-records="focusSessionRecords"
        :habits-loading="habitsLoading"
        :focus-loading="focusLoading"
        :source-label="taskScopeLabel"
        :notebook-id="summaryNotebookId"
        @open-task="handleOpenTask"
      />

      <section v-if="activeStatsTab === 'tasks'" class="stats-panel tasks-panel">
        <div class="panel-head">
          <div class="task-panel-head-copy">
            <div class="task-panel-head-top">
              <h3>{{ t('personalStats.taskReviewTitle') }}</h3>
            </div>
            <p>{{ formatTemplate('personalStats.taskReviewSummaryTemplate', { scope: taskScopeLabel }) }}</p>
          </div>
          <div class="panel-head-actions">
            <span class="panel-chip" :title="t('personalStats.taskFlowDeltaHint')">{{ taskFlowDeltaLabel }}</span>
          </div>
        </div>

        <div class="panel-body">
          <div v-if="taskTotalCount === 0" class="panel-empty">{{ t('personalStats.noTaskReviewData') }}</div>
          <template v-else>
          <div class="task-metric-groups">
            <section class="task-metric-group">
              <div class="task-section-head">
                <h4>{{ t('personalStats.taskPeriodPerformance') }}</h4>
                <span class="metric-scope">{{ selectedRangeLabel }}</span>
              </div>
              <div class="mini-stat-grid">
                <button
                  v-for="metric in taskPeriodMetrics"
                  :key="metric.key"
                  type="button"
                  class="mini-stat-card task-metric-action"
                  :class="{ active: selectedTaskMetric === metric.key }"
                  :disabled="metric.count === 0"
                  :aria-expanded="selectedTaskMetric === metric.key"
                  aria-controls="task-period-details"
                  @click="selectedTaskMetric = selectedTaskMetric === metric.key ? null : metric.key"
                >
                  <span class="mini-stat-label">{{ metric.label }}</span>
                  <strong class="mini-stat-value">{{ metric.count }}</strong>
                  <span class="task-metric-hint">{{ t('personalStats.taskMetricViewDetails') }} <span aria-hidden="true">↓</span></span>
                </button>
              </div>
            </section>
            <section class="task-metric-group">
              <div class="task-section-head">
                <h4>{{ t('personalStats.taskCurrentSituation') }}</h4>
                <span class="metric-scope">{{ t('personalStats.taskCurrentScope') }}</span>
              </div>
              <div class="mini-stat-grid">
                <button
                  v-for="metric in taskCurrentMetrics"
                  :key="metric.key"
                  type="button"
                  class="mini-stat-card task-metric-action"
                  :class="metric.key"
                  :disabled="metric.count === 0"
                  @click="handleDrilldown(metric.payload)"
                >
                  <span class="mini-stat-label">{{ metric.label }}</span>
                  <strong class="mini-stat-value">{{ metric.count }}</strong>
                  <span class="task-metric-hint">{{ t('personalStats.taskMetricViewTable') }} <span aria-hidden="true">→</span></span>
                </button>
              </div>
            </section>
          </div>

          <div v-if="undoCompletion" class="task-undo-notice" role="status" aria-live="polite">
            <span>{{ formatTemplate('personalStats.taskCompletedNotice', { title: getTaskDisplayTitle(undoCompletion.previous) }) }}</span>
            <button type="button" :disabled="undoInProgress" @click="void handleUndoReviewCompletion()">{{ t('personalStats.taskUndoComplete') }}</button>
            <span v-if="undoError" class="task-review-error" role="alert">{{ undoError }}</span>
          </div>

          <section v-if="selectedTaskMetric" id="task-period-details" class="review-detail-block task-period-details">
            <div class="task-section-head">
              <h4>{{ formatRangeMetricLabel(selectedRangeShortLabel, t(selectedTaskMetric === 'created' ? 'personalStats.taskCreated' : 'personalStats.taskCompleted')) }} · {{ taskPeriodDetailTasks.length }}</h4>
              <button type="button" class="overview-link-action" @click="selectedTaskMetric = null">{{ t('personalStats.collapseCardList') }}</button>
            </div>
            <p class="task-scope-note">{{ t('personalStats.taskPeriodScopeHint') }}</p>
            <div v-if="taskPeriodDetailTasks.length" class="task-period-list">
              <button v-for="task in taskPeriodDetailTasks" :key="task.id" type="button" class="stuck-item" :disabled="!task.blockId" @click="void handleOpenTask(task)">
                <span class="stuck-main">
                  <span class="stuck-title">{{ getTaskDisplayTitle(task) }}</span>
                  <span class="stuck-meta">{{ getTaskSourceLabel(task) }} · {{ toLocalDateKey(selectedTaskMetric === 'created' ? task.createdAt : task.completedAt) }}</span>
                </span>
                <span class="stuck-badge">{{ task.archived ? t('personalStats.taskArchived') : getTaskStatusText(task.status) }}</span>
              </button>
            </div>
            <div v-else class="inline-empty">{{ t('personalStats.taskNoPeriodDetails') }}</div>
          </section>

          <section class="task-current-review">
            <div class="task-section-head">
              <h4>{{ t('personalStats.taskNeedsAttention') }}</h4>
              <button type="button" class="overview-link-action" :disabled="archivedTaskCount === 0" @click="handleDrilldown({ title: t('personalStats.reviewActionArchivedTitle'), target: 'archive-table' })">
                {{ t('personalStats.reviewActionArchived') }} · {{ archivedTaskCount }}
              </button>
            </div>
            <p class="task-scope-note">{{ t('personalStats.taskCurrentScopeHint') }}</p>
            <div class="status-pills task-status-pills">
              <button v-for="item in taskStatusSummary" :key="item.label" type="button" class="status-pill" :class="item.tone" :disabled="!item.payload || item.count === 0" @click="item.payload ? handleDrilldown(item.payload) : undefined">
                {{ item.label }} {{ item.count }}
              </button>
            </div>
            <div class="review-detail-grid task-attention-grid">
            <div v-for="panel in taskReviewPanels" :key="panel.key" class="review-detail-block" :class="`${panel.key}-review-block`">
                <div class="list-block-head">
                  <span>{{ panel.title }}</span>
                  <span class="list-block-subtle">{{ panel.subtitle }}</span>
                </div>
                <template v-if="panel.key === 'priorities'">
                  <button type="button" class="overview-link-action task-priority-picker-toggle" :aria-expanded="showPriorityPicker" @click="showPriorityPicker = !showPriorityPicker">{{ t('personalStats.chooseTodayPriorities') }}</button>
                  <div v-if="showPriorityPicker" class="task-priority-picker">
                    <div class="task-priority-selected">
                      <button v-for="id in todayPriorityIds" :key="id" type="button" @click="toggleTodayPriority(id)">{{ getTodayPriorityLabel(id) }} ×</button>
                    </div>
                    <input v-model="prioritySearch" type="search" :placeholder="t('personalStats.prioritySearch')" :aria-label="t('personalStats.prioritySearch')" />
                    <p class="task-scope-note">{{ t('personalStats.priorityLimitHint') }}</p>
                    <div class="task-priority-options">
                      <button v-for="task in priorityCandidates" :key="task.id" type="button" :disabled="todayPriorityIds.length >= 3 && !todayPriorityIds.includes(task.id)" :aria-pressed="todayPriorityIds.includes(task.id)" @click="toggleTodayPriority(task.id)">{{ getTaskDisplayTitle(task) }} <span aria-hidden="true">{{ todayPriorityIds.includes(task.id) ? '✓' : '+' }}</span></button>
                    </div>
                    <div v-if="!priorityCandidates.length" class="inline-empty">{{ t('personalStats.noPriorityCandidates') }}</div>
                  </div>
                  <p v-if="prioritySaveError" class="task-review-error" role="alert">{{ t('personalStats.prioritySaveFailed') }}</p>
                </template>
                <div v-if="panel.key === 'inbox'" class="task-inbox-switch" role="group" :aria-label="t('personalStats.taskInboxTitle')">
                  <button type="button" :aria-pressed="inboxFilter === 'unplanned'" @click="inboxFilter = 'unplanned'; showAllInboxTasks = false">{{ t('personalStats.taskUnplanned') }} {{ unplannedTasks.length }}</button>
                  <button type="button" :aria-pressed="inboxFilter === 'uncategorized'" @click="inboxFilter = 'uncategorized'; showAllInboxTasks = false">{{ t('personalStats.taskUncategorized') }} {{ uncategorizedTasks.length }}</button>
                </div>
                <div v-if="panel.entries.length === 0" class="inline-empty">
                {{ panel.emptyLabel }}
                </div>
              <div v-else class="stuck-list">
                <article
                  v-for="entry in panel.entries"
                  :key="entry.task.id"
                  :class="`${panel.key}-task-row`"
                  :aria-busy="pendingTaskIds.includes(entry.task.id)"
                >
                  <div class="stuck-task-row-content">
                    <button type="button" class="stuck-task-open" :disabled="!entry.task.blockId" @click="void handleOpenTask(entry.task)">
                      <span class="stuck-title">{{ entry.title }}</span>
                      <span class="stuck-meta">{{ entry.sourceLabel }}</span>
                    </button>
                    <span class="stuck-badge">{{ entry.statusLabel }}</span>
                    <div class="stuck-task-footer">
                      <span class="stuck-reasons">
                        <span v-if="panel.key === 'priorities' && entry.task.dueDate === todayKey" class="stuck-reason today-deadline">{{ t('personalStats.taskDueToday') }} {{ entry.task.dueTime || '' }}</span>
                        <span v-if="panel.key === 'upcoming'" class="stuck-reason">{{ entry.task.dueDate }} {{ entry.task.dueTime || '' }} · {{ formatTemplate('personalStats.goalDaysRemainingTemplate', { days: entry.daysRemaining ?? 0 }) }}</span>
                        <span v-if="entry.overdueDays > 0" class="stuck-reason overdue">{{ getOverdueDaysText(entry.overdueDays) }}</span>
                        <span v-if="entry.daysSinceUpdate >= 7" class="stuck-reason">{{ formatTemplate('personalStats.taskIdleDaysTemplate', { days: entry.daysSinceUpdate }) }}</span>
                        <span v-if="panel.key === 'inbox' && entry.needsSchedule" class="stuck-reason">{{ t('personalStats.taskUnplanned') }}</span>
                        <span v-if="panel.key === 'inbox' && entry.needsCategory" class="stuck-reason">{{ t('personalStats.taskUncategorized') }}</span>
                      </span>
                      <div class="stuck-task-actions">
                        <button type="button" class="task-complete-action" :disabled="!completeTask || !entry.task.blockId || pendingTaskIds.includes(entry.task.id)" :aria-label="formatTemplate('personalStats.taskCompleteAria', { title: entry.title })" @click="void handleCompleteReviewTask(entry.task)">{{ t('personalStats.taskCompleteAction') }}</button>
                        <button type="button" class="task-reschedule-action" :disabled="!rescheduleTask || !entry.task.blockId || pendingTaskIds.includes(entry.task.id)" :aria-expanded="rescheduleTaskId === entry.task.id && reschedulePanelKey === panel.key" @click="toggleReviewTaskDate(entry.task, panel.key)">{{ t('personalStats.taskRescheduleAction') }}</button>
                        <button v-if="panel.key === 'inbox'" type="button" class="task-organize-action" :disabled="!entry.task.blockId || pendingTaskIds.includes(entry.task.id)" @click="emit('edit-task', entry.task, $event)">{{ t('personalStats.taskOrganize') }}</button>
                        <button v-if="panel.key === 'priorities' && todayPriorityIds.includes(entry.task.id)" type="button" class="task-priority-remove" :aria-label="formatTemplate('personalStats.removePriorityAria', { title: entry.title })" @click="toggleTodayPriority(entry.task.id)">{{ t('personalStats.removePriority') }}</button>
                      </div>
                    </div>
                  </div>
                  <div v-if="rescheduleTaskId === entry.task.id && reschedulePanelKey === panel.key" class="task-reschedule-menu" @keydown.esc.stop="rescheduleTaskId = null">
                    <div class="task-reschedule-presets">
                      <button v-for="preset in reviewDatePresets" :key="preset.key" type="button" :disabled="pendingTaskIds.includes(entry.task.id) || (!!entry.task.startDate && preset.date < entry.task.startDate)" @click="void handleRescheduleReviewTask(entry.task, preset.date)">{{ preset.label }}</button>
                    </div>
                    <form class="task-reschedule-custom" @submit.prevent="void handleRescheduleReviewTask(entry.task, reviewDueDateDraft)">
                      <input v-model="reviewDueDateDraft" type="date" :min="entry.task.startDate || undefined" :disabled="pendingTaskIds.includes(entry.task.id)" :aria-label="t('taskManager.dueDate')" required />
                      <button type="submit" :disabled="pendingTaskIds.includes(entry.task.id) || !reviewDueDateDraft || (!!entry.task.startDate && reviewDueDateDraft < entry.task.startDate)">{{ t('personalStats.taskApplyDate') }}</button>
                      <button type="button" :disabled="pendingTaskIds.includes(entry.task.id)" @click="rescheduleTaskId = null">{{ t('personalStats.cancelCards') }}</button>
                    </form>
                    <p v-if="entry.task.startDate" class="task-scope-note">{{ formatTemplate('personalStats.taskDateMinimumTemplate', { date: entry.task.startDate }) }}</p>
                  </div>
                  <p v-if="reviewTaskErrors[entry.task.id]" class="task-review-error" role="alert">{{ reviewTaskErrors[entry.task.id] }}</p>
                </article>
              </div>
              <button v-if="panel.key === 'upcoming' && upcomingDeadlineTasks.length > 5" type="button" class="overview-link-action" :aria-expanded="showAllUpcomingReviewTasks" @click="showAllUpcomingReviewTasks = !showAllUpcomingReviewTasks">{{ showAllUpcomingReviewTasks ? t('personalStats.collapseCardList') : formatTemplate('personalStats.expandCardListTemplate', { count: upcomingDeadlineTasks.length }) }}</button>
              <button v-if="panel.key === 'inbox' && inboxTasks.length > 5" type="button" class="overview-link-action" :aria-expanded="showAllInboxTasks" @click="showAllInboxTasks = !showAllInboxTasks">{{ showAllInboxTasks ? t('personalStats.collapseCardList') : formatTemplate('personalStats.expandCardListTemplate', { count: inboxTasks.length }) }}</button>
              <button v-if="panel.key === 'stuck' && stuckReviewTasks.length > 5" type="button" class="overview-link-action" :aria-expanded="showAllStuckReviewTasks" @click="showAllStuckReviewTasks = !showAllStuckReviewTasks">{{ showAllStuckReviewTasks ? t('personalStats.collapseCardList') : formatTemplate('personalStats.expandCardListTemplate', { count: stuckReviewTasks.length }) }}</button>
            </div>

            </div>
          </section>

            <div class="trend-stack">
            <div class="task-trend-layout">
              <div class="task-trend-desktop">
              <div class="task-trend-chart">
                <div class="task-trend-chart-head">
                  <div class="task-trend-chart-title">
                    <strong>{{ formatTemplate('personalStats.taskTrendTitleTemplate', { range: selectedRangeLabel }) }}</strong>
                    <span>{{ t('personalStats.taskCreatedCompleted') }}</span>
                  </div>
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
                      class="task-trend-chart-svg ariaLabel"
                      :viewBox="taskTrendDesktopViewBox"
                      preserveAspectRatio="none"
                      role="img"
                      :aria-label="t('personalStats.taskTrendChartAria')"
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
                      <line
                        v-for="(point, index) in taskTrendDesktopAxisPoints"
                        :key="`task-trend-grid-vertical-${point.key}`"
                        class="task-trend-grid-line vertical"
                        :x1="getTaskTrendChartX(index, taskTrendDesktopAxisPoints.length)"
                        y1="6"
                        :x2="getTaskTrendChartX(index, taskTrendDesktopAxisPoints.length)"
                        :y2="62"
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
                          <title>{{ formatTemplate('personalStats.taskPointTitleTemplate', {
                            label: point.label,
                            series: series.label,
                            count: point.count
                          }) }}</title>
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
                          class="task-trend-dot ariaLabel"
                          :class="series.key"
                          :style="getTaskTrendPointStyle(point)"
                          :aria-label="formatTemplate('personalStats.taskPointTitleTemplate', {
                            label: point.label,
                            series: series.label,
                            count: point.count
                          })"
                        ></span>
                      </template>
                    </div>
                    </div>

                    <div class="task-trend-chart-labels" :style="taskTrendColumnsStyle">
                      <div
                        v-for="point in taskTrendDesktopAxisPoints"
                        :key="point.key"
                        class="task-trend-chart-label ariaLabel"
                        :aria-label="formatTemplate('personalStats.taskAxisTitleTemplate', {
                          label: point.label,
                          created: point.created,
                          completed: point.completed
                        })"
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
                  <span>{{ t('personalStats.taskPeriodComparisonTitle') }}</span>
                  <span class="list-block-subtle">{{ t('personalStats.taskPeriodComparisonSubtitle') }}</span>
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
              <div class="mobile-trend-switch ariaLabel" role="tablist" :aria-label="t('personalStats.taskTrendPaginationAria')">
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
                  <span class="list-block-subtle">{{ formatTemplate('personalStats.taskTrendPageViewTemplate', {
                    range: selectedRangeShortLabel
                  }) }}</span>
                </div>
                <div class="trend-row mobile-trend-row">
                  <div class="trend-row-bars mobile-trend-bars" :style="taskTrendColumnsStyle">
                    <div
                      v-for="point in activeTaskTrendSection.points"
                      :key="`mobile-${activeTaskTrendSection.key}-${point.key}`"
                      class="trend-row-bar ariaLabel"
                      :aria-label="formatTemplate('personalStats.taskPointTitleTemplate', {
                        label: point.label,
                        series: activeTaskTrendSection.label,
                        count: point.count
                      })"
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

          <section class="task-distribution-review">
            <div class="task-section-head">
              <h4>{{ t('personalStats.taskDistributionTitle') }}</h4>
              <span class="metric-scope">{{ t('personalStats.currentTaskPool') }}</span>
            </div>
            <p class="task-scope-note">{{ t('personalStats.taskDistributionScopeHint') }}</p>
            <div class="review-detail-grid task-distribution-grid">
            <div class="review-detail-block">
                <div class="list-block-head">
                  <span>{{ t('personalStats.tagCompletionTitle') }}</span>
                  <span class="list-block-subtle">{{ t('personalStats.currentTaskPool') }}</span>
                </div>
                <div v-if="tagCompletionRates.length === 0" class="inline-empty">
                {{ t('personalStats.noTaskTags') }}
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
                  <div class="rate-item-meta">{{ formatTemplate('personalStats.completionRateMetaTemplate', {
                    completed: item.completed,
                    total: item.total
                  }) }}</div>
                </div>
              </div>
            </div>

            <div class="review-detail-block">
                <div class="list-block-head">
                  <span>{{ t('personalStats.sourceCompletionTitle') }}</span>
                  <span class="list-block-subtle">{{ t('personalStats.currentTaskPool') }}</span>
                </div>
                <div v-if="sourceCompletionRates.length === 0" class="inline-empty">
                {{ t('personalStats.noTaskSources') }}
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
                  <div class="rate-item-meta">{{ formatTemplate('personalStats.completionRateMetaTemplate', {
                    completed: item.completed,
                    total: item.total
                  }) }}</div>
                </div>
              </div>
            </div>
            </div>
          </section>
          </template>
        </div>
      </section>

      <RhythmWorkbench
        v-if="activeStatsTab === 'rhythm'"
        class="rhythm-workbench-section"
        :habits="habits"
        :habits-loading="habitsLoading"
        :focus-loading="focusLoading"
        :focus-records="focusRecords"
        :focus-session-records="focusSessionRecords"
        :period-focus-sessions="focusTrackedSessionsInRange"
        :tasks="scopedTasks"
        :today-key="todayKey"
        :selected-range-label="selectedRangeShortLabel"
        @open-habit="handleOpenDetail({ target: 'habit-detail', habitId: $event })"
        @open-focus-record="void handleWorkbenchFocusRecord($event)"
      />

      <section v-if="activeStatsTab === 'rhythm'" class="stats-panel habits-panel">
        <div class="panel-head">
          <div class="panel-head-copy">
            <div class="panel-head-top">
              <h3>{{ t('personalStats.habitsTitle') }}</h3>
              <div class="panel-head-actions">
                <button
                  type="button"
                  class="panel-link-btn"
                  @click="handleOpenDetail({ target: 'habit-total' })"
                >
                  {{ t('personalStats.habitsOverview') }}
                </button>
                <span class="panel-chip">{{ selectedRangeShortLabel }}</span>
              </div>
            </div>
            <p>{{ t('personalStats.habitsSummary') }}</p>
          </div>
        </div>

        <div class="panel-body">
          <div v-if="habitsLoading" class="panel-empty">{{ t('personalStats.loadingHabits') }}</div>
          <template v-else>
          <div v-if="totalHabitsCount === 0" class="panel-empty">{{ t('personalStats.noHabits') }}</div>
          <template v-else>
            <p class="task-scope-note">{{ t('personalStats.rhythmHabitStatsScope') }}</p>
            <div class="mini-stat-grid">
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('personalStats.activeHabits') }}</span>
                <strong class="mini-stat-value">{{ activeHabitsCount }}</strong>
              </article>
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ formatRangeMetricLabel(selectedRangeShortLabel, t('personalStats.habitCheckins')) }}</span>
                <strong class="mini-stat-value">{{ habitCompletionsInRange }}</strong>
              </article>
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('personalStats.longestHabitStreak') }}</span>
                <strong class="mini-stat-value">{{ getDayCountLabel(longestHabitRangeStreak) }}</strong>
              </article>
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('habitTracker.completionRate') }}</span>
                <strong class="mini-stat-value">{{ habitCompletionRateInRange }}%</strong>
              </article>
            </div>

            <div class="trend-block">
              <div class="list-block-head">
                <span>{{ formatTemplate('personalStats.habitsTrendTitleTemplate', { range: selectedRangeLabel }) }}</span>
                <span class="list-block-subtle">{{ t('personalStats.habitsTrendSubtitle') }}</span>
              </div>
              <div class="trend-bars">
                <div
                  v-for="point in habitTrend"
                  :key="point.key"
                  class="trend-bar-item ariaLabel"
                  :aria-label="formatTemplate('personalStats.habitTrendPointTitleTemplate', {
                    label: point.label,
                    count: point.count
                  })"
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
                <span>{{ t('personalStats.topHabitsTitle') }}</span>
                <span class="list-block-subtle">{{ t('personalStats.topHabitsSubtitle') }}</span>
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
                      <div class="rank-meta">{{ getHabitRankMeta(habit.completions, habit.rate) }}</div>
                    </div>
                  </div>
                  <span class="rank-badge">{{ getDayCountLabel(habit.streak) }}</span>
                </button>
              </div>
            </div>
          </template>
          </template>
        </div>
      </section>

      <section v-if="activeStatsTab === 'rhythm'" class="stats-panel focus-panel">
        <div class="panel-head">
          <div class="panel-head-copy">
            <div class="panel-head-top">
              <h3>{{ t('focusTimer.title') }}</h3>
              <div class="panel-head-actions">
                <span class="panel-chip">{{ selectedRangeShortLabel }}</span>
              </div>
            </div>
            <p>{{ t('personalStats.focusSummary') }}</p>
          </div>
        </div>

        <div class="panel-body">
          <div v-if="focusLoading" class="panel-empty">{{ t('personalStats.loadingFocus') }}</div>
          <template v-else>
          <div v-if="focusSessionsInRange === 0" class="panel-empty">{{ t('personalStats.noFocusInRange') }}</div>
          <template v-else>
            <div class="mini-stat-grid">
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ formatRangeMetricLabel(selectedRangeShortLabel, t('personalStats.focusDuration')) }}</span>
                <strong class="mini-stat-value">{{ formatMinutes(focusMinutesInRange) }}</strong>
              </article>
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ formatRangeMetricLabel(selectedRangeShortLabel, t('personalStats.focusSessions')) }}</span>
                <strong class="mini-stat-value">{{ focusSessionsInRange }}</strong>
              </article>
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('personalStats.focusActiveDays') }}</span>
                <strong class="mini-stat-value">{{ focusActiveDaysInRange }}</strong>
              </article>
              <article class="mini-stat-card">
                <span class="mini-stat-label">{{ t('personalStats.focusAveragePerSession') }}</span>
                <strong class="mini-stat-value">{{ formatMinutes(focusAverageMinutesPerSession) }}</strong>
              </article>
            </div>

             <div class="trend-block">
               <div class="list-block-head">
                 <span>{{ formatTemplate('personalStats.focusTrendTitleTemplate', { range: selectedRangeLabel }) }}</span>
                 <span class="list-block-subtle">{{ t('personalStats.focusTrendSubtitle') }}</span>
               </div>
              <div class="trend-bars">
                <div
                  v-for="point in focusTrend"
                  :key="point.key"
                  class="trend-bar-item ariaLabel"
                  :aria-label="formatTemplate('personalStats.focusTrendPointTitleTemplate', {
                    label: point.label,
                    count: point.count
                  })"
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
                  <span>{{ t('personalStats.focusTopHabitsTitle') }}</span>
                  <span class="list-block-subtle">{{ getItemCountLabel(focusTopHabits.length) }}</span>
                </div>
                <div v-if="focusTopHabits.length === 0" class="inline-empty">
                  {{ t('personalStats.noFocusHabitLinks') }}
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
                      <div class="focus-target-meta">{{ getFocusTargetMeta(item.sessions) }}</div>
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
                  <span>{{ t('personalStats.focusTopTasksTitle') }}</span>
                  <span class="list-block-subtle">{{ getItemCountLabel(focusTopTasks.length) }}</span>
                </div>
                <div v-if="focusTopTasks.length === 0" class="inline-empty">
                  {{ t('personalStats.noFocusTaskLinks') }}
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
                      <div class="focus-target-meta">{{ getFocusTargetMeta(item.sessions) }}</div>
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

      <GrowthWorkbench
        v-if="activeStatsTab === 'growth'"
        class="rewards-panel"
        :snapshot="rewardSnapshot"
        :entries="rewardEntries"
        :redemptions="rewardRedemptions"
        :loading="rewardsLoading"
        :error="rewardLoadError"
        :range-label="selectedRangeLabel"
        :start-key="currentRange.startKey"
        :end-exclusive-key="currentRange.endExclusiveKey"
        @open-manager="handleOpenDetail({ target: 'reward' })"
        @refresh="void loadRewardData(true)"
      />

      <GoalWorkbench
        v-if="activeStatsTab === 'goals'"
        class="goals-panel"
        :goals="goalItems"
        :tasks="goalTasks"
        :tasks-loading="goalTasksLoading"
        :pending-task-ids="pendingTaskIds"
        :today-key="todayKey"
        @open-manager="handleOpenDetail({ target: 'goal' })"
        @open-detail="goalId => handleOpenDetail({ target: 'goal', goalId })"
        @open-goal="handleOpenGoalKanban"
        @open-task="handleOpenTask"
        @create-task="goalId => emit('create-goal-task', goalId)"
      >
        <template #notice>
          <div v-if="undoCompletion" class="task-undo-notice" role="status" aria-live="polite">
            <span>{{ formatTemplate('personalStats.taskCompletedNotice', { title: getTaskDisplayTitle(undoCompletion.previous) }) }}</span>
            <button type="button" :disabled="undoInProgress" @click="void handleUndoReviewCompletion()">{{ t('personalStats.taskUndoComplete') }}</button>
            <span v-if="undoError" class="task-review-error" role="alert">{{ undoError }}</span>
          </div>
        </template>
        <template #task-actions="{ task, goal }">
          <div class="stuck-task-actions goal-next-task-actions">
            <button type="button" class="task-complete-action" :disabled="!completeTask || pendingTaskIds.includes(task.id)" :aria-label="formatTemplate('personalStats.taskCompleteAria', { title: getTaskDisplayTitle(task) })" @click="void handleCompleteReviewTask(task)">{{ t('personalStats.taskCompleteAction') }}</button>
            <button type="button" class="task-reschedule-action" :disabled="!rescheduleTask || pendingTaskIds.includes(task.id)" :aria-expanded="rescheduleTaskId === task.id && reschedulePanelKey === `goal-next-${goal.id}`" @click="toggleReviewTaskDate(task, `goal-next-${goal.id}`)">{{ t('personalStats.taskRescheduleAction') }}</button>
          </div>
        </template>
        <template #task-details="{ task, goal }">
          <div v-if="rescheduleTaskId === task.id && reschedulePanelKey === `goal-next-${goal.id}`" class="task-reschedule-menu goal-action-date-menu" @keydown.esc.stop="rescheduleTaskId = null">
            <div class="task-reschedule-presets">
              <button v-for="preset in reviewDatePresets" :key="preset.key" type="button" :disabled="pendingTaskIds.includes(task.id) || (!!task.startDate && preset.date < task.startDate)" @click="void handleRescheduleReviewTask(task, preset.date)">{{ preset.label }}</button>
            </div>
            <form class="task-reschedule-custom" @submit.prevent="void handleRescheduleReviewTask(task, reviewDueDateDraft)">
              <input v-model="reviewDueDateDraft" type="date" :min="task.startDate || undefined" :disabled="pendingTaskIds.includes(task.id)" :aria-label="t('taskManager.dueDate')" required />
              <button type="submit" :disabled="pendingTaskIds.includes(task.id) || !reviewDueDateDraft || (!!task.startDate && reviewDueDateDraft < task.startDate)">{{ t('personalStats.taskApplyDate') }}</button>
              <button type="button" :disabled="pendingTaskIds.includes(task.id)" @click="rescheduleTaskId = null">{{ t('personalStats.cancelCards') }}</button>
            </form>
            <p v-if="task.startDate" class="task-scope-note">{{ formatTemplate('personalStats.taskDateMinimumTemplate', { date: task.startDate }) }}</p>
          </div>
          <p v-if="reviewTaskErrors[task.id]" class="task-review-error goal-action-error" role="alert">{{ reviewTaskErrors[task.id] }}</p>
        </template>
      </GoalWorkbench>
    </div>
    </div>

    <aside v-if="activeStatsTab === 'overview' && showOverviewCustomizer" class="overview-customizer" :aria-label="t('personalStats.editOverview')">
      <header class="overview-customizer-head">
        <h3 ref="overviewEditorHeading" tabindex="-1">{{ t('personalStats.editOverview') }}</h3>
        <p>{{ t('personalStats.customizeCardsSummary') }}</p>
        <div class="overview-customizer-status" role="status" aria-live="polite">
          <span>{{ formatTemplate('personalStats.selectedCardsTemplate', { count: visibleOptionalOverviewCardCount }) }}</span>
          <span v-if="overviewCardsDirty" class="overview-unsaved">{{ t('personalStats.unsavedCards') }}</span>
        </div>
      </header>
      <div class="overview-customizer-body">
        <fieldset v-for="group in overviewCardGroups" :key="group.id" class="overview-card-group">
          <legend>{{ group.label }}</legend>
          <div class="overview-card-options">
            <label v-for="card in group.cards" :key="card.id" class="overview-card-option" :class="{ 'is-selected': draftOverviewCardIds.includes(card.id) }">
              <input v-model="draftOverviewCardIds" type="checkbox" :value="card.id" />
              <TaskCheckbox :checked="draftOverviewCardIds.includes(card.id)" :size="18" aria-hidden="true" focusable="false" />
              <span><strong>{{ card.label }}</strong><small>{{ card.description }}</small></span>
            </label>
          </div>
        </fieldset>
      </div>
      <footer class="overview-customizer-footer">
        <p v-if="overviewSaveStatus === 'error'" class="overview-save-status is-error" role="status" aria-live="polite">{{ t('personalStats.saveCardsFailed') }}</p>
        <div class="overview-customizer-actions">
          <button type="button" class="overview-customizer-reset" @click="resetOverviewCards">{{ t('personalStats.resetCards') }}</button>
          <button type="button" class="overview-customizer-cancel" @click="cancelOverviewEditing">{{ t('personalStats.cancelCards') }}</button>
          <button type="button" class="overview-customizer-save" @click="commitOverviewCards">{{ t('personalStats.saveCards') }}</button>
        </div>
      </footer>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, TransitionGroup, watch } from 'vue';
import { showMessage } from 'siyuan';
import OverviewCardEditorControls from './OverviewCardEditorControls.vue';
import StatsSummaryView from './StatsSummaryView.vue';
import RhythmWorkbench from './RhythmWorkbench.vue';
import GoalWorkbench from './GoalWorkbench.vue';
import GrowthWorkbench from './GrowthWorkbench.vue';
import TaskCheckbox from './TaskCheckbox.vue';
import {
  getFocusTimerData,
  getHabits,
  loadTaskGroups,
  openBlockById,
  type DailyFocusRecord,
  type FocusSessionRecord,
  type Habit,
  type Task,
  type TaskGroup
} from '@/api';
import type { GoalListItem } from '@/composables/useGoals';
import { isHabitScheduledOnDate } from '@/composables/useHabitUtils';
import {
  createEmptyRewardSnapshot,
  getRewardWorkbenchData,
  type RewardLedgerEntry,
  type RewardRedemption,
  type RewardSnapshot,
} from '@/rewardRepository';
import { formatTemplate, useI18n } from '@/composables/useI18n';
import { eventBus, Events } from '@/utils/eventBus';
import { openTaskViewByRequest } from '@/main';
import { buildGoalDocumentSource } from '@/utils/documentGroupSource';
import { resolveTaskTagIds } from '@/utils/taskTags';
import { getTaskTitlePlainText } from '@/utils/taskHtml';
import { getHabitDayProgress, getWorkbenchWeekProgress, summarizeWorkbenchHabit } from '@/utils/personalStatsHabitProgress';
import { getEffectiveGoalIdsForTask } from '@/utils/goalTaskMembership';
import { createPersonalStatsGreeting, createPersonalStatsQuote, getGreetingContextKey } from '@/utils/personalStatsGreeting';

type StatsRangeKey = 'today' | '7d' | '30d' | 'month';
type StatsViewTab = 'overview' | 'tasks' | 'rhythm' | 'goals' | 'growth' | 'summary';
type OverviewCardId =
  | 'kpi-task'
  | 'kpi-focus'
  | 'kpi-habit'
  | 'kpi-backlog'
  | 'activity'
  | 'attention'
  | 'focus-summary'
  | 'growth-summary'
  | 'today-actions'
  | 'upcoming-deadlines'
  | 'stagnant-tasks'
  | 'today-habits'
  | 'unscheduled-tasks'
  | 'estimate-vs-actual'
  | 'goal-progress-detail'
  | 'habit-rhythm'
  | 'recent-activity';
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
  fulfilled: number;
  target: number;
  rate: number;
  streak: number;
  createdAt: string;
}

interface TaskPeriodComparisonCard {
  label: string;
  currentValue: string;
  previousValue: string;
  deltaLabel: string;
  detail: string;
  tone: 'up' | 'down' | 'flat';
}

interface StuckTaskEntry {
  task: Task;
  title: string;
  sourceLabel: string;
  daysSinceUpdate: number;
  overdueDays: number;
  statusLabel: string;
  daysRemaining?: number;
  needsSchedule?: boolean;
  needsCategory?: boolean;
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

interface OverviewTrendSeries {
  key: 'tasks' | 'focus' | 'habits';
  label: string;
  total: string;
  tone: 'tasks' | 'focus' | 'habits';
  max: number;
  ariaLabel: string;
  points: Array<TrendPoint & { ariaLabel: string }>;
}

interface OverviewCardOption {
  id: OverviewCardId;
  label: string;
  description: string;
}

interface HabitHeatPoint {
  key: string;
  level: 0 | 1 | 2 | 3 | 4;
  ariaLabel: string;
}

interface RecentOverviewActivity {
  key: string;
  kind: 'task' | 'focus' | 'habit';
  kindLabel: string;
  title: string;
  timeLabel: string;
  timestamp: number;
  actionable: boolean;
  task?: Task;
  habitId?: string;
}

interface OverviewAttentionItem {
  key: string;
  title: string;
  detail: string;
  value: string;
  tone: 'danger' | 'warning' | 'notice';
  targetTab: Exclude<StatsViewTab, 'overview' | 'growth'>;
  payload?: StatsDrilldownPayload;
}

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
const OVERVIEW_CARDS_STORAGE_KEY = 'pinch.personal-stats.overview-cards';
const LEGACY_OVERVIEW_CARD_IDS = {
  'task-status': 'today-actions',
  'habit-summary': 'habit-rhythm',
  'goals-summary': 'goal-progress-detail',
  'period-comparison': 'activity'
} as const satisfies Record<string, OverviewCardId>;
const CORE_OVERVIEW_CARD_IDS: OverviewCardId[] = [
  'kpi-task',
  'kpi-focus',
  'kpi-habit',
  'kpi-backlog'
];
const DEFAULT_OVERVIEW_CARD_IDS: OverviewCardId[] = [
  ...CORE_OVERVIEW_CARD_IDS,
  'activity',
  'attention'
];
const OVERVIEW_CARD_GROUPS: Array<{ id: string; labelKey: string; ids: OverviewCardId[] }> = [
  { id: 'metrics', labelKey: 'personalStats.cardGroupMetrics', ids: CORE_OVERVIEW_CARD_IDS },
  { id: 'trends', labelKey: 'personalStats.cardGroupTrends', ids: ['activity', 'attention'] },
  { id: 'details', labelKey: 'personalStats.cardGroupDetails', ids: ['today-actions', 'upcoming-deadlines', 'stagnant-tasks', 'today-habits', 'unscheduled-tasks', 'goal-progress-detail', 'habit-rhythm', 'recent-activity'] },
  { id: 'summaries', labelKey: 'personalStats.cardGroupSummaries', ids: ['focus-summary', 'estimate-vs-actual', 'growth-summary'] }
];
const { t } = useI18n();
const greeting = ref(createPersonalStatsGreeting());
const dailyQuote = ref(createPersonalStatsQuote());
const workbenchDay = ref(formatLocalDateKey(new Date()));
let greetingTimer: ReturnType<typeof setInterval> | undefined;
const greetingTitle = computed(() => formatTemplate(greeting.value.messageKey, greeting.value.values));
const dailyQuoteSubtitle = computed(() => formatTemplate('personalStats.dailyQuoteTemplate', {
  date: formatTemplate('personalStats.quoteDateTemplate', dailyQuote.value.values),
  quote: t(dailyQuote.value.messageKey)
}));

function refreshGreeting(): void {
  const now = new Date();
  workbenchDay.value = formatLocalDateKey(now);
  if (getGreetingContextKey(now) !== greeting.value.contextKey) {
    greeting.value = createPersonalStatsGreeting(now);
  }
  const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  if (dateKey !== dailyQuote.value.dateKey) {
    dailyQuote.value = createPersonalStatsQuote(now);
  }
}

const formatRangeMetricLabel = (range: string, label: string): string => (
  formatTemplate('personalStats.rangeMetricTemplate', { range, label })
);

const getAllScopeLabel = (): string => t('personalStats.allScope');

const isAllScopeLabel = (value: string | undefined): boolean => {
  const normalized = value?.trim().toLowerCase();
  return !value
    || value === '全部'
    || value === getAllScopeLabel()
    || normalized === 'all';
};

const getOverdueDaysText = (days: number): string => (
  formatTemplate('personalStats.overdueDaysTemplate', { days })
);

const getDayCountLabel = (count: number): string => (
  formatTemplate('personalStats.dayCountTemplate', { count })
);

const getItemCountLabel = (count: number): string => (
  formatTemplate('personalStats.itemCountTemplate', { count })
);

const getHabitRankMeta = (count: number, rate: number): string => (
  formatTemplate('personalStats.habitRankMetaTemplate', { count, rate })
);

const getFocusTargetMeta = (count: number): string => (
  formatTemplate('personalStats.focusTargetMetaTemplate', { count })
);

const getRewardLevelProgressLabel = (current: number, next: number): string => (
  formatTemplate('personalStats.rewardLevelProgressTemplate', { current, next })
);

const props = withDefaults(defineProps<{
  tasks: Task[];
  taskGroups?: TaskGroup[];
  goalItems: GoalListItem[];
  goalTasks?: Task[];
  goalTasksLoading?: boolean;
  sourceLabel?: string;
  documentLabel?: string;
  completeTask?: (task: Task) => Promise<Task | void>;
  rescheduleTask?: (task: Task, dueDate: string) => Promise<void>;
  undoCompleteTask?: (completed: Task, previous: Task) => Promise<void>;
}>(), {
  taskGroups: () => [],
  goalTasks: () => [],
  goalTasksLoading: false,
  sourceLabel: '',
  documentLabel: ''
});

const emit = defineEmits<{
  (event: 'drilldown', payload: StatsDrilldownPayload): void;
  (event: 'open-detail', payload: StatsDetailPayload): void;
  (event: 'edit-task', task: Task, mouseEvent: MouseEvent): void;
  (event: 'create-goal-task', goalId: string): void;
}>();

const rangeOptions = computed<Array<{ value: StatsRangeKey; label: string }>>(() => [
  { value: 'today', label: t('personalStats.rangeToday') },
  { value: '7d', label: t('personalStats.range7d') },
  { value: '30d', label: t('personalStats.range30d') },
  { value: 'month', label: t('personalStats.rangeMonth') }
]);
const statsTabs = computed<Array<{ value: StatsViewTab; label: string }>>(() => [
  { value: 'overview', label: t('personalStats.overviewTab') },
  { value: 'tasks', label: t('personalStats.tasksTab') },
  { value: 'rhythm', label: t('personalStats.rhythmTab') },
  { value: 'goals', label: t('personalStats.goalsTab') },
  { value: 'growth', label: t('personalStats.growthTab') },
  { value: 'summary', label: t('personalStats.summaryTab') }
]);

const selectedRange = ref<StatsRangeKey>(loadSavedStatsRange());
const activeStatsTab = ref<StatsViewTab>('overview');
const overviewCardIds = ref<OverviewCardId[]>(loadSavedOverviewCards());
const showOverviewCustomizer = ref(false);
const draftOverviewCardIds = ref<OverviewCardId[]>([]);
const dragPreviewOverviewCardIds = ref<OverviewCardId[] | null>(null);
const previewOverviewCardIds = computed(() => showOverviewCustomizer.value
  ? (dragPreviewOverviewCardIds.value || draftOverviewCardIds.value)
  : overviewCardIds.value);
const overviewCardsDirty = computed(() => JSON.stringify(draftOverviewCardIds.value) !== JSON.stringify(overviewCardIds.value));
const overviewSaveStatus = ref<'error' | ''>('');
const overviewEditorHeading = ref<HTMLElement | null>(null);
const overviewCustomizeButton = ref<HTMLButtonElement | null>(null);
const draggedOverviewCardId = ref<OverviewCardId | null>(null);
let overviewDragImage: HTMLElement | null = null;
interface OverviewDropSlot {
  id: OverviewCardId;
  left: number;
  top: number;
  right: number;
  bottom: number;
}
let overviewPreviewSlot: OverviewDropSlot | null = null;
let overviewPreviewTargetId: OverviewCardId | null = null;
const mobileTaskTrendKey = ref<TaskTrendMetricKey>('created');
const habits = shallowRef<Habit[]>([]);
const focusRecords = shallowRef<DailyFocusRecord[]>([]);
const focusSessionRecords = shallowRef<FocusSessionRecord[]>([]);
const fallbackTaskGroups = shallowRef<TaskGroup[]>([]);
const habitsLoading = ref(false);
const focusLoading = ref(false);
const rewardsLoading = ref(false);
const rewardSnapshot = ref<RewardSnapshot>(createEmptyRewardSnapshot());
const rewardEntries = ref<RewardLedgerEntry[]>([]);
const rewardRedemptions = ref<RewardRedemption[]>([]);
const rewardLoadError = ref('');
let rewardDataVersion = 0;
let habitUpdateVersion = 0;

const taskScopeLabel = computed(() => {
  const sourceLabel = isAllScopeLabel(props.sourceLabel)
    ? getAllScopeLabel()
    : props.sourceLabel;
  const documentLabel = isAllScopeLabel(props.documentLabel)
    ? ''
    : props.documentLabel;
  return documentLabel
    ? `${sourceLabel} / ${documentLabel}`
    : sourceLabel;
});

const todayKey = computed(() => workbenchDay.value);
const currentRange = computed(() => buildCurrentRangeWindow(selectedRange.value, parseDateValue(todayKey.value) || new Date()));
const previousRange = computed(() => buildPreviousRangeWindow(currentRange.value));
const rangeDays = computed(() => buildDatePoints(currentRange.value.start, currentRange.value.endExclusive));
const rangeBins = computed(() => buildDateBins(rangeDays.value, 8));

const selectedRangeLabel = computed(() => currentRange.value.label);
const selectedRangeShortLabel = computed(() => currentRange.value.shortLabel);

const scopedTasks = computed(() =>
  props.tasks.filter(task => task.type === 'block' && task.isVirtual !== true)
);
const summaryNotebookId = computed(() => scopedTasks.value.find(task => task.notebookId)?.notebookId || '');
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
    (task.status === 'pending' || task.status === 'in-progress')
    && getTaskOverdueDays(task, todayKey.value) > 0
  ).length
);
const todayOpenTasks = computed(() =>
  liveScopedTasks.value
    .filter(task =>
      task.status !== 'completed'
      && task.status !== 'cancelled'
      && task.dueDate === todayKey.value
    )
    .sort((left, right) => {
      const leftTime = left.dueTime || '23:59';
      const rightTime = right.dueTime || '23:59';
      return leftTime.localeCompare(rightTime);
    })
);
const todayCompletedTaskCount = computed(() => scopedTasks.value.filter(task =>
  task.status === 'completed' && task.completedAt && formatLocalDateKey(parseDateValue(task.completedAt) || new Date(0)) === todayKey.value
).length);
const overviewActionTasks = computed(() => {
  if (todayOpenTasks.value.length) return todayOpenTasks.value.slice(0, 2);
  return liveScopedTasks.value.filter(task =>
    task.status !== 'completed' && task.status !== 'cancelled' && task.dueDate && task.dueDate < todayKey.value
  ).sort((left, right) => (left.dueDate || '').localeCompare(right.dueDate || '')).slice(0, 2);
});
const upcomingDeadlineTasks = computed(() => liveScopedTasks.value
  .filter(task => task.status !== 'completed' && task.status !== 'cancelled')
  .map(task => ({ task, daysRemaining: getSignedDayDifference(normalizeDateKey(task.dueDate), todayKey.value) }))
  .filter(entry => entry.daysRemaining >= 1 && entry.daysRemaining <= 7)
  .sort((left, right) => left.daysRemaining - right.daysRemaining
    || (left.task.dueTime || '23:59').localeCompare(right.task.dueTime || '23:59')
    || getTaskDisplayTitle(left.task).localeCompare(getTaskDisplayTitle(right.task))));
const stagnantTasks = computed(() => liveScopedTasks.value
  .filter(task => task.status !== 'completed' && task.status !== 'cancelled')
  .map(task => ({ task, daysSinceUpdate: getTaskDaysSinceUpdate(task, todayKey.value) }))
  .filter(entry => entry.daysSinceUpdate >= 7)
  .sort((left, right) => right.daysSinceUpdate - left.daysSinceUpdate
    || getTaskDisplayTitle(left.task).localeCompare(getTaskDisplayTitle(right.task))));
const unscheduledTasks = computed(() => liveScopedTasks.value
  .filter(task => task.status !== 'completed' && task.status !== 'cancelled'
    && task.priority === 'high' && !task.startDate?.trim() && !task.dueDate?.trim())
  .sort((left, right) => getDateValueTimestamp(left.createdAt) - getDateValueTimestamp(right.createdAt)
    || getTaskDisplayTitle(left).localeCompare(getTaskDisplayTitle(right))));
const expandedOverviewLists = ref<OverviewCardId[]>([]);

function toggleOverviewList(cardId: OverviewCardId): void {
  expandedOverviewLists.value = expandedOverviewLists.value.includes(cardId)
    ? expandedOverviewLists.value.filter(id => id !== cardId)
    : [...expandedOverviewLists.value, cardId];
}

function getOverviewListToggleLabel(cardId: OverviewCardId, count: number): string {
  return expandedOverviewLists.value.includes(cardId)
    ? t('personalStats.collapseCardList')
    : formatTemplate('personalStats.expandCardListTemplate', { count });
}
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
  return formatTemplate('personalStats.taskFlowDeltaTemplate', {
    delta: `${prefix}${taskFlowDelta.value}`
  });
});

const taskStatusSummary = computed(() => [
  {
    label: t('personalStats.taskStatusPending'),
    count: liveScopedTasks.value.filter(task => task.status === 'pending').length,
    tone: 'pending',
    payload: {
      title: t('personalStats.taskStatusPendingTitle'),
      target: 'table',
      statuses: ['pending']
    } satisfies StatsDrilldownPayload
  },
  {
    label: t('taskManager.statusInProgress'),
    count: liveScopedTasks.value.filter(task => task.status === 'in-progress').length,
    tone: 'progress',
    payload: {
      title: t('personalStats.taskStatusInProgressTitle'),
      target: 'table',
      statuses: ['in-progress']
    } satisfies StatsDrilldownPayload
  },
  {
    label: t('taskManager.dueOverdue'),
    count: overdueTaskCount.value,
    tone: 'overdue',
    payload: {
      title: t('personalStats.reviewActionOverdueTitle'),
      target: 'table',
      statuses: ['pending', 'in-progress'],
      due: 'overdue'
    } satisfies StatsDrilldownPayload
  },
  {
    label: t('taskManager.statusCompleted'),
    count: liveScopedTasks.value.filter(task => task.status === 'completed').length,
    tone: 'completed',
    payload: {
      title: t('personalStats.taskStatusCompletedTitle'),
      target: 'table',
      statuses: ['completed'],
      includeCompleted: true
    } satisfies StatsDrilldownPayload
  },
  {
    label: t('taskManager.statusCancelled'),
    count: liveScopedTasks.value.filter(task => task.status === 'cancelled').length,
    tone: 'cancelled',
    payload: {
      title: t('personalStats.taskStatusCancelledTitle'),
      target: 'table',
      statuses: ['cancelled']
    } satisfies StatsDrilldownPayload
  }
]);

const selectedTaskMetric = ref<'created' | 'completed' | null>(null);
const taskPeriodMetrics = computed(() => [
  {
    key: 'created' as const,
    label: formatRangeMetricLabel(selectedRangeShortLabel.value, t('personalStats.taskCreated')),
    count: taskCreatedInRangeCount.value
  },
  {
    key: 'completed' as const,
    label: formatRangeMetricLabel(selectedRangeShortLabel.value, t('personalStats.taskCompleted')),
    count: taskCompletedInRangeCount.value
  }
]);
const taskPeriodDetailTasks = computed(() => {
  if (!selectedTaskMetric.value) return [];
  const field = selectedTaskMetric.value === 'created' ? 'createdAt' : 'completedAt';
  return scopedTasks.value
    .filter(task => isDateKeyInRange(toLocalDateKey(task[field]), currentRange.value))
    .sort((left, right) => getDateValueTimestamp(right[field]) - getDateValueTimestamp(left[field])
      || getTaskDisplayTitle(left).localeCompare(getTaskDisplayTitle(right)));
});
const taskCurrentMetrics = computed(() => [
  {
    key: 'backlog',
    label: t('personalStats.taskCurrentOpen'),
    count: activeBacklogCount.value,
    payload: {
      title: t('personalStats.reviewActionBacklogTitle'),
      target: 'table',
      statuses: ['pending', 'in-progress', 'delayed']
    } satisfies StatsDrilldownPayload
  },
  {
    key: 'overdue',
    label: t('personalStats.currentOverdue'),
    count: overdueTaskCount.value,
    payload: {
      title: t('personalStats.reviewActionOverdueTitle'),
      target: 'table',
      statuses: ['pending', 'in-progress'],
      due: 'overdue'
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
      label: t('personalStats.taskCreated'),
      points: taskCreatedTrend.value
    },
    {
      key: 'completed',
      label: t('personalStats.taskCompleted'),
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
    label: t('personalStats.taskCreated'),
    fillClass: 'created',
    points: taskCreatedTrend.value
  },
  {
    key: 'completed',
    label: t('personalStats.taskCompleted'),
    fillClass: 'completed',
    points: taskCompletedTrend.value
  },
  {
    key: 'archived',
    label: t('personalStats.taskArchived'),
    fillClass: 'archived',
    points: taskArchivedTrend.value
  }
]);
const activeTaskTrendSection = computed<TaskTrendSection>(() =>
  taskTrendSections.value.find(section => section.key === mobileTaskTrendKey.value)
  ?? taskTrendSections.value[0]
  ?? {
    key: 'created',
    label: t('personalStats.taskCreated'),
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
  const values = Array.from(new Set([
    max,
    Math.ceil(max * 0.75),
    Math.ceil(max * 0.5),
    Math.ceil(max * 0.25),
    0
  ]))
    .sort((left, right) => right - left);

  return values.map(value => ({
    value,
    y: getTaskTrendChartY(value, max)
  }));
});
const taskTrendDesktopViewBox = '0 0 100 72';
const taskPeriodComparisonCards = computed<TaskPeriodComparisonCard[]>(() => [
  buildTaskPeriodComparisonCard(t('personalStats.taskCreated'), taskCreatedInRangeCount.value, taskCreatedPreviousCount.value),
  buildTaskPeriodComparisonCard(t('personalStats.taskCompleted'), taskCompletedInRangeCount.value, taskCompletedPreviousCount.value)
]);

const stuckReviewTasks = computed<StuckTaskEntry[]>(() => {
  const entries = liveScopedTasks.value
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
      && (entry.daysSinceUpdate >= 7 || entry.overdueDays > 0)
    )
    .sort((left, right) => {
      if (right.overdueDays !== left.overdueDays) {
        return right.overdueDays - left.overdueDays;
      }
      if (right.daysSinceUpdate !== left.daysSinceUpdate) {
        return right.daysSinceUpdate - left.daysSinceUpdate;
      }
      return left.title.localeCompare(right.title, 'zh-CN');
    });
  return entries;
});

const showAllStuckReviewTasks = ref(false);
const showAllUpcomingReviewTasks = ref(false);
const TODAY_PRIORITY_STORAGE_KEY = 'pinch.personal-stats.today-priorities';
const todayPriorityIds = ref<string[]>(loadTodayPriorityIds(todayKey.value));
const prioritySaveError = ref(false);
const showPriorityPicker = ref(false);
const prioritySearch = ref('');
const inboxFilter = ref<'unplanned' | 'uncategorized'>('unplanned');
const showAllInboxTasks = ref(false);
const openWorkbenchTasks = computed(() => liveScopedTasks.value.filter(task =>
  task.status !== 'completed' && task.status !== 'cancelled'
));
const priorityCandidates = computed(() => {
  const query = prioritySearch.value.trim().toLocaleLowerCase();
  return openWorkbenchTasks.value.filter(task =>
    !query || getTaskDisplayTitle(task).toLocaleLowerCase().includes(query)
  ).slice(0, 30);
});
const todayPriorityTasks = computed(() => {
  const dueTodayIds = new Set(todayOpenTasks.value.map(task => task.id));
  const selectedTasks = todayPriorityIds.value
    .map(id => openWorkbenchTasks.value.find(task => task.id === id))
    .filter((task): task is Task => !!task && !dueTodayIds.has(task.id));
  return [...todayOpenTasks.value, ...selectedTasks];
});
const unplannedTasks = computed(() => openWorkbenchTasks.value.filter(task =>
  !task.startDate?.trim() && !task.dueDate?.trim()
));
const uncategorizedTasks = computed(() => openWorkbenchTasks.value.filter(task =>
  resolveTaskTagIds(task.tags, task.groupId).length === 0
  && getEffectiveGoalIdsForTask(props.goalItems, task).length === 0
));
const inboxTasks = computed(() => [...(inboxFilter.value === 'unplanned' ? unplannedTasks.value : uncategorizedTasks.value)]
  .sort((left, right) => getDateValueTimestamp(left.createdAt) - getDateValueTimestamp(right.createdAt)
    || getTaskDisplayTitle(left).localeCompare(getTaskDisplayTitle(right))));

function toWorkbenchTaskEntry(task: Task): StuckTaskEntry {
  return {
    task,
    title: getTaskDisplayTitle(task),
    sourceLabel: getTaskSourceLabel(task),
    statusLabel: getTaskStatusText(task.status),
    daysSinceUpdate: 0,
    overdueDays: 0
  };
}

function loadTodayPriorityIds(date: string): string[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(TODAY_PRIORITY_STORAGE_KEY) || 'null');
    return saved?.date === date && Array.isArray(saved.ids)
      ? [...new Set<string>(saved.ids.filter((id: unknown) => typeof id === 'string' && id.trim()))].slice(0, 3)
      : [];
  } catch {
    return [];
  }
}

function toggleTodayPriority(id: string): void {
  if (todayPriorityIds.value.includes(id)) {
    todayPriorityIds.value = todayPriorityIds.value.filter(item => item !== id);
  } else if (todayPriorityIds.value.length < 3 && openWorkbenchTasks.value.some(task => task.id === id)) {
    todayPriorityIds.value = [...todayPriorityIds.value, id];
  } else {
    return;
  }
  saveTodayPriorityIds();
}

function getTodayPriorityLabel(id: string): string {
  const task = scopedTasks.value.find(item => item.id === id);
  return task ? getTaskDisplayTitle(task) : t('personalStats.priorityOutsideScope');
}

function saveTodayPriorityIds(): void {
  try {
    window.localStorage.setItem(TODAY_PRIORITY_STORAGE_KEY, JSON.stringify({ date: todayKey.value, ids: todayPriorityIds.value }));
    prioritySaveError.value = false;
  } catch {
    prioritySaveError.value = true;
  }
}

const taskReviewPanels = computed(() => [
  {
    key: 'priorities',
    title: t('personalStats.todayPrioritiesTitle'),
    subtitle: formatTemplate('personalStats.todayPrioritiesCount', { count: todayPriorityIds.value.length, dueCount: todayOpenTasks.value.length }),
    emptyLabel: t('personalStats.noTodayPriorities'),
    entries: todayPriorityTasks.value.map(toWorkbenchTaskEntry)
  },
  {
    key: 'inbox',
    title: t('personalStats.taskInboxTitle'),
    subtitle: t('personalStats.taskInboxHint'),
    emptyLabel: t(inboxFilter.value === 'unplanned' ? 'personalStats.noUnplannedTasks' : 'personalStats.noUncategorizedTasks'),
    entries: inboxTasks.value.slice(0, showAllInboxTasks.value ? undefined : 5).map(task => ({
      ...toWorkbenchTaskEntry(task),
      needsSchedule: unplannedTasks.value.some(item => item.id === task.id),
      needsCategory: uncategorizedTasks.value.some(item => item.id === task.id)
    }))
  },
  {
    key: 'upcoming',
    title: t('personalStats.overviewCardUpcomingDeadlines'),
    subtitle: `${t('personalStats.upcomingDeadlineScope')} · ${formatTemplate('personalStats.upcomingDeadlineCountTemplate', { count: upcomingDeadlineTasks.value.length })}`,
    emptyLabel: t('personalStats.noUpcomingDeadlines'),
    entries: upcomingDeadlineTasks.value.slice(0, showAllUpcomingReviewTasks.value ? undefined : 5)
      .map(({ task, daysRemaining }): StuckTaskEntry => ({
        task,
        title: getTaskDisplayTitle(task),
        sourceLabel: getTaskSourceLabel(task),
        statusLabel: getTaskStatusText(task.status),
        daysRemaining,
        daysSinceUpdate: 0,
        overdueDays: 0
      }))
  },
  {
    key: 'stuck',
    title: t('personalStats.stuckTasksTitle'),
    subtitle: t('personalStats.stuckTasksSubtitle'),
    emptyLabel: t('personalStats.noStuckTasks'),
    entries: stuckReviewTasks.value.slice(0, showAllStuckReviewTasks.value ? undefined : 5)
  }
]);

const effectiveTaskGroups = computed(() => {
  const merged = new Map<string, TaskGroup>();
  fallbackTaskGroups.value.forEach((group) => {
    merged.set(group.id, group);
  });
  (props.taskGroups || []).forEach((group) => {
    merged.set(group.id, group);
  });
  return Array.from(merged.values());
});
const taskGroupNameMap = computed(() =>
  new Map(effectiveTaskGroups.value.map(group => [group.id, group.name || '']))
);

const tagCompletionRates = computed<CompletionRateItem[]>(() =>
  buildCompletionRateItems(scopedTasks.value, (task) => {
    const tags = resolveTaskTagIds(task.tags, task.groupId);
    if (tags.length === 0) {
      return [{ key: '__untagged__', label: t('personalStats.untagged') }];
    }
    return tags.map(tagId => ({
      key: tagId,
      label: taskGroupNameMap.value.get(tagId) || tagId
    }));
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
const pendingTodayHabits = computed(() => {
  const today = parseDateValue(todayKey.value)!;
  return habits.value.filter(habit => habit.isPaused !== true
    && isHabitActiveOnDay(habit, todayKey.value)
    && isHabitScheduledOnDate(habit, today)
    && (!habit.frequency.startsWith('weekly') || !getWorkbenchWeekProgress(habit, today).fulfilled))
    .map(habit => {
      return {
        habit,
        ...getHabitDayProgress(habit, todayKey.value)
      };
    })
    .filter(entry => entry.completed < entry.target);
});
const habitRangeSummaries = computed(() =>
  habits.value.map(habit => summarizeHabitInRange(habit, currentRange.value))
);
const overviewHabitSummaries = computed(() => {
  const activeIds = new Set(habits.value.filter(habit => habit.isPaused !== true).map(habit => habit.id));
  return habitRangeSummaries.value.filter(summary => activeIds.has(summary.id) && summary.target > 0)
    .sort((left, right) => left.rate - right.rate || left.name.localeCompare(right.name))
    .slice(0, 2);
});
const previousHabitRangeSummaries = computed(() =>
  habits.value.map(habit => summarizeHabitInRange(habit, previousRange.value))
);
const habitCompletionsInRange = computed(() =>
  habitRangeSummaries.value.reduce((sum, summary) => sum + summary.completions, 0)
);
const habitCompletionRateInRange = computed(() =>
  safePercent(
    habitRangeSummaries.value.reduce((sum, summary) => sum + summary.fulfilled, 0),
    habitRangeSummaries.value.reduce((sum, summary) => sum + summary.target, 0)
  )
);
const habitCompletionRatePrevious = computed(() =>
  safePercent(
    previousHabitRangeSummaries.value.reduce((sum, summary) => sum + summary.fulfilled, 0),
    previousHabitRangeSummaries.value.reduce((sum, summary) => sum + summary.target, 0)
  )
);
const longestHabitRangeStreak = computed(() =>
  Math.max(0, ...habitRangeSummaries.value.map(summary => summary.streak))
);
const currentLongestHabitStreak = computed(() =>
  Math.max(0, ...habits.value.filter(habit => habit.isPaused !== true).map(habit => habit.currentStreak || 0))
);
const habitDailyCompletionMap = computed(() => {
  const counts = new Map<string, number>();
  habits.value.forEach((habit) => {
    habit.calendar.forEach((entry) => {
      if (!isDateKeyInRange(entry.date, currentRange.value)) {
        return;
      }
      counts.set(entry.date, (counts.get(entry.date) || 0) + getHabitEntryCompletionCount(entry));
    });
  });
  return counts;
});
const habitActiveDaysInRange = computed(() =>
  [...habitDailyCompletionMap.value.values()].filter(count => count > 0).length
);
const habitHeatStrip = computed<HabitHeatPoint[]>(() => {
  const max = Math.max(1, ...habitDailyCompletionMap.value.values());
  return rangeDays.value.map((day) => {
    const count = habitDailyCompletionMap.value.get(day.key) || 0;
    const level = count <= 0
      ? 0
      : Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as 1 | 2 | 3 | 4;
    return {
      key: day.key,
      level,
      ariaLabel: formatTemplate('personalStats.habitHeatPointTemplate', {
        date: day.key,
        count
      })
    };
  });
});
const latestHabitInterruptionKey = computed(() => {
  const activeHabits = habits.value.filter(habit => habit.isPaused !== true);
  if (activeHabits.length === 0) {
    return '';
  }
  const priorDays = rangeDays.value.filter(day => day.key < todayKey.value).reverse();
  const interruptedDay = priorDays.find((day) => {
    const date = parseDateValue(day.key);
    if (!date) {
      return false;
    }
    const scheduled = activeHabits.some(habit =>
      isHabitActiveOnDay(habit, day.key) && isHabitScheduledOnDate(habit, date)
    );
    return scheduled && (habitDailyCompletionMap.value.get(day.key) || 0) === 0;
  });
  return interruptedDay?.key || '';
});
const latestHabitInterruptionLabel = computed(() =>
  latestHabitInterruptionKey.value || t('personalStats.noInterruptionInPeriod')
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
const focusMinutesToday = computed(() =>
  focusRecords.value
    .filter(record => record.date === todayKey.value)
    .reduce((sum, record) => sum + record.minutes, 0)
);
const todayEstimatedMinutes = computed(() =>
  todayOpenTasks.value.reduce((sum, task) => sum + getTaskFocusEstimateMinutes(task), 0)
);
const todayHasFocusEstimate = computed(() =>
  todayOpenTasks.value.some(task => getTaskFocusEstimateMinutes(task) > 0)
);
const todayRemainingTimeLabel = computed(() => {
  if (todayOpenTasks.value.length === 0) {
    return '0m';
  }
  if (!todayHasFocusEstimate.value) {
    return t('personalStats.notEstimated');
  }
  return formatMinutes(Math.max(0, todayEstimatedMinutes.value - focusMinutesToday.value));
});
const todayActionLabel = computed(() =>
  todayOpenTasks.value.length > 0
    ? t('personalStats.startFocus')
    : t('personalStats.viewBacklog')
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
const taskEstimateComparison = computed(() => {
  const completedTasks = scopedTasks.value.filter(task => task.status === 'completed'
    && isDateKeyInRange(toLocalDateKey(task.completedAt), currentRange.value));
  const tasksById = new Map(completedTasks.map(task => [task.id, task]));
  const tasksByBlockId = new Map(completedTasks.filter(task => task.blockId).map(task => [task.blockId!, task]));
  const focusMinutesByTask = new Map<string, number>();
  // Compare full estimates with all linked sessions, including work before the selected period.
  focusSessionRecords.value.forEach(record => {
    if (record.targetType !== 'task' || !Number.isFinite(record.minutes) || record.minutes <= 0) return;
    const task = (record.targetId ? tasksById.get(record.targetId) : undefined)
      || (record.targetBlockId ? tasksByBlockId.get(record.targetBlockId) : undefined)
      || (record.targetId ? tasksByBlockId.get(record.targetId) : undefined);
    if (task) focusMinutesByTask.set(task.id, (focusMinutesByTask.get(task.id) || 0) + record.minutes);
  });
  const allEntries = completedTasks.map(task => ({
    task,
    estimatedMinutes: getTaskFocusEstimateMinutes(task),
    actualMinutes: focusMinutesByTask.get(task.id) || 0
  }));
  const entries = allEntries.filter(entry => entry.estimatedMinutes > 0 && entry.actualMinutes > 0)
    .sort((left, right) => Math.abs(right.actualMinutes - right.estimatedMinutes) - Math.abs(left.actualMinutes - left.estimatedMinutes)
      || getDateValueTimestamp(right.task.completedAt) - getDateValueTimestamp(left.task.completedAt)
      || getTaskDisplayTitle(left.task).localeCompare(getTaskDisplayTitle(right.task)));
  return {
    entries,
    total: completedTasks.length,
    missingEstimate: allEntries.filter(entry => entry.estimatedMinutes <= 0).length,
    missingFocus: allEntries.filter(entry => entry.actualMinutes <= 0).length,
    estimatedMinutes: entries.reduce((sum, entry) => sum + entry.estimatedMinutes, 0),
    actualMinutes: entries.reduce((sum, entry) => sum + entry.actualMinutes, 0)
  };
});
const estimateComparisonDeviationLabel = computed(() => {
  const { estimatedMinutes, actualMinutes } = taskEstimateComparison.value;
  if (estimatedMinutes <= 0 || actualMinutes === estimatedMinutes) return t('personalStats.estimateMatchesActual');
  const percent = Math.round(Math.abs(actualMinutes - estimatedMinutes) / estimatedMinutes * 100);
  return formatTemplate(actualMinutes > estimatedMinutes ? 'personalStats.estimateOverPercentTemplate' : 'personalStats.estimateUnderPercentTemplate', { percent });
});

function getEstimateDifferenceLabel(difference: number): string {
  if (difference === 0) return t('personalStats.estimateMatchesActual');
  return formatTemplate(difference > 0 ? 'personalStats.estimateOverTimeTemplate' : 'personalStats.estimateUnderTimeTemplate', { time: formatMinutes(Math.abs(difference)) });
}
const focusTopHabits = computed(() =>
  buildFocusTargetSummaries(focusTrackedSessionsInRange.value, 'habit')
);
const focusTopTasks = computed(() =>
  buildFocusTargetSummaries(focusTrackedSessionsInRange.value, 'task')
);
const overviewFocusTargets = computed(() => [...focusTopTasks.value, ...focusTopHabits.value]
  .sort((left, right) => right.minutes - left.minutes || left.name.localeCompare(right.name))
  .slice(0, 2)
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
const activeGoalItems = computed(() =>
  props.goalItems.filter(goal => goal.status !== 'completed')
);
const activeGoalAverageProgress = computed(() => {
  if (activeGoalItems.value.length === 0) {
    return 0;
  }
  return Math.round(
    activeGoalItems.value.reduce((sum, goal) => sum + goal.progressPercent, 0)
    / activeGoalItems.value.length
  );
});
const lowestProgressGoal = computed(() =>
  [...activeGoalItems.value]
    .sort((left, right) => {
      if (left.progressPercent !== right.progressPercent) {
        return left.progressPercent - right.progressPercent;
      }
      return (left.dueDate || '9999-12-31').localeCompare(right.dueDate || '9999-12-31');
    })[0] || null
);
const lowestProgressGoalDeadlineLabel = computed(() => {
  const dueDate = lowestProgressGoal.value?.dueDate;
  if (!dueDate) {
    return t('personalStats.noGoalDeadline');
  }
  const days = getSignedDayDifference(dueDate, todayKey.value);
  if (days === 0) {
    return t('personalStats.goalDueToday');
  }
  return formatTemplate(
    days > 0 ? 'personalStats.goalDaysRemainingTemplate' : 'personalStats.goalDaysOverdueTemplate',
    { days: Math.abs(days) }
  );
});

const recentCompletedTasks = computed<RecentOverviewActivity[]>(() =>
  scopedTasks.value
    .filter(task => task.status === 'completed' && !!task.completedAt)
    .map(task => ({
      key: `task-${task.id}`,
      kind: 'task' as const,
      kindLabel: t('personalStats.activityTask'),
      title: getTaskDisplayTitle(task),
      timeLabel: formatActivityDateTime(getDateValueTimestamp(task.completedAt)),
      timestamp: getDateValueTimestamp(task.completedAt),
      actionable: !!task.blockId,
      task
    }))
    .filter(activity => activity.timestamp > 0)
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 3)
);
const latestFocusActivity = computed<RecentOverviewActivity | null>(() => {
  const record = [...focusSessionRecords.value].sort((left, right) => right.timestamp - left.timestamp)[0];
  if (!record) {
    return null;
  }
  return {
    key: `focus-${record.id}`,
    kind: 'focus',
    kindLabel: t('personalStats.activityFocus'),
    title: record.targetName
      ? `${record.targetName} · ${formatMinutes(record.minutes)}`
      : formatTemplate('personalStats.unlinkedFocusTemplate', { minutes: record.minutes }),
    timeLabel: formatActivityDateTime(record.timestamp),
    timestamp: record.timestamp,
    actionable: true
  };
});
const latestHabitActivity = computed<RecentOverviewActivity | null>(() => {
  let latest: RecentOverviewActivity | null = null;
  habits.value.forEach((habit) => {
    habit.calendar.forEach((entry) => {
      if (getHabitEntryCompletionCount(entry) <= 0) {
        return;
      }
      const timestamp = getHabitEntryLatestTimestamp(entry);
      if (!timestamp || (latest && latest.timestamp >= timestamp)) {
        return;
      }
      latest = {
        key: `habit-${habit.id}-${entry.date}`,
        kind: 'habit',
        kindLabel: t('personalStats.activityHabit'),
        title: habit.name,
        timeLabel: formatActivityDateTime(timestamp),
        timestamp,
        actionable: true,
        habitId: habit.id
      };
    });
  });
  return latest;
});
const recentOverviewActivities = computed<RecentOverviewActivity[]>(() => {
  const activities = [...recentCompletedTasks.value];
  if (latestFocusActivity.value) {
    activities.push(latestFocusActivity.value);
  }
  if (latestHabitActivity.value) {
    activities.push(latestHabitActivity.value);
  }
  return activities.sort((left, right) => right.timestamp - left.timestamp);
});
const overviewTiles = computed(() => [
  {
    id: 'kpi-task' as const,
    label: formatRangeMetricLabel(selectedRangeShortLabel.value, t('personalStats.taskCompleted')),
    value: String(taskCompletedInRangeCount.value),
    meta: getOverviewDeltaLabel(taskCompletedInRangeCount.value, taskCompletedPreviousCount.value),
    tone: 'tone-complete',
    scope: t('personalStats.periodScope'),
    direction: getComparisonTone(taskCompletedInRangeCount.value, taskCompletedPreviousCount.value)
  },
  {
    id: 'kpi-focus' as const,
    label: formatRangeMetricLabel(selectedRangeShortLabel.value, t('personalStats.focusDuration')),
    value: formatMinutes(focusMinutesInRange.value),
    meta: getOverviewDeltaLabel(focusMinutesInRange.value, focusMinutesPrevious.value, formatMinutes),
    tone: 'tone-focus',
    scope: t('personalStats.periodScope'),
    direction: getComparisonTone(focusMinutesInRange.value, focusMinutesPrevious.value)
  },
  {
    id: 'kpi-habit' as const,
    label: formatRangeMetricLabel(selectedRangeShortLabel.value, t('personalStats.habitCheckins')),
    value: `${habitCompletionRateInRange.value}%`,
    meta: getOverviewDeltaLabel(habitCompletionRateInRange.value, habitCompletionRatePrevious.value, value => `${value}%`),
    tone: 'tone-habit',
    scope: t('personalStats.periodScope'),
    direction: getComparisonTone(habitCompletionRateInRange.value, habitCompletionRatePrevious.value)
  },
  {
    id: 'kpi-backlog' as const,
    label: t('personalStats.currentBacklog'),
    value: String(activeBacklogCount.value),
    meta: getBacklogChangeLabel(taskFlowDelta.value),
    tone: 'tone-backlog',
    scope: t('personalStats.currentScope'),
    direction: taskFlowDelta.value > 0 ? 'down' : 'up'
  }
]);


const overviewCardOptions = computed<OverviewCardOption[]>(() => [
  {
    id: 'kpi-task',
    label: t('personalStats.overviewCardTaskKpi'),
    description: t('personalStats.overviewCardTaskKpiDescription')
  },
  {
    id: 'kpi-focus',
    label: t('personalStats.overviewCardFocusKpi'),
    description: t('personalStats.overviewCardFocusKpiDescription')
  },
  {
    id: 'kpi-habit',
    label: t('personalStats.overviewCardHabitKpi'),
    description: t('personalStats.overviewCardHabitKpiDescription')
  },
  {
    id: 'kpi-backlog',
    label: t('personalStats.overviewCardBacklogKpi'),
    description: t('personalStats.overviewCardBacklogKpiDescription')
  },
  {
    id: 'activity',
    label: t('personalStats.overviewCardActivity'),
    description: t('personalStats.overviewCardActivityDescription')
  },
  {
    id: 'attention',
    label: t('personalStats.overviewCardAttention'),
    description: t('personalStats.overviewCardAttentionDescription')
  },
  {
    id: 'focus-summary',
    label: t('personalStats.overviewCardFocusSummary'),
    description: t('personalStats.overviewCardFocusSummaryDescription')
  },
  {
    id: 'growth-summary',
    label: t('personalStats.overviewCardGrowthSummary'),
    description: t('personalStats.overviewCardGrowthSummaryDescription')
  },
  {
    id: 'today-actions',
    label: t('personalStats.overviewCardTodayActions'),
    description: t('personalStats.overviewCardTodayActionsDescription')
  },
  {
    id: 'upcoming-deadlines',
    label: t('personalStats.overviewCardUpcomingDeadlines'),
    description: t('personalStats.overviewCardUpcomingDeadlinesDescription')
  },
  {
    id: 'stagnant-tasks',
    label: t('personalStats.overviewCardStagnantTasks'),
    description: t('personalStats.overviewCardStagnantTasksDescription')
  },
  {
    id: 'today-habits',
    label: t('personalStats.overviewCardTodayHabits'),
    description: t('personalStats.overviewCardTodayHabitsDescription')
  },
  {
    id: 'unscheduled-tasks',
    label: t('personalStats.overviewCardUnscheduledTasks'),
    description: t('personalStats.overviewCardUnscheduledTasksDescription')
  },
  {
    id: 'estimate-vs-actual',
    label: t('personalStats.overviewCardEstimateVsActual'),
    description: t('personalStats.overviewCardEstimateVsActualDescription')
  },
  {
    id: 'goal-progress-detail',
    label: t('personalStats.overviewCardGoalProgressDetail'),
    description: t('personalStats.overviewCardGoalProgressDetailDescription')
  },
  {
    id: 'habit-rhythm',
    label: t('personalStats.overviewCardHabitRhythm'),
    description: t('personalStats.overviewCardHabitRhythmDescription')
  },
  {
    id: 'recent-activity',
    label: t('personalStats.overviewCardRecentActivity'),
    description: t('personalStats.overviewCardRecentActivityDescription')
  }
]);

const overviewCardGroups = computed(() => OVERVIEW_CARD_GROUPS.filter(group => group.id !== 'metrics').map(group => ({
  id: group.id,
  label: t(group.labelKey),
  cards: overviewCardOptions.value.filter(card => group.ids.includes(card.id))
})));
const visibleOptionalOverviewCardIds = computed(() => previewOverviewCardIds.value.filter(id => !CORE_OVERVIEW_CARD_IDS.includes(id)));
const visibleOptionalOverviewCardCount = computed(() => visibleOptionalOverviewCardIds.value.length);
const hasVisibleOverviewCards = computed(() => visibleOptionalOverviewCardCount.value > 0);

const overviewTrendSeries = computed<OverviewTrendSeries[]>(() => {
  const taskPoints = taskCompletedTrend.value.map(point => ({
    ...point,
    ariaLabel: formatTemplate('personalStats.taskPointTitleTemplate', {
      label: point.label,
      series: t('personalStats.taskCompleted'),
      count: point.count
    })
  }));
  const focusPoints = focusTrend.value.map(point => ({
    ...point,
    ariaLabel: formatTemplate('personalStats.focusTrendPointTitleTemplate', {
      label: point.label,
      count: point.count
    })
  }));
  const habitPoints = habitTrend.value.map(point => ({
    ...point,
    ariaLabel: formatTemplate('personalStats.habitTrendPointTitleTemplate', {
      label: point.label,
      count: point.count
    })
  }));
  return [
    {
      key: 'tasks',
      label: t('personalStats.taskCompleted'),
      total: String(taskCompletedInRangeCount.value),
      tone: 'tasks',
      max: Math.max(1, ...taskPoints.map(point => point.count)),
      ariaLabel: t('personalStats.taskTrendChartAria'),
      points: taskPoints
    },
    {
      key: 'focus',
      label: t('personalStats.focusDuration'),
      total: formatMinutes(focusMinutesInRange.value),
      tone: 'focus',
      max: Math.max(1, ...focusPoints.map(point => point.count)),
      ariaLabel: t('personalStats.focusTrendSubtitle'),
      points: focusPoints
    },
    {
      key: 'habits',
      label: t('personalStats.habitCheckins'),
      total: String(habitCompletionsInRange.value),
      tone: 'habits',
      max: Math.max(1, ...habitPoints.map(point => point.count)),
      ariaLabel: t('personalStats.habitsTrendSubtitle'),
      points: habitPoints
    }
  ];
});

const overviewAttentionItems = computed<OverviewAttentionItem[]>(() => {
  const items: OverviewAttentionItem[] = [];
  if (overdueTaskCount.value > 0) {
    items.push({
      key: 'overdue',
      title: t('personalStats.currentOverdue'),
      detail: t('personalStats.overviewOverdueDetail'),
      value: String(overdueTaskCount.value),
      tone: 'danger',
      targetTab: 'tasks',
      payload: {
        title: t('personalStats.reviewActionOverdueTitle'),
        target: 'table',
        statuses: ['pending', 'in-progress'],
        due: 'overdue'
      }
    });
  }
  if (taskFlowDelta.value < 0) {
    items.push({
      key: 'backlog',
      title: t('personalStats.overviewBacklogTitle'),
      detail: t('personalStats.overviewBacklogDetail'),
      value: `+${Math.abs(taskFlowDelta.value)}`,
      tone: 'warning',
      targetTab: 'tasks',
      payload: {
        title: t('personalStats.reviewActionBacklogTitle'),
        target: 'table',
        statuses: ['pending', 'in-progress', 'delayed']
      }
    });
  }
  if (averageGoalProgress.value < 50 && props.goalItems.length > 0) {
    items.push({
      key: 'goals',
      title: t('personalStats.overviewGoalsTitle'),
      detail: t('personalStats.overviewGoalsDetail'),
      value: `${averageGoalProgress.value}%`,
      tone: 'notice',
      targetTab: 'goals'
    });
  }
  if (habitCompletionsInRange.value === 0 && activeHabitsCount.value > 0) {
    items.push({
      key: 'habits',
      title: t('personalStats.overviewHabitsTitle'),
      detail: t('personalStats.overviewHabitsDetail'),
      value: '0',
      tone: 'notice',
      targetTab: 'rhythm'
    });
  }
  return items.slice(0, 4);
});

async function loadHabitData(): Promise<void> {
  const requestVersion = habitUpdateVersion;
  habitsLoading.value = true;
  try {
    const nextHabits = await getHabits();
    if (requestVersion === habitUpdateVersion) {
      habits.value = Array.isArray(nextHabits) ? nextHabits : [];
    }
  } finally {
    if (requestVersion === habitUpdateVersion) {
      habitsLoading.value = false;
    }
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

async function loadFallbackTaskGroups(): Promise<void> {
  const groups = await loadTaskGroups();
  fallbackTaskGroups.value = Array.isArray(groups) ? groups : [];
}

async function loadRewardData(forceRefresh = false, showLoading = true): Promise<void> {
  const version = ++rewardDataVersion;
  if (showLoading) rewardsLoading.value = true;
  try {
    const data = await getRewardWorkbenchData(forceRefresh);
    if (version !== rewardDataVersion) return;
    rewardSnapshot.value = data.snapshot;
    rewardEntries.value = data.entries;
    rewardRedemptions.value = data.redemptions;
    rewardLoadError.value = '';
  } catch (error) {
    if (version === rewardDataVersion) rewardLoadError.value = t('personalStats.growthLoadFailed');
    console.error('[PersonalStatsView] Failed to load growth data:', error);
  } finally {
    if (version === rewardDataVersion) rewardsLoading.value = false;
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

function handleOverviewAttention(item: OverviewAttentionItem): void {
  if (item.payload) {
    handleDrilldown(item.payload);
    return;
  }
  activeStatsTab.value = item.targetTab;
}

function handleTodayAction(): void {
  const task = todayOpenTasks.value[0];
  if (!task) {
    handleDrilldown({
      title: t('personalStats.reviewActionBacklogTitle'),
      target: 'table',
      statuses: ['pending', 'in-progress', 'delayed']
    });
    return;
  }

  const preferredDuration = getTaskFocusEstimateMinutes(task);
  eventBus.emit(Events.FOCUS_TIMER_PANEL_OPEN_REQUEST, {
    target: {
      type: 'task',
      id: task.id,
      name: getTaskDisplayTitle(task),
      blockId: task.blockId,
      ...(preferredDuration > 0 ? { preferredDuration } : {})
    },
    showPanel: true
  });
}

function handleRecentActivity(activity: RecentOverviewActivity): void {
  if (activity.kind === 'task' && activity.task) {
    void handleOpenTask(activity.task);
    return;
  }
  if (activity.kind === 'habit' && activity.habitId) {
    handleOpenDetail({ target: 'habit-detail', habitId: activity.habitId });
    return;
  }
  if (activity.kind === 'focus') {
    activeStatsTab.value = 'rhythm';
  }
}

function resetOverviewCards(): void {
  beginOverviewEditing();
  draftOverviewCardIds.value = [...DEFAULT_OVERVIEW_CARD_IDS];
}

function beginOverviewEditing(): void {
  if (!showOverviewCustomizer.value) {
    draftOverviewCardIds.value = [...overviewCardIds.value];
    overviewSaveStatus.value = '';
    showOverviewCustomizer.value = true;
  }
  void nextTick(() => overviewEditorHeading.value?.focus());
}

function finishOverviewEditing(): void {
  showOverviewCustomizer.value = false;
  clearOverviewDrag();
  void nextTick(() => {
    overviewCustomizeButton.value?.focus();
  });
}

function cancelOverviewEditing(): void {
  draftOverviewCardIds.value = [...overviewCardIds.value];
  overviewSaveStatus.value = '';
  finishOverviewEditing();
}

function handleOverviewEditorEscape(event: KeyboardEvent): void {
  if (!showOverviewCustomizer.value) return;
  event.preventDefault();
  event.stopPropagation();
  cancelOverviewEditing();
}

function commitOverviewCards(): void {
  clearOverviewDrag();
  if (!saveOverviewCards(draftOverviewCardIds.value)) {
    overviewSaveStatus.value = 'error';
    return;
  }
  overviewCardIds.value = [...draftOverviewCardIds.value];
  overviewSaveStatus.value = '';
  finishOverviewEditing();
  showMessage(t('personalStats.cardsSaved'), 2200, 'info');
}

function moveOverviewCard(cardId: OverviewCardId, direction: -1 | 1): void {
  if (!showOverviewCustomizer.value || CORE_OVERVIEW_CARD_IDS.includes(cardId)) return;
  clearOverviewDrag();
  const siblings = visibleOptionalOverviewCardIds.value;
  const target = siblings[siblings.indexOf(cardId) + direction];
  if (!target) return;
  const next = [...draftOverviewCardIds.value];
  const fromIndex = next.indexOf(cardId);
  const toIndex = next.indexOf(target);
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
  draftOverviewCardIds.value = next;
}

function overviewEditorBindings(cardId: OverviewCardId) {
  return {
    label: overviewCardOptions.value.find(card => card.id === cardId)!.label,
    onHide: () => {
      clearOverviewDrag();
      draftOverviewCardIds.value = draftOverviewCardIds.value.filter(id => id !== cardId);
      void nextTick(() => overviewEditorHeading.value?.focus());
    }
  };
}

function clearOverviewDrag(): void {
  draggedOverviewCardId.value = null;
  dragPreviewOverviewCardIds.value = null;
  overviewPreviewSlot = null;
  overviewPreviewTargetId = null;
  overviewDragImage?.remove();
  overviewDragImage = null;
}

function canDragOverviewCards(): boolean {
  return showOverviewCustomizer.value && draggedOverviewCardId.value !== null
    && draftOverviewCardIds.value.includes(draggedOverviewCardId.value);
}

function startOverviewDrag(cardId: OverviewCardId, event: DragEvent): void {
  if (!showOverviewCustomizer.value || CORE_OVERVIEW_CARD_IDS.includes(cardId)) return;
  clearOverviewDrag();
  draggedOverviewCardId.value = cardId;
  dragPreviewOverviewCardIds.value = [...draftOverviewCardIds.value];
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', cardId);
    // Capture the whole card before applying the translucent preview style.
    const card = event.currentTarget as HTMLElement;
    if (event.dataTransfer.setDragImage) {
      const rect = card.getBoundingClientRect();
      overviewDragImage = card.cloneNode(true) as HTMLElement;
      overviewDragImage.classList.remove('overview-card-move');
      overviewDragImage.setAttribute('aria-hidden', 'true');
      Object.assign(overviewDragImage.style, {
        position: 'fixed', left: '-10000px', top: '0', width: `${rect.width}px`,
        height: `${rect.height}px`, transform: 'none', transition: 'none', opacity: '1', pointerEvents: 'none'
      });
      document.body.appendChild(overviewDragImage);
      event.dataTransfer.setDragImage(overviewDragImage, event.clientX - rect.left, event.clientY - rect.top);
    }
  }
}

function previewOverviewDrop(event: DragEvent): void {
  if (!canDragOverviewCards()) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  const grid = event.currentTarget as HTMLElement;
  const gridRect = grid.getBoundingClientRect();
  const x = event.clientX - gridRect.left + grid.scrollLeft;
  const y = event.clientY - gridRect.top + grid.scrollTop;
  const slots: OverviewDropSlot[] = [];
  grid.querySelectorAll<HTMLElement>(':scope > [data-card-id]').forEach(card => {
    if (!isOverviewCardId(card.dataset.cardId) || !card.offsetWidth || !card.offsetHeight) return;
    // offset positions describe the final grid layout and ignore FLIP animation transforms.
    slots.push({ id: card.dataset.cardId, left: card.offsetLeft, top: card.offsetTop,
      right: card.offsetLeft + card.offsetWidth, bottom: card.offsetTop + card.offsetHeight });
  });
  let targetSlot: OverviewDropSlot | null = null;
  let cardId: OverviewCardId | null = null;
  if (slots.length && Number.isFinite(x) && Number.isFinite(y)) {
    // Keep the current destination while the pointer stays in its original slot.
    // Moving cards beneath the pointer must never reverse the same insertion.
    if (overviewPreviewSlot && x >= overviewPreviewSlot.left - 6 && x <= overviewPreviewSlot.right + 6
      && y >= overviewPreviewSlot.top - 6 && y <= overviewPreviewSlot.bottom + 6) return;
    let nearestDistance = Infinity;
    for (const slot of slots) {
      const distance = Math.hypot(Math.max(slot.left - x, 0, x - slot.right), Math.max(slot.top - y, 0, y - slot.bottom));
      if (distance < nearestDistance) { nearestDistance = distance; targetSlot = slot; }
    }
    cardId = targetSlot?.id || null;
  } else {
    // No layout is available while the grid is hidden or in a DOM-only environment.
    const target = (event.target as Element | null)?.closest<HTMLElement>('[data-card-id]');
    if (target && grid.contains(target) && isOverviewCardId(target.dataset.cardId)) cardId = target.dataset.cardId;
    if (cardId === overviewPreviewTargetId) return;
  }
  if (!cardId || cardId === draggedOverviewCardId.value) return;
  const next = [...dragPreviewOverviewCardIds.value!];
  const fromIndex = next.indexOf(draggedOverviewCardId.value!);
  const targetIndex = next.indexOf(cardId);
  if (fromIndex < 0 || targetIndex < 0) return;
  next.splice(fromIndex, 1);
  next.splice(targetIndex, 0, draggedOverviewCardId.value!);
  dragPreviewOverviewCardIds.value = next;
  overviewPreviewSlot = targetSlot;
  overviewPreviewTargetId = cardId;
}

function handleOverviewGridDragOver(event: DragEvent): void {
  previewOverviewDrop(event);
}

function handleOverviewDrop(event: DragEvent): void {
  if (!canDragOverviewCards()) return;
  previewOverviewDrop(event);
  event.preventDefault();
  event.stopPropagation();
  draftOverviewCardIds.value = [...dragPreviewOverviewCardIds.value!];
  clearOverviewDrag();
}

function overviewDropBindings(cardId: OverviewCardId) {
  return {
    draggable: showOverviewCustomizer.value,
    tabindex: showOverviewCustomizer.value ? 0 : undefined,
    'aria-label': showOverviewCustomizer.value
      ? formatTemplate('personalStats.dragCardTemplate', { label: overviewCardOptions.value.find(card => card.id === cardId)!.label })
      : undefined,
    class: {
      'is-editing-card': showOverviewCustomizer.value,
      'is-drag-preview': draggedOverviewCardId.value === cardId
    },
    onDragstart: (event: DragEvent) => startOverviewDrag(cardId, event),
    onDragend: clearOverviewDrag,
    onKeydown: (event: KeyboardEvent) => {
      if (!showOverviewCustomizer.value || event.target !== event.currentTarget) return;
      const direction = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1
        : event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : null;
      if (direction === null) return;
      event.preventDefault();
      event.stopPropagation();
      const card = event.currentTarget as HTMLElement;
      moveOverviewCard(cardId, direction);
      void nextTick(() => card.focus({ preventScroll: true }));
    }
  };
}

async function handleOpenGoalKanban(goal: GoalListItem): Promise<void> {
  await openTaskViewByRequest({
    view: 'kanban',
    source: buildGoalDocumentSource(goal.id),
    documentId: 'all'
  });
}

async function handleOpenTask(task: Task): Promise<void> {
  if (!task.blockId) {
    return;
  }
  await openBlockById(task.blockId);
}

const pendingTaskIds = ref<string[]>([]);
const reviewTaskErrors = ref<Record<string, string>>({});
const rescheduleTaskId = ref<string | null>(null);
const reschedulePanelKey = ref<string | null>(null);
const reviewDueDateDraft = ref('');
const reviewDatePresets = computed(() => {
  const today = startOfDay(parseDateValue(todayKey.value) || new Date());
  return [
    { key: 'today', label: t('taskManager.today'), date: formatLocalDateKey(today) },
    { key: 'tomorrow', label: t('date.tomorrow'), date: formatLocalDateKey(addDays(today, 1)) },
    { key: 'next-week', label: t('date.nextMonday'), date: formatLocalDateKey(addDays(today, (8 - today.getDay()) % 7 || 7)) }
  ];
});

function toggleReviewTaskDate(task: Task, panelKey: string): void {
  if (rescheduleTaskId.value === task.id && reschedulePanelKey.value === panelKey) {
    rescheduleTaskId.value = null;
    return;
  }
  rescheduleTaskId.value = task.id;
  reschedulePanelKey.value = panelKey;
  reviewDueDateDraft.value = task.dueDate || todayKey.value;
  delete reviewTaskErrors.value[task.id];
}

async function runReviewTaskAction(task: Task, save: () => Promise<void>): Promise<void> {
  if (pendingTaskIds.value.includes(task.id)) return;
  pendingTaskIds.value.push(task.id);
  delete reviewTaskErrors.value[task.id];
  try {
    await save();
    if (rescheduleTaskId.value === task.id) rescheduleTaskId.value = null;
  } catch (error) {
    console.error('[PersonalStatsView] Failed to save task:', error);
    reviewTaskErrors.value[task.id] = t('personalStats.taskSaveFailed');
  } finally {
    pendingTaskIds.value = pendingTaskIds.value.filter(id => id !== task.id);
  }
}

async function handleCompleteReviewTask(task: Task): Promise<void> {
  const complete = props.completeTask;
  if (!complete) return;
  const previous = { ...task };
  await runReviewTaskAction(task, async () => {
    const saved = await complete(task);
    const completed = saved || props.tasks.find(item => item.id === task.id) || props.goalTasks.find(item => item.id === task.id);
    if (props.undoCompleteTask && completed?.status === 'completed') {
      clearTimeout(undoCompletionTimer);
      undoCompletion.value = { previous, completed: { ...completed } };
      undoError.value = '';
      undoCompletionTimer = setTimeout(() => { if (!undoInProgress.value) undoCompletion.value = null; }, 8000);
    }
  });
}

const undoCompletion = ref<{ previous: Task; completed: Task } | null>(null);
const undoInProgress = ref(false);
const undoError = ref('');
let undoCompletionTimer: ReturnType<typeof setTimeout> | undefined;

async function handleUndoReviewCompletion(): Promise<void> {
  const entry = undoCompletion.value;
  const undo = props.undoCompleteTask;
  if (!entry || !undo || undoInProgress.value) return;
  undoInProgress.value = true;
  undoError.value = '';
  try {
    await undo(entry.completed, entry.previous);
    if (undoCompletion.value === entry) undoCompletion.value = null;
  } catch (error) {
    console.error('[PersonalStatsView] Failed to undo completion:', error);
    undoError.value = t('personalStats.taskUndoFailed');
  } finally {
    undoInProgress.value = false;
  }
}

async function handleRescheduleReviewTask(task: Task, dueDate: string): Promise<void> {
  const reschedule = props.rescheduleTask;
  if (!reschedule || !dueDate) return;
  reviewDueDateDraft.value = dueDate;
  await runReviewTaskAction(task, () => reschedule(task, dueDate));
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
    await openBlockById(target.targetBlockId);
  }
}

async function handleWorkbenchFocusRecord(record: FocusSessionRecord): Promise<void> {
  if (record.targetType === 'habit' && record.targetId) {
    handleOpenDetail({ target: 'habit-detail', habitId: record.targetId });
  } else if (record.targetType === 'task') {
    const blockId = record.targetBlockId || scopedTasks.value.find(task => task.id === record.targetId)?.blockId;
    if (blockId) await openBlockById(blockId);
  }
}

let unsubscribeHabitUpdates: (() => void) | null = null;
let unsubscribeRewardUpdates: (() => void) | null = null;

watch(selectedRange, (value) => {
  saveSelectedRange(value);
});

watch(activeStatsTab, clearOverviewDrag);

watch(todayKey, (date) => {
  todayPriorityIds.value = loadTodayPriorityIds(date);
  showPriorityPicker.value = false;
  prioritySearch.value = '';
});

watch(draftOverviewCardIds, () => {
  clearOverviewDrag();
  overviewSaveStatus.value = '';
}, { deep: true });

onMounted(() => {
  refreshGreeting();
  greetingTimer = setInterval(refreshGreeting, 60_000);
  unsubscribeHabitUpdates = eventBus.on(Events.HABITS_UPDATED, (payload?: { habits?: Habit[] }) => {
    habitUpdateVersion += 1;
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
      rewardsLoading.value = false;
      void loadRewardData(false, false);
      return;
    }
    void loadRewardData(true);
  });
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', refreshGreeting);
    window.addEventListener('pinch-focus-session', handleFocusSession);
  }
  void loadHabitData();
  void loadFocusData();
  void loadFallbackTaskGroups();
  void loadRewardData(true);
});

onUnmounted(() => {
  rewardDataVersion += 1;
  clearInterval(greetingTimer);
  clearTimeout(undoCompletionTimer);
  clearOverviewDrag();
  unsubscribeHabitUpdates?.();
  unsubscribeRewardUpdates?.();
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', refreshGreeting);
    window.removeEventListener('pinch-focus-session', handleFocusSession);
  }
});

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

function isOverviewCardId(value: unknown): value is OverviewCardId {
  return typeof value === 'string' && [
    'kpi-task',
    'kpi-focus',
    'kpi-habit',
    'kpi-backlog',
    'activity',
    'attention',
    'focus-summary',
    'growth-summary',
    'today-actions',
    'upcoming-deadlines',
    'stagnant-tasks',
    'today-habits',
    'unscheduled-tasks',
    'estimate-vs-actual',
    'goal-progress-detail',
    'habit-rhythm',
    'recent-activity'
  ].includes(value);
}

function loadSavedOverviewCards(): OverviewCardId[] {
  if (typeof window === 'undefined') {
    return [...DEFAULT_OVERVIEW_CARD_IDS];
  }
  try {
    const raw = window.localStorage.getItem(OVERVIEW_CARDS_STORAGE_KEY);
    if (!raw) {
      return [...DEFAULT_OVERVIEW_CARD_IDS];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_OVERVIEW_CARD_IDS];
    }
    // Restore core metrics in their fixed order and preserve the optional card order.
    const migrated = parsed.map((value: unknown): OverviewCardId | null => {
      if (isOverviewCardId(value)) return value;
      if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(LEGACY_OVERVIEW_CARD_IDS, value)) {
        return LEGACY_OVERVIEW_CARD_IDS[value as keyof typeof LEGACY_OVERVIEW_CARD_IDS];
      }
      return null;
    }).filter((value): value is OverviewCardId => value !== null);
    return [...CORE_OVERVIEW_CARD_IDS, ...new Set(migrated.filter(id => !CORE_OVERVIEW_CARD_IDS.includes(id)))];
  } catch {
    return [...DEFAULT_OVERVIEW_CARD_IDS];
  }
}

function saveOverviewCards(value: OverviewCardId[]): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    window.localStorage.setItem(OVERVIEW_CARDS_STORAGE_KEY, JSON.stringify(value));
    return true;
  } catch {
    return false;
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

function getSignedDayDifference(laterKey: string, earlierKey: string): number {
  const later = parseDateValue(laterKey);
  const earlier = parseDateValue(earlierKey);
  if (!later || !earlier) {
    return 0;
  }
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (startOfDay(later).getTime() - startOfDay(earlier).getTime()) / millisecondsPerDay
  );
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

function buildCurrentRangeWindow(key: StatsRangeKey, now: Date = new Date()): RangeWindow {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);

  if (key === 'today') {
    return buildRangeWindow(key, t('personalStats.rangeToday'), t('personalStats.rangeTodayShort'), today, tomorrow);
  }

  if (key === '30d') {
    return buildRangeWindow(key, t('personalStats.range30d'), t('personalStats.range30dShort'), addDays(today, -29), tomorrow);
  }

  if (key === 'month') {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return buildRangeWindow(key, t('personalStats.rangeMonth'), t('personalStats.rangeMonthShort'), monthStart, tomorrow);
  }

  return buildRangeWindow(key, t('personalStats.range7d'), t('personalStats.range7dShort'), addDays(today, -6), tomorrow);
}

function buildPreviousRangeWindow(current: RangeWindow): RangeWindow {
  const endExclusive = new Date(current.start);
  const start = addDays(endExclusive, -current.dayCount);
  return buildRangeWindow(current.key, t('personalStats.rangePrevious'), t('personalStats.rangePreviousShort'), start, endExclusive);
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

    const fallbackName = type === 'habit'
      ? t('focusTimer.untitledHabit')
      : t('focusTimer.untitledTask');
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

function summarizeHabitInRange(habit: Habit, range: RangeWindow): HabitRangeSummary {
  return {
    id: habit.id,
    name: habit.name,
    emoji: habit.emoji,
    ...summarizeWorkbenchHabit(habit, range.start, range.endExclusive, parseDateValue(todayKey.value)!),
    createdAt: habit.createdAt
  };
}

function getHabitEntryCompletionCount(entry: Habit['calendar'][number]): number {
  if (typeof entry.completedCount === 'number' && Number.isFinite(entry.completedCount)) {
    return entry.completedCount;
  }
  return entry.completed ? 1 : 0;
}

function isHabitActiveOnDay(habit: Habit, dayKey: string): boolean {
  const createdAtKey = toLocalDateKey(habit.createdAt);
  return !createdAtKey || dayKey >= createdAtKey;
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

function buildTaskPeriodComparisonCard(label: string, current: number, previous: number): TaskPeriodComparisonCard {
  const delta = current - previous;
  const magnitude = Math.abs(delta);
  const tone = delta === 0 ? 'flat' : (delta > 0 ? 'up' : 'down');
  const base = Math.max(1, Math.abs(previous));
  const percent = previous === 0 ? null : Math.round((magnitude / base) * 100);
  const deltaLabel = delta === 0
    ? t('personalStats.comparisonFlat')
    : percent === null
      ? formatTemplate('personalStats.comparisonCountDeltaTemplate', {
        sign: delta > 0 ? '+' : '-',
        count: magnitude
      })
      : `${delta > 0 ? '+' : '-'}${percent}%`;

  let detail = '';
  if (delta === 0) {
    detail = t('personalStats.comparisonSameAsPrevious');
  } else if (previous === 0) {
    detail = formatTemplate('personalStats.comparisonPreviousZeroTemplate', { current });
  } else {
    detail = formatTemplate(
      delta > 0
        ? 'personalStats.comparisonIncreaseTemplate'
        : 'personalStats.comparisonDecreaseTemplate',
      { count: magnitude }
    );
  }

  return {
    label,
    currentValue: String(current),
    previousValue: formatTemplate('personalStats.comparisonPreviousValueTemplate', { previous }),
    deltaLabel: formatTemplate('personalStats.comparisonDeltaLabelTemplate', { delta: deltaLabel }),
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
  const activityKey = getTaskStuckBaseDateKey(task);
  if (!activityKey) {
    return 0;
  }
  return getDayDifference(currentDayKey, activityKey);
}

function getTaskStuckBaseDateKey(task: Task): string {
  return normalizeDateKey(task.updatedAt)
    || normalizeDateKey(task.createdAt);
}

function getTaskDisplayTitle(task: Task): string {
  const title = getTaskTitlePlainText(task.title);
  return title || t('focusTimer.untitledTask');
}

function getTaskStatusText(status: Task['status']): string {
  if (status === 'in-progress') {
    return t('taskManager.statusInProgress');
  }
  if (status === 'delayed') {
    return t('personalStats.taskStatusDelayed');
  }
  if (status === 'completed') {
    return t('taskManager.statusCompleted');
  }
  if (status === 'cancelled') {
    return t('taskManager.statusCancelled');
  }
  return t('personalStats.taskStatusPending');
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
  return t('personalStats.unlocatedDocument');
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

function getComparisonTone(current: number, previous: number): 'up' | 'down' | 'flat' {
  if (current > previous) {
    return 'up';
  }
  if (current < previous) {
    return 'down';
  }
  return 'flat';
}

function getOverviewDeltaLabel(
  current: number,
  previous: number,
  formatter: (value: number) => string = value => String(value)
): string {
  const difference = current - previous;
  if (difference === 0) {
    return t('personalStats.overviewDeltaFlat');
  }
  const value = formatter(Math.abs(difference));
  return formatTemplate('personalStats.overviewDeltaTemplate', {
    delta: `${difference > 0 ? '+' : '-'}${value}`
  });
}

function getTaskFocusEstimateMinutes(task: Task): number {
  const estimate = task.focusEstimate;
  if (!estimate || !Number.isFinite(estimate.value) || estimate.value <= 0) {
    return 0;
  }
  return estimate.unit === 'pomodoros'
    ? Math.round(estimate.value * 25)
    : Math.round(estimate.value);
}

function getDateValueTimestamp(value: string | undefined): number {
  const parsed = parseDateValue(value);
  return parsed?.getTime() || 0;
}

function getHabitEntryLatestTimestamp(entry: Habit['calendar'][number]): number {
  const timestamps = Array.isArray(entry.checkinTimestamps)
    ? entry.checkinTimestamps.filter(timestamp => Number.isFinite(timestamp) && timestamp > 0)
    : [];
  if (timestamps.length > 0) {
    return Math.max(...timestamps);
  }
  if (typeof entry.timestamp === 'number' && Number.isFinite(entry.timestamp)) {
    return entry.timestamp;
  }
  return getDateValueTimestamp(entry.date);
}

function formatActivityDateTime(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return '';
  }
  return new Intl.DateTimeFormat(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(timestamp));
}

function getBacklogChangeLabel(taskFlow: number): string {
  if (taskFlow === 0) {
    return t('personalStats.overviewBacklogFlat');
  }
  return formatTemplate(
    taskFlow > 0
      ? 'personalStats.overviewBacklogReducedTemplate'
      : 'personalStats.overviewBacklogGrewTemplate',
    { count: Math.abs(taskFlow) }
  );
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

function getOverviewBarStyle(count: number, max: number): Record<string, string> {
  const safeMax = Math.max(1, max);
  const height = count <= 0 ? 3 : Math.max(8, Math.round((count / safeMax) * 100));
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
    const previous = points[index - 1];
    const point = points[index];
    const midpoint = previous.x + (point.x - previous.x) / 2;
    path += ` C ${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`;
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
  min-width: 0;
  position: relative;
  container: personal-stats / inline-size;
  display: flex;
  overflow: hidden;
  box-sizing: border-box;
  background: color-mix(in srgb, var(--b3-body-background) 50%, var(--b3-theme-background));
}

.personal-stats-main {
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
  container: stats-content / inline-size;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 14px;
  box-sizing: border-box;
  overscroll-behavior: contain;
}

.stats-toolbar {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 2px 0px;
}

.stats-toolbar-copy {
  min-width: 0;
}

.stats-toolbar-copy h2 {
  margin: 0;
  font-size: 36px;
  font-weight: 600;
  line-height: 1.4;
  overflow-wrap: anywhere;
  color: var(--b3-theme-on-background);
}

.stats-toolbar-copy p {
  margin: 12px 0 0;
  overflow: hidden;
  font-size: 16px;
  line-height: 1.6;
  color: var(--b3-theme-on-surface-light);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stats-tabs {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  flex: 0 0 auto;
  min-width: 0;
  min-height: 32px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.stats-tabs::-webkit-scrollbar {
  display: none;
}

.stats-tabs > button,
.overview-customize-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  color: var(--b3-theme-on-background);
  white-space: nowrap;
  background: var(--b3-list-hover);
  transition: all 0.15s ease;
}

.stats-tabs > button:hover,
.overview-customize-btn:hover {
  border-color: var(--b3-border-color);
  background: var(--b3-theme-background);
}

.stats-tabs > button.active {
  color: var(--b3-theme-background);
  background: var(--b3-theme-on-background);
}

.overview-dashboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.overview-cards-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  min-width: 0;
}

.overview-cards-grid > .activity-overview {
  grid-column: span 3;
}

.stats-tabs-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  margin-left: auto;
  padding-left: 8px;
}

.overview-customizer-reset,
.overview-customizer-cancel,
.overview-customizer-save,
.overview-summary-card header button {
  padding: 5px 9px;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  background: var(--b3-theme-background);
}

.overview-customizer-reset:hover,
.overview-customizer-cancel:hover,
.overview-customizer-save:hover,
.overview-summary-card header button:hover {
  color: var(--b3-theme-primary);
  border-color: var(--b3-theme-primary);
}

.overview-customizer {
  flex: 0 0 300px;
  width: 300px;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  border: 0;
  border-left: 1px solid var(--b3-border-color);
  background-color: var(--b3-list-hover);
}

.overview-customizer-head {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  padding: 16px;
  border-bottom: 1px solid var(--b3-border-color);
  gap: 10px;
}

.overview-customizer-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 16px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.overview-customizer-footer {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
  border-top: 1px solid var(--b3-border-color);
}

.overview-customizer-footer .overview-customizer-actions {
  justify-content: flex-end;
}

.overview-customizer-footer .overview-customizer-reset {
  margin-right: auto;
}

.overview-customizer-head h3 {
  margin: 0;
  font-size: 14px;
  color: var(--b3-theme-on-background);
}

.overview-customizer-head p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.overview-customizer-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.overview-customizer-save {
  color: var(--b3-theme-on-primary);
  background: var(--b3-theme-primary);
}

.overview-customizer-save:hover { color: var(--b3-theme-on-primary); }

.overview-customizer-status {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.overview-unsaved { color: var(--b3-theme-primary); }
.overview-save-status { margin: 0; font-size: 12px; color: var(--b3-theme-primary); }
.overview-save-status.is-error { color: var(--b3-theme-error); }
.overview-card-group { flex: 0 0 auto; min-width: 0; margin: 0; padding: 0; border: 0; }
.overview-card-group legend { margin-bottom: 8px; padding: 0; font-size: 12px; font-weight: 600; }
.is-editing-card { outline: 1px dashed var(--b3-border-color); outline-offset: 2px; cursor: grab; }
.is-editing-card:active { cursor: grabbing; }
.is-editing-card:focus-within { outline: 2px solid var(--b3-theme-primary); outline-offset: 2px; }
.is-drag-preview { opacity: 0.5; outline: 2px dashed var(--b3-theme-primary); }
.overview-card-move { transition: transform 220ms ease; }
@media (prefers-reduced-motion: reduce) {
  .overview-card-move { transition: none; }
}
.overview-customizer button:focus-visible,
.overview-customize-btn:focus-visible,
.overview-card-option:focus-within { outline: 2px solid var(--b3-theme-primary); outline-offset: 2px; }

@media (max-width: 640px) {
  .overview-customizer-actions button { min-height: 36px; }
}

@container personal-stats (max-width: 680px) {
  .overview-customizer {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 5;
    width: min(300px, 100%);
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.12);
  }
}

.overview-card-options {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.overview-card-option {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  padding: 7px 8px;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
  transition: box-shadow 0.2s;
}

.overview-card-option:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.overview-card-option input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.overview-card-option :deep(.task-checkbox) {
  flex: 0 0 auto;
  margin-top: 2px;
  pointer-events: none;
}

.overview-card-option span {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.overview-card-option strong {
  overflow: hidden;
  font-size: 14px;
  line-height: 1.6;
  color: var(--b3-theme-on-background);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-card-option small {
  font-size: 13px;
  line-height: 1.5;
  color: var(--b3-theme-on-surface);
  white-space: normal;
}

.overview-detail-card {
  display: flex;
  min-width: 0;
  min-height: 190px;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  border: 0;
  border-radius: 16px;
  box-sizing: border-box;
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
}

.overview-card-explanation { margin: 0; font-size: 11px; line-height: 1.5; color: var(--b3-theme-on-surface-light); }
.overview-list-toggle { align-self: flex-start; margin-top: auto; }

.overview-detail-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.overview-detail-card-head h3 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  font-size: 14px;
  color: var(--b3-theme-on-background);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-link-action {
  flex: 0 0 auto;
  padding: 3px 7px;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
  background: var(--b3-list-hover);
}

.overview-link-action:hover {
  color: var(--b3-theme-primary);
}

.overview-detail-metrics {
  display: grid;
  min-width: 0;
}

.overview-detail-metrics.two-columns {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.overview-detail-metrics.three-columns {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.overview-detail-metrics > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  padding: 2px 10px;
}

.overview-detail-metrics > div:first-child {
  padding-left: 0;
}

.overview-detail-metrics > div:last-child {
  padding-right: 0;
}

.overview-detail-metrics span {
  overflow: hidden;
  font-size: 11px;
  color: var(--b3-theme-on-surface-light);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-detail-metrics strong {
  overflow: hidden;
  font-size: 20px;
  line-height: 1.2;
  color: var(--b3-theme-on-background);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-primary-action {
  width: 100%;
  min-height: 34px;
  margin-top: auto;
  padding: 7px 12px;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--b3-theme-background);
  background: var(--b3-theme-on-background);
}

.overview-primary-action:hover {
  opacity: 0.84;
}

.overview-highlight-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-width: 0;
  margin-top: auto;
  padding: 9px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  background: var(--b3-list-hover);
}

.overview-highlight-row:hover {
  border-color: var(--b3-border-color);
}

.overview-highlight-row:disabled { cursor: default; opacity: 0.7; }
.overview-context-list { display: flex; min-width: 0; flex-direction: column; gap: 6px; }
.overview-context-label { font-size: 11px; color: var(--b3-theme-on-surface-light); }
.overview-context-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; font-size: 11px; color: var(--b3-theme-on-surface-light); }
.overview-context-meta strong { color: var(--b3-theme-on-background); }

.overview-highlight-row > span {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.overview-highlight-row small {
  overflow: hidden;
  font-size: 11px;
  color: var(--b3-theme-on-surface-light);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-highlight-row strong {
  overflow: hidden;
  font-size: 12px;
  color: var(--b3-theme-on-background);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-highlight-value {
  flex: 0 0 auto;
  align-items: flex-end;
}

.overview-highlight-value strong {
  font-size: 16px;
}

.overview-inline-empty {
  display: grid;
  min-height: 70px;
  margin-top: auto;
  place-items: center;
  padding: 10px;
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
  background: var(--b3-list-hover);
}

.habit-heat-strip {
  display: grid;
  grid-template-columns: repeat(var(--heat-columns), minmax(0, 1fr));
  gap: 3px;
  height: 22px;
  margin-top: auto;
}

.habit-heat-cell {
  display: block;
  min-width: 0;
  border-radius: 2px;
  background: var(--b3-list-hover);
}

.habit-heat-cell.level-1 {
  background: color-mix(in srgb, var(--pinch-color3) 30%, var(--b3-theme-background));
}

.habit-heat-cell.level-2 {
  background: color-mix(in srgb, var(--pinch-color3) 48%, var(--b3-theme-background));
}

.habit-heat-cell.level-3 {
  background: color-mix(in srgb, var(--pinch-color3) 68%, var(--b3-theme-background));
}

.habit-heat-cell.level-4 {
  background: var(--pinch-color3);
}

.recent-activity-list {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.recent-activity-list {
  margin-top: -4px;
}

.recent-activity-row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  min-height: 42px;
  padding: 4px 0;
  border: 0;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  background: transparent;
}

.recent-activity-row:hover:not(:disabled) .recent-activity-copy strong {
  color: var(--b3-theme-primary);
}

.recent-activity-row:disabled {
  cursor: default;
}

.recent-activity-kind {
  display: inline-flex;
  justify-content: center;
  padding: 3px 5px;
  border-radius: 4px;
  font-size: 10px;
  color: var(--b3-theme-on-surface);
  background: var(--b3-list-hover);
}

.recent-activity-kind.focus {
  background: var(--pinch-background7);
}

.recent-activity-kind.habit {
  background: var(--pinch-background3);
}

.recent-activity-kind.task {
  background: var(--pinch-background5);
}

.recent-activity-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.recent-activity-copy strong,
.recent-activity-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-activity-copy strong {
  font-size: 12px;
  color: var(--b3-theme-on-background);
}

.recent-activity-copy small {
  font-size: 10px;
  color: var(--b3-theme-on-surface-light);
}

.overview-summary-card {
  display: flex;
  min-width: 0;
  min-height: 150px;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 0;
  border-radius: 16px;
  box-sizing: border-box;
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
}

.overview-summary-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.overview-summary-card h3 {
  margin: 0;
  overflow: hidden;
  font-size: 14px;
  color: var(--b3-theme-on-background);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-summary-card header button {
  flex: 0 0 auto;
  padding: 3px 7px;
  border: 0;
  background: var(--b3-list-hover);
}

.overview-summary-value {
  margin-top: 4px;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--b3-theme-on-background);
}

.overview-summary-card p {
  margin: 0;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.5;
  color: var(--b3-theme-on-surface-light);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-summary-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: auto;
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.overview-summary-stats strong {
  margin-left: 3px;
  color: var(--b3-theme-on-background);
}

.overview-summary-progress {
  height: 7px;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 999px;
  background: var(--b3-list-hover);
}

.overview-summary-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--pinch-color3);
}

.overview-empty-selection {
  display: grid;
  min-height: 150px;
  place-items: center;
  padding: 18px;
  border: 1px dashed var(--b3-border-color);
  border-radius: 16px;
  color: var(--b3-theme-on-surface-light);
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
}

.overview-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.overview-kpi {
  display: flex;
  min-width: 0;
  min-height: 112px;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border: 0;
  border-radius: 16px;
  box-sizing: border-box;
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
}

.overview-kpi-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  font-size: 12px;
  color: var(--b3-theme-on-surface);
}

.overview-kpi-head > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-scope {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--b3-theme-on-surface-light);
}

.overview-kpi > strong {
  overflow: hidden;
  font-size: 26px;
  line-height: 1.1;
  color: var(--b3-theme-on-background);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-kpi-meta {
  margin-top: auto;
  overflow: hidden;
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-kpi-meta.up {
  color: #277a50;
}

.overview-kpi-meta.down {
  color: #a75b28;
}

.overview-section {
  min-width: 0;
  padding: 16px;
  border-radius: 16px;
  box-sizing: border-box;
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
}

.overview-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.overview-section > .overview-card-editor-controls { margin-bottom: 14px; }

.overview-section-head h3 {
  margin: 0;
  font-size: 16px;
  color: var(--b3-theme-on-background);
}

.overview-section-head p {
  margin: 5px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--b3-theme-on-surface-light);
}

.overview-trend-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-trend-row {
  display: grid;
  grid-template-columns: minmax(94px, 0.24fr) minmax(0, 1fr);
  gap: 16px;
  align-items: end;
}

.overview-trend-meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.overview-trend-meta span {
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.overview-trend-meta strong {
  overflow: hidden;
  font-size: 17px;
  color: var(--b3-theme-on-background);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-spark-bars {
  display: grid;
  grid-template-columns: repeat(var(--trend-columns), minmax(4px, 1fr));
  gap: 5px;
  align-items: end;
  height: 48px;
  padding-bottom: 3px;
  border-bottom: 1px solid var(--b3-border-color);
  box-sizing: border-box;
}

.overview-spark-column {
  display: flex;
  align-items: end;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.overview-spark-fill {
  display: block;
  width: min(14px, 70%);
  min-height: 2px;
  border-radius: 3px 3px 0 0;
}

.overview-spark-fill.tasks {
  background: var(--pinch-color5);
}

.overview-spark-fill.focus {
  background: var(--pinch-color7);
}

.overview-spark-fill.habits {
  background: var(--pinch-color3);
}

.attention-count {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 12px;
  color: var(--b3-theme-error);
  background: color-mix(in srgb, var(--b3-theme-error) 12%, transparent);
}

.attention-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.attention-item {
  display: grid;
  grid-template-columns: 6px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  min-height: 58px;
  padding: 9px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  background: var(--b3-list-hover);
}

.attention-item:hover {
  border-color: var(--b3-border-color);
  background: var(--b3-theme-background-light);
}

.attention-indicator {
  width: 6px;
  height: 30px;
  border-radius: 3px;
  background: var(--pinch-color7);
}

.attention-item.danger .attention-indicator {
  background: var(--b3-theme-error);
}

.attention-item.warning .attention-indicator {
  background: var(--pinch-color10);
}

.attention-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.attention-copy strong,
.attention-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attention-copy strong {
  font-size: 13px;
  color: var(--b3-theme-on-background);
}

.attention-copy span {
  font-size: 11px;
  color: var(--b3-theme-on-surface-light);
}

.attention-value {
  font-size: 17px;
  font-weight: 700;
  color: var(--b3-theme-on-background);
}

.attention-empty {
  display: flex;
  min-height: 150px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  text-align: center;
  color: var(--b3-theme-on-surface-light);
  background: var(--b3-list-hover);
}

.attention-empty strong {
  color: var(--b3-theme-on-background);
}

.attention-empty span {
  max-width: 300px;
  font-size: 12px;
  line-height: 1.6;
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
  justify-content: flex-end;
  gap: 4px;
  flex-wrap: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  max-width: 100%;
  min-width: 0;
  border-radius: 99px;
  background: var(--b3-list-hover);
  box-shadow: var(--pinch-shadow);
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.range-switch::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.range-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border: none;
  border-radius: 99px;
  color: var(--b3-theme-on-surface);
  font-size: 12px;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.range-chip:hover {
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
}

.range-chip.active {
  color: var(--b3-theme-on-background);
  font-weight: 700;
  background: var(--b3-theme-background);
  box-shadow: var(--pinch-shadow);
  opacity: 1;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.stats-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 320px;
  padding: 18px;
  border-radius: 16px;
  background: var(--b3-theme-background);
  border: 0;
  box-shadow: var(--pinch-shadow);
}

.stats-panel.is-collapsed {
  min-height: 0;
  gap: 12px;
}

.tasks-panel,
.goals-panel,
.rewards-panel,
.rhythm-workbench-section {
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

.mini-stat-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-radius: 6px;
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

.task-metric-groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.task-metric-group,
.task-current-review,
.task-distribution-review {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.task-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.task-section-head h4 {
  margin: 0;
  font-size: 14px;
  color: var(--b3-theme-on-background);
}

.task-scope-note {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--b3-theme-on-surface-light);
}

.task-metric-action {
  min-width: 0;
  align-items: stretch;
  border: 1px solid transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
  color: var(--b3-theme-on-background);
  transition: border-color 120ms ease;
}

.task-metric-action:hover:not(:disabled),
.task-metric-action.active {
  border-color: var(--pinch-color1);
}

.task-metric-action:focus-visible {
  outline: 2px solid var(--pinch-color1);
  outline-offset: 2px;
}

.task-metric-action.overdue:not(:disabled) .mini-stat-value {
  color: var(--b3-theme-error);
}

.task-metric-action:disabled,
.task-current-review .overview-link-action:disabled,
.task-period-list .stuck-item:disabled {
  cursor: default;
  opacity: 0.58;
}

.task-metric-hint {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.task-period-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.task-period-list .stuck-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-period-list .stuck-item {
  flex-shrink: 0;
}

.review-detail-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.review-detail-grid.task-attention-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.task-attention-grid .review-detail-block {
  padding: 10px;
  gap: 8px;
}

.task-attention-grid .stuck-list {
  gap: 8px;
}

.task-attention-grid .stuck-list > article {
  padding: 8px 10px;
  border-radius: 10px;
  box-shadow: var(--pinch-shadow);
  transition: box-shadow 0.2s;
}

.task-attention-grid .stuck-list > article:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.task-attention-grid .list-block-head {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.task-attention-grid .stuck-task-row-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 6px;
}

.task-attention-grid .stuck-task-open {
  gap: 3px;
}

.task-attention-grid .stuck-badge {
  padding: 3px 6px;
  font-size: 11px;
}

.stuck-task-footer {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.task-attention-grid .stuck-reasons {
  flex: 1 1 0;
  min-width: 0;
  gap: 2px 6px;
  overflow-wrap: anywhere;
}

.task-attention-grid .stuck-reason {
  font-size: 11px;
}

.task-attention-grid .stuck-task-actions {
  flex: 0 0 auto;
  flex-wrap: nowrap;
  gap: 4px;
  margin-left: auto;
}

.task-attention-grid .stuck-task-actions button {
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.4;
  white-space: nowrap;
}

.review-detail-grid.task-distribution-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.review-detail-grid.focus-association-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  min-width: 0;
}

.review-detail-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border-radius: 6px;
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

.rate-list,
.stuck-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rate-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--b3-theme-background);
  padding: 8px;
  border-radius: 16px;
  box-shadow: #0000000f 0 1px 5px;
}

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

.stuck-task-row,
.upcoming-task-row,
.priorities-task-row,
.inbox-task-row {
  padding: 12px;
  border-radius: 10px;
  background: var(--b3-theme-background);
}

.stuck-task-row-content {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.stuck-task-open {
  display: flex;
  flex: 1 1 180px;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
  gap: 5px;
  padding: 0;
  border: 0;
  font: inherit;
  text-align: left;
  color: inherit;
  background: transparent;
  cursor: pointer;
  overflow-wrap: anywhere;
}

.stuck-task-open:hover:not(:disabled) .stuck-title {
  color: var(--pinch-color1);
}

.stuck-reasons,
.stuck-task-actions,
.task-reschedule-presets,
.task-reschedule-custom {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.stuck-reason {
  font-size: 12px;
  color: var(--b3-theme-on-surface-light);
}

.stuck-reason.overdue,
.task-review-error {
  color: var(--b3-theme-error);
}

.stuck-reason.today-deadline {
  color: var(--pinch-color1);
}

.stuck-task-actions button,
.task-reschedule-menu button,
.task-reschedule-custom input {
  padding: 6px 10px;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  font: inherit;
  font-size: 12px;
  color: var(--b3-theme-on-background);
  background: var(--b3-theme-background);
}

.stuck-task-actions button,
.task-reschedule-menu button {
  cursor: pointer;
}

.goal-next-task-actions {
  gap: 4px;
}

.goal-next-task-actions button {
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.4;
  white-space: nowrap;
}

.stuck-task-actions button:hover:not(:disabled),
.task-reschedule-menu button:hover:not(:disabled) {
  border-color: var(--pinch-color1);
  background: var(--b3-list-hover);
}

.stuck-task-actions button:disabled,
.task-reschedule-menu button:disabled,
.stuck-task-open:disabled {
  opacity: 0.5;
  cursor: default;
}

.stuck-task-open:focus-visible,
.stuck-task-actions button:focus-visible,
.task-reschedule-menu button:focus-visible {
  outline: 2px solid var(--pinch-color1);
  outline-offset: 2px;
}

.goal-action-date-menu,
.goal-action-error {
  flex-basis: 100%;
  min-width: 0;
}

.task-reschedule-menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--b3-border-color);
}

.task-reschedule-custom input {
  min-width: 0;
  flex: 1 1 140px;
}

.task-review-error {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.6;
}

.task-undo-notice {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  background: var(--b3-list-hover);
}

.task-priority-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-priority-selected,
.task-inbox-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.task-priority-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
}

.task-priority-options button {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  text-align: left;
  overflow-wrap: anywhere;
}

.task-priority-picker button,
.task-priority-picker input,
.task-inbox-switch button,
.task-undo-notice button {
  padding: 6px 10px;
  border: 1px solid var(--b3-border-color);
  border-radius: 6px;
  font: inherit;
  font-size: 12px;
  color: var(--b3-theme-on-background);
  background: var(--b3-theme-background);
}

.task-priority-picker input {
  min-width: 0;
}

.task-priority-picker button,
.task-inbox-switch button,
.task-undo-notice button {
  cursor: pointer;
}

.task-priority-picker button[aria-pressed="true"],
.task-inbox-switch button[aria-pressed="true"] {
  border-color: var(--pinch-color1);
  background: var(--b3-list-hover);
}

.task-priority-picker button:disabled,
.task-undo-notice button:disabled {
  cursor: default;
  opacity: 0.5;
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
  background: color-mix(in srgb, var(--pinch-background3-color) 46%, white 54%);
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
  background: color-mix(in srgb, var(--pinch-background1-color) 48%, white 52%);
  color: var(--b3-theme-on-background);
}

.status-pill:disabled {
  cursor: default;
  opacity: 0.58;
}

.status-pill.pending {
  background: color-mix(in srgb, var(--pinch-background3-color) 58%, white 42%);
}

.status-pill.progress {
  background: color-mix(in srgb, var(--pinch-background7-color) 56%, white 44%);
}

.status-pill.overdue {
  background: color-mix(in srgb, var(--pinch-background10-color) 52%, white 48%);
}

.status-pill.completed {
  background: color-mix(in srgb, var(--pinch-background5-color) 52%, white 48%);
}

.status-pill.cancelled {
  background: var(--b3-list-hover);
}

.trend-bars {
  display: flex;
  align-items: end;
  gap: clamp(4px, 1.2vw, 10px);
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  min-height: 140px;
  padding: 14px clamp(4px, 1.2vw, 10px) 0;
  border-radius: 18px;
  background: var(--b3-list-hover);
}

.trend-bar-item {
  display: flex;
  flex: 1 1 0;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.trend-bar {
  position: relative;
  display: flex;
  align-items: end;
  width: clamp(10px, 100%, 28px);
  max-width: 28px;
  height: 88px;
  padding: clamp(2px, 0.7vw, 4px);
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
  max-width: 100%;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.2;
  color: var(--b3-theme-on-background);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trend-bar-label {
  max-width: 100%;
  overflow: hidden;
  font-size: 11px;
  height: 40px;
  color: var(--b3-theme-on-surface-light);
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
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
  gap: 12px;
  min-height: 0;
  min-width: 0;
  padding: 16px 18px 12px;
  box-sizing: border-box;
  border: 1px solid color-mix(in srgb, var(--b3-theme-on-surface-light) 12%, transparent);
  border-radius: 14px;
  background: var(--b3-theme-background);
  box-shadow: 0 2px 8px rgb(31 45 61 / 0.06);
  overflow: hidden;
}

.task-trend-chart-head {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 11px;
}

.task-trend-chart-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.task-trend-chart-title strong {
  overflow: hidden;
  color: var(--b3-theme-on-background);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-trend-chart-title span {
  display: none;
}

.task-trend-chart-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.task-trend-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: var(--b3-theme-on-surface);
  font-size: 11px;
  white-space: nowrap;
}

.task-trend-legend-item > strong {
  display: none;
}

.task-trend-legend-swatch {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 999px;
  border: 1.25px solid currentColor;
  box-sizing: border-box;
}

.task-trend-legend-swatch.created {
  color: #3f7cff;
  background: color-mix(in srgb, currentColor 16%, transparent);
}

.task-trend-legend-swatch.completed {
  color: #08b5d1;
  background: color-mix(in srgb, currentColor 16%, transparent);
}

.task-trend-chart-shell {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 10px;
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
  padding: 3px 0 26px;
  font-size: 10px;
  color: var(--b3-theme-on-surface-light);
}

.task-trend-chart-body {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  gap: 8px;
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
  stroke: color-mix(in srgb, var(--b3-theme-on-surface-light) 16%, transparent);
  stroke-width: 0.6;
  vector-effect: non-scaling-stroke;
}

.task-trend-grid-line.vertical {
  stroke: color-mix(in srgb, var(--b3-theme-on-surface-light) 11%, transparent);
}

.task-trend-area {
  stroke: none;
}

.task-trend-area.created {
  fill: color-mix(in srgb, #08b5d1 15%, transparent);
}

.task-trend-area.completed {
  fill: color-mix(in srgb, #3f7cff 8%, transparent);
}

.task-trend-line {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.task-trend-line.created {
  stroke: #08b5d1;
}

.task-trend-line.completed {
  stroke: #3f7cff;
}

.task-trend-point {
  display: none;
  fill: white;
  stroke-width: 1.35;
}

.task-trend-dot {
  position: absolute;
  width: 7px;
  height: 7px;
  border: 1px solid transparent;
  border-radius: 50%;
  box-sizing: border-box;
  fill: white;
  background: var(--b3-theme-background);
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
  border-color: #08b5d1;
}

.task-trend-dot.completed {
  border-color: #3f7cff;
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
  line-height: 1.2;
  color: var(--b3-theme-on-surface-light);
}

.task-trend-chart-values {
  display: none;
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
  color: #08b5d1;
}

.task-trend-chart-value.completed {
  color: #3f7cff;
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
  background: color-mix(in srgb, var(--pinch-background1-color) 56%, white 44%);
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
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
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

.focus-target-main {
  flex: 1 1 140px;
}

.focus-target-side {
  flex: 1 1 96px;
  max-width: 124px;
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
  max-width: 100%;
  overflow: hidden;
  font-size: 12px;
  color: var(--b3-theme-on-background);
  text-overflow: ellipsis;
  white-space: nowrap;
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

  .overview-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
  .review-detail-grid,
  .comparison-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .personal-stats-main {
    padding: 10px;
  }

  .stats-toolbar {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }

  .range-switch {
    justify-content: flex-start;
  }

  .overview-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-kpi {
    min-height: 106px;
    padding: 12px;
  }

  .overview-trend-row {
    grid-template-columns: 82px minmax(0, 1fr);
    gap: 10px;
  }

  .overview-section-head {
    flex-direction: row;
    align-items: flex-start;
  }

  .stats-hero {
    padding: 18px;
  }

  .stats-hero-grid,
  .mini-stat-grid,
  .insight-list,
  .review-detail-grid,
  .comparison-grid {
    grid-template-columns: 1fr;
  }

  .task-metric-groups,
  .review-detail-grid.task-distribution-grid {
    grid-template-columns: 1fr;
  }

  .task-metric-group .mini-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
    gap: clamp(3px, 1vw, 8px);
  }

  .trend-bar-item {
    flex: 1 1 0;
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

@media (max-width: 440px) {
  .overview-kpi-grid {
    grid-template-columns: 1fr;
  }

  .overview-kpi {
    min-height: 96px;
  }
}
@container stats-content (max-width: 1120px) {
  .review-detail-grid.task-attention-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@container stats-content (max-width: 640px) {
  .review-detail-grid.task-attention-grid {
    grid-template-columns: 1fr;
  }
}

@container stats-content (max-width: 900px) {
  .overview-cards-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .overview-cards-grid > .activity-overview { grid-column: span 2; }
}

@container stats-content (max-width: 700px) {
  .overview-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@container stats-content (max-width: 440px) {
  .overview-kpi-grid { grid-template-columns: 1fr; }
  .overview-cards-grid { grid-template-columns: 1fr; }
  .overview-cards-grid > .activity-overview { grid-column: span 1; }
}

</style>
