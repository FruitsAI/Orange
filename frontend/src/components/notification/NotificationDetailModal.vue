<script setup lang="ts">
import { computed } from 'vue'
import type { Notification } from '@/api/notification'

const props = defineProps<{
  modelValue: boolean
  notification: Notification | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const typeName = computed(() => {
  if (!props.notification) return ''
  switch (props.notification.type) {
    case 2: return '活动'
    case 3: return '私信'
    default: return '系统'
  }
})

const targetName = computed(() => {
  if (!props.notification) return ''
  return props.notification.is_global === 1 ? '全员通知' : '私信通知'
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="modal-overlay open" @click.self="visible = false">
        <div class="modal open">
          <div class="modal-header">
            <h3 class="modal-title">通知详情</h3>
            <button class="modal-close" @click="visible = false">
              <i class="ri-close-line"></i>
            </button>
          </div>
          <div class="modal-body" v-if="notification">
            <div class="notification-detail-header mb-md flex items-center gap-md">
              <span class="notification-type-badge" :class="'type-' + notification.type">
                {{ typeName }}
              </span>
              <span class="text-sm text-secondary">
                {{ targetName }}
              </span>
            </div>
            <h4 class="text-xl font-medium mb-md">{{ notification.title }}</h4>
            <div class="content-wrapper mb-lg">
                <p class="text-secondary" style="white-space: pre-wrap;">{{ notification.content }}</p>
            </div>
            <div class="text-sm text-tertiary">
              {{ new Date(notification.create_time).toLocaleString() }}
              <span v-if="notification.sender"> · 发送者: {{ notification.sender.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Badge Styles */
.notification-type-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid currentColor;
  font-weight: 500;
}

/* System Notification */
.type-1 {
  color: #64748b;
  background: #f8fafc;
  border-color: #cbd5e1;
}

/* Activity Notification */
.type-2 {
  color: #ef4444;
  background: #fef2f2;
  border-color: #fca5a5;
}

/* Private Notification */
.type-3 {
  color: #8b5cf6;
  background: #f5f3ff;
  border-color: #c4b5fd;
}
</style>
