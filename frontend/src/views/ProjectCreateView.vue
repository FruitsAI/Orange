<!--
 * @file ProjectCreateView.vue
 * @description 项目创建/编辑视图
 * 
 * 主要功能：
 * 1. 项目基本信息录入（名称、客户、类型、状态等）
 * 2. 财务信息录入（合同金额、日期、付款模式）
 * 3. 自动根据付款模式（一次性/分期）生成收款计划
 * 4. 支持编辑现有项目及其关联的收款计划
 * 5. 合同编号自动生成与查重校验
 -->
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import GlassCard from '@/components/common/GlassCard.vue'
import DatePicker from '@/components/common/DatePicker.vue'
import { projectApi, paymentApi, type PaymentRequest } from '@/api/project'
import { dictionaryApi, type DictionaryItem } from '@/api/dictionary'
import { useToast } from '@/composables/useToast'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const isEditMode = computed(() => !!route.params.id)

// 统一的款项接口定义
interface PaymentItem {
  id?: number       // 现有款项的 ID (编辑模式)
  stage: string     // 款项阶段 (如：首雪、尾款、进度款)
  amount: string    // 金额 (使用字符串以方便处理输入)
  planDate: string  // 计划收款日期
  method: string    // 收款方式 (如：银行转账)
  status: string    // 状态 (pending/paid)
  remark: string    // 备注信息
}

const formData = ref({
  name: '',
  clientName: '',
  projectType: '',
  status: 'notstarted',
  startDate: '',
  endDate: '',
  totalAmount: '',
  contractNo: '',
  contractDate: '',
  paymentMethod: '一次性付款',
  paymentItems: [] as PaymentItem[], // Use generic name
  description: '',
})

const loading = ref(false)
const originalPaymentIds = ref<number[]>([]) // Track original IDs for deletion

// 选项状态 (从字典加载)
const projectTypeOptions = ref<DictionaryItem[]>([])
const projectStatusOptions = ref<DictionaryItem[]>([])
const collectionStageOptions = ref<DictionaryItem[]>([])
const collectionMethodOptions = ref<DictionaryItem[]>([])
const paymentMethods = ['一次性付款', '分期付款']
const collectionStatuses = [
  { label: '待收款', value: 'pending' },
  { label: '已收款', value: 'paid' }
]

// Methods
// 获取字典数据
const fetchDictionaries = async () => {
  try {
    const [typeRes, statusRes, stageRes, methodRes] = await Promise.all([
      dictionaryApi.getItems('project_type'),
      dictionaryApi.getItems('project_status'),
      dictionaryApi.getItems('payment_stage'),
      dictionaryApi.getItems('payment_method')
    ])
    
    if (typeRes.data.code === 0) {
      projectTypeOptions.value = typeRes.data.data || []
      // 如果没有默认选中值，设置第一个为默认
      if (!formData.value.projectType && projectTypeOptions.value.length > 0) {
        const firstItem = projectTypeOptions.value[0]
        if (firstItem) {
            formData.value.projectType = firstItem.value
        }
      }
    }
    
    if (statusRes.data.code === 0) {
      projectStatusOptions.value = statusRes.data.data || []
    }

    if (stageRes.data.code === 0) {
      collectionStageOptions.value = stageRes.data.data || []
    }

    if (methodRes.data.code === 0) {
      collectionMethodOptions.value = methodRes.data.data || []
    }
  } catch (e) {
    console.error('Failed to fetch dictionaries', e)
  }
}

