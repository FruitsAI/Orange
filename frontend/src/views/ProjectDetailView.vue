<!--
 * @file ProjectDetailView.vue
 * @description 项目详情视图
 * 
 * 主要功能：
 * 1. 展示项目概览（进度、金额、日期等）
 * 2. 展示圆环形进度条和财务统计卡片
 * 3. 展示收款计划列表，并支持确认收款操作
 * 4. 提供快速入口：编辑项目、添加收款
 -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import GlassCard from '@/components/common/GlassCard.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { projectApi, type Project, type Payment } from '@/api/project'
import { dictionaryApi, type DictionaryItem } from '@/api/dictionary'
import { formatCurrency, formatDate } from '@/utils/format'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const activeTab = ref(0) // 0: Overview, 1: Payments

// State
// Partial project for view model or mapped type
// 视图模型接口
interface ProjectViewModel {
    id: number
    name: string
    clientName: string
    status: Project['status']
    startDate: string
    endDate: string
    progress: number
    totalAmount: number
    paidAmount: number
    description: string
    contractNo: string
    contractDate: string
}
const project = ref<ProjectViewModel>({} as ProjectViewModel)

interface PaymentViewModel {
    id: number
    title: string
    amount: number
    date: string
    status: string | number
    method: string
}
const payments = ref<PaymentViewModel[]>([])
const loading = ref(false)

// 字典数据
const paymentStageDict = ref<DictionaryItem[]>([])
const paymentMethodDict = ref<DictionaryItem[]>([])
const projectStatusDict = ref<DictionaryItem[]>([])

// Helper methods
const goBack = () => router.back()
const switchTab = (idx: number) => (activeTab.value = idx)

const getDictionaryLabel = (dict: DictionaryItem[], val: string) => {
    const item = dict.find(i => i.value === val)
    return item ? item.label : val
}

const getStatusLabel = (status: string) => {
  const item = projectStatusDict.value.find(i => i.value === status)
  return item ? item.label : status
}

const getPaymentStatusLabel = (s: string | number) => {
  // Handle both legacy number (mock) and new string
  if (s === 'paid' || s === 2) return '已收款'
  if (s === 'pending' || s === 1) return '待收款'
  return '未开始'
}

const getPaymentStatusClass = (s: string | number) => {
  if (s === 'paid' || s === 2) return 'status-success'
  if (s === 'pending' || s === 1) return 'status-warning'
  return 'status-gray'
}

