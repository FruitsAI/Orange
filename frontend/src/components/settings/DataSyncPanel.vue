<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { syncApi, type SyncConfig, type TableCompareResult, type SyncResult } from '@/api/sync'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'

const toast = useToast()
const { confirm } = useConfirm()

// 云端配置
const cloudConfig = reactive<SyncConfig>({
  db_type: 'postgres', // 默认 PostgreSQL
  host: '',
  port: 5432,
  user: '',
  password: '',
  db_name: '',
  ssl_mode: 'require'
})

// UI 状态
const loading = ref(false)
const testLoading = ref(false)
const syncLoading = ref(false)
const compareResults = ref<TableCompareResult[]>([])
const syncResults = ref<SyncResult[]>([])
const step = ref<'config' | 'compare' | 'sync'>('config') // 当前步骤

// 数据库类型选项
const dbTypeOptions = [
  { label: 'PostgreSQL / Supabase / Nile', value: 'postgres' },
  { label: 'MySQL / TiDB', value: 'mysql' }
]

// 监听类型变化调整默认端口
const handleDbTypeChange = () => {
  if (cloudConfig.db_type === 'mysql') {
    cloudConfig.port = 3306
    cloudConfig.ssl_mode = 'false' // MySQL 驱动通常不需要手动指定 sslmode=require，视驱动而定
  } else {
    cloudConfig.port = 5432
    cloudConfig.ssl_mode = 'require'
  }
}

// 1. 测试连接
const testConnection = async () => {
  if (!cloudConfig.host || !cloudConfig.user || !cloudConfig.db_name) {
    toast.warning('请填写完整的数据库连接信息')
    return
  }
  
  testLoading.value = true
  try {
    const res = await syncApi.testConnection(cloudConfig)
    if (res.data.code === 0) {
      toast.success('连接成功')
      // 连接成功后，自动进入对比步骤
      compareData()
    } else {
      toast.error(`连接失败: ${res.data.message}`)
    }
  } catch (error) {
    console.error(error)
    toast.error('连接失败，请检查网络或配置')
  } finally {
    testLoading.value = false
  }
}

// 2. 对比数据
const compareData = async () => {
  loading.value = true
  step.value = 'compare'
  compareResults.value = []
  syncResults.value = []
  
  try {
    const res = await syncApi.compare(cloudConfig)
    if (res.data.code === 0) {
      compareResults.value = res.data.data
    } else {
      toast.error(`对比失败: ${res.data.message}`)
    }
  } catch (error) {
    console.error(error)
    toast.error('获取对比数据失败')
  } finally {
    loading.value = false
  }
}

// 3. 执行同步
const startSync = async () => {
  const confirmed = await confirm({
    title: '确认同步',
    message: '此操作将把本地数据覆盖写入到云端数据库，云端已有的同ID数据将被更新。确定要继续吗？'
  })
  
  if (!confirmed) return

  syncLoading.value = true
  step.value = 'sync'
  
  // 收集所有表名
  const tables = compareResults.value.map(r => r.table_name)
  
  try {
    const res = await syncApi.execute(cloudConfig, tables)
    if (res.data.code === 0) {
      syncResults.value = res.data.data
      const failed = res.data.data.filter(r => !r.success)
      if (failed.length > 0) {
        toast.warning(`同步完成，但有 ${failed.length} 个表同步失败`)
      } else {
        toast.success('所有数据同步成功！')
        // 刷新对比数据
        setTimeout(compareData, 1000)
      }
    } else {
      toast.error(`同步请求失败: ${res.data.message}`)
    }
  } catch (error) {
    console.error(error)
    toast.error('同步过程中发生错误')
  } finally {
    syncLoading.value = false
  }
}

const getTableLabel = (name: string) => {
  const map: Record<string, string> = {
    'users': '用户表 (users)',
    'projects': '项目表 (projects)',
    'payments': '收款表 (payments)',
    'dictionaries': '字典分类 (dictionaries)',
    'dictionary_item': '字典详情 (dictionary_item)',
    'notifications': '通知表 (notifications)',
    'user_notifications': '用户通知状态 (user_notifications)'
  }
  return map[name] || name
}