// Ensure at least one payment item exists
// 确保至少有一个款项，并根据付款模式保持数据一致性
const ensurePaymentItems = () => {
  if (formData.value.paymentMethod === '一次性付款') {
    // 默认使用第一个支付方式或 bank_transfer
    let defaultMethod = 'bank_transfer'
    if (collectionMethodOptions.value.length > 0) {
        const first = collectionMethodOptions.value[0]
        if (first) defaultMethod = first.value
    }
    
    const currentItems = formData.value.paymentItems
    if (currentItems.length > 0) {
        // 如果已有款项 (从 DB 加载或用户已输入)
        // 保留第一个，强制更新其属性以符合"一次性付款"的要求
        const first = currentItems[0]
        
        if (first) {
            // 注意：保留现有 ID 以便更新而非删除重建
            // 更新强制字段
            first.stage = 'all' 
            first.amount = formData.value.totalAmount // 保持金额同步
            if (!first.planDate && formData.value.endDate) {
                 first.planDate = formData.value.endDate
            }
            // 如果方式为空，设置默认值
            if (!first.method) first.method = defaultMethod
            
            // 移除多余的款项 (一次性付款只能有一个)
            if (currentItems.length > 1) {
                 formData.value.paymentItems = [first]
            }
        }
    } else {
        // 无款项，创建全新的默认款项
        formData.value.paymentItems = [{
            stage: 'all', 
            amount: formData.value.totalAmount,
            planDate: formData.value.endDate || '',
            method: defaultMethod,
            status: 'pending',
            remark: '项目全款'
        }]
    }
  } else {
    // 分期付款模式：如果为空则添加默认第一期
    if (formData.value.paymentItems.length === 0) {
      addPaymentItem()
    } else {
      // 如果从一次性付款切换过来，更新第一个款项的阶段为"首付款"
      const firstItem = formData.value.paymentItems[0]
      if (firstItem && firstItem.stage === 'all') {
        firstItem.stage = 'deposit'
        firstItem.remark = '' // 清除"项目全款"备注
      }
    }
  }
}

// Watchers
// 监听器：当支付模式改变时，重新调整款项列表
watch(() => formData.value.paymentMethod, ensurePaymentItems)

// Watch when dictionaries are loaded to update defaults if needed
// 当字典加载完成后，如果当前是一次性付款且没有付款方式，设置默认值
watch(collectionMethodOptions, (newVal) => {
    if (formData.value.paymentMethod === '一次性付款' && formData.value.paymentItems.length > 0 && newVal && newVal.length > 0) {
         const firstItem = formData.value.paymentItems[0]
         if (firstItem && !firstItem.method) {
             const firstOption = newVal[0]
             if (firstOption) {
                 firstItem.method = firstOption.value
             }
         }
    }
})


// 监听总金额变化，同步更新一次性付款的金额
watch(() => formData.value.totalAmount, (newVal) => {
  if (formData.value.paymentMethod === '一次性付款' && formData.value.paymentItems.length > 0) {
    const firstItem = formData.value.paymentItems[0]
    if (firstItem) {
      firstItem.amount = newVal
    }
  }
})

watch(() => formData.value.endDate, (newVal) => {
   if (formData.value.paymentMethod === '一次性付款' && formData.value.paymentItems.length > 0) {
      const firstItem = formData.value.paymentItems[0]
      if (firstItem && !firstItem.planDate) {
        firstItem.planDate = newVal
      }
  } 
})

// 监听合同日期变化，自动生成合同编号（仅新建模式）
watch(() => formData.value.contractDate, async (newVal) => {
  // 仅在新建模式、合同日期有效时自动生成
  if (!isEditMode.value && newVal) {
    try {
      const { data } = await projectApi.generateContractNumber(newVal)
      if (data.code === 0 && data.data) {
        formData.value.contractNo = data.data.contract_number
      }
    } catch (error) {
      console.error('生成合同编号失败', error)
    }
  }
})


const addPaymentItem = () => {
  // 分期付款默认使用"首付款"阶段
  let defaultStage = 'deposit'
  // 如果字典中没有 deposit，则使用第一个选项
  const hasDeposit = collectionStageOptions.value.some(opt => opt.value === 'deposit')
  if (!hasDeposit && collectionStageOptions.value.length > 0) {
      const first = collectionStageOptions.value[0]
      if (first) defaultStage = first.value
  }

  let defaultMethod = ''
  if (collectionMethodOptions.value.length > 0) {
      const first = collectionMethodOptions.value[0]
      if (first) defaultMethod = first.value
  }
  
  formData.value.paymentItems.push({
    stage: defaultStage,
    amount: '',
    planDate: '',
    method: defaultMethod,
    status: 'pending',
    remark: '',
  })
}

const removePaymentItem = (index: number) => {
  if (formData.value.paymentMethod === '一次性付款') return
  formData.value.paymentItems.splice(index, 1)
}

const handleCancel = () => {
  router.back()
}

