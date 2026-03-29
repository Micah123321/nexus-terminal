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

### 工作区交互
**条件**: 用户进入 `/workspace` 或相关管理页面。  
**行为**: 通过组件、Pinia 与 composable 协同管理终端、文件管理、命令历史、布局配置、主题和状态监控；当前 `/workspace` 默认主布局为“左侧 Workbench、中央终端、右侧状态监控”，其中 Workbench 继续整合快捷指令、命令历史、文件管理和编辑器四个面板，导航入口保持为纯图标按钮，但已调整为位于 `Workbench` 标题区上方的横向 icon rail，四个入口自左向右排列、默认仅显示图标并通过 tooltip 暴露名称，默认激活快捷指令。`CommandInputBar.vue` 当前已将底部命令框升级为支持会话级草稿保留的多行 `textarea`：普通 `Enter` 插入换行，`Ctrl+Shift+Enter` 发送当前命令，输入框会按内容自动增高至约 6 行，超出后在输入框内部滚动，并继续兼容快捷指令/命令历史同步与选中发送逻辑。应用根组件 `App.vue` 现在还新增了全局服务器快捷检索：已登录页面按下 `Ctrl+Shift+F` 会打开 `GlobalConnectionQuickSearch.vue`，通过 `utils/connectionSearch.ts` 对连接名称、主机、用户名和类型做本地模糊排序，并直接复用 `sessionStore.handleConnectRequest()` 触发 SSH 工作区跳转或 RDP / VNC 弹窗连接。快捷指令相关能力目前由 `AddEditQuickCommandForm.vue`、`QuickCommandsView.vue` 与新增的 `utils/quickCommandTemplate.ts` 协同实现：编辑弹窗左侧既可维护自定义 `${变量名}`，也提供 `${{date}}`、`${{time}}`、`${{timestamp}}`、`${{week}}`、`${{uuid}}`、`${{random:8}}`、`${{clipboard}}`、`${{password}}` 等动态变量的一键插入；实际执行时会统一走共享解析器，覆盖编辑弹窗执行、列表直接执行、粘贴到命令输入框和发送到全部服务器等链路，并对未定义变量、无法读取的剪贴板或不可用密码给出非阻断告警。`QuickCommandsView.vue` 内的新增按钮、空状态按钮和列表操作按钮统一复用 `bg-button`、`text-button-text`、`hover:bg-button-hover`、`hover:bg-border` 等主题变量类，避免写死黑白 hover 色值；该视图当前还支持命令项右键菜单，并已修正为实底卡片式上下文菜单，提供立即执行、粘贴到命令输入框（不自动发送）、复制命令、发送到全部服务器、编辑和删除等动作。`Terminal.vue` 会跟踪 xterm 的视口行号与贴底状态，在终端标签切换、重新激活和 `fit()` 后按原滚动意图恢复，并在渲染层为带 `xterm-fg-*` class 或内联 `style.color` 的显式前景色字符打标记，让终端文字描边/阴影仅作用于默认前景文本，不覆盖 ANSI 彩色输出；`session.store` 当前会为同一 SSH 连接下的新终端分配递增的 `terminalIndex`。当前顶部 `TerminalTabBar.vue` 已改为服务器级入口：SSH 项只负责在不同服务器之间切换，全局 `+` 继续负责选择其他服务器；同一服务器下的多个终端则下沉到 `LayoutRenderer.vue` 的终端面板内部，以次级标签条承载切换、关闭和新增，从而让“进入服务器后再管理该服务器的多个终端”成为主要交互模型。当前终端标签右键菜单继续复用 `WorkspaceView.vue` 中转的会话关闭链路，除关闭当前、关闭其他、关闭左右侧外，也支持直接触发“关闭全部”来清空当前工作区中的全部终端标签。`ConnectionsView.vue` 已升级为“左侧范围树 + 顶部搜索工具条 + 右侧结果列表”的双栏管理台，当前左侧进一步支持基于标签名路径分隔符推导的多级标签树、树节点展开状态持久化、分组 scope 恢复，以及树工具栏中的展开全部、收起全部和重置范围控制；近期又补上了独立的左侧树搜索、命中节点及祖先路径过滤、命中链路自动展开、节点计数高亮，以及更接近资源管理器的树头部布局；本轮继续为树节点加入 hover 工具按钮、资源管理器式分隔标题行与拖拽重排占位反馈；右侧结果列表则同时支持顶部排序控件、列头点击排序，并将行内操作整理为“连接”主按钮加“更多”菜单（编辑/测试/克隆/删除）；`FileManager.vue` 当前已进一步收敛为固定 `/` 根节点的单栏资源管理器树，组件加载时会优先拉取 `/` 目录，树中按“目录在前、文件在后”同时显示目录和文件节点，点击目录只展开与聚焦，点击文件则沿用现有工作区文件打开链路；文件右键菜单链路则已补齐图标化菜单结构、危险态删除项、终端子菜单（执行 `cd` 命令到终端 / 新建终端到当前目录）、复制文件名与复制绝对路径等动作，并继续复用现有下载、权限、新建、上传和删除逻辑，同时又新增了独立“上传文件夹”入口：前端会先将本地目录打包为 zip，再复用现有 `sftp:upload` 链路上传，并在上传成功后自动调用远端解压、尝试清理临时压缩包；外部拖拽文件或目录上传时，则会按鼠标当前悬停的目录作为目标路径，其中目录同样走“先压缩再上传”的路径，从而显著降低小文件很多时的扫描与上传耗时；本轮又补上了拖拽上传前的目标路径确认、桌面端右键子菜单点击展开，以及目录删除时“仅删空目录 / 强制递归删除”的显式二选一；当前右键菜单的关闭职责已经收敛到 `FileManagerContextMenu.vue` 组件层处理，`useFileManagerContextMenu.ts` 不再额外注册捕获阶段的全局点击关闭监听，以避免“终端 / 上传 / 压缩”等带子菜单项在展开或点击前被提前关闭；同时 `useSftpActions.ts` 会在删除目录后自动回退当前或待加载的失效路径，避免文件树持续对已删除目录刷出 `No such file`。样式编辑器中的终端文字描边/阴影默认开关也已与新的黑绿终端风格保持默认开启。  
**结果**: 页面逻辑分散在 `views/`、`components/`、`stores/` 与 `composables/`，其中工作区终端行为和标签交互优先落在 `session.store.ts`、`session/actions/sessionActions.ts`、`session/getters.ts`、`TerminalTabBar.vue`、`WorkspaceView.vue`、`Terminal.vue` 与相关 locale 文件。

