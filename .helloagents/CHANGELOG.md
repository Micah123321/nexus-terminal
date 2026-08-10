# 变更日志

## [Unreleased]

- **[frontend]**: 将共享 WebSocket 连接失败后的自动重连限制为最多 3 次，并在工作区显示重连状态、尝试次数和等待时间 — by yinjianm
  - 方案: [202605131759_websocket-reconnect-limit-and-status](archive/2026-05/202605131759_websocket-reconnect-limit-and-status/)
  - 决策: websocket-reconnect-limit-and-status#D001(在共享 WebSocket 管理器中统一限制重连并暴露状态)

- **[frontend]**: 为连接管理页批量工具条新增“更改凭证”快捷入口，选中或全选连接后可直接将同类型连接批量改绑到指定登录凭证，也支持清空已保存凭证 — by yinjianm
  - 方案: [202605131758_bulk-credential-shortcut](archive/2026-05/202605131758_bulk-credential-shortcut/)
  - 决策: bulk-credential-shortcut#D001(使用前端快捷入口复用现有连接更新链路)

- **[frontend]**: 为全局服务器检索补充“最近连接 / 名称”排序切换，默认最近连接，并新增中文拼音全拼与首字母模糊搜索索引 — by yinjianm
  - 方案: [202605042126_global-connection-search-sort-pinyin](archive/2026-05/202605042126_global-connection-search-sort-pinyin/)
  - 决策: global-connection-search-sort-pinyin#D001(使用本地轻量拼音索引扩展现有搜索)

- **[frontend]**: 将快捷指令列表和弹窗改为与服务器状态监控一致的紧凑面板布局，并按深色 NVIDIA / 浅色 Apple 设计文档区分主题配色 — by yinjianm
  - 方案: [202605041950_quick-commands-panel-status-monitor-theme](archive/2026-05/202605041950_quick-commands-panel-status-monitor-theme/)

- **[frontend]**: 将 SSH 终端 `%` 运行中提示从单布尔派生升级为显式 `commandRuntimePhase` 状态机，并为极短命令补上最短可见窗口，避免标签提示一闪而过几乎不可感知 — by yinjianm
  - 方案: [202604210531_ssh-terminal-runtime-state-machine](archive/2026-04/202604210531_ssh-terminal-runtime-state-machine/)

- **[frontend]**: 将 `packages/frontend` 的 Vite 开发代理改为支持通过 `VITE_DEV_PROXY_TARGET`、`VITE_DEV_WS_PROXY_TARGET` 与 `VITE_API_BASE_URL` 切换远端联调目标，并验证 `focus-switcher-sequence`、登录链路与默认白色主题可在本地前端联调时正常工作 — by yinjianm
  - 方案: [202604210440_frontend-dev-api-theme-verification](archive/2026-04/202604210440_frontend-dev-api-theme-verification/)

- **[frontend]**: 为 SSH 顶部服务器标签与服务器内终端标签补充 `%` 命令运行中提示，并基于前端发送链路与 shell prompt 输出派生运行态 — by yinjianm
  - 方案: [202604192106_terminal-running-indicator](archive/2026-04/202604192106_terminal-running-indicator/)
  - 决策: terminal-running-indicator#D001(运行态继续作为前端派生状态实现), terminal-running-indicator#D002(采用发送置位加 prompt 清除的混合检测策略)

- **[frontend]**: 移除状态监控默认 CPU 卡里重复的 `CPU 使用率` 标题，并修正 CPU 摘要区固定高度导致的卡片/按钮截断问题 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/StatusMonitor.vue:61-88,1035-1100,1565-1580

- **[frontend]**: 将状态监控默认 CPU 卡改为“总 CPU 历史图 + 当前/平均/最忙核心紧凑摘要 + 查看全部核心详情弹层”，避免多核机器下侧栏被逐核心条卡撑高 — by yinjianm
  - 方案: [202604190520_status-monitor-cpu-summary-modal](archive/2026-04/202604190520_status-monitor-cpu-summary-modal/)

- **[frontend]**: 移除状态监控 CPU 与网络模块标题区里重复的主标题 `h5`，只保留 eyebrow 标签，减少卡片标题冗余 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/StatusMonitor.vue:61-64,129-132

