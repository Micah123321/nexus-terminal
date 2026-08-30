# workspace-root

## 职责

管理仓库根目录的 npm workspaces、共享依赖、`patch-package` 补丁应用、GitHub Actions 发布流程以及 Docker Compose 部署编排。该模块不是业务运行时服务，但决定了三个子包如何安装、构建、发布和协同运行。

## 接口定义（可选）

> 模块对外暴露的公共 API 和数据结构

### 公共 API
| 函数/方法 | 参数 | 返回值 | 说明 |
|----------|------|--------|------|
| `package.json#workspaces` | `packages/*` | npm workspace 列表 | 声明后端、前端、远程网关三个子包属于同一工作区。 |
| `package.json#postinstall` | 无 | shell 命令 | 安装依赖后自动执行 `patch-package`。 |
| `.github/workflows/docker-publish.yml` | GitHub push / workflow_dispatch 事件 | GHCR 镜像 | 在 `main` 推送时按路径检测发布受影响的 `linux/amd64` 业务镜像，手动触发时仍可全量发布。 |
| `docker-compose.yml` | 环境变量、卷、端口映射 | 服务编排 | 统一启动 `frontend`、`backend`、`remote-gateway`、`guacd`。 |

### 数据结构
| 字段 | 类型 | 说明 |
|------|------|------|
| `packages/*` | 目录集合 | Monorepo 子包入口。 |
| `patches/` | 目录 | 第三方依赖补丁存放位置。 |
| `data/` | 运行时卷目录 | Docker 部署时挂载到后端 `/app/data`。 |

## 行为规范

### 依赖安装
**条件**: 在仓库根目录执行 `npm install`。  
**行为**: npm 解析 `workspaces`，统一安装根依赖与子包依赖，并在安装结束后运行 `patch-package`。  
**结果**: 三个子包共享锁文件与依赖树，补丁在安装阶段自动落地。

### 容器化部署
**条件**: 使用根目录 `docker-compose.yml` 启动服务。
**行为**: compose 顶层固定 `name: nexus-terminal`，`frontend` 暴露 `18111:80`，`backend` 读取根 `.env` 并挂载 `./data:/app/data`，`remote-gateway` 依赖 `guacd` 和 `backend`，三个业务镜像默认从 `ghcr.io/micah123321` 拉取。部署更新前应先执行 `docker compose config --services` 与 `docker compose config --images`，确认服务为 `frontend/backend/remote-gateway/guacd` 且镜像为 `nexus-terminal-*` 后再 `pull` 和 `up -d`。
**结果**: Web 入口、REST API、远程桌面网关与 `guacd` 形成完整运行拓扑，并降低在错误目录或其他项目 compose 下误操作容器的风险。

### 镜像自动发布
**条件**: 向 `main` 分支推送代码，或在 GitHub Actions 手动触发 workflow。  
**行为**: `.github/workflows/docker-publish.yml` 当前会先运行 `detect-changes` 作业：对 `package.json`、`package-lock.json`、`docker-compose.yml`、`patches/**` 和 workflow 自身视为共享根文件，对 `packages/frontend/**`、`packages/backend/**`、`packages/remote-gateway/**` 分别视为服务级改动；若是手动 `workflow_dispatch` 则直接将三个服务都标记为受影响。随后发布作业按检测结果生成动态矩阵，仅对受影响服务使用各自 Dockerfile 构建 `linux/amd64` 镜像，并向 GHCR 发布 `latest` 与 `sha-<commit>` 标签。  
**结果**: 镜像发布链路与 compose 使用的镜像来源保持一致，同时避免无关改动触发三个服务的完整构建。

## 依赖关系

```yaml
依赖: frontend, backend, remote-gateway, docker-compose, .env
被依赖: frontend, backend, remote-gateway
```
