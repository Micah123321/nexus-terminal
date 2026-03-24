# 变更日志

## [Unreleased]

- 2026-03-25：初始化 `.helloagents/` 知识库骨架与首批模块文档，不代表源码功能变更。
- 2026-03-25：新增 GHCR Docker 发布 workflow，并将 `docker-compose.yml` 的三个业务镜像切换到 `ghcr.io/micah123321/*`。
- 2026-03-25：`/workspace` 默认布局改为“左侧 Workbench + 中央视终端 + 右侧状态监控”，并在状态监控中新增开机累计上下行流量展示。
- 2026-03-25：继续微调 `/workspace` Workbench，新增默认“快捷指令”标签、调整三栏宽度到更接近 xterminal 参考图，并修复终端区域鼠标悬停时指针异常消失的问题。

### 修复
- **[frontend]**: 统一 `QuickCommandsView.vue` 的按钮主题适配，移除残留硬编码 hover 色值并切回主题变量体系 — by yinjianm
  - 方案: [202603250532_quickcommands-theme-alignment](archive/2026-03/202603250532_quickcommands-theme-alignment/)
- **[frontend]**: 修复终端标签切换后的视口恢复逻辑，贴底终端重新激活后自动贴底，上翻终端保留历史位置 — by yinjianm
  - 方案: [202603250547_terminal-tab-scroll-restore](archive/2026-03/202603250547_terminal-tab-scroll-restore/)

### 新增
- **[frontend]**: 将“黑暗模式”预设与终端默认主题统一调整为黑绿夜间风格 — by yinjianm
  - 方案: [202603250603_dark-green-night-theme](archive/2026-03/202603250603_dark-green-night-theme/)