// 获取项目及其款项数据 (编辑模式)
const fetchProjectData = async (id: number) => {
  try {
    loading.value = true
    // 1. 获取项目基本信息
    const { data } = await projectApi.get(id)
    if (data.code === 0 && data.data) {
      const p = data.data
      formData.value = {
        name: p.name,
        clientName: p.company,
        projectType: p.type || '',
        status: p.status || 'notstarted',
        startDate: p.start_date ? dayjs(p.start_date).format('YYYY-MM-DD') : '',
        endDate: p.end_date ? dayjs(p.end_date).format('YYYY-MM-DD') : '',
        totalAmount: p.total_amount.toString(),
        contractNo: p.contract_number,
        contractDate: p.contract_date ? dayjs(p.contract_date).format('YYYY-MM-DD') : '',
        paymentMethod: p.payment_method || '一次性付款',
        paymentItems: [], 
        description: p.description,
      }
      
      // 2. 获取现有款项列表
      const payRes = await projectApi.getPayments(id)
      if (payRes.data.code === 0 && payRes.data.data) {
          const payments = payRes.data.data
          // 记录原始 ID 以便后续判断删除
          originalPaymentIds.value = payments.map((p) => p.id)
          formData.value.paymentItems = payments.map(p => ({
              id: p.id,
              stage: p.stage,
              amount: p.amount.toString(),
              planDate: p.plan_date ? dayjs(p.plan_date).format('YYYY-MM-DD') : '',
              method: p.method || '',
              status: p.status,
              remark: p.remark
          }))
      }
      
      ensurePaymentItems() // 如果为空或不符合逻辑，进行修正
    }
  } catch (e) {
    console.error(e)
    toast.error('获取项目详情失败')
  } finally {
    loading.value = false
  }
}

// 保存款项信息（处理增删改）
const savePayments = async (projectId: number) => {
    // 1. 识别需要删除的 ID
    const currentIds = new Set(formData.value.paymentItems.map(i => i.id).filter(id => id !== undefined) as number[])
    const toDelete = originalPaymentIds.value.filter(id => !currentIds.has(id))
    
    // 2. 执行删除操作
    for (const id of toDelete) {
        try {
            await paymentApi.delete(id)
        } catch (error) {
            console.error(`Failed to delete payment ${id}:`, error)
            toast.error(`删除收款项 ${id} 失败`)
        }
    }

    // 3. 执行创建或更新操作
    for (const item of formData.value.paymentItems) {
        if (!item.amount || !item.planDate) continue 
        
        const payload: PaymentRequest = {
            project_id: projectId,
            stage: item.stage || '款项',
            amount: parseFloat(item.amount) || 0,
            plan_date: item.planDate, // 必须符合 API 格式
            status: item.status || 'pending',
            method: item.method || 'bank_transfer',
            remark: item.remark
        }

        try {
            if (item.id) {
                await paymentApi.update(item.id, payload)
            } else {
                await paymentApi.create(payload)
            }
        } catch (error) {
            console.error(`Failed to save payment item:`, item, error)
            toast.error(`保存收款项失败: ${item.remark || item.stage}`)
        }
    }
}

