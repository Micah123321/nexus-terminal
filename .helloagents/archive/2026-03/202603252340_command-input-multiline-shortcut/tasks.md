# 任务清单: command-input-multiline-shortcut

```yaml
@feature: command-input-multiline-shortcut
@created: 2026-03-25
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 4 | 0 | 0 | 4 |

---

## 任务列表

### 1. 命令输入交互改造

- [√] 1.1 在 `packages/frontend/src/components/CommandInputBar.vue` 中将命令输入节点从单行输入改为支持多行的 `textarea`，补齐自动高度同步逻辑 | depends_on: []
- [√] 1.2 在 `packages/frontend/src/components/CommandInputBar.vue` 中调整键盘处理逻辑，将发送动作改为 `Ctrl+Shift+Enter`，并保持快捷指令/命令历史选中发送路径可用 | depends_on: [1.1]

### 2. 文案与验证

- [√] 2.1 更新 `packages/frontend/src/locales/zh-CN.json`、`packages/frontend/src/locales/en-US.json`、`packages/frontend/src/locales/ja-JP.json` 中的命令输入提示文案，反映新的发送快捷键 | depends_on: [1.2]
- [√] 2.2 执行 `packages/frontend` 的构建验证，确认类型检查与打包通过 | depends_on: [2.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-25 23:40 | DESIGN | completed | 已确认采用 textarea 自动增高方案，最多约 6 行并改用 Ctrl+Shift+Enter 发送 |
| 2026-03-25 23:44 | 1.1 / 1.2 | 完成 | `CommandInputBar.vue` 已切换为多行 textarea，并将发送动作改为 Ctrl+Shift+Enter |
| 2026-03-25 23:44 | 2.1 | 完成 | 已同步中文、英文、日文命令输入占位提示文案 |
| 2026-03-25 23:45 | 2.2 | 完成 | `packages/frontend` 执行 `npm run build` 通过，仅保留既有 Vite chunk 警告 |

---

## 执行备注

> 当前环境缺少可直接调用的 `python/py`，方案包通过模板降级方式手工创建。本轮未做浏览器级工作区实机操作，运行态确认以代码审查和前端构建通过为主。
