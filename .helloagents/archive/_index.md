# 方案归档索引

> 通过此文件快速查找历史方案
> 历史年份: 暂无

## 快速索引（当前年份）

| 时间戳 | 名称 | 类型 | 涉及模块 | 决策 | 结果 |
|--------|------|------|---------|------|------|
| 202603260234 | folder-upload-auto-zip | implementation | frontend | folder-upload-auto-zip#D001 | ✅完成 |
| 202603260228 | file-context-menu-terminal-actions | implementation | frontend | - | ✅完成 |
| 202603260212 | workbench-file-root-tree | implementation | frontend | - | ✅完成 |
| 202603260156 | quickcommands-context-menu-polish | implementation | frontend | quickcommands-context-menu-polish#D001 | ✅完成 |
| 202603260150 | workbench-file-folder-overview | implementation | frontend | - | ✅完成 |
| 202603260041 | workbench-file-multi-root-explorer | implementation | frontend | - | ✅完成 |
| 202603260042 | quickcommands-dynamic-variables | implementation | frontend | quickcommands-dynamic-variables#D001 | ✅完成 |
| 202603260038 | quickcommands-context-menu-actions | implementation | frontend | quickcommands-context-menu-actions#D001 | ✅完成 |
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
| 202603252340 | command-input-multiline-shortcut | implementation | frontend | command-input-multiline-shortcut#D001 | ✅完成 |
| 202603252343 | dashboard-management-cockpit | implementation | frontend, backend | dashboard-management-cockpit#D001, dashboard-management-cockpit#D002 | ✅完成 |
| 202603260043 | dashboard-live-session-metrics | implementation | frontend, backend | dashboard-live-session-metrics#D001, dashboard-live-session-metrics#D002 | ✅完成 |
| 202603252229 | terminal-tab-group-visual | implementation | frontend | terminal-tab-group-visual#D001 | ✅完成 |
| 202603252256 | workspace-monitor-terminal-polish | implementation | workspace-root | workspace-monitor-terminal-polish#D001 | ✅完成 |
| 202603251200 | workspace-workbench-monitor | implementation | frontend, backend | workspace-workbench-monitor#D001 | ✅完成 |

## 按月归档

### 2026-03
- [202603260234_folder-upload-auto-zip](./2026-03/202603260234_folder-upload-auto-zip/) - 为文件管理器补齐上传文件夹入口，选择目录后先打包为 zip，再上传并自动触发远端解压
- [202603260228_file-context-menu-terminal-actions](./2026-03/202603260228_file-context-menu-terminal-actions/) - 重排文件区右键菜单结构，并补齐终端子菜单、复制文件名和复制绝对路径等动作
- [202603260212_workbench-file-root-tree](./2026-03/202603260212_workbench-file-root-tree/) - 将工作台文件区收敛为固定 / 根节点的单栏资源管理器树，并在树内同时显示目录与文件
- [202603260156_quickcommands-context-menu-polish](./2026-03/202603260156_quickcommands-context-menu-polish/) - 修正快捷命令右键菜单透明背景，并将粘贴动作统一为“粘贴到命令输入框（不发送）”
- [202603260150_workbench-file-folder-overview](./2026-03/202603260150_workbench-file-folder-overview/) - 将工作台文件区调整为多根目录常驻的文件夹总览，不再点击目录后切成单独文件表格
- [202603260041_workbench-file-multi-root-explorer](./2026-03/202603260041_workbench-file-multi-root-explorer/) - 为工作台文件面板补齐左侧多根目录资源管理器，并允许收藏路径与当前路径同屏作为多个根目录展开浏览
- [202603260042_quickcommands-dynamic-variables](./2026-03/202603260042_quickcommands-dynamic-variables/) - 为快捷指令编辑弹窗补充动态变量清单、一键插入，并统一列表执行与弹窗执行的动态变量解析
- [202603260038_quickcommands-context-menu-actions](./2026-03/202603260038_quickcommands-context-menu-actions/) - 为快捷命令列表补齐图标化右键菜单，并区分立即执行、粘贴到终端输入框和粘贴到快捷输入框
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
- [202603252340_command-input-multiline-shortcut](./2026-03/202603252340_command-input-multiline-shortcut/) - 将命令输入框改为多行自动增高，并改用 Ctrl+Shift+Enter 发送
- [202603252343_dashboard-management-cockpit](./2026-03/202603252343_dashboard-management-cockpit/) - 将首页升级为统计卡片、趋势/分布图和活跃连接排行组成的 dashboard 驾驶舱，并补充 summary 聚合接口
- [202603260043_dashboard-live-session-metrics](./2026-03/202603260043_dashboard-live-session-metrics/) - 为首页 dashboard 增加当前用户与系统总览双视角的在线 SSH / 挂起会话与状态监控流指标
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