const handleSubmit = async () => {
  try {
    // Validation
    if (!formData.value.name) { toast.error('请输入项目名称'); return }
    if (!formData.value.clientName) { toast.error('请输入客户名称'); return }
    if (!formData.value.projectType) { toast.error('请选择项目类型'); return }
    if (!formData.value.status) { toast.error('请选择项目状态'); return }
    if (!formData.value.startDate) { toast.error('请选择开始日期'); return }
    if (!formData.value.endDate) { toast.error('请选择截止日期'); return }
    
    // 校验：开始日期不能晚于截止日期
    if (dayjs(formData.value.startDate).isAfter(dayjs(formData.value.endDate))) {
      toast.error('开始日期不能晚于截止日期')
      return
    }

    if (!formData.value.totalAmount || parseFloat(formData.value.totalAmount) <= 0) { toast.error('请输入有效的合同总金额'); return }
    if (!formData.value.contractNo) { toast.error('请输入合同编号'); return }
    if (!formData.value.contractDate) { toast.error('请选择合同日期'); return }
    
    // 校验：合同日期不能晚于开始日期
    if (dayjs(formData.value.contractDate).isAfter(dayjs(formData.value.startDate))) {
      toast.error('合同日期不能晚于项目开始日期')
      return
    }
    
    // 检查合同编号唯一性
    try {
      const excludeId = isEditMode.value ? parseInt(route.params.id as string) : 0
      const { data: checkResult } = await projectApi.checkContractNumber(formData.value.contractNo, excludeId)
      if (checkResult.code === 0 && checkResult.data?.exists) {
        toast.error('合同编号已存在，请使用其他编号')
        return
      }
    } catch (error) {
      console.error('检查合同编号失败', error)
      toast.error('检查合同编号失败')
      return
    }
    
    // Validate Payment Items
    if (formData.value.paymentItems.length === 0) { toast.error('请至少添加一项收款计划'); return }
    for (const item of formData.value.paymentItems) {
        if (!item.amount || parseFloat(item.amount) <= 0) { toast.error('收款金额必须大于0'); return }
        if (!item.planDate) { toast.error('请选择收款日期'); return }

        // 校验：收款日期不能早于合同日期
        if (dayjs(item.planDate).isBefore(dayjs(formData.value.contractDate))) {
          toast.error(`收款日期(${item.planDate})不能早于合同日期`)
          return
        }
    }

    loading.value = true

    const payload = {
      name: formData.value.name,
      company: formData.value.clientName,
      total_amount: parseFloat(formData.value.totalAmount) || 0,
      status: formData.value.status,
      type: formData.value.projectType,
      contract_number: formData.value.contractNo,
      contract_date: formData.value.contractDate ? dayjs(formData.value.contractDate).format('YYYY-MM-DD') : undefined,
      payment_method: formData.value.paymentMethod,
      start_date: formData.value.startDate,
      end_date: formData.value.endDate,
      description: formData.value.description,
    }

    let projectId: number

    if (isEditMode.value) {
      const id = parseInt(route.params.id as string)
      const { data } = await projectApi.update(id, payload)
      if (data.code !== 0) throw new Error(data.message)
      projectId = id
      
      // Update Payments
      await savePayments(projectId)
      toast.success('项目与收款已更新')

    } else {
      const { data } = await projectApi.create(payload)
      if (data.code !== 0) throw new Error(data.message)
      if (!data.data) throw new Error('No data returned')
      projectId = data.data.id
      
      // Create Payments
      // For create, all are new, so just loop create. 
      // But `savePayments` logic works too (originalIds is empty).
      await savePayments(projectId)
      
      toast.success('项目已创建')
    }

    router.push('/projects')
  } catch (e: unknown) {
    console.error(e)
    const msg = e instanceof Error ? e.message : '提交失败'
    toast.error(msg)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await fetchDictionaries()
  // Ensure we add "all" manually if not in DB yet (for safety)
  // Or trust the user to have updated DB. 
  // Good practice: If 'all' is missing from collectionStageOptions, adding it locally?
  // Let's rely on DB update for consistency, but for immediate UI:
  // We will check in Template or here. 
  // Actually, if we set value 'all', and select options don't have it, it shows blank or value.
  // We will run DB update command in next step.

  if (isEditMode.value) {
    fetchProjectData(parseInt(route.params.id as string))
  } else {
    ensurePaymentItems() // Init for create mode
  }
})
</script>