- **[frontend]**: 移除状态监控底部重复的 CPU / 网络 `chart-panel` 图表区，保留默认概览中的 CPU 与网络卡片，只收掉重复展示 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/StatusMonitor.vue:184-189

- **[frontend]**: 将状态监控中的 CPU 卡片升级为总 CPU `canvas` 历史图 + 每核心实时条卡，并在极窄侧栏下自动切换为单列布局 — by yinjianm
  - 方案: [202604190351_status-monitor-cpu-total-and-per-core](archive/2026-04/202604190351_status-monitor-cpu-total-and-per-core/)

- **[backend]**: 扩展 `StatusMonitorService` 的 `/proc/stat` 采样链路，新增 `cpuCorePercents` 每核心实时占用字段并与总 CPU 百分比一同下发 — by yinjianm
  - 方案: [202604190351_status-monitor-cpu-total-and-per-core](archive/2026-04/202604190351_status-monitor-cpu-total-and-per-core/)

- **[frontend]**: 将状态监控里的网络历史图和网络统计表固定改为上下堆叠，并通过压缩图表 canvas、表格间距与统计项内边距，把整个网络模块限制在 350px 以内 — by yinjianm
  - 方案: [202604190358_status-monitor-network-vertical-stack](archive/2026-04/202604190358_status-monitor-network-vertical-stack/)

- **[frontend]**: 为进程管理详细视图补充可点击表头排序，支持按 `PID / USER / STATE / CPU / MEM / START / COMMAND` 列切换升降序，并拉开关闭按钮与刷新区的安全间距 — by yinjianm
  - 方案: [202604190352_process-manager-table-sort-and-close-spacing](archive/2026-04/202604190352_process-manager-table-sort-and-close-spacing/)

- **[frontend]**: 将状态监控“进程管理”的总数从独立摘要项提升为标题区右侧胶囊，并将默认摘要区收敛为“运行中 / 休眠中”两项，减少默认卡片纵向占用 - by yinjianm
  - 方案: [202604190349_process-total-pill-display](archive/2026-04/202604190349_process-total-pill-display/)

- **[frontend]**: 支持将快捷指令从一个标签组拖到另一个标签组内，允许把未标记命令直接拖入目标标签组，并修正 `manual / name / last_used` 排序按钮状态映射 - by yinjianm
  - 方案: [202604190322_quickcommands-cross-group-drag-move](archive/2026-04/202604190322_quickcommands-cross-group-drag-move/)

- **[frontend]**: 将状态监控中的内存与网络卡片响应式阈值统一收紧到 250px，并把网络卡片的 SVG 趋势线升级为可 hover 查看最近 24 个采样点的 canvas 历史图 — by yinjianm
  - 方案: [202604190319_status-monitor-memory-network-canvas-history](archive/2026-04/202604190319_status-monitor-memory-network-canvas-history/)

- **[frontend]**: 为快捷指令视图新增分组拖拽排序、组内命令拖拽排序与扁平命令列表拖拽排序，并在拖拽完成后自动切换到手动顺序视图以保持刷新后顺序一致 — by yinjianm
  - 方案: [202604190208_quickcommands-drag-reorder](archive/2026-04/202604190208_quickcommands-drag-reorder/)

- **[backend]**: 为快捷指令、快捷指令标签及其关联表补充 `sort_order` 持久化字段，并新增分组重排、全局命令重排和标签内命令重排接口，同时保留既有标签关联顺序 — by yinjianm
  - 方案: [202604190208_quickcommands-drag-reorder](archive/2026-04/202604190208_quickcommands-drag-reorder/)

- **[frontend]**: 将连接管理页 SSH 连接卡片的默认操作区调整为“连接 / 测试 / 更多”，并把重复的测试入口从更多菜单移除，减少常用测试操作的额外点击 — by yinjianm
  - 方案: [202604190210_connection-card-default-test-button](archive/2026-04/202604190210_connection-card-default-test-button/)

- **[frontend]**: 为连接新增/编辑表单以及登录凭证管理弹窗的直填密码输入补充“小眼睛”显隐切换，默认仍隐藏，仅在本地输入端切换明文核对 — by yinjianm
  - 方案: [202604190201_connection-password-visibility-toggle](archive/2026-04/202604190201_connection-password-visibility-toggle/)

