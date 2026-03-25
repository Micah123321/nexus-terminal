# 变更提案: server-status-memory-disk-cards

## 元信息
```yaml
类型: 功能增强
方案类型: implementation
优先级: P1
状态: 已完成
状态说明: 已按参考图补齐服务器状态中的内存卡片和磁盘卡片，并接入真实监控数据
创建: 2026-03-25
完成: 2026-03-25
```

---

## 1. 需求
### 背景
当前服务器状态面板原本只有 CPU、内存、Swap、磁盘进度条，以及 CPU / 网络速度折线图，无法承载参考图中的内存细分项、磁盘设备信息和读写速率展示。

### 目标
- 新增参考图风格的内存监控卡片，展示总量、已用、缓存、空闲和环形占比。
- 新增参考图风格的磁盘监控卡片，展示设备名、文件系统类型、读写速率以及挂载点/大小/可用/已用率。
- 保留现有 CPU / 网络曲线和基础状态信息。

### 约束条件
```yaml
范围约束:
  - packages/backend/src/services/status-monitor.service.ts
  - packages/frontend/src/components/StatusMonitor.vue
  - packages/frontend/src/types/server.types.ts
  - packages/frontend/src/locales/{zh-CN,en-US,ja-JP}.json
兼容约束:
  - 不新增第三方依赖
  - 保留现有 StatusCharts.vue 的 CPU / 网络曲线
数据约束:
  - 新增 memFree、memCached
  - 新增 diskAvailable、diskMountPoint、diskFsType、diskDevice、diskReadRate、diskWriteRate
```

### 验收标准
- [x] 状态面板出现参考图风格的内存卡片并展示总量、已用、缓存、空闲
- [x] 状态面板出现参考图风格的磁盘卡片并展示设备、类型、读写速率、挂载点、大小、可用、已用率
- [x] 新字段来自实时状态采集链路
- [x] 前端构建通过
- [x] 后端 TypeScript 构建通过

---

## 2. 方案

### 技术方案
- 后端重构 `StatusMonitorService`，在现有 SSH 轮询链路中补齐 `free`、`df`、`findmnt` 与 `/proc/diskstats` 的解析。
- 前端在 `StatusMonitor.vue` 中以卡片替代简单内存/磁盘进度行，内存使用 CSS 环形图，磁盘使用竖向容量条与明细表格。
- 新增多语言键值用于内存/磁盘卡片标题、统计标签和表头。

### 影响范围
```yaml
涉及模块:
  - frontend
  - backend
变更文件:
  - packages/backend/src/services/status-monitor.service.ts
  - packages/frontend/src/components/StatusMonitor.vue
  - packages/frontend/src/types/server.types.ts
  - packages/frontend/src/locales/zh-CN.json
  - packages/frontend/src/locales/en-US.json
  - packages/frontend/src/locales/ja-JP.json
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| Linux 不同发行版的 `free` / `df` / `findmnt` 输出格式差异 | 中 | 采用多层回退解析，失败字段返回 `undefined` |
| 根挂载点对应设备可能是分区或 mapper 设备 | 中 | 优先规整到块设备名，无法精确匹配时 I/O 速率回退为 0 |
| 卡片信息较多可能挤压原状态布局 | 低 | 采用纵向卡片堆叠并保留现有图表区域 |

### 技术决策
- `server-status-memory-disk-cards#D001`: 采用卡片化监控视图，而不是继续在折线图区域追加内存/磁盘折线图。
- `server-status-memory-disk-cards#D002`: 磁盘读写速率基于 `/proc/diskstats` 计算，不引入 `iostat` 等额外依赖。