const fetchData = async () => {
    loading.value = true
    try {
        const id = parseInt(route.params.id as string)
        const { data } = await projectApi.get(id)
        if (data.code === 0 && data.data) {
            const p = data.data
            
            // 如果后端未提供进度字段，根据金额计算
            let progress = 0
            if (p.total_amount > 0) {
                 progress = Math.min(100, Math.round((p.received_amount / p.total_amount) * 100))
            }

            project.value = {
                id: p.id,
                name: p.name,
                clientName: p.company,
                status: p.status,
                startDate: p.start_date,
                endDate: p.end_date,
                progress: progress,
                totalAmount: p.total_amount,
                paidAmount: p.received_amount || 0,
                description: p.description,
                contractNo: p.contract_number,
                contractDate: p.contract_date
            }

            // 获取款项列表
            let rawPayments: Payment[] = p.payments || []
            if (!rawPayments.length) {
                 const payRes = await projectApi.getPayments(id)
                 if (payRes.data.code === 0 && payRes.data.data) {
                     rawPayments = payRes.data.data
                 }
            }
            
            // 映射为视图模型
            payments.value = rawPayments.map((rp) => ({
                id: rp.id,
                title: getDictionaryLabel(paymentStageDict.value, rp.stage) || rp.remark, 
                amount: rp.amount,
                date: rp.plan_date,
                status: rp.status, 
                method: rp.method
            }))
        }
    } catch (e) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

const fetchDictionaries = async () => {
    try {
        const [stageRes, methodRes, statusRes] = await Promise.all([
            dictionaryApi.getItems('payment_stage'),
            dictionaryApi.getItems('payment_method'),
            dictionaryApi.getItems('project_status')
        ])
        if (stageRes.data.code === 0) paymentStageDict.value = stageRes.data.data || []
        if (methodRes.data.code === 0) paymentMethodDict.value = methodRes.data.data || []
        if (statusRes.data.code === 0) projectStatusDict.value = statusRes.data.data || []
    } catch (e) { console.error(e) }
}

onMounted(async () => {
    await fetchDictionaries()
    if (route.params.id) {
        await fetchData()
    }
})


</script>

<template>
  <div class="project-detail-view pb-12">
    <!-- Header Section -->
    <div class="header-section">
      <div class="flex items-center gap-4">
        <button class="btn btn-ghost btn-icon" @click="goBack">
          <i class="ri-arrow-left-line text-2xl text-primary"></i>
        </button>
        <div>
          <h1 class="text-2xl font-bold flex items-center gap-3">
            {{ project.name }}
          </h1>
          <div class="flex items-center gap-2 mt-1">
            <p class="text-secondary text-sm">客户: {{ project.clientName }}</p>
            <StatusBadge :status="project.status">{{ getStatusLabel(project.status) }}</StatusBadge>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          class="btn btn-ghost btn-icon"
          title="编辑项目"
          @click="router.push(`/projects/edit/${project.id}`)"
        >
          <i class="ri-edit-line"></i>
        </button>
        <button class="btn btn-ghost btn-icon" title="导出">
          <i class="ri-download-2-line"></i>
        </button>
      </div>
    </div>

    <!-- Main Layout -->
    <div class="detail-layout">
      <!-- Tabs -->
      <div class="tabs-container">
        <button class="tab-btn" :class="{ active: activeTab === 0 }" @click="switchTab(0)">
          项目概览
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 1 }" @click="switchTab(1)">
          收款计划
        </button>
      </div>

      <!-- Tab 0: Overview -->
      <div v-if="activeTab === 0" class="content-animate">
        <!-- Progress Card -->
        <GlassCard class="card-spacing">
          <div class="progress-card-content">
            <!-- Circular Progress -->
            <div class="circle-container">
              <svg class="progress-ring" width="120" height="120" viewBox="0 0 120 120">
                <circle
                  class="progress-ring-track"
                  stroke-width="10"
                  fill="transparent"
                  r="50"
                  cx="60"
                  cy="60"
                />
                <circle
                  class="progress-ring-circle"
                  stroke-width="10"
                  fill="transparent"
                  r="50"
                  cx="60"
                  cy="60"
                  :style="{ strokeDashoffset: 314 - (314 * project.progress) / 100 }"
                />
              </svg>
              <div class="circle-text">
                <span class="percent">{{ project.progress }}%</span>
                <span class="label">总进度</span>
              </div>
            </div>

            <div class="progress-info">
              <h3 class="card-title">项目整体进度</h3>
              <p class="description-text">
                {{
                  project.progress >= 100
                    ? '项目已全部完成，等待最终交付确认。'
                    : '当前项目正如期进行中，已完成关键里程碑。'
                }}
              </p>
              <div class="info-grid">
                <div class="info-item">
                  <div class="label">开始日期</div>
                  <div class="value">{{ formatDate(project.startDate) }}</div>
                </div>
                <div class="info-item">
                  <div class="label">预计完成</div>
                  <div class="value">{{ formatDate(project.endDate) }}</div>
                </div>
                <div class="info-item">
                  <div class="label">合同编号</div>
                  <div class="value font-mono">{{ project.contractNo }}</div>
                </div>
                <div class="info-item">
                  <div class="label">签约日期</div>
                  <div class="value">{{ formatDate(project.contractDate) }}</div>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        <!-- Financial Snapshot -->
        <GlassCard class="card-spacing">
          <h3 class="card-header">收款概况</h3>
          <div class="financial-grid">
            <div class="finance-card bg-gray">
              <span class="label">合同总额</span>
              <span class="amount">{{ formatCurrency(project.totalAmount) }}</span>
            </div>
            <div class="finance-card bg-green">
              <span class="label success">已收款</span>
              <span class="amount text-success">{{ formatCurrency(project.paidAmount) }}</span>
            </div>
            <div class="finance-card bg-orange">
              <span class="label warning">待收款</span>
              <span class="amount text-warning">{{
                formatCurrency(project.totalAmount - project.paidAmount)
              }}</span>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="payment-progress">
            <div class="progress-header">
              <span class="text-secondary">收款进度</span>
              <span class="font-medium"
                >{{ Math.round((project.paidAmount / project.totalAmount) * 100) }}%</span
              >
            </div>
            <div class="progress-bar-bg">
              <div
                class="progress-bar-fill"
                :style="{ width: (project.paidAmount / project.totalAmount) * 100 + '%' }"
              ></div>
            </div>
          </div>
        </GlassCard>

        <!-- Description -->
        <GlassCard>
          <h3 class="card-header mb-2">项目描述</h3>
          <p class="description-text leading-relaxed">
            {{ project.description }}
          </p>
        </GlassCard>
      </div>

      <!-- Tab 1: Payments -->
      <div v-if="activeTab === 1" class="content-animate">
        <div class="payments-header-card">
          <div>
            <h3 class="font-bold text-lg">收款记录</h3>
            <p class="text-xs text-secondary mt-0.5">共 {{ payments.length }} 笔收款计划</p>
          </div>

          <button
            class="btn btn-sm btn-primary"
            @click="router.push(`/projects/${project.id}/payment/create`)"
          >
            <i class="ri-add-line mr-1"></i>添加收款
          </button>
        </div>

        <div class="payments-list">
          <GlassCard v-for="pay in payments" :key="pay.id" class="payment-item">
            <div class="payment-left">
              <div class="icon-circle">
                <i class="ri-secure-payment-line"></i>
              </div>
              <div>
                <div class="payment-title-row">
                  <span class="font-bold text-sm">{{ pay.title }}</span>
                  <span class="status-tag" :class="getPaymentStatusClass(pay.status)">
                    {{ getPaymentStatusLabel(pay.status) }}
                  </span>
                </div>
                <div class="text-xs text-secondary">
                  {{ pay.status === 2 ? '实际收款' : '预计收款' }}: {{ formatDate(pay.date) }}
                </div>
              </div>
            </div>
            <div class="payment-right">
              <div class="amount-text">{{ formatCurrency(pay.amount) }}</div>
              <button v-if="pay.status === 1" class="confirm-btn">
                <i class="ri-check-double-line mr-0.5"></i>确认收款
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Standard Layout */
.project-detail-view {
  width: 100%;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  /* Ensure header aligns with content */
  padding-left: 0;
}

