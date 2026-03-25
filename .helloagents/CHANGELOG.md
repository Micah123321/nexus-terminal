# 变更日志

## [Unreleased]

- 2026-03-25：初始化 `.helloagents/` 知识库骨架与首批模块文档，不代表源码功能变更。
- 2026-03-25：新增 GHCR Docker 发布 workflow，并将 `docker-compose.yml` 的三个业务镜像切换到 `ghcr.io/micah123321/*`。
- 2026-03-25：`/workspace` 默认布局改为“左侧 Workbench + 中央视终端 + 右侧状态监控”，并在状态监控中新增开机累计上下行流量展示。
- 2026-03-25：继续微调 `/workspace` Workbench，新增默认“快捷指令”标签、调整三栏宽度到更接近 xterminal 参考图，并修复终端区域鼠标悬停时指针异常消失的问题。

### 修复
- **[workspace-root]**: 重新核对工作区状态监控与终端标签剩余改动，确认当前前后端构建通过，并修正知识库归档索引与活跃方案状态 — by yinjianm
  - 方案: [202603252256_workspace-monitor-terminal-polish](archive/2026-03/202603252256_workspace-monitor-terminal-polish/)
- **[frontend]**: 统一 `QuickCommandsView.vue` 的按钮主题适配，移除残留硬编码 hover 色值并切回主题变量体系 — by yinjianm
  - 方案: [202603250532_quickcommands-theme-alignment](archive/2026-03/202603250532_quickcommands-theme-alignment/)
- **[frontend]**: 修复终端标签切换后的视口恢复逻辑，贴底终端重新激活后自动贴底，上翻终端保留历史位置 — by yinjianm
  - 方案: [202603250547_terminal-tab-scroll-restore](archive/2026-03/202603250547_terminal-tab-scroll-restore/)
- **[frontend]**: 修复终端文字效果对 ANSI 彩色输出的覆盖问题，仅让默认前景文字保留描边/阴影效果 — by yinjianm
  - 方案: [202603250614_terminal-ansi-color-effects](archive/2026-03/202603250614_terminal-ansi-color-effects/)

### 新增
- **[frontend]**: 将首页仪表盘升级为统计卡片、趋势/分布图和活跃连接排行组成的管理驾驶舱 — by yinjianm
  - 方案: [202603252343_dashboard-management-cockpit](archive/2026-03/202603252343_dashboard-management-cockpit/)
- **[backend]**: 新增 `/api/v1/dashboard/summary` 聚合接口，统一输出首页所需的连接、审计和 SSH 统计摘要 — by yinjianm
  - 方案: [202603252343_dashboard-management-cockpit](archive/2026-03/202603252343_dashboard-management-cockpit/)
- **[frontend]**: 将底部命令输入框升级为支持多行草稿与自动增高，并把发送快捷键改为 `Ctrl+Shift+Enter` — by yinjianm
  - 方案: [202603252340_command-input-multiline-shortcut](archive/2026-03/202603252340_command-input-multiline-shortcut/)
- **[frontend]**: 将服务器状态中的内存与磁盘区域升级为卡片化监控视图，补齐环形内存占比、磁盘设备信息、读写速率与挂载表格展示 — by yinjianm
  - 方案: [202603252200_server-status-memory-disk-cards](archive/2026-03/202603252200_server-status-memory-disk-cards/)
- **[backend]**: 扩展 `StatusMonitorService` 的内存/磁盘采集字段，新增缓存、空闲、挂载点、文件系统类型、磁盘设备与磁盘 I/O 速率 — by yinjianm
  - 方案: [202603252200_server-status-memory-disk-cards](archive/2026-03/202603252200_server-status-memory-disk-cards/)
- **[frontend]**: 将“黑暗模式”预设与终端默认主题统一调整为黑绿夜间风格 — by yinjianm
  - 方案: [202603250603_dark-green-night-theme](archive/2026-03/202603250603_dark-green-night-theme/)
- **[backend]**: 将终端文字描边与阴影开关的外观默认值改为开启，与前端回退值保持一致 — by yinjianm
  - 方案: [202603250614_terminal-ansi-color-effects](archive/2026-03/202603250614_terminal-ansi-color-effects/)
- **[frontend]**: 将连接管理页升级为左侧标签树、顶部搜索工具条和右侧结果列表的双栏管理台 — by yinjianm
  - 方案: [202603250636_connections-view-tree-search-redesign](archive/2026-03/202603250636_connections-view-tree-search-redesign/)
- **[frontend]**: 为连接管理页补充多级标签树、列头排序和行级更多菜单，并支持分组范围与展开状态持久化 — by yinjianm
  - 方案: [202603252152_connections-tree-sort-more-menu](archive/2026-03/202603252152_connections-tree-sort-more-menu/)
- **[frontend]**: 为连接管理页补树工具栏与展开/收起控制，并将行内次级操作整理进更完整的更多菜单 — by yinjianm
  - 方案: [202603252220_connections-tree-toolbar-menu-polish](archive/2026-03/202603252220_connections-tree-toolbar-menu-polish/)
- **[frontend]**: 为连接管理页补左侧树搜索、命中链路过滤、节点计数高亮和资源管理器式头部布局 — by yinjianm
  - 方案: [202603252310_connections-tree-search-explorer-polish](archive/2026-03/202603252310_connections-tree-search-explorer-polish/)
- **[frontend]**: 为连接管理页补树节点 hover 工具操作、资源管理器式分隔标题行和拖拽重排占位反馈 — by yinjianm
  - 方案: [202603252336_connections-tree-hover-drag-polish](archive/2026-03/202603252336_connections-tree-hover-drag-polish/)
- **[frontend]**: 为同一 SSH 服务器连接补充多终端入口与终端序号标识，默认首次仍只打开一个终端 — by yinjianm
  - 方案: [202603252207_ssh-connection-multi-terminal](archive/2026-03/202603252207_ssh-connection-multi-terminal/)
- **[frontend]**: 将顶部终端标签栏升级为“服务器组头 + 终端子标签 + 组尾新增按钮”，让同服务器多终端关系更直观 — by yinjianm
  - 方案: [202603252229_terminal-tab-group-visual](archive/2026-03/202603252229_terminal-tab-group-visual/)
