# API 接口设计文档

> 基于前端代码分析和数据库表结构设计

## 基础信息

- **Base URL**: `/api/v1`
- **Content-Type**: `application/json`
- **认证方式**: JWT Token (Header: `Authorization: Bearer <token>`)

---

## 1. 认证模块 (Auth)

### 1.1 用户登录

```
POST /api/v1/auth/login
```

**请求体**:

```json
{
  "username": "string", // 邮箱或手机号
  "password": "string"
}
```

**响应**:

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "jwt-token-string",
    "user": {
      "id": 1,
      "username": "chen.mingyu",
      "name": "陈明宇",
      "email": "chen.mingyu@company.com",
      "phone": "138-0000-0000",
      "avatar": "/uploads/avatar.png",
      "role": "admin",
      "department": "财务管理部",
      "position": "项目经理"
    }
  }
}
```

### 1.2 用户注册

```
POST /api/v1/auth/register
```

**请求体**:

```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "password": "string"
}
```

### 1.3 退出登录

```
POST /api/v1/auth/logout
```

---

## 2. 用户模块 (Users)

### 2.1 获取当前用户信息

```
GET /api/v1/users/me
```

### 2.2 更新用户信息

```
PUT /api/v1/users/me
```

**请求体**:

```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "department": "string",
  "position": "string"
}
```

### 2.3 修改密码

```
PUT /api/v1/users/me/password
```

**请求体**:

```json
{
  "old_password": "string",
  "new_password": "string"
}
```

---

## 3. 项目模块 (Projects)

### 3.1 获取项目列表

```
GET /api/v1/projects
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| page | int | 页码，默认 1 |
| page_size | int | 每页条数，默认 10 |
| status | string | 状态筛选: active/completed/pending/notstarted |
| keyword | string | 关键词搜索 |

**响应**:

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "云端SaaS系统开发",
        "company": "科技创新有限公司",
        "total_amount": 120000.0,
        "received_amount": 60000.0,
        "status": "active",
        "type": "SaaS系统",
        "start_date": "2023-10-15",
        "end_date": "2024-03-15"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 10
  }
}
```

### 3.2 获取项目详情

```
GET /api/v1/projects/:id
```

**响应**:

```json
{
  "code": 0,
  "data": {
    "id": 1,
    "name": "云端SaaS系统开发",
    "company": "科技创新有限公司",
    "total_amount": 120000.0,
    "received_amount": 60000.0,
    "status": "active",
    "type": "SaaS系统",
    "contract_number": "CT-20231015-001",
    "contract_date": "2023-10-01",
    "payment_method": "分期付款",
    "start_date": "2023-10-15",
    "end_date": "2024-03-15",
    "description": "项目描述...",
    "create_time": "2023-10-01T10:00:00Z"
  }
}
```

### 3.3 创建项目

```
POST /api/v1/projects
```

**请求体**:

```json
{
  "name": "string",
  "company": "string",
  "total_amount": 120000.0,
  "status": "notstarted",
  "type": "Web开发",
  "contract_number": "string",
  "contract_date": "2023-10-01",
  "payment_method": "分期付款",
  "start_date": "2023-10-15",
  "end_date": "2024-03-15",
  "description": "string"
}
```

### 3.4 更新项目

```
PUT /api/v1/projects/:id
```

### 3.5 删除项目

```
DELETE /api/v1/projects/:id
```

### 3.6 归档项目

```
POST /api/v1/projects/:id/archive
```

---

## 4. 收款模块 (Payments)

### 4.1 获取收款列表

```
GET /api/v1/payments
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| project_id | int | 项目 ID 筛选 |
| status | string | 状态: paid/pending/overdue |
| start_date | string | 开始日期 |
| end_date | string | 结束日期 |

### 4.2 获取项目收款列表

```
GET /api/v1/projects/:id/payments
```

**响应**:

```json
{
  "code": 0,
  "data": [
    {
      "id": 101,
      "project_id": 1,
      "stage": "首付款",
      "amount": 36000.0,
      "percentage": 30.0,
      "plan_date": "2023-10-15",
      "status": "paid",
      "actual_date": "2023-10-15",
      "method": "银行转账",
      "remark": ""
    }
  ]
}
```