/* Tabs */
.tabs-container {
  display: flex;
  gap: 4px;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px;
  border-radius: 12px;
  width: fit-content;
  margin-bottom: 24px;
}

.tab-btn {
  padding: 8px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  cursor: pointer;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  background: white;
  color: var(--color-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  font-weight: 600;
}

/* Overview - Progress Card */
.progress-card-content {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 8px;
}

@media (max-width: 768px) {
  .progress-card-content {
    flex-direction: column;
    text-align: center;
  }
}

/* Circular Progress */
.circle-container {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
}

.progress-ring {
  transform: rotate(-90deg);
  transform-origin: 50% 50%;
}

.progress-ring-track {
  stroke: #f3f4f6;
}

.progress-ring-circle {
  stroke: var(--color-primary);
  stroke-dasharray: 314; /* 2 * PI * 50 */
  transition: stroke-dashoffset 1s ease-out;
  stroke-linecap: round;
}

.circle-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.circle-text .percent {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.circle-text .label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Info Grid */
.progress-info {
  flex: 1;
  width: 100%;
}

.card-title,
.card-header {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}

.description-text {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.6;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  background: rgba(0, 0, 0, 0.03);
  padding: 16px;
  border-radius: 12px;
}

@media (max-width: 640px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.info-item .label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.info-item .value {
  font-weight: 600;
  font-size: 14px;
}

/* Financial Grid */
.financial-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.finance-card {
  padding: 16px;
  border-radius: 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
}

.finance-card.bg-gray {
  background: var(--bg-base);
}
.finance-card.bg-green {
  background: rgba(16, 185, 129, 0.1);
}
.finance-card.bg-orange {
  background: rgba(245, 158, 11, 0.1);
}

.finance-card .label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

[data-theme='dark'] .finance-card.bg-gray {
  background: rgba(255, 255, 255, 0.05);
}
[data-theme='dark'] .finance-card .label {
  color: var(--text-secondary);
}
[data-theme='dark'] .finance-card .amount {
  color: var(--text-primary);
}

.finance-card .label.success {
  color: var(--color-success);
}
.finance-card .label.warning {
  color: var(--color-warning);
}

.amount {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}
.text-success {
  color: var(--color-success);
}
.text-warning {
  color: var(--color-warning);
}

@media (max-width: 640px) {
  .financial-grid {
    gap: 8px;
  }

  .finance-card {
    padding: 10px 4px;
    border-radius: 8px;
  }

  .finance-card .label {
    font-size: 10px;
    margin-bottom: 2px;
  }

  .amount {
    font-size: 14px;
  }
}

/* Progress Bar */
.payment-progress .progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 6px;
}

.progress-bar-bg {
  width: 100%;
  height: 10px;
  background: #f3f4f6;
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar-fill {
  background: #10b981;
  height: 100%;
  border-radius: 999px;
  transition: width 1s ease-out;
}

/* Payments List */
.payments-header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  padding: 16px 0;
  padding-left: 12px; /* Added spacing as requested */
  /* border-radius: 16px; */
  /* box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); */
  margin-bottom: 0; /* Reduce gap since padding handles it */
}

.payments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.payment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  cursor: default; /* Explicitly default */
  transition: all 0.2s;
}

.payment-item:hover {
  border-color: rgba(var(--color-primary-rgb), 0.3);
  background: rgba(255, 255, 255, 0.4);
}

.payment-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 18px;
}

.payment-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.status-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 500;
}

.status-success {
  background: #d1fae5;
  color: #047857;
}
.status-warning {
  background: #fef3c7;
  color: #b45309;
}
.status-gray {
  background: #f3f4f6;
  color: #6b7280;
}

.payment-right {
  text-align: right;
}

.amount-text {
  font-size: 18px;
  font-weight: 600;
  font-family: monospace;
}

.confirm-btn {
  font-size: 12px;
  color: var(--color-primary);
  margin-top: 4px;
}

.confirm-btn:hover {
  text-decoration: underline;
}

.content-animate {
  animation: slideUp 0.4s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-spacing {
  margin-bottom: 24px; /* Reduced from 32px to match standard gap-6 (24px) */
}

/* Payment List Item - Standard Clickable Cursor REMOVED as requested */
.payment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  cursor: default; /* Changed from pointer */
  transition: all 0.2s;
}

.text-primary {
  color: var(--color-primary);
}
</style>