- **[workspace-root]**: 为 Docker 镜像发布 workflow 增加按路径检测的动态构建矩阵，仅在共享根文件或对应服务目录变更时构建受影响镜像，手动触发仍保留全量发布能力 - by yinjianm
  - 方案: [202604160350_workflow-service-scoped-docker-builds](archive/2026-04/202604160350_workflow-service-scoped-docker-builds/)

- **[frontend]**: 将右侧服务器状态监控的默认视图从通用卡片栅格重排为更贴近参考图的窄屏监控布局，统一顶部信息条、索引化资源行与内存/网络/磁盘/进程概览的左右分区关系 - by yinjianm
  - 方案: [202604152323_status-monitor-reference-layout-parity](archive/2026-04/202604152323_status-monitor-reference-layout-parity/)
- **[frontend]**: 将右侧状态监控继续收紧为更贴近服务器小屏的默认概览，并新增时区、运行时间、进程概览与“查看全部”独立进程管理弹窗 - by yinjianm
  - 方案: [202604152147_status-monitor-process-manager-modal](archive/2026-04/202604152147_status-monitor-process-manager-modal/)
- **[backend]**: 扩展状态监控采集时区、运行时间和轻量进程摘要，并为当前 SSH 会话新增 `process:list` / `process:signal` WebSocket 进程管理消息 — by yinjianm
  - 方案: [202604152147_status-monitor-process-manager-modal](archive/2026-04/202604152147_status-monitor-process-manager-modal/)

- **[frontend]**: 让全局服务器检索将标签名纳入本地模糊搜索评分，并保持标签匹配权重低于名称和主机、高于类型 - by yinjianm
  - 方案: [202604152139_workspace-global-search-tag-fuzzy-search](archive/2026-04/202604152139_workspace-global-search-tag-fuzzy-search/)

- **[frontend]**: 将工作区状态监控重构为更接近服务器监控小屏的深色响应式面板，统一头部信息条、资源监控条、内存/网络/磁盘卡片及 CPU/网络趋势图风格 — by yinjianm
  - 方案: [202604152109_status-monitor-responsive-remodel](archive/2026-04/202604152109_status-monitor-responsive-remodel/)

- **[frontend]**: 为全局服务器检索结果卡片补充服务器标签显示，便于在 `Ctrl+Shift+F` 快速检索时区分同名或近似主机 - by yinjianm
  - 方案: [202604152110_workspace-global-search-show-connection-tags](archive/2026-04/202604152110_workspace-global-search-show-connection-tags/)

- **[frontend]**: 修复持续日志输出时切换终端后的 viewport 恢复偏移问题，改为按距底部偏移恢复滚动位置，避免重新激活后无法继续向下滚到最底部 — by yinjianm
  - 方案: [202604120705_terminal-scroll-viewport-restore-fix](archive/2026-04/202604120705_terminal-scroll-viewport-restore-fix/)

- 2026-03-25：初始化 `.helloagents/` 知识库骨架与首批模块文档，不代表源码功能变更。
- 2026-03-25：新增 GHCR Docker 发布 workflow，并将 `docker-compose.yml` 的三个业务镜像切换到 `ghcr.io/micah123321/*`。
- 2026-03-25：`/workspace` 默认布局改为“左侧 Workbench + 中央视终端 + 右侧状态监控”，并在状态监控中新增开机累计上下行流量展示。
- 2026-03-25：继续微调 `/workspace` Workbench，新增默认“快捷指令”标签、调整三栏宽度到更接近 xterminal 参考图，并修复终端区域鼠标悬停时指针异常消失的问题。

### 修复
- **[frontend]**: 将快捷命令列表项从单击立即执行改为单击选中、双击执行，并在 hover 时补充完整命令提示，降低误触执行概率 — by yinjianm
  - 方案: [202604120709_quickcommands-double-click-tooltip](archive/2026-04/202604120709_quickcommands-double-click-tooltip/)
- **[frontend]**: 为 SSH 服务器组头补充整组关闭按钮，并修正脚本模式对单/双引号包裹值的保存行为 — by yinjianm
  - 方案: [202604120656_ssh-group-close-and-script-input-sanitize](archive/2026-04/202604120656_ssh-group-close-and-script-input-sanitize/)
