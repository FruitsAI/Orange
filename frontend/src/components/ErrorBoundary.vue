<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-content">
      <h2>⚠️ 页面出错了</h2>
      <p class="error-message">{{ error?.message }}</p>
      <button @click="resetError" class="retry-button">重新加载</button>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'

const hasError = ref(false)
const error = ref<Error | null>(null)

// 捕获子组件错误
onErrorCaptured((err) => {
  hasError.value = true
  error.value = err

  // 记录错误日志
  console.error('ErrorBoundary captured:', err)

  // 返回 false 阻止错误继续传播
  return false
})

// 重置错误状态
function resetError() {
  hasError.value = false
  error.value = null

  // 可选：刷新页面
  // window.location.reload()
}
</script>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px;
}

.error-content {
  text-align: center;
  max-width: 400px;
}

.error-content h2 {
  color: #ef4444;
  margin-bottom: 16px;
}

.error-message {
  color: #6b7280;
  margin-bottom: 24px;
}

.retry-button {
  padding: 8px 24px;
  background: #3b82f6;
  color: white;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-button:hover {
  background: #2563eb;
}
</style>