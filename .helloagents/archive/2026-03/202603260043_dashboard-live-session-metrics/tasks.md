# 任务清单: dashboard-live-session-metrics

```yaml
@feature: dashboard-live-session-metrics
@created: 2026-03-26
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 5 | 0 | 0 | 5 |

---

## 任务列表

### 1. 后端运行态统计扩展

- [√] 1.1 在 `packages/backend/src/ssh-suspend/ssh-suspend.service.ts` 中补充系统级挂起会话汇总能力，并在 `packages/backend/src/dashboard/` 中扩展 live metrics 结构与 service 组合逻辑 | depends_on: []
- [√] 1.2 调整 `packages/backend/src/dashboard/dashboard.controller.ts` / `dashboard.service.ts` / `dashboard.types.ts`，让 summary 响应同时包含当前用户和系统总览的实时指标 | depends_on: [1.1]

### 2. 前端展示扩展

- [√] 2.1 更新 `packages/frontend/src/types/server.types.ts` 与 `packages/frontend/src/components/DashboardOverviewPanel.vue`，新增“当前用户 / 系统总览”实时会话指标展示 | depends_on: [1.2]
- [√] 2.2 更新 `packages/frontend/src/locales/zh-CN.json`、`packages/frontend/src/locales/en-US.json`、`packages/frontend/src/locales/ja-JP.json` 的实时指标文案 | depends_on: [2.1]

### 3. 验证

- [√] 3.1 执行 `packages/backend` 与 `packages/frontend` 的构建校验，确认新增实时指标链路通过 | depends_on: [2.2]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-26 00:43 | DESIGN | completed | 已确定采用“数据库统计继续走 repository + 运行态统计走 clientStates/sshSuspendService 组合”的实现路径 |
| 2026-03-26 00:47 | 1.1 | completed | 为 sshSuspendService 增加系统级/当前用户挂起会话计数，并将 clientStates 运行态接入 dashboard service |
| 2026-03-26 00:49 | 2.1 | completed | 首页 summary 类型与总览组件已扩展为混合视角实时会话面板，并拆出 DashboardLiveMetricsPanel 保持单文件约束 |
| 2026-03-26 00:50 | 3.1 | completed | `packages/frontend` 构建通过；`packages/backend` 类型校验问题已修正后再次通过 |

---

## 执行备注

> `create_package.py` 在当前环境未返回有效执行报告，本方案包按模板规则手工创建。当前仓库存在其他并行中的方案包和未提交改动，本轮仅处理 dashboard 实时指标相关范围。
