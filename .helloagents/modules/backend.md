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

### SQLite 串行事务
**条件**: 任意可能并发到达的写事务请求，例如脚本模式批量创建连接、批量标签操作、导入和快捷指令重排。
**行为**: `database/transaction.ts` 提供 `runSerializedTransaction(work)`，在进程内通过 Promise 链互斥执行 `BEGIN → work(db) → COMMIT`，事务失败时尽力 `ROLLBACK` 后重新抛出原始错误；连接、标签、导入、快捷指令及其标签关联等所有原生前事务点均已迁移到该助手，事务体内不再使用 `Promise.all` 并发写。
**结果**: 同一 SQLite 连接上的事务不再交错执行，`cannot commit - no transaction is active`、`cannot start a transaction within a transaction` 一类并发错误被消除。新增业务事务必须复用该助手，禁止手写 `BEGIN/COMMIT`。

### 标签批量删除
**条件**: 前端连接管理页对一个或多个标签执行批量删除，并指定是否同时删除标签命中的连接。  
**行为**: `packages/backend/src/tags/` 当前新增 `POST /api/v1/tags/bulk-delete`；控制器校验 `tag_ids` 与 `delete_connections` 后，将请求交给 `tag.service.ts` 与 `tag.repository.ts`。仓库层会在单个事务内先汇总命中的唯一连接集合，再按策略执行“仅删标签”或“先删连接、再删标签”，同时返回删除标签数、受影响连接数和实际删除连接数摘要；原有单标签删除也已复用同一底层批量删除事务。  
**结果**: 标签删除语义在后端被统一收口，前端可以安全支持“删除标签但保留服务器归入未标记”和“删除标签同时删除服务器”两种操作，而不会留下中间态关联数据。

### 外观默认值
**条件**: 数据库初始化、外观设置重置或前后端默认主题定义调整。  
**行为**: `appearance.repository.ts` 负责写入默认 UI 外观设置，`config/default-themes.ts` 保持与前端同名默认主题定义一致，作为默认外观与终端主题的镜像基线；当前默认外观中终端文字描边和阴影开关默认开启，但仅作为“无保存值时”的回退，不主动覆盖数据库里已有用户配置。  
**结果**: 前后端在默认主题、终端文字效果开关和回退值上保持一致，避免前端回退与后端初始化出现风格漂移。

### 状态监控
**条件**: 前端工作区通过 WebSocket 订阅服务器状态。  
**行为**: `StatusMonitorService` 通过 SSH 读取 `free`、`df`、`/proc/stat`、`/proc/net/dev`、`date` 与 `/proc/uptime`，同时计算瞬时网速与默认网卡自开机以来的累计上下行字节数，并在常规 `status_update` 中附带服务器时区、运行秒数和轻量级进程摘要（总数、运行中、休眠中、Top 进程预览）；其中 CPU 采样当前会同时解析 `/proc/stat` 中的总 `cpu` 行与各 `cpuN` 行，为总 CPU 与每核心分别计算差值百分比，并把 `cpuCorePercents` 一并下发。  
**结果**: 前端状态监控既能展示实时资源状态，也能直接展示服务器时区、运行时间、默认进程概览以及每核心 CPU 实时占用，而无需再为这些基础信息单独请求后端。

## 依赖关系

```yaml
依赖: workspace-root, sqlite(data), express-session, ssh2, ws
被依赖: frontend
```

### 状态监控字段扩展
**条件**: `StatusMonitorService` 为前端工作区持续轮询服务器状态。  
**行为**: 当前状态采集链路除 `free`、`df`、`/proc/stat` 与 `/proc/net/dev` 外，还会补充解析 `memFree`、`memCached`、`diskAvailable`、`diskMountPoint`、`diskFsType`、`diskDevice`，并基于 `/proc/diskstats` 计算根设备的磁盘读写速率；CPU 规格信息则会先读取 CPU 型号，再通过 `nproc`、`getconf _NPROCESSORS_ONLN`、`grep -c '^processor' /proc/cpuinfo` 与 `lscpu` 多级回退获取 `cpuCores`；CPU 使用率则基于 `/proc/stat` 的总快照和各 `cpuN` 快照做会话级差值计算，空闲时间按 `idle + iowait` 处理，并新增 `cpuCorePercents` 字段供前端展示每核心实时占用；本轮还新增服务器时区、运行时间和默认进程摘要采集。与此同时，`websocket/connection.ts` 新增 `process:list` 与 `process:signal` 消息分发，后端会在当前活动 SSH 会话上下文中执行 `ps` 与 `kill` 指令，返回完整进程列表及结束/强制结束结果。  
**结果**: 前端默认状态监控可以展示更完整的小屏监控信息，包括总 CPU 历史趋势所依赖的总占用与每核心实时条卡所需的数据，而“查看全部”进程管理 modal 也能沿同一 SSH 会话上下文安全复用进程查询与操作能力。

### 快捷指令顺序持久化
**条件**: 前端快捷指令视图提交分组拖拽、标签内命令拖拽或扁平列表命令拖拽结果。  
**行为**: packages/backend/src/database/schema.ts 与 migrations.ts 现在为 quick_commands、quick_command_tags 与 quick_command_tag_associations 三张表补齐 sort_order 字段；quick-commands 业务域新增 /api/v1/quick-commands/reorder 与 /api/v1/quick-commands/reorder-by-tag，quick-command-tags 业务域新增 /api/v1/quick-command-tags/reorder。同时标签关联写入从“先删后插”调整为增量同步，保留命令已存在标签关联的原组内顺序，仅为新增关联追加新的末尾顺序。  
**结果**: 后端可以稳定表达“标签顺序”“命令全局顺序”和“命令在某个标签组内的局部顺序”三层语义，并保证历史数据库升级后也能直接承接前端拖拽排序能力；这也让前端可以通过“先更新 `tagIds`、再提交目标标签内重排”复用既有接口实现跨分组移动，而无需新增专用后端路由。  
