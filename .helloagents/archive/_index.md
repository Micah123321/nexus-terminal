# 方案归档索引

> 通过此文件快速查找历史方案
> 历史年份: 暂无

## 快速索引（当前年份）

| 时间戳 | 名称 | 类型 | 涉及模块 | 决策 | 结果 |
|--------|------|------|---------|------|------|
| 202603250317 | ghcr-docker-publish | implementation | workspace-root | ghcr-docker-publish#D001 | ✅完成 |
| 202603250532 | quickcommands-theme-alignment | implementation | frontend | - | ✅完成 |
| 202603250547 | terminal-tab-scroll-restore | implementation | frontend | - | ✅完成 |
| 202603250603 | dark-green-night-theme | implementation | frontend, backend | - | ✅完成 |
| 202603250614 | terminal-ansi-color-effects | implementation | frontend, backend | - | ✅完成 |
| 202603250636 | connections-view-tree-search-redesign | implementation | frontend | - | ✅完成 |
| 202603252152 | connections-tree-sort-more-menu | implementation | frontend | - | ✅完成 |
| 202603252200 | server-status-memory-disk-cards | implementation | frontend, backend | server-status-memory-disk-cards#D001, server-status-memory-disk-cards#D002 | ✅完成 |
| 202603252207 | ssh-connection-multi-terminal | implementation | frontend | ssh-connection-multi-terminal#D001 | ✅完成 |
| 202603252220 | connections-tree-toolbar-menu-polish | implementation | frontend | - | ✅完成 |
| 202603252310 | connections-tree-search-explorer-polish | implementation | frontend | - | ✅完成 |
| 202603252336 | connections-tree-hover-drag-polish | implementation | frontend | - | ✅完成 |
| 202603252229 | terminal-tab-group-visual | implementation | frontend | terminal-tab-group-visual#D001 | ✅完成 |
| 202603252256 | workspace-monitor-terminal-polish | implementation | workspace-root | workspace-monitor-terminal-polish#D001 | ✅完成 |
| 202603251200 | workspace-workbench-monitor | implementation | frontend, backend | workspace-workbench-monitor#D001 | ✅完成 |

## 按月归档

### 2026-03
- [202603250317_ghcr-docker-publish](./2026-03/202603250317_ghcr-docker-publish/) - 新增 GHCR 镜像发布 workflow 并切换 compose 镜像来源
- [202603250532_quickcommands-theme-alignment](./2026-03/202603250532_quickcommands-theme-alignment/) - 统一快捷指令视图按钮主题适配，移除残留硬编码 hover 色值
- [202603250547_terminal-tab-scroll-restore](./2026-03/202603250547_terminal-tab-scroll-restore/) - 修复终端标签切换后的贴底/历史滚动恢复逻辑
- [202603250603_dark-green-night-theme](./2026-03/202603250603_dark-green-night-theme/) - 将黑暗模式预设与终端默认主题统一调整为黑绿夜间风格
- [202603250614_terminal-ansi-color-effects](./2026-03/202603250614_terminal-ansi-color-effects/) - 修复终端文字效果覆盖 ANSI 彩色输出的问题，并将文字效果默认开关改为开启
- [202603250636_connections-view-tree-search-redesign](./2026-03/202603250636_connections-view-tree-search-redesign/) - 将连接管理页升级为左侧标签树、顶部搜索工具条和右侧结果列表的双栏管理台
- [202603252152_connections-tree-sort-more-menu](./2026-03/202603252152_connections-tree-sort-more-menu/) - 为连接管理页补充多级标签树、列头排序和行级更多菜单
- [202603252200_server-status-memory-disk-cards](./2026-03/202603252200_server-status-memory-disk-cards/) - 为服务器状态补齐参考图风格的内存/磁盘卡片，并扩展后端监控字段与磁盘 I/O 速率
- [202603252207_ssh-connection-multi-terminal](./2026-03/202603252207_ssh-connection-multi-terminal/) - 为同一 SSH 服务器连接补充多终端入口与终端序号标识
- [202603252220_connections-tree-toolbar-menu-polish](./2026-03/202603252220_connections-tree-toolbar-menu-polish/) - 为连接管理页补树工具栏与展开/收起控制，并整理行内更多菜单
- [202603252310_connections-tree-search-explorer-polish](./2026-03/202603252310_connections-tree-search-explorer-polish/) - 为连接管理页补左侧树搜索、命中链路过滤、节点计数高亮和资源管理器式头部布局
- [202603252336_connections-tree-hover-drag-polish](./2026-03/202603252336_connections-tree-hover-drag-polish/) - 为连接管理页补树节点 hover 工具、分隔标题行和拖拽重排占位反馈
- [202603252229_terminal-tab-group-visual](./2026-03/202603252229_terminal-tab-group-visual/) - 将顶部终端标签栏改成更明显的服务器组头与终端子标签
- [202603252256_workspace-monitor-terminal-polish](./2026-03/202603252256_workspace-monitor-terminal-polish/) - 重新核对状态监控与终端标签剩余改动，并修正知识库归档索引与活跃方案状态
- [202603251200_workspace-workbench-monitor](./2026-03/202603251200_workspace-workbench-monitor/) - `/workspace` 改为三栏 Workbench 布局，并新增开机累计流量监控
## 结果状态说明
- ✅ 完成
- ⚠️ 部分完成
- ❌ 失败/中止
- ⏸ 未执行
- 🔄 已回滚
- 📄 概述
