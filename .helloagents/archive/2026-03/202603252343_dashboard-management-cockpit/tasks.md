# 任务清单: dashboard-management-cockpit

```yaml
@feature: dashboard-management-cockpit
@created: 2026-03-25
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 6 | 0 | 0 | 6 |

---

## 任务列表

### 1. 后端 Dashboard 聚合接口

- [√] 1.1 在 `packages/backend/src/dashboard/` 下新增 summary 查询与 service/controller/routes，实现基于连接表、标签关联表和审计日志表的聚合统计接口 | depends_on: []
- [√] 1.2 在 `packages/backend/src/index.ts` 中注册 dashboard 路由，并补齐必要的后端类型定义 | depends_on: [1.1]

### 2. 前端数据接入

- [√] 2.1 在 `packages/frontend/src/types/server.types.ts` 中新增 dashboard summary 响应类型，并在 `packages/frontend/src/stores/` 中新增 dashboard store 负责获取首页聚合数据 | depends_on: [1.2]

### 3. 仪表盘页面重构

- [√] 3.1 重构 `packages/frontend/src/views/DashboardView.vue`，新增统计卡片、近 7 天趋势图、连接类型分布图、事件类型分布图和活跃连接排行，同时保留现有连接列表与最近活动区域 | depends_on: [2.1]
- [√] 3.2 更新 `packages/frontend/src/locales/zh-CN.json`、`packages/frontend/src/locales/en-US.json`、`packages/frontend/src/locales/ja-JP.json` 的 dashboard 文案，补齐新增统计与图表标签 | depends_on: [3.1]

### 4. 验证

- [√] 4.1 执行 `packages/backend` 与 `packages/frontend` 的构建校验，确认新增 dashboard 接口和页面改造通过类型检查与打包 | depends_on: [3.2]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-25 23:50 | 1.1 | completed | 新增 backend dashboard 聚合模块，输出总量、趋势、分布和活跃连接排行 |
| 2026-03-25 23:51 | 1.2 | completed | 已注册 `/api/v1/dashboard/summary` 路由并接入后端入口 |
| 2026-03-25 23:56 | 2.1 | completed | 新增 dashboard store 与 summary 类型定义，首页改为单接口聚合数据驱动 |
| 2026-03-26 00:05 | 3.1 | completed | 重构 DashboardView 并拆出 DashboardOverviewPanel，加入统计卡片、趋势/分布图和活跃连接排行 |
| 2026-03-26 00:08 | 4.1 | completed | `packages/backend` 与 `packages/frontend` 构建通过，仅保留既有 chunk 警告 |

---

## 执行备注

> `create_package.py` 与 `validate_package.py` 在当前环境均未返回有效执行报告，方案包与校验结果已按模板规则手工接管。仓库存在若干与本任务无关的未提交后端改动，本次仅同步仪表盘相关文件。
