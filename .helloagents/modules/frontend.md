# frontend

## 职责

`packages/frontend` 是 Vue 3 + Vite 的 Web 客户端，负责登录、初始化设置、连接管理、工作区布局、终端与文件编辑、通知与审计视图，以及对后端 REST/WebSocket 和远程桌面网关的前端集成。

## 接口定义（可选）

> 模块对外暴露的公共 API 和数据结构

### 公共 API
| 函数/方法 | 参数 | 返回值 | 说明 |
|----------|------|--------|------|
| `src/main.ts` 启动流程 | 无 | Vue 应用实例 | 启动时先检查 setup/auth 状态，再挂载路由和应用。 |
| `src/router/index.ts` | 路由对象 | Vue Router 实例 | 管理 `/`、`/login`、`/workspace`、`/settings` 等页面与路由守卫。 |
| `useWebSocketConnection()` 等 composable | 业务参数 | 响应式状态/方法 | 处理 SSH 会话、文件管理、设置页等前端交互逻辑。 |

### 数据结构
| 字段 | 类型 | 说明 |
|------|------|------|
| `authStore` | Pinia store | 保存 `isAuthenticated`、`needsSetup` 等认证状态。 |
| `session.store` | Pinia store | 管理工作区标签、终端、SFTP 与弹窗状态。 |
| `connections.store` | Pinia store | 管理连接列表及其与后端的同步。 |

## 行为规范

### 应用启动
**条件**: 浏览器加载前端入口。
**行为**: `main.ts` 先并行拉取 setup 状态与认证状态；若用户已登录，再加载设置和外观数据；最后才注册路由并挂载应用。
**结果**: 路由守卫在挂载前即可拿到最新认证状态，避免错误跳转。

### 路由访问控制
**条件**: 用户访问任一路由。
**行为**: `router.beforeEach` 根据 `needsSetup` 与 `isAuthenticated` 决定是否重定向到 `/setup`、`/login` 或首页。
**结果**: 初始化设置和登录约束由统一路由守卫执行。

### 本地开发联调代理
**条件**: 开发者通过 `packages/frontend` 启动本地 Vite 开发服务器，并在本地环境变量中提供 `VITE_DEV_PROXY_TARGET`、`VITE_DEV_WS_PROXY_TARGET` 或 `VITE_API_BASE_URL`。
**行为**: `vite.config.ts` 会按环境变量为 `/api`、`/uploads` 与 `/ws` 配置开发代理；业务代码继续保留相对路径请求，`appearance.store.ts` 和 `LayoutRenderer.vue` 中需要拼接后端资源地址的逻辑则读取 `VITE_API_BASE_URL`。
**结果**: 前端可以在不改业务接口路径的前提下切换到远端测试后端联调，本地验证时仍可通过移除或修改本地环境变量回退到默认 `localhost:3001`。

### Playwright CLI 联调注意事项
**条件**: 开发者使用 `playwright-cli` 对本地 `packages/frontend` 页面做登录、主题或接口联调验收。
**行为**:
- `snapshot` 生成的 `eXXX` 引用在跳转、登录、登出或 UI 重绘后容易失效；发生页面状态切换后应立即重新抓取快照，不要复用旧引用。
- `snapshot` 命中的 `eXXX` 可能是输入框外层容器而不是可编辑节点；遇到 `fill` 失败时，应改用重新 `snapshot`、语义定位或小粒度 `eval` 校验真实元素。
- `type` 依赖当前焦点，不适合并行输入用户名和密码；表单填充应串行执行，先确认焦点，再输入，避免文本串入错误字段。
- 做登录链路验证前应先显式登出或清理会话状态；否则残留 cookie 会让“登录成功”与“主题是否生效”的结论失真。
- 主题验收不能只看登录页，必须区分登录前与登录后；用户侧外观持久化配置可能覆盖默认主题，需要在干净登录后再次检查页面背景和主容器颜色。
- PowerShell 下 `eval` / `run-code` 的引号与转义容易导致语法错误；复杂表达式应拆成更小的调用，优先读取单个样式值或执行单一步骤。
- `screenshot` 命令的参数位容易被误当成目标选择器；若只想截图当前视口，直接使用无目标参数的截图命令更稳。
- `network` 记录展示的是本地 Vite 地址，不会直接显示被代理的远端域名；联调远端后端时应结合接口返回码、登录结果和页面行为判断代理是否成功。
- 控制台中的 warning / error 可能来自业务前端而非 `playwright-cli` 自身；排障时需区分“自动化控制失败”和“应用自身日志”。
- 视觉验收不要只凭主观观察，最好同时读取 `body`、主容器和卡片的 `backgroundColor` / `color`，形成可复核证据。
**结果**: 本地浏览器联调时可显著降低引用失效、输入串焦点、会话污染和主题误判等问题，提高登录与主题验收的可重复性。

