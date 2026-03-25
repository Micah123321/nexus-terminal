# 任务清单: connections-tree-sort-more-menu

```yaml
@feature: connections-tree-sort-more-menu
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

### 1. 方案与范围确认

- [√] 1.1 创建连接管理页增强方案包并锁定为多级标签树、列头排序和更多菜单 | depends_on: []

### 2. 交互增强实现

- [√] 2.1 在 `ConnectionsView.vue` 中实现多级标签树和展开状态管理 | depends_on: [1.1]
- [√] 2.2 为右侧结果列表接入列头排序与行级更多菜单 | depends_on: [2.1]

### 3. 验证与同步

- [√] 3.1 运行前端构建验证并同步 `.helloagents` 文档与变更记录 | depends_on: [2.2]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-25 21:52 | 1.1 | 完成 | 创建 implementation 方案包，范围锁定为 ConnectionsView.vue 的树形筛选与列表增强 |
| 2026-03-25 22:05 | 2.1 / 2.2 | 完成 | 实现多级标签树、展开状态持久化、列头排序与行级更多菜单，并补齐 group scope 刷新恢复 |
| 2026-03-25 22:13 | 3.1 | 完成 | `npm run build --workspace @nexus-terminal/frontend` 通过，并同步知识库与归档记录 |

---

## 执行备注

- 本轮是 `connections-view-tree-search-redesign` 的后续增强，目标是继续向参考图靠拢，但仍限制在单页增量改造。
- 标签层级仍由现有标签名即时推导，不新增后端 hierarchy 字段，也不引入新的仓库视图入口。
