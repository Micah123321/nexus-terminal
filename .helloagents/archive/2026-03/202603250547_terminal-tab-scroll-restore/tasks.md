# 任务清单: terminal-tab-scroll-restore

```yaml
@feature: terminal-tab-scroll-restore
@created: 2026-03-25
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 5 | 0 | 0 | 5 |

---

## 任务列表

### 1. 方案与范围确认

- [√] 1.1 创建终端切换滚动恢复方案包并锁定前端终端组件范围 | depends_on: []

### 2. 终端滚动恢复修复

- [√] 2.1 盘点终端切换、fit 与 xterm 视口状态的现有实现 | depends_on: [1.1]
- [√] 2.2 在 `Terminal.vue` 中实现“贴底优先、上翻保留”的视口恢复逻辑 | depends_on: [2.1]

### 3. 验证与同步

- [√] 3.1 运行前端最小验证并记录结果 | depends_on: [2.2]
- [√] 3.2 更新 `.helloagents` 文档与变更记录 | depends_on: [3.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-25 05:47 | 1.1 | 完成 | 创建 implementation 方案包，范围锁定为终端标签切换后的 xterm 视口恢复 |
| 2026-03-25 05:49 | 2.1 / 2.2 | 完成 | 在 Terminal.vue 中加入视口快照、贴底判断与重激活恢复逻辑，并将 fit/ResizeObserver 路径统一纳入恢复流程 |
| 2026-03-25 05:51 | 3.1 | 完成 | `npm run build --workspace @nexus-terminal/frontend` 通过 |
| 2026-03-25 05:52 | 3.2 | 完成 | 更新 frontend 模块文档并准备归档 |

---

## 执行备注

- 本次修复目标是恢复滚动意图，不是简单强制滚到底部。
- 当前最可能的落点是 `Terminal.vue` 的激活与 `fit()` 逻辑，而非 `TerminalTabBar.vue` 本身。
- 运行态真实验收仍依赖本地可用的多 SSH 会话现场；本轮以构建验证和代码路径审查为主。
