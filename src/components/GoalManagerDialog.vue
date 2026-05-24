<template>
  <TaskScopeDialog
    :show="show"
    :notebooks="[]"
    :excluded-notebook-ids="[]"
    :show-scope-tab="false"
    :show-extra="false"
    :title="t('goalManager.title')"
    :hint="t('goalManager.compatHint')"
    :confirm-text="t('common.save')"
    :initial-tab="'goals'"
    :goals="goals"
    :goal-documents="documents"
    @close="emit('close')"
    @save="handleSave"
  />
</template>

<script setup lang="ts">
import TaskScopeDialog, { type TaskScopeDialogSavePayload } from '@/components/TaskScopeDialog.vue';
import type { Goal } from '@/goalRepository';
import type { GoalScopeDocument } from '@/utils/goalScopeDocuments';
import { useI18n } from '@/composables/useI18n';

interface Props {
  show: boolean;
  goals: Goal[];
  documents: GoalScopeDocument[];
}

defineProps<Props>();
const { t } = useI18n();

const emit = defineEmits<{
  close: [];
  save: [goals: Goal[]];
}>();

function handleSave(payload: TaskScopeDialogSavePayload): void {
  emit('save', payload.goals);
}
</script>