### 工作区交互
**条件**: 用户进入 `/workspace` 或相关管理页面。
**行为**: 通过组件、Pinia 与 composable 协同管理终端、文件管理、命令历史、布局配置、主题和状态监控；当前 `/workspace` 默认主布局为“左侧 Workbench、中央终端、右侧状态监控”，其中 Workbench 继续整合快捷指令、命令历史、文件管理和编辑器四个面板，导航入口保持为纯图标按钮，但已调整为位于 `Workbench` 标题区上方的横向 icon rail，四个入口自左向右排列、默认仅显示图标并通过 tooltip 暴露名称，默认激活快捷指令。`CommandInputBar.vue` 当前已将底部命令框升级为支持会话级草稿保留的多行 `textarea`：普通 `Enter` 插入换行，`Ctrl+Shift+Enter` 发送当前命令，输入框会按内容自动增高至约 6 行，超出后在输入框内部滚动，并继续兼容快捷指令/命令历史同步与选中发送逻辑。围绕这条发送链路，`session` 现已将 SSH 运行态从旧的 `isCommandRunning` 单布尔值升级为显式 `commandRuntimePhase` 阶段模型，并继续保留 `terminalInputBuffer` 作为本地输入缓冲：前端会在发送非空命令时进入 `pending / running` 活动态，在命中常见 shell prompt、`Ctrl+C`、断连或错误时统一退出活动阶段；对于极短命令，还会维持一个很短的最小可见窗口，避免顶部和内部终端标签上的 `%` 运行中提示只闪过一个渲染帧。应用根组件 `App.vue` 现在还新增了全局服务器快捷检索：已登录页面按下 `Ctrl+Shift+F` 会打开 `GlobalConnectionQuickSearch.vue`，通过 `utils/connectionSearch.ts` 对连接名称、主机、用户名、类型和标签做本地模糊检索，并直接复用 `sessionStore.handleConnectRequest()` 触发 SSH 工作区跳转或 RDP / VNC 弹窗连接；该检索弹层顶部提供“最近连接 / 名称”分段排序控件，默认按 `last_connected_at` 最近连接排序，也可切换为连接显示名升序；`utils/pinyinSearch.ts` 会为中文连接名或标签生成轻量拼音全拼与首字母索引，例如“标准型”可通过 `biaoz` 命中；弹层还会复用 `tags.store.ts` 读取标签名称映射，在结果卡片内补充显示每台服务器的标签 chips，便于快速区分同名或近似主机。快捷指令相关能力目前由 `AddEditQuickCommandForm.vue`、`QuickCommandsView.vue` 与新增的 `utils/quickCommandTemplate.ts` 协同实现：编辑弹窗左侧既可维护自定义 `${变量名}`，也提供 `${{date}}`、`${{time}}`、`${{timestamp}}`、`${{week}}`、`${{uuid}}`、`${{random:8}}`、`${{clipboard}}`、`${{password}}` 等动态变量的一键插入；实际执行时会统一走共享解析器，覆盖编辑弹窗执行、列表直接执行、粘贴到命令输入框和发送到全部服务器等链路，并对未定义变量、无法读取的剪贴板或不可用密码给出非阻断告警。`QuickCommandsView.vue` 内的新增按钮、空状态按钮和列表操作按钮统一复用 `bg-button`、`text-button-text`、`hover:bg-button-hover`、`hover:bg-border` 等主题变量类，避免写死黑白 hover 色值；该视图当前还支持命令项右键菜单，并已修正为实底卡片式上下文菜单，提供立即执行、粘贴到命令输入框（不自动发送）、复制命令、发送到全部服务器、编辑和删除等动作。快捷命令列表的鼠标主交互当前已从“单击立即执行”收紧为“单击仅更新选中态、双击才执行”，从而继续兼容键盘 `Enter` 的选中执行路径并降低误触风险；每条命令项同时会把完整 `command` 文本挂到浏览器原生 tooltip 上，便于在名称或命令被截断时直接 hover 核对完整内容。`Terminal.vue` 现在会跟踪 xterm 相对底部的视口偏移与贴底状态，在终端标签切换、重新激活和 `fit()` 后按原滚动意图恢复；当隐藏标签在后台持续追加日志时，重新激活会基于“距底部偏移”而不是过期的绝对行号恢复 viewport，避免用户继续向下滚动时无法回到底部。组件同时继续在渲染层为带 `xterm-fg-*` class 或内联 `style.color` 的显式前景色字符打标记，让终端文字描边/阴影仅作用于默认前景文本，不覆盖 ANSI 彩色输出；`session.store` 当前会为同一 SSH 连接下的新终端分配递增的 `terminalIndex`。当前顶部 `TerminalTabBar.vue` 已改为服务器级入口：SSH 项只负责在不同服务器之间切换，全局 `+` 继续负责选择其他服务器；同一服务器下的多个终端则下沉到 `LayoutRenderer.vue` 的终端面板内部，以次级标签条承载切换、关闭和新增，从而让“进入服务器后再管理该服务器的多个终端”成为主要交互模型。服务器组头现在除主点击切换外，还额外提供了一个 hover 后出现的 `X` 按钮，点击后会复用既有 `session:close` 事件逐个关闭该 `connectionId` 下的全部终端；如果该服务器下任一终端仍在执行命令，组头会显示一个琥珀色 `%` 提示。当前服务器内部终端标签同样会在对应终端运行命令时显示 `%`，从而同时暴露“服务器级有活跃命令”和“具体哪个终端仍在运行”两层信号。当前终端标签右键菜单继续复用 `WorkspaceView.vue` 中转的会话关闭链路，除关闭当前、关闭其他、关闭左右侧外，也支持直接触发“关闭全部”来清空当前工作区中的全部终端标签。连接新增弹窗中的脚本模式则继续由 `useAddConnectionForm.ts` 统一清洗输入：会先剔除空行、Markdown 代码围栏行，再按单引号/双引号感知切分参数，并去掉成对包裹值的外层引号，避免像 `-p '$Moka1998A'` 这样的输入把 `'` 一并保存。`ConnectionsView.vue` 已升级为“左侧范围树 + 顶部搜索工具条 + 右侧结果列表”的双栏管理台，当前左侧进一步支持基于标签名路径分隔符推导的多级标签树、树节点展开状态持久化、分组 scope 恢复，以及树工具栏中的展开全部、收起全部和重置范围控制；近期又补上了独立的左侧树搜索、命中节点及祖先路径过滤、命中链路自动展开、节点计数高亮，以及更接近资源管理器的树头部布局；本轮继续为树节点加入 hover 工具按钮、资源管理器式分隔标题行与拖拽重排占位反馈；右侧结果列表则同时支持顶部排序控件、列头点击排序，并将行内操作整理为“连接”主按钮加“更多”菜单，其中 SSH 连接卡片默认进一步提升为“连接 / 测试 / 更多”三按钮结构，复用既有单连接测试状态，编辑/克隆/删除等次级操作保留在更多菜单中；连接页顶部工具条当前又补上了独立“标签管理”入口，打开 `ManageConnectionTagsModal.vue` 后可按标签名搜索、多选、批量删除标签，并通过显式危险开关决定删除标签时是否连带删除命中的连接；`tags.store.ts` 在该链路里会统一刷新标签与连接缓存，而 `ConnectionsView.vue` 会在当前 scope 指向已删标签或分组时自动回退到 `all`。`FileManager.vue` 当前已进一步收敛为固定 `/` 根节点的单栏资源管理器树，组件加载时会优先拉取 `/` 目录，树中按“目录在前、文件在后”同时显示目录和文件节点，点击目录只展开与聚焦，点击文件则沿用现有工作区文件打开链路；文件右键菜单链路则已补齐图标化菜单结构、危险态删除项、终端子菜单（执行 `cd` 命令到终端 / 新建终端到当前目录）、复制文件名与复制绝对路径等动作，并继续复用现有下载、权限、新建、上传和删除逻辑，同时又新增了独立“上传文件夹”入口：前端会先将本地目录打包为 zip，再复用现有 `sftp:upload` 链路上传，并在上传成功后自动调用远端解压、尝试清理临时压缩包；外部拖拽文件或目录上传时，则会按鼠标当前悬停的目录作为目标路径，其中目录同样走“先压缩再上传”的路径，从而显著降低小文件很多时的扫描与上传耗时；本轮又补上了拖拽上传前的目标路径确认、桌面端右键子菜单点击展开，以及目录删除时“仅删空目录 / 强制递归删除”的显式二选一；当前右键菜单的关闭职责已经收敛到 `FileManagerContextMenu.vue` 组件层处理，`useFileManagerContextMenu.ts` 不再额外注册捕获阶段的全局点击关闭监听，以避免“终端 / 上传 / 压缩”等带子菜单项在展开或点击前被提前关闭；同时 `useSftpActions.ts` 会在删除目录后自动回退当前或待加载的失效路径，避免文件树持续对已删除目录刷出 `No such file`。样式编辑器中的终端文字描边/阴影默认开关也已与新的黑绿终端风格保持默认开启。
**连接状态**: `createWebSocketConnectionManager()` 对非主动断开的 WebSocket 失败统一限制为最多 3 次自动重连，延迟为 10 秒、30 秒、30 秒；`reconnectState` 会暴露当前尝试次数、上限和等待秒数，`WorkspaceView.vue` 会在活动会话处显示连接状态条，让重连中、失败和断开状态对用户可见。
**结果**: 页面逻辑分散在 `views/`、`components/`、`stores/` 与 `composables/`，其中工作区终端行为和标签交互优先落在 `session.store.ts`、`session/actions/sessionActions.ts`、`session/getters.ts`、`TerminalTabBar.vue`、`WorkspaceView.vue`、`Terminal.vue` 与相关 locale 文件。

