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
**行为**: 通过组件、Pinia 与 composable 协同管理终端、文件管理、命令历史、布局配置、主题和状态监控；当前 `/workspace` 默认主布局为“左侧 Workbench、中央终端、右侧状态监控”，其中 Workbench 以 tab 容器整合快捷指令、命令历史、文件管理和编辑器，默认激活快捷指令。`QuickCommandsView.vue` 内的新增按钮、空状态按钮和列表操作按钮统一复用 `bg-button`、`text-button-text`、`hover:bg-button-hover`、`hover:bg-border` 等主题变量类，避免写死黑白 hover 色值。  
**结果**: 页面逻辑分散在 `views/`、`components/`、`stores/` 与 `composables/`，其中布局与交互微调优先落在 `layout.store.ts`、`LayoutRenderer.vue`、`WorkspaceWorkbench.vue`、`QuickCommandsView.vue` 和 `Terminal.vue`。

## 依赖关系

```yaml
依赖: workspace-root, backend, remote-gateway, vue-router, pinia
被依赖: 无
```
