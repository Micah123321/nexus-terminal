# 任务清单: quickcommands-context-menu-actions

```yaml
@feature: quickcommands-context-menu-actions
@created: 2026-03-26
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 4 | 0 | 0 | 4 |

---

## 任务列表

### 1. 快捷命令右键菜单扩展

- [√] 1.1 在 `packages/frontend/src/views/QuickCommandsView.vue` 中补齐右键菜单动作与样式，加入立即执行、粘贴到终端、复制命令、粘贴到快捷输入框、编辑、删除，并保留现有扩展动作 | depends_on: []
- [√] 1.2 在 `packages/frontend/src/views/QuickCommandsView.vue` 中补齐命令处理与联动逻辑，确保“粘贴到终端”只写入底部命令输入框、不发送 | depends_on: [1.1]

### 2. 文案与验证

- [√] 2.1 更新 `packages/frontend/src/locales/zh-CN.json`、`packages/frontend/src/locales/en-US.json`、`packages/frontend/src/locales/ja-JP.json` 中的快捷命令右键菜单文案和提示信息 | depends_on: [1.2]
- [√] 2.2 执行 `packages/frontend` 的构建验证，确认类型检查与打包通过 | depends_on: [2.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-26 00:38 | DESIGN | completed | 已确认右键菜单需扩展为 5 个主动作，“粘贴到终端”只写入底部命令输入框不发送 |
| 2026-03-26 00:42 | 1.1 / 1.2 | 完成 | `QuickCommandsView.vue` 已补齐多动作右键菜单，并区分立即执行、粘贴到终端输入框和粘贴到快捷输入框三种语义 |
| 2026-03-26 00:42 | 2.1 | 完成 | 已同步中文、英文、日文快捷命令右键菜单文案与提示信息 |
| 2026-03-26 00:43 | 2.2 | 完成 | `packages/frontend` 执行 `npm run build` 通过，仅保留既有 Vite 动态导入与 chunk 警告 |

---

## 执行备注

> 当前环境缺少可直接调用的 `python/py`，方案包通过模板降级方式手工创建。本轮未做浏览器内真实右键交互截图对照，运行态确认以代码审查和前端构建通过为主。