### 仪表盘总览
**条件**: 用户登录后访问 `/` 首页仪表盘。
**行为**: `DashboardView.vue` 当前会并行拉取连接列表、最近审计日志、标签列表和新的 dashboard summary 数据，并将总览区拆到 `DashboardOverviewPanel.vue`：顶部提供连接总数、近 7 天活跃连接、标签覆盖率、审计日志总量、24 小时 SSH 成功/失败等统计卡片，中部展示近 7 天活动趋势、连接类型分布和事件类型分布图表，下方展示高频连接排行；同时又把实时会话块拆到 `DashboardLiveMetricsPanel.vue`，以“我的会话 / 系统总览”双栏形式显示当前用户在线 SSH 会话数、当前用户挂起会话数、系统总在线 SSH 会话数、系统总挂起会话数和状态监控流数量。`dashboard.store.ts` 负责缓存 `/api/v1/dashboard/summary` 的聚合结果，原有连接列表和最近活动则继续复用 `connections.store.ts` 与 `audit.store.ts`。
**结果**: 首页从“列表首页”升级为“总览 + 实时运行态 + 操作入口”的管理驾驶舱，用户可在同一页面同时判断自己的会话状态和系统整体运行态。

### 登录凭证工作流
**条件**: 用户在连接管理页、新增连接弹窗或批量编辑中需要复用登录配置。
**行为**: 前端新增 `loginCredentials.store.ts`、`LoginCredentialSelector.vue` 和 `LoginCredentialManagementModal.vue`，在 `ConnectionsView.vue` 顶部增加“登录凭证”入口；`AddConnectionFormAuth.vue` 当前把认证区拆成“直填账号密码 / 密钥”和“使用已保存凭证”两种来源，`useAddConnectionForm.ts` 在保存和测试连接时会根据 `credential_source` 自动决定提交 `login_credential_id` 还是直填字段；`AddConnectionFormAuth.vue` 与 `LoginCredentialManagementModal.vue` 现在还会为直填密码输入提供眼睛显隐切换，默认仍保持掩码，仅在本地输入框显示层切换明文，方便用户核对输入内容；`BatchEditConnectionForm.vue` 也补充了批量应用已保存凭证的能力，并限制为同一种连接类型批量使用；`ConnectionsView.vue` 的批量工具条新增 `BatchCredentialShortcutModal.vue` 快捷入口，选中或全选连接后可直接选择同类型已保存凭证并批量写入 `login_credential_id`，也可清空已保存凭证。
**结果**: 用户既可以继续沿用原来的直填方式，也可以把常用账号沉淀成独立凭证并在连接或批量编辑时快速套用，同时在录入密码时可即时核对输入是否正确，而不会改变默认安全策略或后端返回行为。

