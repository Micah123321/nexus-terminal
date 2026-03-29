# 任务清单: global-server-quick-search

> **@status:** completed | 2026-03-30 02:15

```yaml
@feature: global-server-quick-search
@created: 2026-03-30
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 6 | 0 | 0 | 6 |

---

## 任务列表

### 1. 方案与范围确认

- [√] 1.1 创建全局服务器快捷检索方案包并锁定为前端实现 | depends_on: []

### 2. 全局检索能力实现

- [√] 2.1 新增全局服务器检索面板与本地模糊匹配排序 | depends_on: [1.1]
- [√] 2.2 在 `App.vue` 接入 `Ctrl+Shift+F` 打开/关闭逻辑并管理连接数据加载 | depends_on: [2.1]
- [√] 2.3 接通上下键切换、回车自动连接与现有 `sessionStore` 连接链路 | depends_on: [2.2]

### 3. 文案与验证

- [√] 3.1 补齐多语言文案并执行前端构建验证 | depends_on: [2.3]
- [√] 3.2 同步前端知识库与 CHANGELOG 记录并完成归档 | depends_on: [3.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-30 02:04 | 1.1 | 完成 | 创建 implementation 方案包，范围锁定为前端全局快捷检索与现有连接链路复用 |
| 2026-03-30 02:12 | 2.1 | 完成 | 新增 `GlobalConnectionQuickSearch.vue` 与 `connectionSearch.ts`，提供本地模糊搜索和结果排序 |
| 2026-03-30 02:15 | 2.2 | 完成 | `App.vue` 接入 `Ctrl+Shift+F` 全局快捷键、面板开关和连接列表加载 |
| 2026-03-30 02:17 | 2.3 | 完成 | 接通上下键、回车自动连接与 `sessionStore.handleConnectRequest()` 复用链路 |
| 2026-03-30 02:22 | 3.1 | 完成 | 补齐中英日文案，并通过 `npm run build --workspace @nexus-terminal/frontend` |
| 2026-03-30 02:28 | 3.2 | 完成 | 已同步 `frontend` 模块文档与 CHANGELOG，准备归档方案包 |

---

## 执行备注

> 记录执行过程中的重要说明、决策变更、风险提示等

- 当前选择范围: 搜索所有连接类型（SSH / RDP / VNC）
- 默认策略: 全局唤起、局部实现，不新增后端接口