<template>
  <div class="project-create-view">
    <!-- Back Header -->
    <div style="margin-top: -12px; margin-bottom: 12px">
      <button class="btn btn-ghost btn-sm pl-0 hover:bg-transparent" @click="handleCancel">
        <i class="ri-arrow-left-line text-2xl text-primary"></i>
      </button>
    </div>

    <GlassCard class="w-full">
      <form @submit.prevent="handleSubmit" class="project-form">
        <!-- 基本信息 -->
        <h3 class="section-title">基本信息</h3>
        <div class="form-grid">
          <div class="input-group">
            <label>项目名称 <span class="text-red-500">*</span></label>
            <div class="input-wrapper">
              <input
                v-model="formData.name"
                type="text"
                placeholder="请输入项目名称"
                required
                spellcheck="false"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
              />
            </div>
          </div>

          <div class="input-group">
            <label>客户名称 <span class="text-red-500">*</span></label>
            <div class="input-wrapper">
              <input
                v-model="formData.clientName"
                type="text"
                placeholder="请输入客户名称"
                required
                spellcheck="false"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
              />
            </div>
          </div>

          <div class="input-group">
            <label>项目类型 <span class="text-red-500">*</span></label>
            <div class="input-wrapper">
              <select v-model="formData.projectType" class="form-select">
                <option v-for="type in projectTypeOptions" :key="type.value" :value="type.value">
                  {{ type.label }}
                </option>
              </select>
              <i class="ri-arrow-down-s-line select-arrow"></i>
            </div>
          </div>

          <div class="input-group">
            <label>项目状态 <span class="text-red-500">*</span></label>
            <div class="input-wrapper">
              <select v-model="formData.status" class="form-select">
                <option v-for="status in projectStatusOptions" :key="status.value" :value="status.value">
                  {{ status.label }}
                </option>
              </select>
              <i class="ri-arrow-down-s-line select-arrow"></i>
            </div>
          </div>

          <div class="input-group">
            <label>开始日期 <span class="text-red-500">*</span></label>
            <div class="input-wrapper">
              <DatePicker v-model="formData.startDate" required placeholder="请选择开始日期" />
            </div>
          </div>

          <div class="input-group">
            <label>截止日期 <span class="text-red-500">*</span></label>
            <div class="input-wrapper">
              <DatePicker v-model="formData.endDate" required placeholder="请选择截止日期" />
            </div>
          </div>
        </div>

        <!-- 财务信息 -->
        <h3 class="section-title mt-md">财务信息</h3>
        <div class="form-grid">
          <div class="input-group">
            <label>合同总金额 (¥) <span class="text-red-500">*</span></label>
            <div class="input-wrapper">
              <input
                v-model="formData.totalAmount"
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                spellcheck="false"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
              />
            </div>
          </div>

          <div class="input-group">
            <label>合同日期 <span class="text-red-500">*</span></label>
            <div class="input-wrapper">
              <DatePicker v-model="formData.contractDate" placeholder="请选择合同日期" />
            </div>
          </div>

          <div class="input-group">
            <label>合同编号 <span class="text-red-500">*</span></label>
            <div class="input-wrapper">
              <input
                v-model="formData.contractNo"
                type="text"
                placeholder="选择合同日期后自动生成"
                spellcheck="false"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
              />
            </div>
          </div>

          <div class="input-group">
            <label>付款模式 <span class="text-red-500">*</span></label>
            <div class="input-wrapper">
              <select
                v-model="formData.paymentMethod"
                class="form-select"
                @change="ensurePaymentItems"
              >
                <option v-for="method in paymentMethods" :key="method" :value="method">
                  {{ method }}
                </option>
              </select>
              <i class="ri-arrow-down-s-line select-arrow"></i>
            </div>
          </div>
        </div>

        <!-- 收款计划 (Unified for both methods) -->
        <div class="installments-section mt-md mb-md">
          <div class="flex justify-between items-center mb-sm">
            <h3 class="section-title text-base mb-0 border-none pb-0 pl-0">收款计划</h3>
            <button 
              v-if="formData.paymentMethod === '分期付款'" 
              type="button" 
              class="btn btn-sm btn-primary" 
              @click="addPaymentItem"
            >
              <i class="ri-add-line mr-1"></i>添加分期
            </button>
          </div>

          <div
            v-for="(item, index) in formData.paymentItems"
            :key="index"
            class="installment-item glass-panel p-md mb-md rounded-lg"
            style="border: 1px solid var(--color-primary);"
          >
            <!-- 头部：如果是分期，显示第x期和删除按钮；一次性付款不显示删除 -->
            <div class="flex justify-between items-center mb-4" v-if="formData.paymentMethod === '分期付款'">
              <span class="text-sm font-bold text-primary">第 {{ index + 1 }} 期</span>
              <button type="button" class="text-xs text-danger hover:underline" @click="removePaymentItem(index)">
                删除
              </button>
            </div>
            
            <div class="form-grid">
               <!-- Row 1: Amount & Date -->
              <div class="input-group">
                <label>收款金额 (¥) <span class="text-red-500">*</span></label>
                <div class="input-wrapper">
                  <input 
                    v-model="item.amount" 
                    type="number" 
                    placeholder="0.00" 
                    required 
                    spellcheck="false"
                    autocomplete="off"
                    autocorrect="off"
                    autocapitalize="off"
                  />
                </div>
              </div>
              <div class="input-group">
                <label>收款日期 <span class="text-red-500">*</span></label>
                <div class="input-wrapper">
                  <DatePicker v-model="item.planDate" required placeholder="请选择收款日期" />
                </div>
              </div>

               <!-- Row 2: Stage & Method -->
               <div class="input-group">
                <label>款项阶段 <span class="text-red-500">*</span></label>
                <div class="input-wrapper">
                    <select 
                      v-model="item.stage" 
                      class="form-select" 
                      :disabled="formData.paymentMethod === '一次性付款'"
                    >
                        <option v-for="s in collectionStageOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
                    </select>
                   <i class="ri-arrow-down-s-line select-arrow"></i>
                </div>
              </div>
              <div class="input-group">
                <label>收款方式 <span class="text-red-500">*</span></label>
                <div class="input-wrapper">
                    <select v-model="item.method" class="form-select">
                        <option v-for="m in collectionMethodOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
                    </select>
                   <i class="ri-arrow-down-s-line select-arrow"></i>
                </div>
              </div>

              <!-- Row 3: Status -->
              <div class="input-group">
                <label>状态 <span class="text-red-500">*</span></label>
                <div class="input-wrapper">
                    <select v-model="item.status" class="form-select">
                        <option v-for="s in collectionStatuses" :key="s.value" :value="s.value">{{ s.label }}</option>
                    </select>
                   <i class="ri-arrow-down-s-line select-arrow"></i>
                </div>
              </div>

              <!-- Row 4: Remark -->
              <div class="input-group span-2">
                <label>备注</label>
                <div class="input-wrapper">
                  <textarea v-model="item.remark" rows="2" placeholder="请输入备注信息（选填）" class="form-textarea" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off"></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 其他信息 -->
        <h3 class="section-title mt-md">其他信息</h3>
        <div class="input-group">
          <label>项目描述</label>
          <div class="input-wrapper">
            <textarea
              v-model="formData.description"
              rows="4"
              placeholder="请输入项目描述（选填）"
              class="form-textarea"
              spellcheck="false"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
            ></textarea>
          </div>
        </div>

        <!-- Actions -->
        <div class="form-actions mt-xl">
          <button type="button" class="btn btn-ghost" @click="handleCancel">取消</button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? '处理中...' : isEditMode ? '保存修改' : '创建项目' }}
          </button>
        </div>
      </form>
    </GlassCard>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
  padding-left: var(--spacing-sm);
  border-left: 3px solid var(--color-primary);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md);
}

