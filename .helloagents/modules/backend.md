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

### SFTP 目录删除
**条件**: 前端文件管理器请求删除目录。  
**行为**: `websocket/handlers/sftp.handler.ts` 当前允许 `sftp:rmdir` 接收可选 `payload.recursive`；`sftp.service.ts` 在 `recursive=false` 时走原生 `sftp.rmdir` 仅删除空目录，在 `recursive=true` 时继续沿用现有 `rm -rf` / `sudo rm -rf` 链路。  
**结果**: 前端可以把“仅删空目录”和“强制递归删除”明确区分为两类后端行为，而不是所有目录删除都默认递归。  

### 仪表盘聚合接口
**条件**: 前端首页需要一次性获取可视化仪表盘统计。  
**行为**: 后端新增 `packages/backend/src/dashboard/` 业务域，当前通过 `GET /api/v1/dashboard/summary` 统一组合两类数据源：数据库侧继续聚合 SQLite 中的 `connections`、`connection_tags` 和 `audit_logs`，输出连接总量、近 7 天活跃连接数、标签覆盖连接数、24 小时 SSH 成功/失败计数、近 7 天活动趋势、连接类型分布、事件类型分布以及活跃连接排行；运行态侧则由 `dashboard.service.ts` 组合 `clientStates` 与 `sshSuspendService`，补充当前登录用户与系统范围的在线 SSH 会话数、挂起会话数和活跃状态监控流数量。其中高频连接排行会安全解析审计日志 `details` 中的 `connectionId/connectionName`，解析失败的单条日志会被忽略而不阻断整体 summary。  
**结果**: 仪表盘统计口径集中在后端统一维护，首页既能看到稳定统计，也能看到当前用户与系统总览的实时会话指标，而无需前端额外拼接第二条接口链路。

### 登录凭证管理
**条件**: 用户需要把 SSH / RDP / VNC 的账号信息独立管理并复用于多台连接。  
**行为**: 后端新增 `packages/backend/src/login-credentials/` 业务域和 `login_credentials` 表，通过 `/api/v1/login-credentials` 提供登录凭证列表、创建、编辑、删除和详情读取接口；`connections` 表新增 `login_credential_id` 外键，连接创建、更新和未保存测试时都可以引用已保存凭证；运行时凭证解析则优先读取 `login_credentials` 的用户名、认证方式和加密凭证，再回退到连接自身保存的直填字段，因此编辑登录凭证后，引用它的连接在测试和实际连接时会自动使用新配置。  
**结果**: 连接管理支持“直填凭证”和“引用已保存凭证”双轨并存，旧连接保持兼容，后续如需扩展凭证审计、共享或筛选能力，也有了独立数据模型承接。

### 外观默认值
**条件**: 数据库初始化、外观设置重置或前后端默认主题定义调整。  
**行为**: `appearance.repository.ts` 负责写入默认 UI 外观设置，`config/default-themes.ts` 保持与前端同名默认主题定义一致，作为默认外观与终端主题的镜像基线；当前默认外观中终端文字描边和阴影开关默认开启，但仅作为“无保存值时”的回退，不主动覆盖数据库里已有用户配置。  
**结果**: 前后端在默认主题、终端文字效果开关和回退值上保持一致，避免前端回退与后端初始化出现风格漂移。

### 状态监控
**条件**: 前端工作区通过 WebSocket 订阅服务器状态。  
**行为**: `StatusMonitorService` 通过 SSH 读取 `free`、`df`、`/proc/stat` 与 `/proc/net/dev`，同时计算瞬时网速与默认网卡自开机以来的累计上下行字节数。  
**结果**: 前端状态监控既能展示实时速率，也能展示“开机累计流量”，后续扩展监控字段时应优先复用现有 SSH 采集链路。

## 依赖关系

```yaml
依赖: workspace-root, sqlite(data), express-session, ssh2, ws
被依赖: frontend
```

### 状态监控字段扩展
**条件**: `StatusMonitorService` 为前端工作区持续轮询服务器状态。  
**行为**: 当前状态采集链路除 `free`、`df`、`/proc/stat` 与 `/proc/net/dev` 外，还会补充解析 `memFree`、`memCached`、`diskAvailable`、`diskMountPoint`、`diskFsType`、`diskDevice`，并基于 `/proc/diskstats` 计算根设备的磁盘读写速率；设备名会尽量从分区名规整到块设备名，无法获取的字段则按 `undefined` 降级。  
**结果**: 前端状态监控可以直接展示参考图风格的内存/磁盘卡片，而不需要再自行推导缓存、空闲和磁盘元信息。
