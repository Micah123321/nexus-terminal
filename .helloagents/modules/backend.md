# backend

## 职责

`packages/backend` 是主后端服务，基于 Express 5、SQLite 和 WebSocket 提供认证、连接管理、SFTP、SSH 挂起、通知、审计、快速命令、主题与外观设置等能力，并负责初始化数据库和共享会话。

## 接口定义（可选）

> 模块对外暴露的公共 API 和数据结构

### 公共 API
| 函数/方法 | 参数 | 返回值 | 说明 |
|----------|------|--------|------|
| `GET /api/v1/status` | 无 | `{ status: string }` | 后端健康检查接口。 |
| `/api/v1/auth` 等 REST 路由组 | HTTP 请求体与路径参数 | JSON | 提供认证、连接、SFTP、设置、通知、审计等业务接口。 |
| `initializeWebSocket(server, sessionMiddleware)` | HTTP server, session middleware | WebSocket 服务实例 | 在现有 HTTP 服务上挂接 SSH/SFTP/RDP/Docker 等实时会话。 |

### 数据结构
| 字段 | 类型 | 说明 |
|------|------|------|
| `session.userId` | `number` | 登录用户 ID，存入 `express-session`。 |
| `session.username` | `string` | 当前登录用户名。 |
| `data/.env` / 根 `.env` | 环境变量文件 | 保存部署模式、加密密钥、会话密钥等运行配置。 |

## 行为规范

### 启动初始化
**条件**: 执行 `packages/backend` 的 `dev`、`build && start` 或容器启动流程。  
**行为**: 先读取根 `.env` 与 `data/.env`，缺失 `ENCRYPTION_KEY` 或 `SESSION_SECRET` 时自动生成并尝试写回，再初始化数据库。  
**结果**: 环境变量、数据库和会话存储准备完成后才开始监听 HTTP/WebSocket 服务。

### 路由与会话
**条件**: 应用启动完成并收到前端请求。  
**行为**: 所有业务接口挂载在 `/api/v1/*` 下，`express-session` 通过文件存储共享登录状态，WebSocket 初始化时复用同一会话中间件。  
**结果**: REST 与实时会话使用一致的认证上下文。

### 业务分层
**条件**: 维护业务域代码。  
**行为**: 按 `controller/service/repository/routes` 的分层模式组织连接、通知、设置、快速命令、主题等功能。  
**结果**: 新增后端能力时应优先延续现有业务域目录结构，而不是在入口文件堆叠逻辑。

### 状态监控
**条件**: 前端工作区通过 WebSocket 订阅服务器状态。  
**行为**: `StatusMonitorService` 通过 SSH 读取 `free`、`df`、`/proc/stat` 与 `/proc/net/dev`，同时计算瞬时网速与默认网卡自开机以来的累计上下行字节数。  
**结果**: 前端状态监控既能展示实时速率，也能展示“开机累计流量”，后续扩展监控字段时应优先复用现有 SSH 采集链路。

## 依赖关系

```yaml
依赖: workspace-root, sqlite(data), express-session, ssh2, ws
被依赖: frontend
```
