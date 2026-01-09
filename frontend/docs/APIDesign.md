# Orange 财务收款管理系统 - API 接口设计文档

**版本**: v0.0.1  
**日期**: 2026-01-03  
**状态**: 设计阶段 (原型使用模拟数据)

---

## 1. 概述

### 1.1 基础信息
- **Base URL**: `https://api.orange.example.com/v1`
- **数据格式**: JSON
- **认证方式**: JWT Bearer Token

### 1.2 通用响应格式
```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

### 1.3 错误码
| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 422 | 参数验证失败 |
| 500 | 服务器错误 |

---

## 2. 认证接口

### 2.1 用户登录
```
POST /auth/login
```

**请求体**:
```json
{
  "username": "string",
  "password": "string",
  "remember": boolean
}
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "username": "admin",
      "name": "陈明宇",
      "email": "chen@example.com"
    }
  }
}
```

### 2.2 获取当前用户
```
GET /auth/me
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "username": "admin",
    "name": "陈明宇",
    "email": "chen@example.com",
    "department": "财务管理部"
  }
}
```

### 2.3 退出登录
```
POST /auth/logout
```

---

## 3. 项目接口

### 3.1 获取项目列表
```
GET /projects
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| page | int | 页码，默认 1 |
| limit | int | 每页数量，默认 10 |
| status | string | 状态筛选 |
| keyword | string | 搜索关键词 |

**响应**:
```json
{
  "code": 0,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "云端SaaS系统开发",
        "clientName": "科技创新有限公司",
        "totalAmount": 120000,
        "paidAmount": 60000,
        "startDate": "2023-10-15",
        "endDate": "2024-03-15",
        "status": "active"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 10
  }
}
```

### 3.2 获取项目详情
```
GET /projects/:id
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "id": 1,
    "name": "云端SaaS系统开发",
    "clientName": "科技创新有限公司",
    "totalAmount": 120000,
    "paidAmount": 60000,
    "startDate": "2023-10-15",
    "endDate": "2024-03-15",
    "contractNo": "CT-20231015-001",
    "contractDate": "2023-10-10",
    "status": "active",
    "description": "项目描述...",
    "progress": 50
  }
}
```

### 3.3 创建项目
```
POST /projects
```

**请求体**:
```json
{
  "name": "新项目",
  "clientName": "客户名称",
  "totalAmount": 100000,
  "startDate": "2024-01-01",
  "endDate": "2024-06-30",
  "contractNo": "CT-2024010",
  "description": "项目描述"
}
```

### 3.4 更新项目
```
PUT /projects/:id
```

### 3.5 删除项目
```
DELETE /projects/:id
```

---

## 4. 收款接口

### 4.1 获取项目收款列表
```
GET /projects/:id/payments
```

**响应**:
```json
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "stage": "deposit",
      "stageName": "首付款",
      "amount": 30000,
      "dueDate": "2023-10-20",
      "paidDate": "2023-10-18",
      "status": "paid",
      "method": "bank_transfer"
    }
  ]
}
```

### 4.2 添加收款记录
```
POST /projects/:id/payments
```

**请求体**:
```json
{
  "stage": "deposit",
  "amount": 30000,
  "dueDate": "2024-01-15",
  "method": "bank_transfer",
  "status": "pending",
  "remark": "备注"
}
```

### 4.3 更新收款状态
```
PATCH /payments/:id/status
```

**请求体**:
```json
{
  "status": "paid",
  "paidDate": "2024-01-10"
}
```

---

## 5. 统计接口

### 5.1 获取仪表盘统计
```
GET /dashboard/stats
```

**响应**:
```json
{
  "code": 0,
  "data": {
    "totalAmount": 500000,
    "paidAmount": 320000,
    "pendingAmount": 180000,
    "paymentRate": 64,
    "projectCount": 12,
    "overdueCount": 2
  }
}
```

### 5.2 获取收入趋势
```
GET /dashboard/income-trend
```

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| period | string | monthly/weekly |

**响应**:
```json
{
  "code": 0,
  "data": {
    "labels": ["1月", "2月", "3月"],
    "values": [50000, 65000, 48000]
  }
}
```

---

## 6. 字典接口

### 6.1 获取字典列表
```
GET /dictionaries
```

### 6.2 获取字典项
```
GET /dictionaries/:id/items
```

### 6.3 添加字典项
```
POST /dictionaries/:id/items
```

### 6.4 删除字典项
```
DELETE /dictionaries/:dictId/items/:itemId
```

---

## 7. 日历接口

### 7.1 获取月度收款计划
```
GET /calendar/payments
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
      "date": "2024-01-15",
      "payments": [
        {
          "id": 1,
          "projectName": "项目A",
          "amount": 30000,
          "status": "pending"
        }
      ]
    }
  ]
}
```