- **[frontend]**: 将 `/workspace` Workbench 的导航从左侧竖排 icon rail 调整为 `Workbench` header 上方的横向纯图标栏，保留原有四面板切换逻辑与信息头部层级 — by yinjianm
  - 方案: [202603300206_workspace-workbench-top-tabs](archive/2026-03/202603300206_workspace-workbench-top-tabs/)
- **[frontend]**: 将 `/workspace` 的 SSH 多终端展示从顶部组头胶囊改为“顶部只切服务器、终端面板内部切换同服务器多个终端”，修正服务器与终端的视觉层级 - by yinjianm
  - 方案: [202603292139_terminal-server-internal-tabs](archive/2026-03/202603292139_terminal-server-internal-tabs/)
- **[frontend]**: 修复文件管理器右键菜单的回归关闭竞态，避免“终端 / 上传 / 压缩”子菜单在展开或点击前被捕获阶段监听提前关闭 - by yinjianm
  - 方案: [202603260527_file-manager-context-submenu-regression](archive/2026-03/202603260527_file-manager-context-submenu-regression/)
- **[frontend]**: 修复文件管理器右键子菜单点击无反应、拖拽上传目标不明确，以及目录删除后持续报 `No such file` 的稳定性问题 — by yinjianm
  - 方案: [202603260324_file-manager-delete-upload-stability](archive/2026-03/202603260324_file-manager-delete-upload-stability/)
- **[backend]**: 为 `sftp:rmdir` 增加 `recursive` 分支，让“仅删空目录”和“强制递归删除”分别落到 SFTP 原生删除与 `rm -rf` 链路 — by yinjianm
  - 方案: [202603260324_file-manager-delete-upload-stability](archive/2026-03/202603260324_file-manager-delete-upload-stability/)
- **[frontend]**: 修正新终端会话下文件树只保留当前路径链路的问题，改为先加载 `/` 根树再串行加载当前工作目录，确保 `/` 下同级目录可见 — by yinjianm
  - 方案: [202603260310_file-manager-root-sibling-bootstrap](archive/2026-03/202603260310_file-manager-root-sibling-bootstrap/)
- **[frontend]**: 重排文件区右键菜单结构，补齐终端子菜单、复制文件名和复制绝对路径等动作 — by yinjianm
  - 方案: [202603260228_file-context-menu-terminal-actions](archive/2026-03/202603260228_file-context-menu-terminal-actions/)
- **[frontend]**: 将工作台文件区继续收敛为固定 `/` 根节点的单栏资源管理器树，并在树内同时显示目录与文件 — by yinjianm
  - 方案: [202603260212_workbench-file-root-tree](archive/2026-03/202603260212_workbench-file-root-tree/)
- **[frontend]**: 修正快捷命令右键菜单的透明背景与粘贴项语义，改为实底菜单并将回填动作统一为“粘贴到命令输入框（不发送）” — by yinjianm
  - 方案: [202603260156_quickcommands-context-menu-polish](archive/2026-03/202603260156_quickcommands-context-menu-polish/)
- **[frontend]**: 将工作台文件区从单目录文件表格切换修正为多根目录常驻的文件夹总览视图 — by yinjianm
  - 方案: [202603260150_workbench-file-folder-overview](archive/2026-03/202603260150_workbench-file-folder-overview/)
- **[workspace-root]**: 重新核对工作区状态监控与终端标签剩余改动，确认当前前后端构建通过，并修正知识库归档索引与活跃方案状态 — by yinjianm
  - 方案: [202603252256_workspace-monitor-terminal-polish](archive/2026-03/202603252256_workspace-monitor-terminal-polish/)
- **[frontend]**: 统一 `QuickCommandsView.vue` 的按钮主题适配，移除残留硬编码 hover 色值并切回主题变量体系 — by yinjianm
  - 方案: [202603250532_quickcommands-theme-alignment](archive/2026-03/202603250532_quickcommands-theme-alignment/)
- **[frontend]**: 修复终端标签切换后的视口恢复逻辑，贴底终端重新激活后自动贴底，上翻终端保留历史位置 — by yinjianm
  - 方案: [202603250547_terminal-tab-scroll-restore](archive/2026-03/202603250547_terminal-tab-scroll-restore/)