onMounted(async () => {
  try {
    const res = await syncApi.getConfig()
    if (res.data.code === 0 && res.data.data) {
      const cfg = res.data.data
      // 只有当配置存在时才覆盖
      if (cfg.host) {
        Object.assign(cloudConfig, {
          ...cfg,
          // 确保端口也是数字
          port: Number(cfg.port) || 5432
        })
      }
    }
  } catch (e) {
    console.error('Failed to load sync config', e)
  }
})
</script>

<template>
  <div class="data-sync-panel">
    <!-- Header: Consistent with SettingsView -->
    <div class="glass-card-header border-b border-color-border p-md flex justify-between items-center">
      <h3 class="glass-card-title">数据同步</h3>
      <div v-if="step !== 'config'">
        <button class="btn btn-secondary btn-sm border border-color-border shadow-sm hover:bg-bg-elevated transition-colors" @click="step = 'config'">
          <i class="ri-settings-3-line mr-1"></i> 修改配置
        </button>
      </div>
    </div>

    <div class="p-md">
      <!-- 1. Configuration Form -->
      <div v-show="step === 'config'" class="config-section">
        <!-- Intro Text -->
        <div class="rounded-lg flex items-start gap-4" 
             style="padding: 16px !important; margin-bottom: 24px !important; background-color: rgba(var(--color-primary-rgb), 0.06); border: 1px solid rgba(var(--color-primary-rgb), 0.15);">
          <i class="ri-information-line mt-0.5 shrink-0 text-lg" style="color: var(--color-primary);"></i>
          <p class="text-sm leading-8" style="color: var(--text-secondary);">
            将本地 SQLite 数据单向同步到云端 PostgreSQL 或 MySQL 数据库。此操作适合数据备份或多端数据汇总。
          </p>
        </div>

        <div class="form-group" style="margin-bottom: 24px !important;">
          <label class="form-label">数据库类型</label>
          <div class="input-wrapper">
             <select v-model="cloudConfig.db_type" @change="handleDbTypeChange" class="form-select">
                <option v-for="opt in dbTypeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
             </select>
             <i class="ri-arrow-down-s-line select-arrow"></i>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="form-group col-span-1 md:col-span-2">
            <label class="form-label">主机地址 (Host)</label>
            <input type="text" v-model="cloudConfig.host" class="form-input" placeholder="例如: aws-0-ap-northeast-1.pooler.supabase.com" />
          </div>

          <div class="form-group">
            <label class="form-label">端口 (Port)</label>
            <input type="number" v-model="cloudConfig.port" class="form-input" />
          </div>

          <div class="form-group">
            <label class="form-label">数据库名 (Database)</label>
            <input type="text" v-model="cloudConfig.db_name" class="form-input" placeholder="例如: postgres" />
          </div>

          <div class="form-group">
            <label class="form-label">用户名 (User)</label>
            <input type="text" v-model="cloudConfig.user" class="form-input" />
          </div>

          <div class="form-group">
            <label class="form-label">密码 (Password)</label>
            <input type="password" v-model="cloudConfig.password" class="form-input" placeholder="••••••••" />
          </div>
          
           <div class="form-group col-span-1 md:col-span-2" v-if="cloudConfig.db_type === 'postgres'">
            <label class="form-label">SSL 模式</label>
            <div class="input-wrapper">
               <select v-model="cloudConfig.ssl_mode" class="form-select">
                  <option value="disable">Disable</option>
                  <option value="require">Require (推荐)</option>
                  <option value="verify-full">Verify Full</option>
               </select>
               <i class="ri-arrow-down-s-line select-arrow"></i>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between border-t border-color-border" style="margin-top: 32px !important; padding-top: 24px !important;">
           <div class="text-xs text-secondary opacity-60 max-w-[60%]">
             <i class="ri-shield-check-line mr-1 align-bottom"></i> 你的数据库凭据仅用于本地连接，不会发送到任何第三方服务器。
           </div>
           <button 
            class="btn btn-primary px-8 py-2.5 flex items-center justify-center gap-2" 
            @click="testConnection" 
            :disabled="testLoading"
          >
            <i v-if="testLoading" class="ri-loader-4-line animate-spin"></i>
            <span v-else>测试连接并下一步</span>
            <i v-if="!testLoading" class="ri-arrow-right-line"></i>
          </button>
        </div>
      </div>

      <!-- 2. Compare & Sync Dashboard -->
      <div v-show="step !== 'config'" class="sync-section">
        
        <!-- Dashboard Card -->
        <div class="bg-bg-base border border-color-border rounded-xl flex flex-col items-center justify-center shadow-sm"
             style="padding: 20px !important; margin-bottom: 20px !important; gap: 24px !important;">
           
           <!-- Database Info -->
           <div class="flex items-center gap-6">
              <div class="w-16 h-16 rounded-2xl bg-bg-elevated border border-color-border flex items-center justify-center text-primary shadow-sm shrink-0" 
                   style="width: 64px !important; height: 64px !important;">
                 <i class="ri-database-2-line text-3xl text-primary"></i>
              </div>
              <div class="flex flex-col items-start text-left" style="align-items: flex-start !important;">
                <div class="text-xs font-bold text-secondary mb-2 uppercase tracking-wider" style="letter-spacing: 0.05em;">目标数据库</div>
                <div class="font-mono font-bold text-xl flex items-center gap-3 text-primary">
                   <span class="truncate max-w-[400px]" :title="cloudConfig.host">
                     {{ cloudConfig.db_type === 'postgres' ? 'PostgreSQL' : 'MySQL' }} 
                     <span class="text-secondary font-normal opacity-40 mx-1">@</span> 
                     {{ cloudConfig.host }}
                   </span>
                   <span class="relative flex h-3 w-3 shrink-0" title="Connection Active">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
                   </span>
                </div>
              </div>
           </div>

           <!-- Action Buttons -->
           <div class="flex items-center justify-center gap-5 w-full">
             <button class="btn btn-secondary px-8 py-3 h-12 border border-color-border shadow-sm hover:bg-bg-elevated hover:border-primary/30 transition-all font-medium text-sm" 
                     @click="compareData" :disabled="loading || syncLoading">
               <i class="ri-refresh-line mr-2 text-lg" :class="{'animate-spin': loading}"></i> 重新对比
             </button>
             <button class="btn btn-primary px-10 py-3 h-12 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all font-medium text-sm" 
                     @click="startSync" :disabled="loading || syncLoading">
                <i v-if="syncLoading" class="ri-loader-4-line animate-spin mr-2 text-lg"></i>
                <i v-else class="ri-upload-cloud-2-line mr-2 text-lg"></i>
                开始同步
             </button>
           </div>
        </div>

        <!-- Data Table (Clean Style) -->
        <div class="flex flex-col">
           <div class="px-2 py-3 border-b border-color-border flex items-center justify-between mb-2">
              <h3 class="font-bold text-lg text-primary flex items-center gap-2">
                <i class="ri-file-list-3-line text-secondary"></i> 数据对比明细
              </h3>
              <div class="text-xs text-secondary font-mono">
                 TOTAL: {{ compareResults.length }} tables
              </div>
           </div>
           
           <table class="w-full text-left border-collapse data-table-clean">
             <thead>
               <tr class="text-[11px] font-bold text-secondary border-b border-color-border">
                 <th class="px-4 py-3 pl-2 opacity-70">数据表</th>
                 <th class="px-4 py-3 text-right opacity-70">本地记录数</th>
                 <th class="px-4 py-3 text-right opacity-70">云端记录数</th>
                 <th class="px-4 py-3 text-center opacity-70">状态</th>
                 <th class="px-4 py-3 pr-2 text-right opacity-70" v-if="syncResults.length">同步结果</th>
               </tr>
             </thead>
             <tbody class="divide-y divide-color-border">
               <tr v-if="loading">
                  <td colspan="5" class="p-16 text-center text-secondary">
                    <div class="flex flex-col items-center gap-4">
                      <i class="ri-loader-4-line text-4xl animate-spin text-primary"></i>
                      <span class="text-sm font-medium opacity-70">正在分析数据库差异...</span>
                    </div>
                  </td>
               </tr>
               <tr 
                 v-else 
                 v-for="res in compareResults" 
                 :key="res.table_name"
                 class="hover:bg-bg-elevated/40 transition-colors group"
               >
                 <td class="px-4 py-3 pl-2">
                    <div class="font-medium text-primary text-sm">{{ getTableLabel(res.table_name).split('(')[0] }}</div>
                    <div class="text-[11px] text-secondary opacity-50 font-mono mt-0.5">{{ res.table_name }}</div>
                 </td>
                 <td class="px-4 py-3 text-right font-mono text-sm text-secondary">{{ res.local_count }}</td>
                 <td class="px-4 py-3 text-right font-mono text-sm text-secondary">
                    <span v-if="res.remote_count === -1" class="text-danger bg-danger/10 px-1.5 py-0.5 rounded text-[10px] font-bold border border-danger/20">ERROR</span>
                    <span v-else>{{ res.remote_count }}</span>
                 </td>
                 <td class="px-4 py-3 text-center">
                    <!-- Status Badges -->
                    <span v-if="res.local_count !== res.remote_count" class="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 text-xs font-bold shadow-sm"
                          style="padding: 6px 12px !important">
                       <span class="w-1.5 h-1.5 rounded-full bg-orange-500"></span> 差异
                    </span>
                    <span v-else class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold shadow-sm"
                          style="padding: 6px 12px !important">
                       <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 一致
                    </span>
                 </td>
                 <td class="px-4 py-3 pr-2 text-right" v-if="syncResults.length">
                    <!-- Sync Result -->
                    <template v-for="sr in syncResults" :key="sr.table_name">
                       <div v-if="sr.table_name === res.table_name">
                          <span v-if="sr.success" class="text-emerald-600 dark:text-emerald-500 text-sm flex items-center justify-end gap-1.5 font-bold">
                             <i class="ri-check-line text-lg"></i> {{ sr.synced_count }}
                          </span>
                          <span v-else class="text-danger flex items-center justify-end gap-1.5 text-[11px] bg-danger/10 px-2 py-1 rounded border border-danger/20 font-medium" :title="sr.error_message">
                             <i class="ri-error-warning-fill"></i> 失败
                          </span>
                       </div>
                    </template>
                 </td>
               </tr>
                <tr v-if="!loading && compareResults.length === 0">
                  <td colspan="5" class="p-12 text-center text-tertiary">
                    <div class="flex flex-col items-center gap-2">
                       <i class="ri-inbox-archive-line text-3xl opacity-30"></i>
                       <span class="text-sm">暂无对比数据，请在上方点击「重新对比」</span>
                    </div>
                  </td>
                </tr>
             </tbody>
           </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
    color: var(--text-secondary);
}

