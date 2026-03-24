# Nexus Terminal 知识库

> 本文件是知识库的入口点

## 快速导航

| 需要了解 | 读取文件 |
|---------|---------|
| 项目概况、技术栈、开发约定 | [context.md](context.md) |
| 模块索引 | [modules/_index.md](modules/_index.md) |
| 根工作区与部署编排 | [modules/workspace-root.md](modules/workspace-root.md) |
| Web 前端 | [modules/frontend.md](modules/frontend.md) |
| Node.js 后端 | [modules/backend.md](modules/backend.md) |
| 远程桌面网关 | [modules/remote-gateway.md](modules/remote-gateway.md) |
| 项目变更历史 | [CHANGELOG.md](CHANGELOG.md) |
| 历史方案索引 | [archive/_index.md](archive/_index.md) |
| 当前待执行的方案 | [plan/](plan/) |

## 模块关键词索引

> AI 读取此表即可判断哪些模块与当前需求相关，按需深读。

| 模块 | 关键词 | 摘要 |
|------|--------|------|
| workspace-root | npm workspaces, docker-compose, patch-package, 部署编排 | Monorepo 根目录，负责依赖管理、镜像编排和共享配置。 |
| frontend | Vue 3, Vite, Pinia, xterm, Monaco, PWA | 提供 Web 终端工作区、设置页和连接管理等交互界面。 |
| backend | Express, WebSocket, SQLite, SSH, SFTP, 认证 | 提供 `/api/v1/*` REST 接口、WebSocket 会话和数据持久化。 |
| remote-gateway | Guacamole, RDP, VNC, token, guacd | 为远程桌面连接生成加密令牌并桥接到 `guacd`。 |

## 知识库状态

```yaml
kb_version: 2.3.7
最后更新: 2026-03-25 06:06
模块数量: 4
待执行方案: 0
```

## 读取指引

```yaml
启动任务:
  1. 读取本文件获取导航
  2. 读取 context.md 获取项目上下文
  3. 检查 plan/ 是否有进行中方案包

任务相关:
  - 涉及依赖、构建、部署: 读取 modules/workspace-root.md
  - 涉及页面、路由、Pinia 状态: 读取 modules/frontend.md
  - 涉及 API、认证、数据库、WebSocket: 读取 modules/backend.md
  - 涉及 RDP/VNC、guacd、远程桌面 token: 读取 modules/remote-gateway.md
  - 需要历史决策: 搜索 CHANGELOG.md → 读取对应 archive/{YYYY-MM}/{方案包}/proposal.md
  - 继续之前任务: 读取 plan/{方案包}/*
```