- **[frontend]**: 修复终端文字效果对 ANSI 彩色输出的覆盖问题，仅让默认前景文字保留描边/阴影效果 — by yinjianm
  - 方案: [202603250614_terminal-ansi-color-effects](archive/2026-03/202603250614_terminal-ansi-color-effects/)

### 快速修改
- **[frontend]**: 修复连接管理页按名称排序时数字片段按文本比较的问题，使日期类名称按自然数值顺序排列 — by hlm123
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/views/ConnectionsView.vue:473-480
- **[frontend]**: 修复关闭当前活动终端后的自动选中规则，改为切换到剩余终端列表中最前的终端，而不是最后的终端 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/stores/session/actions/sessionActions.ts:335-340
- **[frontend]**: 为快捷指令自定义变量卡片补充“添加到指令”按钮，支持把 `${变量名}` 插入右侧指令输入框当前光标位置，并补齐中英日三套界面文案 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/AddEditQuickCommandForm.vue:37-58,430-458,526-566; packages/frontend/src/locales/zh-CN.json:1472-1475; packages/frontend/src/locales/en-US.json:1468-1471; packages/frontend/src/locales/ja-JP.json:840-843
- **[frontend]**: 修正快捷指令编辑弹窗变量管理布局，将自定义变量和动态变量拆成独立滚动区，并统一保存/执行时的变量归集逻辑，避免自定义变量卡片被挤压导致无法填写和保存 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/AddEditQuickCommandForm.vue:14-81,200-209,324-331,373-386,460-546
- **[frontend]**: 修复快捷指令编辑弹窗点击“添加变量”后新增项不可见的问题，新增变量后会刷新变量列表、滚动到新增项并聚焦变量名输入框 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/AddEditQuickCommandForm.vue:18,24,185-186,342-366
- **[frontend]**: 修复快捷指令右键菜单背景透明导致日夜主题下文字不清的问题，按 NVIDIA 设计规范补充菜单专用实体背景、绿色 hover 强调和危险项高对比样式 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/views/QuickCommandsView.vue:1535-1666
- **[frontend]**: 为命令输入框补充上下方向键历史命令导航，支持按 ↑ 回填更早命令、按 ↓ 返回更新命令并恢复未发送草稿 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/CommandInputBar.vue
- **[frontend]**: 修正状态监控网络模块的上下布局分配，让历史图区按内容自适应、统计表区拿剩余空间并在极限高度下内部滚动，避免下半部分被直接裁切 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/StatusMonitor.vue, packages/frontend/src/components/StatusMonitorNetworkHistoryChart.vue
- **[frontend]**: 删除状态监控“进程管理”模块标题下的“默认概览 / 点击查看全部”副标题，只保留眉标与右侧操作区，收紧标题区纵向占用 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/StatusMonitor.vue:222-228
- **[frontend]**: 将 CPU 历史图的 `canvas` 高度继续收紧到 `70px`，并同步缩短上方历史图区块行高，避免外层保留多余留白 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/StatusMonitor.vue, packages/frontend/src/components/StatusMonitorCpuHistoryChart.vue
- **[frontend]**: 将 CPU 历史图卡片从随父容器拉伸改为固定紧凑高度约 `188px`，并同步压缩标题区与 canvas 高度，避免在窄侧栏下被撑到约 `278px` — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/StatusMonitorCpuHistoryChart.vue:185-245
- **[frontend]**: 将状态监控“进程管理”的“运行中 / 休眠中”也收纳进标题区胶囊组，和“总数”一起以内联小显示呈现，不再保留独立摘要行 - by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/StatusMonitor.vue:217-230,571-575,875-880
- **[frontend]**: 将状态监控模块区从默认并排调整回基于常用 300px 右栏比例的单列布局，并用弹性高度把普通卡控制在约 200、进程管理控制在约 400 的视觉比例 - by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/StatusMonitor.vue
- **[frontend]**: 将状态监控模块区从大断点固定分列改为更高密度的 auto-fit 自适应网格，让内存/网络/磁盘在正常宽度下默认并排，只有非常窄时才回落为单列 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/StatusMonitor.vue
- **[frontend]**: 将状态监控顶部的“服务器状态 + 系统信息”从分裂的头部和独立概览块改为单个一体化系统卡，统一容纳 IP、LIVE、系统名、网卡、CPU 核数、CPU 型号、时区和运行时间 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/StatusMonitor.vue
- **[frontend]**: 将状态监控默认视图中的网络模块改为基于真实上下行历史的小曲线 + 速度/累计流量表格，并把磁盘模块压缩成更贴近参考图的设备卡 + 读写速率 + 摘要表结构 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/StatusMonitor.vue
- **[frontend]**: 将状态监控顶部资源条改为仅保留 CPU 占用横条，并把内存右侧统计块压缩为更接近参考图的紧凑小卡布局 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/StatusMonitor.vue
- **[frontend]**: 删除右侧状态监控默认概览中的“挂载”信息条，避免在顶部概览重复展示仅为 `/` 的磁盘挂载值 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/StatusMonitor.vue:550-557
- **[frontend]**: 取消连接管理页在“批量修改”模式下对单行“连接 / 更多”按钮的禁用，保留批量选择同时允许继续操作单台服务器 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/views/ConnectionsView.vue
- **[frontend]**: 修复右侧状态监控在窄侧栏下的内存/磁盘卡片字体重叠问题，改为基于卡片容器宽度自适应折列与缩字 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/StatusMonitor.vue:446-452,572-600,697-707,744-802
- **[frontend]**: 修复右侧状态监控底部 CPU / 网络图表在侧栏收窄后仍保留旧 canvas 宽度的问题，补充容器宽度监听并强制图表随容器重绘收缩 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/StatusCharts.vue:2,34,99-100,439-479,485-560
- **[frontend]**: 将“添加新连接”弹窗的脚本模式开关上移到基本信息之前，并在脚本导入时自动忽略空格、空行与 Markdown 代码围栏行 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/AddConnectionForm.vue, packages/frontend/src/composables/useAddConnectionForm.ts
- **[workspace-root]**: 将双语 README 的仓库、发布与下载链接统一切到 `Micah123321/nexus-terminal`，移除 Ko-fi，并补充源项目指向 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: README.md, doc/README_EN.md
- **[frontend]**: 将前端关于页、版本检查和样式仓库默认链接切换到 `Micah123321/nexus-terminal`，并移除 Ko-fi 入口 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/composables/settings/useVersionCheck.ts, packages/frontend/src/composables/settings/useAboutSection.ts, packages/frontend/src/components/settings/AboutSection.vue, packages/frontend/src/App.vue, packages/frontend/src/components/style-customizer/StyleCustomizerBackgroundTab.vue, package.json
- **[frontend]**: 修正外部拖拽上传的落点路径判定，拖到哪个目录就上传到哪个目录，拖拽目录仍沿用先压缩再上传 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/FileManager.vue, packages/frontend/src/composables/file-manager/useFileManagerDragAndDrop.ts, packages/frontend/src/composables/file-manager/useFolderArchiveUpload.ts, packages/frontend/src/composables/useFileUploader.ts
- **[backend]**: 将后端包版本元数据同步提升到 `1.0.0`，与根工作区和其余主包保持一致 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/backend/package.json, packages/backend/package-lock.json, package-lock.json
- **[frontend]**: 将设置页本地版本显示调整为 `1.0`，并同步前端包版本元数据到 `1.0.0` — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/package.json, package-lock.json, packages/frontend/src/composables/settings/useVersionCheck.ts, packages/frontend/src/composables/settings/useAboutSection.ts
- **[workspace-root]**: 同步更新中英文 README，补充 monorepo 结构、最新功能清单与 `.helloagents/` 开发说明 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: README.md, doc/README_EN.md
- **[frontend]**: 收紧快捷指令编辑弹窗的最小尺寸、初始尺寸和视口上限，并在窄屏下切换为上下布局，降低小分辨率下的弹窗溢出概率 — by yinjianm
  - 类型: 快速修改（无方案包）
  - 文件: packages/frontend/src/components/AddEditQuickCommandForm.vue:9,184-185,242-245