### 连接脚本模式批量添加
**条件**: 用户在新增连接弹窗启用脚本模式并粘贴多行连接脚本。
**行为**: `useAddConnectionForm.ts` 会先统一解析连接、标签、SSH 密钥和代理依赖；缺失标签按名称去重创建，随后调用 `connections.store.ts#addConnectionsBatch` 以默认 6 路受控并发提交现有 `/api/v1/connections` 创建接口，并在有成功项时只执行一次 `fetchConnections()` 刷新缓存。
**结果**: 大批量脚本新增连接不再被逐条 `addConnection()` + 逐条全量刷新拖慢，同时仍保留每条创建结果统计和首个错误提示。

## 依赖关系

```yaml
依赖: workspace-root, backend, remote-gateway, vue-router, pinia
被依赖: 无
```

### 状态监控卡片
**条件**: 用户在 `/workspace` 右侧状态监控面板查看服务器资源状态。
**行为**: `StatusMonitor.vue` 当前已从通用卡片栅格重排为更接近参考图的窄屏监控结构：顶部改为成对的信息条；默认概览区继续保留 CPU、内存、网络、磁盘和进程管理五块常驻模块，其中 CPU 卡片使用 `StatusMonitorCpuHistoryChart.vue` 展示总 CPU 历史曲线，但默认侧栏不再直接铺开每个核心的实时条卡，而是改为“当前 / 平均 / 最忙核心”的紧凑摘要，并通过新增的 `StatusMonitorCpuCoreModal.vue` 提供“查看核心”入口，在弹层中按当前占用率排序展示全部核心；网络卡片继续使用 `StatusMonitorNetworkHistoryChart.vue` 展示最近网络历史，并保留下方统计表。为避免与默认概览重复，底部独立 `StatusCharts.vue` 图表区不再挂载。内存卡片会在容器宽度大于等于 250px 时维持环形概览与统计块的高密度横向布局，仅在低于 250px 时切为手机式竖排；磁盘模块继续展示设备视觉块与紧凑磁盘摘要；默认视图底部继续保留“进程管理”概览与高占用进程预览，并通过“查看全部”打开 `ProcessManagerModal.vue`。其中进程统计当前已整体收纳到模块标题区右侧的一组 `monitor-module__pill` 胶囊中，统一展示“总数 / 运行中 / 休眠中”，不再额外保留独立摘要行，以减少默认卡片的纵向占用。该 modal 继续采用深色控制台式表格布局，支持搜索 PID / 用户 / 命令、自动刷新、手动刷新，以及对单个进程执行“结束”或“强制结束”操作，并通过当前活动 SSH 会话的 `wsManager` 与后端 `process:list` / `process:signal` 消息交互；当前还支持点击 `PID / USER / STATE / CPU / MEM / START / COMMAND` 表头做本地升降序排序，并为激活列显示方向标记，同时给右上角关闭按钮预留了独立安全区，避免与刷新区过近。
**结果**: 前端状态监控形成了“更贴近参考图的默认小屏监控 + 独立详情弹层/管理页”的双层结构：默认面板保留 CPU 和网络等常驻概览卡，同时移除了底部重复图表区；CPU 在多核机器上也不会再被逐核心条卡撑高，详细核心分布则下沉到专门弹层中；完整进程管理继续独立存在，不挤占侧栏本体；进入进程管理详细视图后，也能更快按字段维度筛查进程。

