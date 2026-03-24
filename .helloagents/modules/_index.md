# 模块索引

> 通过此文件快速定位模块文档

## 模块清单

| 模块 | 职责 | 状态 | 文档 |
|------|------|------|------|
| workspace-root | 管理 monorepo 工作区、共享依赖、补丁与部署编排 | ✅ | [workspace-root.md](./workspace-root.md) |
| frontend | 提供终端工作区、设置页和连接管理等 Web 界面 | ✅ | [frontend.md](./frontend.md) |
| backend | 提供认证、连接管理、SFTP、通知与 WebSocket 服务 | ✅ | [backend.md](./backend.md) |
| remote-gateway | 生成远程桌面令牌并桥接 `guacd` | ✅ | [remote-gateway.md](./remote-gateway.md) |

## 模块依赖关系

```text
workspace-root → frontend
workspace-root → backend
workspace-root → remote-gateway
frontend → backend
frontend → remote-gateway
remote-gateway → guacd
backend → data(volume)
```

## 状态说明
- ✅ 稳定
- 🚧 开发中
- 📝 规划中
