# 任务清单: terminal-server-internal-tabs

> **@status:** completed | 2026-03-29 22:59

```yaml
@feature: terminal-server-internal-tabs
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

### 1. 方案与现状确认

- [√] 1.1 复核 `TerminalTabBar.vue`、`LayoutRenderer.vue` 与 `sessionActions.ts` 的现状，锁定“顶部服务器切换 + 面板内终端切换”的最小实现范围 | depends_on: []

### 2. 顶部服务器级切换改造

- [√] 2.1 在 `packages/frontend/src/components/TerminalTabBar.vue` 中将 SSH 顶部标签改为服务器级入口，并保留非 SSH 会话的现有行为 | depends_on: [1.1]

### 3. 终端面板内切换改造

- [√] 3.1 在 `packages/frontend/src/components/LayoutRenderer.vue` 中新增当前服务器内部终端切换条，支持切换/新增/关闭该服务器下的终端 | depends_on: [2.1]
- [√] 3.2 补充 `packages/frontend/src/locales/zh-CN.json` 与 `packages/frontend/src/locales/en-US.json` 的相关文案 | depends_on: [3.1]

### 4. 验证与同步

- [√] 4.1 运行前端构建并同步知识库变更说明 | depends_on: [3.2]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-29 21:39 | 方案包创建 | 完成 | 已创建 `202603292139_terminal-server-internal-tabs` 并确认本轮按 R2 执行 |
| 2026-03-29 21:54 | 2.1 / 3.1 / 3.2 | 完成 | 顶部 SSH 标签改为服务器级入口，终端面板内新增当前服务器终端切换条与新增按钮 |
| 2026-03-29 22:15 | 4.1 | 完成 | `npm --prefix packages/frontend run build` 通过；仅保留既有 Vite chunk size / dynamic import 提示 |

---

## 执行备注

- 本轮只调整 SSH 多终端的展示归属，不改变后端协议、不扩展到 RDP/VNC 会话模型。
- 顶部拖拽在存在 SSH 聚合展示时已临时禁用，避免“可见服务器项”与“底层会话项”不一致造成错误拖拽。
