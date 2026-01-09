# Orange 财务收款管理系统 - 数据库设计文档

**版本**: v0.0.1  
**日期**: 2026-01-03  
**状态**: 设计阶段

---

## 1. 概述

### 1.1 数据库选型
- **推荐**: PostgreSQL 15+ 或 MySQL 8+
- **缓存**: Redis (可选，用于会话和缓存)

### 1.2 命名规范
- 表名: 小写复数形式 (users, projects)
- 字段名: snake_case
- 主键: id (自增或 UUID)
- 外键: {table}_id

---

## 2. ER 图

```
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│   users     │       │    projects     │       │  payments   │
├─────────────┤       ├─────────────────┤       ├─────────────┤
│ id          │──┐    │ id              │──┐    │ id          │
│ username    │  │    │ name            │  │    │ project_id  │◄─┐
│ password    │  │    │ client_name     │  │    │ stage       │  │
│ name        │  └───▶│ user_id         │  │    │ amount      │  │
│ email       │       │ total_amount    │  │    │ due_date    │  │
│ phone       │       │ start_date      │  │    │ paid_date   │  │
│ department  │       │ end_date        │  └───▶│ status      │  │
│ created_at  │       │ status          │       │ method      │  │
│ updated_at  │       │ description     │       │ remark      │  │
└─────────────┘       │ created_at      │       │ created_at  │  │
                      │ updated_at      │       │ updated_at  │  │
                      └─────────────────┘       └─────────────┘  │
                                                                 │
┌─────────────────┐       ┌─────────────────┐                   │
│  dictionaries   │       │ dictionary_items│                   │
├─────────────────┤       ├─────────────────┤                   │
│ id              │──┐    │ id              │                   │
│ code            │  │    │ dictionary_id   │◄──────────────────┘
│ name            │  └───▶│ label           │
│ description     │       │ value           │
│ created_at      │       │ sort_order      │
└─────────────────┘       │ created_at      │
                          └─────────────────┘
```

---

## 3. 表结构

### 3.1 users (用户表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 主键 |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 用户名 |
| password | VARCHAR(255) | NOT NULL | 密码哈希 |
| name | VARCHAR(100) | NOT NULL | 姓名 |
| email | VARCHAR(100) | UNIQUE | 邮箱 |
| phone | VARCHAR(20) | | 手机号 |
| department | VARCHAR(100) | | 部门 |
| avatar | VARCHAR(255) | | 头像URL |
| status | TINYINT | DEFAULT 1 | 状态(1启用,0禁用) |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | ON UPDATE NOW() | 更新时间 |

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    department VARCHAR(100),
    avatar VARCHAR(255),
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

### 3.2 projects (项目表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 主键 |
| user_id | BIGINT | FK -> users.id | 所属用户 |
| name | VARCHAR(200) | NOT NULL | 项目名称 |
| client_name | VARCHAR(200) | NOT NULL | 客户名称 |
| total_amount | DECIMAL(12,2) | NOT NULL | 合同总额 |
| start_date | DATE | NOT NULL | 开始日期 |
| end_date | DATE | NOT NULL | 结束日期 |
| contract_no | VARCHAR(50) | | 合同编号 |
| contract_date | DATE | | 签约日期 |
| status | VARCHAR(20) | DEFAULT 'notstarted' | 状态 |
| description | TEXT | | 项目描述 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | ON UPDATE NOW() | 更新时间 |

**状态枚举**: `notstarted`, `active`, `pending`, `completed`, `cancelled`

```sql
CREATE TABLE projects (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    name VARCHAR(200) NOT NULL,
    client_name VARCHAR(200) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    contract_no VARCHAR(50),
    contract_date DATE,
    status VARCHAR(20) DEFAULT 'notstarted',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
```

---

### 3.3 payments (收款记录表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 主键 |
| project_id | BIGINT | FK -> projects.id | 所属项目 |
| stage | VARCHAR(50) | NOT NULL | 款项阶段 |
| amount | DECIMAL(12,2) | NOT NULL | 金额 |
| due_date | DATE | NOT NULL | 计划收款日期 |
| paid_date | DATE | | 实际收款日期 |
| status | VARCHAR(20) | DEFAULT 'pending' | 状态 |
| method | VARCHAR(50) | | 收款方式 |
| remark | TEXT | | 备注 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | ON UPDATE NOW() | 更新时间 |

**状态枚举**: `pending`, `paid`, `overdue`

```sql
CREATE TABLE payments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    project_id BIGINT NOT NULL,
    stage VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    status VARCHAR(20) DEFAULT 'pending',
    method VARCHAR(50),
    remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_payments_project_id ON payments(project_id);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_payments_status ON payments(status);
```

---

### 3.4 dictionaries (字典表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 主键 |
| code | VARCHAR(50) | UNIQUE, NOT NULL | 字典代码 |
| name | VARCHAR(100) | NOT NULL | 字典名称 |
| description | VARCHAR(255) | | 描述 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |

```sql
CREATE TABLE dictionaries (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO dictionaries (code, name) VALUES
('payment_stage', '款项阶段'),
('payment_method', '支付方式'),
('project_status', '项目状态');
```

---

### 3.5 dictionary_items (字典项表)

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 主键 |
| dictionary_id | BIGINT | FK -> dictionaries.id | 所属字典 |
| label | VARCHAR(100) | NOT NULL | 显示名称 |
| value | VARCHAR(100) | NOT NULL | 值 |
| sort_order | INT | DEFAULT 0 | 排序 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |

```sql
CREATE TABLE dictionary_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    dictionary_id BIGINT NOT NULL,
    label VARCHAR(100) NOT NULL,
    value VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dictionary_id) REFERENCES dictionaries(id) ON DELETE CASCADE,
    UNIQUE KEY uk_dict_value (dictionary_id, value)
);

CREATE INDEX idx_dict_items_dictionary_id ON dictionary_items(dictionary_id);
```

---

## 4. 初始化数据

```sql
-- 默认字典项: 款项阶段
INSERT INTO dictionary_items (dictionary_id, label, value, sort_order)
SELECT id, '首付款', 'deposit', 1 FROM dictionaries WHERE code = 'payment_stage'
UNION ALL
SELECT id, '进度款', 'progress', 2 FROM dictionaries WHERE code = 'payment_stage'
UNION ALL
SELECT id, '尾款', 'final', 3 FROM dictionaries WHERE code = 'payment_stage'
UNION ALL
SELECT id, '质保金', 'warranty', 4 FROM dictionaries WHERE code = 'payment_stage';

-- 默认字典项: 支付方式
INSERT INTO dictionary_items (dictionary_id, label, value, sort_order)
SELECT id, '银行转账', 'bank_transfer', 1 FROM dictionaries WHERE code = 'payment_method'
UNION ALL
SELECT id, '支付宝', 'alipay', 2 FROM dictionaries WHERE code = 'payment_method'
UNION ALL
SELECT id, '微信支付', 'wechat', 3 FROM dictionaries WHERE code = 'payment_method'
UNION ALL
SELECT id, '现金', 'cash', 4 FROM dictionaries WHERE code = 'payment_method';
```

---

## 5. 索引策略

| 表 | 索引 | 类型 | 说明 |
|-----|------|------|------|
| projects | idx_projects_user_id | B-Tree | 按用户查询 |
| projects | idx_projects_status | B-Tree | 按状态筛选 |
| payments | idx_payments_project_id | B-Tree | 按项目查询 |
| payments | idx_payments_due_date | B-Tree | 日历查询 |
| payments | idx_payments_status | B-Tree | 按状态筛选 |
