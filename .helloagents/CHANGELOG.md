# 变更日志

## [Unreleased]

- 2026-03-25：初始化 `.helloagents/` 知识库骨架与首批模块文档，不代表源码功能变更。
- 2026-03-25：新增 GHCR Docker 发布 workflow，并将 `docker-compose.yml` 的三个业务镜像切换到 `ghcr.io/micah123321/*`。
- 2026-03-25：`/workspace` 默认布局改为“左侧 Workbench + 中央终端 + 右侧状态监控”，并在状态监控中新增开机累计上/下行流量展示。
- 2026-03-25：继续微调 `/workspace` Workbench，新增默认“快捷指令”标签、调整三栏宽度到更接近 xterminal 参考图，并修复终端区域鼠标悬停时指针异常消失的问题。
- 2026-03-25：前端主站视觉语言统一升级为 `Slate Control Center`，新增公共页面壳层与认证壳层，并重做 Dashboard、Settings、Login、Setup、Notifications、Proxies、Audit Logs、Workbench、StatusMonitor 的现代化 UI 表达。
- 2026-03-25：收口前端控制中心细节，修复顶部 `app-nav` 激活下划线误命中品牌链接的问题，并将 `ConnectionsView` 重做为控制中心卡片列表，同时升级 `/workspace` 外层容器与 `TerminalTabBar` 的玻璃面板视觉。
