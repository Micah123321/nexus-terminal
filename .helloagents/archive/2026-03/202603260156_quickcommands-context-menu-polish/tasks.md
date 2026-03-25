# 任务清单: quickcommands-context-menu-polish

```yaml
@feature: quickcommands-context-menu-polish
@created: 2026-03-26
@status: pending
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 0 | 0 | 0 | 4 |

---

## 任务列表

### 1. 快捷命令右键菜单修正

- [ ] 1.1 在 `packages/frontend/src/views/QuickCommandsView.vue` 中修正右键菜单容器样式，改为实底不透明菜单 | depends_on: []
- [ ] 1.2 在 `packages/frontend/src/views/QuickCommandsView.vue` 中移除“粘贴到终端”，并将“粘贴到快捷输入框”改为“粘贴到命令输入框”且写入底部命令输入框不发送 | depends_on: [1.1]

### 2. 文案与验证

- [ ] 2.1 更新 `packages/frontend/src/locales/zh-CN.json`、`packages/frontend/src/locales/en-US.json`、`packages/frontend/src/locales/ja-JP.json` 中的相关菜单文案和提示信息 | depends_on: [1.2]
- [ ] 2.2 执行 `packages/frontend` 的构建验证，确认类型检查与打包通过 | depends_on: [2.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-26 01:56 | DESIGN | completed | 已确认删除“粘贴到终端”，并将替代项改为“粘贴到命令输入框”且只回填不发送 |

---

## 执行备注

> 当前环境缺少可直接调用的 `python/py`，方案包通过模板降级方式手工创建。