### 4.3 创建收款记录

```
POST /api/v1/payments
```

**请求体**:

```json
{
  "project_id": 1,
  "stage": "进度款",
  "amount": 36000.0,
  "percentage": 30.0,
  "plan_date": "2023-12-20",
  "status": "pending",
  "method": "银行转账",
  "remark": "string"
}
```

### 4.4 更新收款记录

```
PUT /api/v1/payments/:id
```

### 4.5 确认收款

```
POST /api/v1/payments/:id/confirm
```

**请求体**:

```json
{
  "actual_date": "2023-12-20",
  "method": "银行转账"
}
```

### 4.6 删除收款记录

```
DELETE /api/v1/payments/:id
```

---

## 5. 仪表盘模块 (Dashboard)

### 5.1 获取统计数据

```
GET /api/v1/dashboard/stats
```

**响应**:

```json
{
  "code": 0,
  "data": {
    "total_amount": 289560.0,
    "paid_amount": 215360.0,
    "pending_amount": 74200.0,
    "overdue_amount": 12500.0,
    "total_trend": 24.0,
    "paid_trend": 18.0,
    "pending_trend": -5.0,
    "overdue_trend": 2.3
  }
}
```

### 5.2 获取收入趋势

```
GET /api/v1/dashboard/income-trend
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| period | string | 周期: week/month/year |

**响应**:

```json
{
  "code": 0,
  "data": {
    "labels": ["7月", "8月", "9月", "10月", "11月", "12月"],
    "values": [35000, 42000, 38500, 45000, 58000, 62500]
  }
}
```

### 5.3 获取近期项目

```
GET /api/v1/dashboard/recent-projects
```

### 5.4 获取即将到期收款

```
GET /api/v1/dashboard/upcoming-payments
```

---

## 6. 日历模块 (Calendar)

### 6.1 获取日历事件

```
GET /api/v1/calendar/events
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| year | int | 年份 |
| month | int | 月份 |

**响应**:

```json
{
  "code": 0,
  "data": [
    {
      "date": "2024-01-16",
      "payments": [
        {
          "id": 101,
          "project_name": "云端SaaS系统开发",
          "stage": "阶段验收款（30%）",
          "amount": 36000.0,
          "status": "pending"
        }
      ]
    }
  ]
}
```

---

## 7. 数据分析模块 (Analytics)

### 7.1 获取分析统计

```
GET /api/v1/analytics/stats
```

**响应**:

```json
{
  "code": 0,
  "data": {
    "avg_collection_days": 32,
    "expected_amount": 152000,
    "collection_rate": 86.4,
    "overdue_rate": 5.2
  }
}
```

### 7.2 获取月度对比数据

```
GET /api/v1/analytics/monthly-comparison
```

### 7.3 获取收款结构

```
GET /api/v1/analytics/payment-structure
```

---

## 8. 字典模块 (Dictionaries)

### 8.1 获取字典列表

```
GET /api/v1/dictionaries
```

**响应**:

```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "code": "payment_stage",
      "name": "款项阶段",
      "status": 1
    }
  ]
}
```

### 8.2 获取字典项

```
GET /api/v1/dictionaries/:code/items
```

**响应**:

```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "label": "首付款",
      "value": "deposit",
      "sort": 1
    }
  ]
}
```

### 8.3 创建字典项

```
POST /api/v1/dictionaries/:code/items
```

**请求体**:

```json
{
  "label": "string",
  "value": "string",
  "sort": 1
}
```

### 8.4 删除字典项

```
DELETE /api/v1/dictionaries/:code/items/:id
```

---

## 通用响应格式

### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

### 错误响应

```json
{
  "code": 1001,
  "message": "参数错误",
  "data": null
}
```

### 错误码定义

| 错误码 | 说明           |
| ------ | -------------- |
| 0      | 成功           |
| 1001   | 参数错误       |
| 1002   | 资源不存在     |
| 2001   | 未授权         |
| 2002   | Token 过期     |
| 5000   | 服务器内部错误 |
