import { useState, type ReactNode } from 'react'
import {
  Accordion,
  Alert,
  Avatar,
  AvatarGroup,
  Badge,
  BreadcrumbItem,
  Breadcrumbs,
  Button,
  ButtonGroup,
  Calendar,
  Checkbox,
  CheckboxGroup,
  Chip,
  CircularProgress,
  Code,
  DatePicker,
  Divider,
  Drawer,
  Dropdown,
  Field,
  Image,
  Input,
  InputOtp,
  Kbd,
  Link,
  Listbox,
  Modal,
  NativeSelect,
  NumberInput,
  Pagination,
  ProgressBar,
  Radio,
  RadioGroup,
  ScrollShadow,
  Select,
  Skeleton,
  Slider,
  Snippet,
  Spinner,
  Surface,
  Switch,
  Table,
  Tabs,
  TextArea,
  Tooltip,
  User,
  Toaster,
  toast,
} from '@/design-system'

const buttonVariants = ['primary', 'secondary', 'tertiary', 'outline', 'ghost', 'danger'] as const
const chipTones = ['neutral', 'accent', 'success', 'warning', 'danger', 'info'] as const
const alertTones = ['neutral', 'success', 'warning', 'danger', 'info'] as const

interface ShowcaseSectionProps {
  children: ReactNode
  description: string
  title: string
}

function ShowcaseSection({ children, description, title }: ShowcaseSectionProps) {
  return (
    <Surface className="design-showcase__section" padding="lg" variant="raised">
      <header className="design-showcase__section-header">
        <h2 className="design-showcase__section-title">{title}</h2>
        <p className="design-showcase__section-description">{description}</p>
      </header>
      <div className="design-showcase__section-body">{children}</div>
    </Surface>
  )
}