### 新增
- **[frontend]**: 为连接管理页顶部工具条新增“标签管理”弹窗，支持按标签搜索、多选删除，并在删除时选择“仅删标签归入未标记”或“连带删除命中服务器” — by yinjianm
  - 方案: [202604122248_connections-tag-batch-management](archive/2026-04/202604122248_connections-tag-batch-management/)
- **[backend]**: 新增 `/api/v1/tags/bulk-delete` 批量标签删除接口，并用统一事务处理“删标签”与“删标签+删连接”两种策略 — by yinjianm
  - 方案: [202604122248_connections-tag-batch-management](archive/2026-04/202604122248_connections-tag-batch-management/)
- **[frontend]**: 在 `/workspace` 状态监控的 CPU 型号下方新增 CPU 核心数 badge，直接显示后端推送的服务器核数规格 — by yinjianm
  - 方案: [202604120656_server-status-cpu-core-display](archive/2026-04/202604120656_server-status-cpu-core-display/)
- **[backend]**: 扩展 `StatusMonitorService` 的 CPU 规格采集链路，新增 `cpuCores` 字段并通过多级回退命令获取逻辑核心数 — by yinjianm
  - 方案: [202604120656_server-status-cpu-core-display](archive/2026-04/202604120656_server-status-cpu-core-display/)
