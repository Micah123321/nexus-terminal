# 任务清单: login-credential-management

```yaml
@feature: login-credential-management
@created: 2026-03-25
@status: pending
@mode: R3
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 0 | 0 | 0 | 9 |

---

## 任务列表

### 1. 后端登录凭证模型与迁移

- [ ] 1.1 在 `packages/backend/src/database/schema.ts`、`schema.registry.ts`、`migrations.ts` 中新增 `login_credentials` 表定义和 `connections.login_credential_id` 迁移 | depends_on: []
- [ ] 1.2 新增 `packages/backend/src/login-credentials/` 模块，实现 repository/service/controller/routes 和类型定义，提供凭证 CRUD 接口 | depends_on: [1.1]

### 2. 连接模块凭证引用支持

- [ ] 2.1 在 `packages/backend/src/types/connection.types.ts`、`packages/backend/src/connections/connection.service.ts`、`packages/backend/src/connections/connections.controller.ts` 中新增 `login_credential_id` 与统一凭证解析逻辑，覆盖创建、更新、测试和读取回显 | depends_on: [1.2]
- [ ] 2.2 在 `packages/backend/src/index.ts` 注册登录凭证路由，并确保连接测试与实际连接链路复用新的凭证解析逻辑 | depends_on: [2.1]

### 3. 前端登录凭证管理与表单接入

- [ ] 3.1 新增前端登录凭证类型、store 和管理组件，提供列表、新增、编辑、删除交互入口 | depends_on: [2.2]
- [ ] 3.2 改造 `packages/frontend/src/components/AddConnectionFormAuth.vue`、`AddConnectionForm.vue`、`packages/frontend/src/composables/useAddConnectionForm.ts`，支持“直填凭证 / 已保存凭证”双模式 | depends_on: [3.1]

### 4. 批量编辑与文案同步

- [ ] 4.1 改造 `packages/frontend/src/components/BatchEditConnectionForm.vue`，支持批量应用已保存登录凭证并做类型校验 | depends_on: [3.1]
- [ ] 4.2 更新连接相关 store、页面入口与 `packages/frontend/src/locales/zh-CN.json`、`packages/frontend/src/locales/en-US.json`、`packages/frontend/src/locales/ja-JP.json` 文案 | depends_on: [3.2, 4.1]

### 5. 验证与知识同步

- [ ] 5.1 执行前后端构建或类型校验，验证登录凭证管理、连接表单和批量编辑改造可通过基础检查 | depends_on: [4.2]
- [ ] 5.2 同步 `.helloagents` 知识库与 CHANGELOG，记录本次“登录凭证管理”实现方案和落地结果 | depends_on: [5.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-25 23:54 | DESIGN | completed | 已确认采用“独立登录凭证实体 + 连接可选引用 + 保留直填”的实现路径 |

---

## 执行备注

> 当前环境缺少可用 Python 运行时，`create_package.py` 未能执行；本方案包已按模板规范手工创建。开发阶段需优先保证统一凭证解析逻辑，避免连接创建、测试和运行时三套行为分叉。

