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
**行为**: 通过组件、Pinia 与 composable 协同管理终端、文件管理、命令历史、布局配置、主题和状态监控；当前 `/workspace` 默认主布局为“左侧 Workbench、中央终端、右侧状态监控”，其中 Workbench 以 tab 容器整合快捷指令、命令历史、文件管理和编辑器，默认激活快捷指令。`QuickCommandsView.vue` 内的新增按钮、空状态按钮和列表操作按钮统一复用 `bg-button`、`text-button-text`、`hover:bg-button-hover`、`hover:bg-border` 等主题变量类，避免写死黑白 hover 色值；`Terminal.vue` 会跟踪 xterm 的视口行号与贴底状态，在终端标签切换、重新激活和 `fit()` 后按原滚动意图恢复，并在渲染层为带 `xterm-fg-*` class 或内联 `style.color` 的显式前景色字符打标记，让终端文字描边/阴影仅作用于默认前景文本，不覆盖 ANSI 彩色输出；`session.store` 当前会为同一 SSH 连接下的新终端分配递增的 `terminalIndex`，`TerminalTabBar.vue` 则进一步把连续同连接会话渲染成“服务器组头 + 终端子标签 + 组尾新增按钮”，全局 `+` 只负责选择其他服务器，从而让“单连接默认 1 个终端、可继续追加多个终端”的关系在顶部标签栏里更接近参考图；`ConnectionsView.vue` 已升级为“左侧范围树 + 顶部搜索工具条 + 右侧结果列表”的双栏管理台，当前左侧进一步支持基于标签名路径分隔符推导的多级标签树、树节点展开状态持久化、分组 scope 恢复，以及树工具栏中的展开全部、收起全部和重置范围控制；近期又补上了独立的左侧树搜索、命中节点及祖先路径过滤、命中链路自动展开、节点计数高亮，以及更接近资源管理器的树头部布局；本轮继续为树节点加入 hover 工具按钮、资源管理器式分隔标题行与拖拽重排占位反馈；右侧结果列表则同时支持顶部排序控件、列头点击排序，并将行内操作整理为“连接”主按钮加“更多”菜单（编辑/测试/克隆/删除）；样式编辑器中的终端文字描边/阴影默认开关也已与新的黑绿终端风格保持默认开启。  
**结果**: 页面逻辑分散在 `views/`、`components/`、`stores/` 与 `composables/`，其中工作区终端行为和标签交互优先落在 `session.store.ts`、`session/actions/sessionActions.ts`、`session/getters.ts`、`TerminalTabBar.vue`、`WorkspaceView.vue`、`Terminal.vue` 与相关 locale 文件。

## 依赖关系

```yaml
依赖: workspace-root, backend, remote-gateway, vue-router, pinia
被依赖: 无
```

### 状态监控卡片
**条件**: 用户在 `/workspace` 右侧状态监控面板查看服务器资源状态。  
**行为**: `StatusMonitor.vue` 当前将内存与磁盘区域升级为卡片化监控视图：内存卡片展示总量、已用、缓存、空闲和环形占比，磁盘卡片展示设备名、文件系统类型、读写速率以及挂载点/大小/可用/已用率表格；CPU、Swap、网络速率和 `StatusCharts.vue` 的 CPU / 网络曲线继续保留。  
**结果**: 状态监控从“简单进度行”升级为“高信息密度卡片”，并直接承接后端新增的内存细分字段与磁盘元数据。
