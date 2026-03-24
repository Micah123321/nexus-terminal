# 任务清单: workspace-workbench-monitor

```yaml
@feature: workspace-workbench-monitor
@created: 2026-03-25
@status: completed
@mode: R3
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 8 | 0 | 0 | 8 |

---

## 任务列表

### 1. 方案包与布局基础

- [√] 1.1 创建 `/workspace` Workbench 改造方案包并记录方案 B | depends_on: []
- [√] 1.2 新增 `workbench` pane 类型与默认布局迁移逻辑 | depends_on: [1.1]

### 2. 前端工作台布局

- [√] 2.1 新增 `WorkspaceWorkbench.vue`，整合命令历史 / 文件 / 编辑器 tab | depends_on: [1.2]
- [√] 2.2 接入 `LayoutRenderer`、`LayoutConfigurator`、设置侧栏宽度类型链 | depends_on: [2.1]

### 3. 状态监控扩展

- [√] 3.1 后端状态监控新增累计上下行流量字段 | depends_on: [1.1]
- [√] 3.2 前端状态监控展示累计流量并补充 i18n | depends_on: [3.1]

### 4. 验证与知识库同步

- [√] 4.1 运行前后端构建验证并记录结果 | depends_on: [2.2, 3.2]
- [√] 4.2 更新 `.helloagents` 模块文档与变更记录 | depends_on: [4.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-25 12:00 | 1.1 | 完成 | 创建 implementation 方案包，进入开发实施 |
| 2026-03-25 12:18 | 1.2 / 2.1 / 2.2 | 完成 | 新增 `workbench` pane、默认布局切换为三栏工作台，并为旧默认布局做轻量迁移 |
| 2026-03-25 12:20 | 3.1 / 3.2 | 完成 | 后端透出累计上下行字节数，前端状态监控新增“开机累计流量”展示 |
| 2026-03-25 12:31 | 4.1 | 完成 | 执行 `npm install` 后，前后端 build 均通过 |
| 2026-03-25 12:33 | 4.2 | 完成 | 更新模块文档、变更日志并准备归档 |
| 2026-03-25 12:48 | follow-up | 完成 | Workbench 新增默认快捷指令 tab，微调三栏宽度并修复终端鼠标悬停指针异常 |

---

## 执行备注

- 本次只改 `/workspace` 主工作区，不触碰其它页面和全局弹层。
- 默认布局改造需要兼顾已有后端 / localStorage 布局数据，因此会做保守迁移而不是强制清空布局。
- 首次构建前本机缺少依赖，补跑 `npm install` 后，`packages/backend` 与 `packages/frontend` 构建均通过。