.input-group {
  margin-bottom: var(--spacing-md);
}

.input-group.mb-0 {
  margin-bottom: 0;
}

.input-group.span-2 {
  grid-column: span 2;
}

.input-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.input-wrapper {
  position: relative;
}

.input-wrapper input,
.input-wrapper .form-select,
.form-textarea {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-base);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  outline: none;
  transition: all 0.2s;
  appearance: none;
}

.input-wrapper.sm input {
  padding: 8px 10px;
  font-size: 13px;
}

/* Date input Styling */
.input-wrapper .date-input {
  /* Inherit height/font from standard input */
  cursor: pointer;
  color-scheme: light;
}

/* Customizing calendar picker indicator for WebKit */
.input-wrapper .date-input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.6;
  transform: scale(1.4); /* Larger icon */
  margin-right: 8px;
  transition: opacity 0.2s;
}

.input-wrapper .date-input:hover::-webkit-calendar-picker-indicator {
  opacity: 1;
}

[data-theme='dark'] .input-wrapper .date-input {
  color-scheme: dark;
  background-color: var(--bg-base);
  color: var(--text-primary);
}

[data-theme='dark'] .input-wrapper .date-input::-webkit-calendar-picker-indicator {
  filter: invert(1);
}

.input-wrapper input:focus,
.input-wrapper .form-select:focus,
.form-textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(255, 159, 10, 0.1);
  background: var(--bg-elevated);
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

.form-textarea {
  resize: vertical;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  border-top: 1px solid var(--border-color);
  padding-top: var(--spacing-lg);
}

.text-secondary {
  color: var(--text-secondary);
}
.text-primary {
  color: var(--color-primary);
}
.text-danger {
  color: var(--color-danger);
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
  .input-group.span-2 {
    grid-column: span 1;
  }
}

.installment-item.border-primary {
  border: 1px solid var(--border-color); /* Subtle border for standard item */
}
/* Active or focus state for installment card */
.installment-item:focus-within {
  border-color: var(--color-primary);
}
</style>