### 快捷指令拖拽排序
**条件**: 用户在 Workbench 的快捷指令视图中浏览分组或扁平命令列表，且当前未启用搜索过滤。
**行为**: `QuickCommandsView.vue` 现已支持拖动已标记分组、标签组内命令，以及关闭标签展示后的扁平命令列表；拖拽完成后会通过 `quickCommands.store.ts` 与 `quickCommandTags.store.ts` 分别调用 `/api/v1/quick-command-tags/reorder`、`/api/v1/quick-commands/reorder` 和 `/api/v1/quick-commands/reorder-by-tag` 回写顺序。当前在开启标签分组且未搜索时，还允许把命令从一个已标记分组拖到另一个已标记分组内，或把“未标记”命令直接拖入目标标签组；前端会先静默调用 `updateQuickCommand(...)` 调整 `tagIds`，再调用 `/api/v1/quick-commands/reorder-by-tag` 固定目标组落点顺序。列表排序模式同步扩展为 `manual / name / last_used`，其中拖拽结果会自动落回 `manual` 视图承接；当前仍禁止把已标记命令拖入“未标记”分组，避免把“移动分组”误解释为隐式清空标签。
**结果**: 快捷指令分组顺序、组内顺序、跨组归类结果和扁平列表顺序在刷新后保持一致，而搜索过滤态继续保持只读展示，避免局部结果重排污染全量顺序。

