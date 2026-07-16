import {
  Button,
  DatePicker,
  EmptyState,
  Field,
  FormGrid,
  FormSection,
  Input,
  Select,
  Surface,
  TextArea,
  type SelectOption,
} from '@/design-system'
import { createPaymentPlanItem, type PaymentPlanItem } from './paymentPlan'

export interface PaymentPlanEditorProps {
  installment: boolean
  items: PaymentPlanItem[]
  onItemsChange: (items: PaymentPlanItem[]) => void
  stageOptions?: SelectOption[]
}

const defaultStageOptions: SelectOption[] = [
  { label: '全款', value: 'all' },
  { label: '预付款', value: 'deposit' },
  { label: '阶段款', value: 'milestone' },
  { label: '尾款', value: 'final' },
]

const methodOptions: SelectOption[] = [
  { label: '银行转账', value: 'bank_transfer' },
  { label: '支付宝', value: 'alipay' },
  { label: '微信', value: 'wechat' },
  { label: '现金', value: 'cash' },
]

const statusOptions: SelectOption[] = [
  { label: '待收款', value: 'pending' },
  { label: '已收款', value: 'paid' },
  { label: '已逾期', value: 'overdue' },
]

export function PaymentPlanEditor({
  installment,
  items,
  onItemsChange,
  stageOptions = defaultStageOptions,
}: PaymentPlanEditorProps) {
  const updateItem = (index: number, patch: Partial<PaymentPlanItem>) => {
    onItemsChange(
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    )
  }

  const addItem = () => onItemsChange([...items, createPaymentPlanItem(true)])
  const actions =
    installment && items.length > 0 ? (
      <Button onClick={addItem} size="sm" type="button">
        <i aria-hidden="true" className="ri-add-line" />
        添加分期
      </Button>
    ) : null

  return (
    <FormSection actions={actions} className="payment-plan-editor" title="收款计划">
      {items.length === 0 ? (
        <EmptyState
          action={
            installment ? (
              <Button onClick={addItem} size="sm" type="button">
                <i aria-hidden="true" className="ri-add-line" />
                添加分期
              </Button>
            ) : null
          }
          description="当前项目还没有可保存的收款节点。"
          icon={<i className="ri-secure-payment-line" />}
          title="暂无收款计划"
        />
      ) : (
        <div className="payment-plan-editor__list">
          {items.map((item, index) => (
            <Surface
              aria-label={installment ? `第 ${index + 1} 期收款` : '一次性收款'}
              className="payment-plan-editor__item"
              focusWithin
              key={item.id ?? item.clientKey}
              padding="md"
              role="group"
              variant="inset"
            >
              {installment ? (
                <div className="payment-plan-editor__item-header">
                  <span className="payment-plan-editor__sequence">第 {index + 1} 期</span>
                  <Button
                    aria-label={`删除第 ${index + 1} 期`}
                    onClick={() =>
                      onItemsChange(items.filter((_, itemIndex) => itemIndex !== index))
                    }
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <i aria-hidden="true" className="ri-delete-bin-line" />
                    删除
                  </Button>
                </div>
              ) : null}

              <FormGrid columns={2}>
                <Field.Root required>
                  <Field.Label>收款金额 (¥)</Field.Label>
                  <Input
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    min="0"
                    onChange={(event) => updateItem(index, { amount: event.currentTarget.value })}
                    placeholder="0.00"
                    spellCheck={false}
                    step="0.01"
                    type="number"
                    value={item.amount}
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>收款日期</Field.Label>
                  <DatePicker
                    aria-label="收款日期"
                    onValueChange={(value) => updateItem(index, { planDate: value })}
                    placeholder="请选择收款日期"
                    value={item.planDate}
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>款项阶段</Field.Label>
                  <Select
                    aria-label="款项阶段"
                    disabled={!installment}
                    onValueChange={(value) => updateItem(index, { stage: value })}
                    options={stageOptions}
                    value={item.stage}
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>收款方式</Field.Label>
                  <Select
                    aria-label="收款方式"
                    onValueChange={(value) => updateItem(index, { method: value })}
                    options={methodOptions}
                    value={item.method}
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>状态</Field.Label>
                  <Select
                    aria-label="状态"
                    onValueChange={(value) => updateItem(index, { status: value })}
                    options={statusOptions}
                    value={item.status}
                  />
                </Field.Root>

                <Field.Root className="payment-plan-editor__remark">
                  <Field.Label>备注</Field.Label>
                  <TextArea
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    onChange={(event) => updateItem(index, { remark: event.currentTarget.value })}
                    placeholder="请输入备注信息（选填）"
                    rows={2}
                    spellCheck={false}
                    value={item.remark}
                  />
                </Field.Root>
              </FormGrid>
            </Surface>
          ))}
        </div>
      )}
    </FormSection>
  )
}
