# 任务清单: terminal-group-and-broadcast-dedupe

```yaml
@feature: terminal-group-and-broadcast-dedupe
@created: 2026-03-25
@status: in_progress
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 4 | 1 | 0 | 5 |

---

## 任务列表

### 1. 方案与边界确认

- [√] 1.1 创建终端分组插入与广播去重方案包 | depends_on: []

### 2. 分组与新增终端修复

- [√] 2.1 在 `sessionActions.ts` 中实现同服务器新终端插回组尾的顺序维护 | depends_on: [1.1]
- [√] 2.2 调整 `TerminalTabBar.vue` 的胶囊分组样式和激活组高亮 | depends_on: [2.1]

### 3. 广播去重

- [√] 3.1 调整 `QuickCommandsView.vue` 与 `CommandHistoryView.vue`，按服务器去重发送 | depends_on: [2.1]

### 4. 验证与同步

- [X] 4.1 执行前端构建验证并同步 `.helloagents` 文档与归档记录 | depends_on: [2.2, 3.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-25 23:11 | 1.1 | 完成 | 创建 implementation 方案包，并锁定“组尾插入 + 按服务器去重广播”方向 |
| 2026-03-25 23:18 | 2.1 / 2.2 | 完成 | 新增基于 sessionOrder 的组尾插入逻辑，并强化终端组胶囊高亮样式 |
| 2026-03-25 23:20 | 3.1 | 完成 | 快捷指令和命令历史的批量发送已统一改成按 connectionId 去重 |
| 2026-03-25 23:21 | 4.1 | 失败 | `npm --prefix packages/frontend run build` 被现有 `ConnectionsView.vue` duplicate attribute 错误阻塞 |

---

## 执行备注

- 本轮以修正会话插入顺序和广播粒度为主，不改后端 SSH 协议。
- “每台服务器只执行一次”适用于快捷指令和命令历史两个入口。
- 如果发现空壳 plan 目录，不参与本轮任务状态流转。