export default function DesignSystemView() {
  const [checked, setChecked] = useState(true)
  const [radioValue, setRadioValue] = useState('monthly')
  const [page, setPage] = useState(3)
  const [activeTab, setActiveTab] = useState('overview')
  const [amount, setAmount] = useState(3)
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectValue, setSelectValue] = useState<string>()
  const [listboxValue, setListboxValue] = useState('inbox')
  const [channels, setChannels] = useState<string[]>(['email'])
  const [volume, setVolume] = useState(60)
  const [otp, setOtp] = useState('')
  const [date, setDate] = useState('2026-07-15')

  return (
    <div className="design-showcase">
      <header className="design-showcase__header">
        <p className="design-showcase__eyebrow">
          <span aria-hidden="true" className="design-showcase__pulse" />
          Ember Orbit · Design System
        </p>
        <h1 className="design-showcase__title">
          <span className="design-showcase__title-accent">Orange</span> 设计系统
        </h1>
        <p className="design-showcase__subtitle">
          组件与视觉基础的实时预览，所有组件来自 <code>@/design-system</code>
          ，随主题在昼夜之间切换。
        </p>
      </header>

      <ShowcaseSection
        title="按钮 Button"
        description="六种语义变体、三种尺寸、加载态与分段按钮组。"
      >
        <div className="design-showcase__row">
          {buttonVariants.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
        <div className="design-showcase__row">
          <Button size="sm">小尺寸</Button>
          <Button size="md">中尺寸</Button>
          <Button size="lg">大尺寸</Button>
          <Button pending>提交中</Button>
          <Button disabled>已禁用</Button>
        </div>
        <div className="design-showcase__row">
          <ButtonGroup>
            <Button variant="secondary">日</Button>
            <Button variant="secondary">周</Button>
            <Button variant="secondary">月</Button>
          </ButtonGroup>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="身份 Avatar / User / Badge"
        description="头像支持图片、缩写与色调回退，徽标锚定在任意元素上。"
      >
        <div className="design-showcase__row">
          <Avatar name="橙子" tone="accent" />
          <Avatar name="Wei Lan" tone="success" />
          <Avatar name="橙" size="sm" />
          <Avatar bordered name="管理员" size="lg" tone="accent" />
          <AvatarGroup max={3}>
            <Avatar name="橙子" tone="accent" />
            <Avatar name="Wei Lan" tone="success" />
            <Avatar name="Mo Chen" tone="warning" />
            <Avatar name="Yu Xia" tone="danger" />
          </AvatarGroup>
        </div>
        <div className="design-showcase__row">
          <User
            avatarProps={{ name: '橙子', tone: 'accent' }}
            description="产品设计 · Ember Orbit"
            name="橙子"
          />
          <Badge content={5} tone="danger">
            <Button size="sm" variant="secondary">
              通知
            </Button>
          </Badge>
          <Badge dot tone="success">
            <Avatar name="在线" />
          </Badge>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="标签 Chip" description="用于状态与分类标记的六种色调、三种外观。">
        <div className="design-showcase__row">
          {chipTones.map((tone) => (
            <Chip key={tone} tone={tone}>
              {tone}
            </Chip>
          ))}
        </div>
        <div className="design-showcase__row">
          <Chip tone="accent" variant="soft">
            soft
          </Chip>
          <Chip tone="accent" variant="solid">
            solid
          </Chip>
          <Chip tone="accent" variant="outline">
            outline
          </Chip>
        </div>
      </ShowcaseSection>

      <ShowcaseSection title="提示 Alert" description="五种语义色调，支持标题、描述与操作区。">
        <div className="design-showcase__stack">
          {alertTones.map((tone) => (
            <Alert key={tone} title={`${tone} 提示`} tone={tone}>
              这是一条 {tone} 色调的提示信息，用于向用户传达对应语义的反馈。
            </Alert>
          ))}
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="表单 Field / Input / NumberInput"
        description="Field 复合组件自动关联标签、描述与错误信息的可访问性属性。"
      >
        <div className="design-showcase__grid">
          <Field.Root>
            <Field.Label>项目名称</Field.Label>
            <Input placeholder="请输入项目名称" />
            <Field.Description>名称将显示在项目列表与报表中。</Field.Description>
          </Field.Root>
          <Field.Root invalid required>
            <Field.Label>合同金额</Field.Label>
            <Input placeholder="0.00" />
            <Field.Error>金额不能为空。</Field.Error>
          </Field.Root>
          <Field.Root>
            <Field.Label>结算周期</Field.Label>
            <NativeSelect defaultValue="monthly">
              <option value="monthly">按月</option>
              <option value="quarterly">按季</option>
              <option value="yearly">按年</option>
            </NativeSelect>
          </Field.Root>
          <Field.Root>
            <Field.Label>备注</Field.Label>
            <TextArea placeholder="补充说明…" rows={3} />
          </Field.Root>
        </div>
        <div className="design-showcase__row">
          <Field.Root>
            <Field.Label>分期数</Field.Label>
            <NumberInput max={12} min={1} onValueChange={setAmount} value={amount} />
          </Field.Root>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="选择控件 Checkbox / Radio / Switch"
        description="选中态点燃余烬辉光，开关拇指以弹簧曲线归位。"
      >
        <div className="design-showcase__row">
          <Checkbox checked={checked} onChange={(event) => setChecked(event.target.checked)}>
            接收到期提醒
          </Checkbox>
          <Checkbox indeterminate readOnly>
            半选状态
          </Checkbox>
          <Checkbox disabled>已禁用</Checkbox>
        </div>
        <RadioGroup onValueChange={setRadioValue} value={radioValue}>
          <RadioGroup.Legend>结算周期</RadioGroup.Legend>
          <div className="design-showcase__row">
            <Radio value="monthly">按月</Radio>
            <Radio value="quarterly">按季</Radio>
            <Radio value="yearly">按年</Radio>
          </div>
        </RadioGroup>
        <div className="design-showcase__row">
          <Switch defaultChecked>启用自动提醒</Switch>
          <Switch size="sm">紧凑</Switch>
          <Switch disabled>已禁用</Switch>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="进度与加载 Progress / Spinner / Skeleton"
        description="确定进度用进度条或环形进度，不确定等待用 Spinner，内容占位用骨架屏。"
      >
        <div className="design-showcase__stack">
          <ProgressBar label="回款进度" tone="accent" value={62} valueLabel="62%" />
          <ProgressBar label="逾期占比" tone="danger" value={18} valueLabel="18%" />
        </div>
        <div className="design-showcase__row">
          <CircularProgress showValueLabel value={62} />
          <CircularProgress size="sm" tone="success" value={88} />
          <CircularProgress indeterminate size="lg" tone="warning" />
          <Spinner size="sm" />
          <Spinner size="md" tone="accent" />
          <Spinner size="lg" tone="success" />
        </div>
        <div className="design-showcase__stack">
          <Skeleton height={16} shape="text" width="60%" />
          <Skeleton height={16} shape="text" width="40%" />
          <div className="design-showcase__row">
            <Skeleton height={48} shape="circle" width={48} />
            <Skeleton height={48} width={220} />
          </div>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="文本 Link / Code / Kbd / Snippet"
        description="行内语义文本与可复制的命令片段。"
      >
        <div className="design-showcase__row">
          <Link href="#showcase">默认链接</Link>
          <Link href="#showcase" tone="foreground" underline="always">
            前景色链接
          </Link>
          <Link external href="https://heroui.com" icon={<span>↗</span>}>
            外部链接
          </Link>
          <Code>npm run dev</Code>
          <Code tone="accent">--ods-color-accent</Code>
          <Kbd keys={['command', 'shift']}>K</Kbd>
        </div>
        <div className="design-showcase__row">
          <Snippet>npm install @fruitsai/orange-design</Snippet>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="导航 Breadcrumbs / Tabs / Pagination"
        description="层级路径、分段切换与分页均以胶囊几何呈现。"
      >
        <Breadcrumbs>
          <BreadcrumbItem href="#showcase">工作台</BreadcrumbItem>
          <BreadcrumbItem href="#showcase">项目管理</BreadcrumbItem>
          <BreadcrumbItem current>晨雾茶室小程序</BreadcrumbItem>
        </Breadcrumbs>
        <Tabs.Root onValueChange={setActiveTab} value={activeTab}>
          <Tabs.List>
            <Tabs.Tab value="overview">概览</Tabs.Tab>
            <Tabs.Tab value="detail">明细</Tabs.Tab>
            <Tabs.Tab value="settings">设置</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="overview">概览面板内容。</Tabs.Panel>
          <Tabs.Panel value="detail">明细面板内容。</Tabs.Panel>
          <Tabs.Panel value="settings">设置面板内容。</Tabs.Panel>
        </Tabs.Root>
        <Pagination onPageChange={setPage} page={page} pageCount={8} />
      </ShowcaseSection>

      <ShowcaseSection
        title="轻提示 Toast"
        description="命令式 API，可在任意逻辑中调用；点击气泡即可关闭。"
      >
        <div className="design-showcase__row">
          <Button onClick={() => toast.success('账单已标记为已收款')} variant="secondary">
            成功提示
          </Button>
          <Button onClick={() => toast.error('网络异常，保存失败')} variant="secondary">
            错误提示
          </Button>
          <Button onClick={() => toast.warning('本期账单三天后到期')} variant="secondary">
            警告提示
          </Button>
          <Button onClick={() => toast.info('数据已同步至云端')} variant="secondary">
            信息提示
          </Button>
        </div>
        <Toaster />
      </ShowcaseSection>

      <ShowcaseSection
        title="浮层 Tooltip / 手风琴 Accordion"
        description="Tooltip 从触发器原点物化浮现；手风琴指示箭头以弹簧旋转。"
      >
        <div className="design-showcase__row">
          <Tooltip content="从触发器原点浮现">
            <Button variant="secondary">悬停查看</Button>
          </Tooltip>
          <Tooltip content="放置于下方" placement="bottom">
            <Button variant="ghost">下方提示</Button>
          </Tooltip>
        </div>
        <Accordion defaultValue={['billing']}>
          <Accordion.Item
            itemKey="billing"
            subtitle="按月或按里程碑收款"
            title="如何设置收款计划？"
          >
            在项目详情页选择「新增收款」，支持按月、按季或按项目里程碑设置分期。
          </Accordion.Item>
          <Accordion.Item itemKey="overdue" title="逾期提醒何时触发？">
            账单到期前三天与到期当天各推送一次提醒，可在系统设置中调整节奏。
          </Accordion.Item>
          <Accordion.Item itemKey="export" title="数据可以导出吗？">
            支持导出 CSV 与 PDF 报表，包含回款、逾期与客户维度的汇总。
          </Accordion.Item>
        </Accordion>
      </ShowcaseSection>

      <ShowcaseSection
        title="滚动 ScrollShadow / 分隔 Divider"
        description="滚动边缘以渐隐遮罩替代硬分割线，内容未尽处自然示意。"
      >
        <ScrollShadow style={{ maxHeight: 160 }}>
          <div className="design-showcase__stack" style={{ paddingRight: 8 }}>
            {Array.from({ length: 10 }, (_, index) => (
              <div className="design-showcase__scroll-item" key={index}>
                <span>收款计划 {index + 1}</span>
                <Chip size="sm" tone={index % 3 === 0 ? 'success' : 'neutral'}>
                  {index % 3 === 0 ? '已回款' : '待处理'}
                </Chip>
              </div>
            ))}
          </div>
        </ScrollShadow>
        <div className="design-showcase__row">
          <span>昼火</span>
          <Divider orientation="vertical" style={{ height: 16 }} />
          <span>夜轨</span>
        </div>
        <Divider />
      </ShowcaseSection>

      <ShowcaseSection
        title="浮层 Modal / Drawer"
        description="经由 Portal 渲染，物化浮现并遮罩背景；Drawer 从边缘滑入、原路滑出。"
      >
        <div className="design-showcase__row">
          <Button onClick={() => setModalOpen(true)} variant="primary">
            打开 Modal
          </Button>
          <Button onClick={() => setDrawerOpen(true)} variant="secondary">
            打开 Drawer
          </Button>
        </div>
        <Modal.Root onClose={() => setModalOpen(false)} open={modalOpen}>
          <Modal.Header>确认收款</Modal.Header>
          <Modal.Close />
          <Modal.Body>将本期账单标记为已收款？此操作会更新回款进度并通知相关成员。</Modal.Body>
          <Modal.Footer>
            <Button onClick={() => setModalOpen(false)} variant="ghost">
              取消
            </Button>
            <Button onClick={() => setModalOpen(false)} variant="primary">
              确认收款
            </Button>
          </Modal.Footer>
        </Modal.Root>
        <Drawer.Root onClose={() => setDrawerOpen(false)} open={drawerOpen} placement="right">
          <Drawer.Header>项目筛选</Drawer.Header>
          <Drawer.Close />
          <Drawer.Body>
            <CheckboxGroup label="项目状态" onValueChange={setChannels} value={channels}>
              <CheckboxGroup.Item value="email">进行中</CheckboxGroup.Item>
              <CheckboxGroup.Item value="sms">已完成</CheckboxGroup.Item>
              <CheckboxGroup.Item value="push">已逾期</CheckboxGroup.Item>
            </CheckboxGroup>
          </Drawer.Body>
          <Drawer.Footer>
            <Button fullWidth onClick={() => setDrawerOpen(false)} variant="primary">
              应用筛选
            </Button>
          </Drawer.Footer>
        </Drawer.Root>
      </ShowcaseSection>

      <ShowcaseSection
        title="选择 Select / Dropdown / Listbox"
        description="Popover 锚定触发器原点缩放展开，列表项支持键盘导航。"
      >
        <div className="design-showcase__row">
          <Select
            aria-label="结算周期"
            onValueChange={setSelectValue}
            options={[
              { label: '按月结算', value: 'monthly' },
              { label: '按季结算', value: 'quarterly' },
              { label: '按年结算', value: 'yearly' },
            ]}
            value={selectValue}
          />
          <Dropdown>
            <Dropdown.Trigger>
              <Button variant="secondary">操作菜单</Button>
            </Dropdown.Trigger>
            <Dropdown.Menu label="项目操作">
              <Dropdown.Item shortcut={<Kbd keys={['command']}>E</Kbd>}>编辑项目</Dropdown.Item>
              <Dropdown.Item>复制链接</Dropdown.Item>
              <Dropdown.Item tone="danger">删除项目</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
        <Surface padding="sm" variant="inset">
          <Listbox aria-label="收件箱" onSelect={setListboxValue} selectedValues={[listboxValue]}>
            <Listbox.Item description="12 封未读" value="inbox">
              收件箱
            </Listbox.Item>
            <Listbox.Item description="按到期排序" value="upcoming">
              待收款
            </Listbox.Item>
            <Listbox.Item value="archived">已归档</Listbox.Item>
          </Listbox>
        </Surface>
      </ShowcaseSection>

      <ShowcaseSection
        title="滑块 Slider"
        description="Pointer Events 指针 1:1 跟手，拖拽全程连续反馈，支持键盘步进。"
      >
        <Slider
          label="回款目标达成度"
          max={100}
          min={0}
          onValueChange={setVolume}
          showValue
          step={5}
          value={volume}
        />
      </ShowcaseSection>

      <ShowcaseSection
        title="日期 Calendar / DatePicker"
        description="基于 dayjs 的月历，选中日点燃余烬辉光；DatePicker 在 Popover 中承载月历。"
      >
        <div className="design-showcase__row" style={{ alignItems: 'flex-start' }}>
          <Calendar onValueChange={setDate} value={date} />
          <DatePicker onValueChange={setDate} value={date} />
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="验证码 InputOtp / 图片 Image"
        description="OTP 分段输入自动跳格、支持粘贴；图片带骨架占位与失败回退。"
      >
        <InputOtp length={6} onValueChange={setOtp} value={otp} />
        <div className="design-showcase__row">
          <Image
            alt="示例封面"
            fallback={<span>图片加载失败</span>}
            radius="lg"
            src="https://invalid.example/broken.png"
            style={{ width: 96, height: 96 }}
          />
          <span className="design-showcase__surface-note">失败时回退到占位内容</span>
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        title="表格 Table"
        description="语义化表格，行悬停高亮，支持选中态与对齐控制。"
      >
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Column>项目</Table.Column>
              <Table.Column>状态</Table.Column>
              <Table.Column align="end">金额</Table.Column>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell>晨雾茶室小程序</Table.Cell>
              <Table.Cell>
                <Chip size="sm" tone="success">
                  已回款
                </Chip>
              </Table.Cell>
              <Table.Cell align="end">¥12,000</Table.Cell>
            </Table.Row>
            <Table.Row selected>
              <Table.Cell>橙心便利店官网</Table.Cell>
              <Table.Cell>
                <Chip size="sm" tone="warning">
                  待收款
                </Chip>
              </Table.Cell>
              <Table.Cell align="end">¥8,500</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>暖阳诊所管理系统</Table.Cell>
              <Table.Cell>
                <Chip size="sm" tone="danger">
                  已逾期
                </Chip>
              </Table.Cell>
              <Table.Cell align="end">¥5,500</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </ShowcaseSection>

      <ShowcaseSection title="表面 Surface" description="四种层级变体，承载不同深度的内容区块。">
        <div className="design-showcase__grid">
          {(['base', 'raised', 'glass', 'inset'] as const).map((variant) => (
            <Surface key={variant} padding="md" variant={variant}>
              <strong>{variant}</strong>
              <p className="design-showcase__surface-note">variant=&quot;{variant}&quot;</p>
            </Surface>
          ))}
        </div>
      </ShowcaseSection>
    </div>
  )
}