### 仪表盘总览
**条件**: 用户登录后访问 `/` 首页仪表盘。  
**行为**: `DashboardView.vue` 当前会并行拉取连接列表、最近审计日志、标签列表和新的 dashboard summary 数据，并将总览区拆到 `DashboardOverviewPanel.vue`：顶部提供连接总数、近 7 天活跃连接、标签覆盖率、审计日志总量、24 小时 SSH 成功/失败等统计卡片，中部展示近 7 天活动趋势、连接类型分布和事件类型分布图表，下方展示高频连接排行；同时又把实时会话块拆到 `DashboardLiveMetricsPanel.vue`，以“我的会话 / 系统总览”双栏形式显示当前用户在线 SSH 会话数、当前用户挂起会话数、系统总在线 SSH 会话数、系统总挂起会话数和状态监控流数量。`dashboard.store.ts` 负责缓存 `/api/v1/dashboard/summary` 的聚合结果，原有连接列表和最近活动则继续复用 `connections.store.ts` 与 `audit.store.ts`。  
**结果**: 首页从“列表首页”升级为“总览 + 实时运行态 + 操作入口”的管理驾驶舱，用户可在同一页面同时判断自己的会话状态和系统整体运行态。

### 登录凭证工作流
**条件**: 用户在连接管理页、新增连接弹窗或批量编辑中需要复用登录配置。  
**行为**: 前端新增 `loginCredentials.store.ts`、`LoginCredentialSelector.vue` 和 `LoginCredentialManagementModal.vue`，在 `ConnectionsView.vue` 顶部增加“登录凭证”入口；`AddConnectionFormAuth.vue` 当前把认证区拆成“直填账号密码 / 密钥”和“使用已保存凭证”两种来源，`useAddConnectionForm.ts` 在保存和测试连接时会根据 `credential_source` 自动决定提交 `login_credential_id` 还是直填字段；`BatchEditConnectionForm.vue` 也补充了批量应用已保存凭证的能力，并限制为同一种连接类型批量使用。  
**结果**: 用户既可以继续沿用原来的直填方式，也可以把常用账号沉淀成独立凭证并在连接或批量编辑时快速套用，连接管理台的凭证入口和表单行为保持一致。

## 依赖关系

```yaml
依赖: workspace-root, backend, remote-gateway, vue-router, pinia
被依赖: 无
```

### 状态监控卡片
**条件**: 用户在 `/workspace` 右侧状态监控面板查看服务器资源状态。  
**行为**: `StatusMonitor.vue` 当前将内存与磁盘区域升级为卡片化监控视图：内存卡片展示总量、已用、缓存、空闲和环形占比，磁盘卡片展示设备名、文件系统类型、读写速率以及挂载点/大小/可用/已用率表格；CPU、Swap、网络速率和 `StatusCharts.vue` 的 CPU / 网络曲线继续保留。  
**结果**: 状态监控从“简单进度行”升级为“高信息密度卡片”，并直接承接后端新增的内存细分字段与磁盘元数据。

