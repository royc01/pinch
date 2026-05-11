<template>
  <TaskScopeDialog
    :show="show"
    :notebooks="[]"
    :excluded-notebook-ids="[]"
    :show-scope-tab="false"
    :show-extra="false"
    :title="t('goalManagement')"
    :hint="t('goalManagementHint')"
    :confirm-text="t('save')"
    :initial-tab="'goals'"
    :goals="goals"
    :goal-documents="documents"
    @close="emit('close')"
    @save="handleSave"
  />
</template>

<script setup lang="ts">
import { t } from '@/utils/i18n';
import TaskScopeDialog, { type TaskScopeDialogSavePayload } from '@/components/TaskScopeDialog.vue';
import type { Goal } from '@/goalRepository';
import type { GoalScopeDocument } from '@/utils/goalScopeDocuments';

interface Props {
  show: boolean;
  goals: Goal[];
  documents: GoalScopeDocument[];
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
  save: [goals: Goal[]];
}>();

function handleSave(payload: TaskScopeDialogSavePayload): void {
  emit('save', payload.goals);
}
</script>
