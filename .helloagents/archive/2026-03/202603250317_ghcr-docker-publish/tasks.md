# 任务清单: ghcr-docker-publish

```yaml
@feature: ghcr-docker-publish
@created: 2026-03-25
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 4 | 0 | 0 | 4 |

---

## 任务列表

### 1. 发布工作流

- [√] 1.1 在 `.github/workflows/docker-publish.yml` 中新增 main push 触发的 GHCR 发布 workflow | depends_on: []
- [√] 1.2 为 workflow 配置 `frontend`、`backend`、`remote-gateway` 三个镜像的 `linux/amd64` 构建与 `latest`/`sha-<commit>` 标签 | depends_on: [1.1]

### 2. 部署编排

- [√] 2.1 在 `docker-compose.yml` 中把三个业务镜像切换到 `ghcr.io/micah123321/nexus-terminal-{frontend,backend,remote-gateway}:latest` | depends_on: [1.2]

### 3. 验证与知识库同步

- [√] 3.1 检查 workflow 与 compose 语法/内容一致性，并记录已知限制 | depends_on: [2.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-25 03:17 | 方案包创建 | 完成 | 创建 implementation 类型方案包并进入开发实施 |
| 2026-03-25 03:24 | 1.1 / 1.2 | 完成 | 新增 GHCR 发布 workflow，main push 发布 latest 和 sha 标签 |
| 2026-03-25 03:24 | 2.1 | 完成 | docker-compose 三个业务镜像切换到 ghcr.io/micah123321 |
| 2026-03-25 03:25 | 3.1 | 完成 | 已人工复核 workflow 与 compose；本机缺少 docker，未执行 `docker compose config` |

---

## 执行备注

> 记录执行过程中的重要说明、决策变更、风险提示等

- 由于当前环境无 Python 解释器，方案包由主代理按模板直接创建。
- 本机缺少 Docker CLI，compose 未做命令级语法验证；workflow 也未运行 `actionlint`。