### 快捷指令变量编辑
**条件**: 用户在 `AddEditQuickCommandForm.vue` 中新增或维护快捷指令自定义变量。
**行为**: 自定义变量列表由 `localVariables` 响应式数组驱动，并与动态变量清单分成两个独立滚动区域；点击“添加变量”会追加完整变量卡片，并在 DOM 更新后滚动变量列表、聚焦新增变量名输入框，变量名和变量值输入区始终保留最小可见高度。每个自定义变量卡片都提供“添加到指令”按钮，变量名为空时禁用，变量名存在时会把 `${变量名}` 插入右侧指令输入框当前光标位置。保存和执行时统一从 `localVariables` 归集带变量名的条目，提交到快捷指令的 `variables` 字段并参与 `${变量名}` 模板解析。
**结果**: 编辑快捷指令时可以连续添加多个自定义变量，保存后变量配置可随快捷指令持久化，并能从变量卡片直接插入到指令模板中用于后续执行。

### 快捷指令视觉体系
**条件**: 用户在 Workbench 或快捷指令弹窗中浏览、搜索和操作快捷指令。
**行为**: `QuickCommandsView.vue` 当前使用 scoped `qc-*` 样式层呈现快捷指令控制栏、标签组、命令行、操作按钮、空状态和右键菜单，布局密度对齐 `StatusMonitor.vue` 的 `sm-shell` / `sm-section` 监控面板风格；深色主题采用 NVIDIA 黑底、灰阶文本和 `#76b900` 交互强调，浅色主题采用 Apple 浅灰背景、近黑文本和 `#0071e3` 交互强调。`QuickCommandsModal.vue` 也同步改为薄边界、压缩标题和同色内容区域，避免在工作区内形成孤立卡片感。
**结果**: 快捷指令面板与右侧服务器状态监控形成统一的紧凑工具面板视觉，同时保留搜索、排序、紧凑模式、标签编辑、展开、拖拽、复制、编辑、删除、双击执行和右键菜单等既有交互。