- **[frontend]**: 为已登录页面新增 `Ctrl+Shift+F` 全局服务器快捷检索面板，支持模糊搜索并直接复用既有 SSH / RDP / VNC 连接链路 — by yinjianm
  - 方案: [202603300204_global-server-quick-search](archive/2026-03/202603300204_global-server-quick-search/)
- **[frontend]**: 为文件管理器补齐“上传文件夹”入口，选择目录后会先在浏览器端打包为 zip，再上传并自动触发远端解压 — by yinjianm
  - 方案: [202603260234_folder-upload-auto-zip](archive/2026-03/202603260234_folder-upload-auto-zip/)
- **[frontend]**: 为工作台文件面板补齐左侧多根目录资源管理器，支持收藏路径与当前路径同屏作为多个根目录展开浏览 — by yinjianm
  - 方案: [202603260041_workbench-file-multi-root-explorer](archive/2026-03/202603260041_workbench-file-multi-root-explorer/)
- **[frontend]**: 为快捷指令编辑弹窗补充动态变量清单与点击插入，并统一列表执行/弹窗执行的动态变量解析链路 — by yinjianm
  - 方案: [202603260042_quickcommands-dynamic-variables](archive/2026-03/202603260042_quickcommands-dynamic-variables/)
- **[frontend]**: 为快捷命令列表补齐图标化右键菜单，支持立即执行、粘贴到终端输入框、复制命令、粘贴到快捷输入框，并保留发送到全部服务器/编辑/删除动作 — by yinjianm
  - 方案: [202603260038_quickcommands-context-menu-actions](archive/2026-03/202603260038_quickcommands-context-menu-actions/)
- **[frontend]**: 为连接管理页新增独立“登录凭证”入口，并在新增连接/批量编辑中支持选择已保存凭证或继续直填账号密码/密钥 — by yinjianm
  - 方案: [202603252354_login-credential-management](plan/202603252354_login-credential-management/)
- **[backend]**: 新增 `login_credentials` 数据模型与 `/api/v1/login-credentials` 接口，并让连接创建、更新和测试支持引用已保存登录凭证 — by yinjianm
  - 方案: [202603252354_login-credential-management](plan/202603252354_login-credential-management/)
- **[frontend]**: 将首页仪表盘升级为统计卡片、趋势/分布图和活跃连接排行组成的管理驾驶舱 — by yinjianm
  - 方案: [202603252343_dashboard-management-cockpit](archive/2026-03/202603252343_dashboard-management-cockpit/)
- **[backend]**: 新增 `/api/v1/dashboard/summary` 聚合接口，统一输出首页所需的连接、审计和 SSH 统计摘要 — by yinjianm
  - 方案: [202603252343_dashboard-management-cockpit](archive/2026-03/202603252343_dashboard-management-cockpit/)
- **[frontend]**: 为首页 dashboard 增加“我的会话 / 系统总览”双视角实时指标面板，展示在线 SSH、挂起会话和状态监控流 — by yinjianm
  - 方案: [202603260043_dashboard-live-session-metrics](archive/2026-03/202603260043_dashboard-live-session-metrics/)
- **[backend]**: 扩展 `/api/v1/dashboard/summary`，组合 `clientStates` 与 `sshSuspendService` 返回当前用户和系统范围的实时会话指标 — by yinjianm
  - 方案: [202603260043_dashboard-live-session-metrics](archive/2026-03/202603260043_dashboard-live-session-metrics/)
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
