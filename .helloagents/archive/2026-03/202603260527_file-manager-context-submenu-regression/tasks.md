# 任务清单: file-manager-context-submenu-regression

```yaml
@feature: file-manager-context-submenu-regression
@created: 2026-03-26
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 3 | 0 | 0 | 3 |

---

## 任务列表

### 1. 方案与根因确认
- [√] 1.1 创建回归修复方案包并锁定到文件管理器右键菜单链路 | depends_on: []

### 2. 菜单关闭竞态修复
- [√] 2.1 移除捕获阶段的全局关闭监听，保留组件层 click-outside 作为唯一关闭入口 | depends_on: [1.1]
- [√] 2.2 回归检查普通菜单点击、子菜单展开和空白处关闭行为 | depends_on: [2.1]

### 3. 验证与知识库同步
- [√] 3.1 运行前端定向验证并同步 CHANGELOG/归档记录 | depends_on: [2.2]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-26 05:27 | 1.1 | 完成 | 创建 implementation 方案包，范围锁定为文件管理器右键子菜单点击无反应的回归修复 |
| 2026-03-26 05:33 | 2.1 | 完成 | 删除 `useFileManagerContextMenu.ts` 中捕获阶段的全局点击关闭监听，避免菜单内部点击前被提前销毁 |
| 2026-03-26 05:36 | 2.2 | 完成 | 复核组件层 `handleClickOutside` 仍负责菜单外部关闭，普通菜单项与子菜单交互路径保持分离 |
| 2026-03-26 05:49 | 3.1 | 完成 | `npm run build --workspace @nexus-terminal/frontend` 通过，并同步 frontend 模块文档与 CHANGELOG |

---

## 执行备注

> 当前任务已完成，修复范围保持在文件管理器右键菜单关闭竞态，不涉及终端、上传或压缩业务逻辑重写。