.form-input, .form-select {
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-base);
    color: var(--text-primary);
    font-size: 14px;
    transition: all 0.2s;
}

.form-input:focus, .form-select:focus {
    border-color: var(--color-primary);
    outline: none;
    background: var(--bg-elevated);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.1);
}

.form-select {
    appearance: none;
    padding-right: 32px;
}

.input-wrapper {
  position: relative;
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-tertiary);
  pointer-events: none;
}

/* 覆盖表格样式 */
.data-table-clean {
  width: 100%;
  border-collapse: collapse;
}

.data-table-clean th,
.data-table-clean td {
  padding: var(--spacing-md);
  text-align: left;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05); /* Light mode border */
  white-space: nowrap;
}

[data-theme='dark'] .data-table-clean th,
[data-theme='dark'] .data-table-clean td {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05); /* Dark mode border */
}

.data-table-clean th {
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 13px; /* Matched size */
  background: transparent !important;
  text-transform: none; /* Remove uppercase if needed, but user didn't explicitly say. Keeping headers clean. */
  letter-spacing: normal;
}

/* Remove uppercase transformation and specific tracking from inline styles if any, 
   but since we are using class names in template, we override here */
.data-table-clean th {
    text-transform: none !important;
    letter-spacing: normal !important;
}

tr:last-child td {
  border-bottom: none;
}

/* Fix CSS variable usage in scoped style */
.border-color-border {
  border-color: var(--separator-color);
}
</style>
