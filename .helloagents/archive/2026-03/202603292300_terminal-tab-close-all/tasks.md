# 任务清单: terminal-tab-close-all

```yaml
@feature: terminal-tab-close-all
@created: 2026-03-29
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 4 | 0 | 0 | 4 |

---

## 任务列表

### 1. 现状确认
- [x] 1.1 复核 `TerminalTabBar.vue`、`workspaceEvents.ts` 与 `WorkspaceView.vue` 的现有关闭链路，确认新增菜单项可复用工作区事件处理 | depends_on: []

### 2. 菜单与事件扩展
- [x] 2.1 在 `packages/frontend/src/components/TerminalTabBar.vue` 中新增“关闭全部”菜单项和 `close-all` 动作 | depends_on: [1.1]
- [x] 2.2 在 `packages/frontend/src/composables/workspaceEvents.ts` 中补充 `session:closeAll` 事件类型，并在 `packages/frontend/src/views/WorkspaceView.vue` 中接入全部关闭处理 | depends_on: [2.1]

### 3. 文案与验证
- [x] 3.1 更新 `packages/frontend/src/locales/zh-CN.json` 与 `packages/frontend/src/locales/en-US.json` 文案 | depends_on: [2.2]
- [x] 3.2 运行 `npm --prefix packages/frontend run build` 验证改动 | depends_on: [3.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-29 | 1.1 | 完成 | 确认终端关闭动作统一经 Workspace 事件总线流转 |
| 2026-03-29 | 2.1 | 完成 | 新增 `close-all` 菜单动作 |
| 2026-03-29 | 2.2 | 完成 | 新增 `session:closeAll` 事件并接入 `cleanupAllSessions()` |
| 2026-03-29 | 3.1 | 完成 | 补充中英文菜单文案 |
| 2026-03-29 | 3.2 | 完成 | 前端构建通过，仅保留既有 chunk warning |

