# 任务清单: ssh-connection-multi-terminal

```yaml
@feature: ssh-connection-multi-terminal
@created: 2026-03-25
@status: completed
@mode: R3
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 7 | 0 | 0 | 7 |

---

## 任务列表

### 1. 方案包与会话模型梳理

- [√] 1.1 创建单连接多终端方案包并固化前端分组决策 | depends_on: []
- [√] 1.2 梳理现有 `session` 状态、标签排序和 SSH 连接入口的复用边界 | depends_on: [1.1]

### 2. 前端会话分组与标签栏改造

- [√] 2.1 扩展 `SessionState` / getter，补充连接分组与终端序号信息 | depends_on: [1.2]
- [√] 2.2 改造 `TerminalTabBar.vue`，支持按连接展示并为当前 SSH 连接新增终端 | depends_on: [2.1]
- [√] 2.3 调整 `WorkspaceView.vue` 与会话入口逻辑，保证默认仅创建一个终端、追加时显式新增 | depends_on: [2.2]

### 3. 文案与验证

- [√] 3.1 补充前端 i18n / 提示文案，并核查 RDP/VNC 不受影响 | depends_on: [2.3]
- [√] 3.2 运行前端构建验证并同步 `.helloagents` 文档与变更记录 | depends_on: [3.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-25 22:07 | 1.1 / 1.2 | 完成 | 创建 implementation 方案包，并确认复用现有独立 SSH session 模型 |
| 2026-03-25 22:14 | 2.1 / 2.2 / 2.3 | 完成 | 为 session 增加终端序号，顶部标签栏拆分“新增终端”和“选择服务器”入口 |
| 2026-03-25 22:19 | 3.1 / 3.2 | 完成 | 补充中英日文案，执行 `npm --prefix packages/frontend run build` 通过，并同步知识库文档 |

---

## 执行备注

- 本次只做 SSH，不扩展到 RDP/VNC。
- 组内每个终端仍对应独立 `sessionId`，避免影响现有 WebSocket / SFTP / 编辑器链路。
- 若现有标签顺序持久化与连接分组发生冲突，优先保证同连接终端的可识别性和可关闭性。
