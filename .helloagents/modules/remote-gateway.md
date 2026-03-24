# remote-gateway

## 职责

`packages/remote-gateway` 是独立的远程桌面网关服务，负责验证 RDP/VNC 连接参数、生成加密 token，并通过 `guacamole-lite` 与 `guacd` 协同提供远程桌面 WebSocket 能力。

## 接口定义（可选）

> 模块对外暴露的公共 API 和数据结构

### 公共 API
| 函数/方法 | 参数 | 返回值 | 说明 |
|----------|------|--------|------|
| `POST /api/remote-desktop/token` | `protocol`, `connectionConfig` | `{ token }` | 校验参数后生成加密远程桌面 token。 |
| `GuacamoleLite(websocketOptions, guacdOptions, clientOptions)` | 端口、guacd 配置、加密配置 | GuacamoleLite 实例 | 启动远程桌面 WebSocket 网关。 |
| `gracefulShutdown(signal)` | 进程信号 | 无 | 关闭 HTTP API 与 Guacamole 服务器。 |

### 数据结构
| 字段 | 类型 | 说明 |
|------|------|------|
| `REMOTE_GATEWAY_API_PORT` | `string \| number` | HTTP API 监听端口，默认 `9090`。 |
| `REMOTE_GATEWAY_WS_PORT` | `string \| number` | Guacamole WebSocket 监听端口，默认 `8080`。 |
| `connectionConfig` | JSON 对象 | 包含 `hostname`、`port`、`username`、`password`、分辨率等桌面连接参数。 |

## 行为规范

### 网关启动
**条件**: 启动 `remote-gateway` 进程。  
**行为**: 进程启动时生成仅驻留内存的 AES 密钥，构造允许来源列表，并初始化 `GuacamoleLite` 与 API 服务器。  
**结果**: 每次进程重启都会使用新的内存密钥，旧 token 不应跨进程复用。

### Token 生成
**条件**: 客户端请求 `/api/remote-desktop/token`。  
**行为**: 仅接受 `rdp` 或 `vnc`，按协议要求校验 `hostname`、`port`、账号口令等字段，再将连接配置加密为 base64 token。  
**结果**: 前端拿到可交给远程桌面 WebSocket 使用的短期 token。

### 优雅退出
**条件**: 收到 `SIGINT`、`SIGTERM` 或 `SIGUSR2`。  
**行为**: 先关闭 API server，再尝试关闭 Guacamole server，10 秒后仍未完成则强制退出。  
**结果**: 开发环境重启和生产环境停机时尽量减少悬挂连接。

## 依赖关系

```yaml
依赖: workspace-root, guacd, guacamole-lite, cors
被依赖: frontend
```
