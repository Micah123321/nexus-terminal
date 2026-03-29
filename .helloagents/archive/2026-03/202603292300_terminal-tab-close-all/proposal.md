# 变更提案: terminal-tab-close-all

## 元信息
```yaml
类型: 修复
方案类型: implementation
优先级: P2
状态: 已完成
创建: 2026-03-29
```

---

## 1. 需求
### 背景
当前终端标签右键菜单已经支持关闭当前、关闭其他、关闭左侧和关闭右侧，但缺少“一次性关闭全部终端标签”的入口。用户希望在工作区内直接关闭所有服务器的终端标签，而不是仅针对当前服务器分组操作。

### 目标
- 在终端标签右键菜单中新增“关闭全部”。
- 点击后关闭当前工作区内全部终端标签。
- 保持现有右键菜单事件链路与会话清理逻辑，不引入新的后端依赖。

### 约束条件
```yaml
范围约束: 仅修改 frontend 菜单、工作区事件和本地化文案
行为约束: “关闭全部”作用域为当前工作区全部终端标签，不区分服务器
实现约束: 复用现有 session store 的 cleanupAllSessions 和 Workspace 事件总线
```

### 验收标准
- [x] 终端标签右键菜单在多标签场景下显示“关闭全部”。
- [x] 点击“关闭全部”后，当前工作区中的全部终端标签被关闭。
- [x] `packages/frontend` 构建通过，未引入新的类型错误。

---

## 2. 方案

### 技术方案
沿用现有 `TerminalTabBar.vue -> workspaceEvents.ts -> WorkspaceView.vue -> session.store.ts` 的前端事件链，新增 `session:closeAll` 事件。`TerminalTabBar.vue` 负责在多标签场景下渲染菜单项并发出事件，`WorkspaceView.vue` 统一接收后调用 `sessionStore.cleanupAllSessions()` 完成全部会话关闭，文案同步更新到中英文 locale 文件。

### 影响范围
```yaml
涉及模块:
  - frontend: TerminalTabBar 右键菜单项
  - frontend: workspaceEvents 工作区事件类型
  - frontend: WorkspaceView 全部关闭处理
  - frontend: zh-CN / en-US 本地化文案
预计变更文件: 5
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 关闭全部复用 `cleanupAllSessions()` 时影响现有退出清理逻辑 | 低 | 仅在用户主动点击菜单时调用，且该逻辑已用于工作区卸载清理 |
| 右键菜单新增项后多语言缺失导致展示 key | 低 | 同步补充 `zh-CN` 与 `en-US` 文案 |

---

## 3. 技术决策
### terminal-tab-close-all#D001: 复用工作区级事件总线和现有全部清理能力
**日期**: 2026-03-29  
**状态**: 采纳  
**背景**: 当前终端标签关闭动作已全部走 `WorkspaceView` 中转处理，`session.store` 已存在 `cleanupAllSessions()` 可安全关闭全部会话。  
**备选方案**:
| 选项 | 优点 | 缺点 |
|------|------|------|
| A: 在 `TerminalTabBar.vue` 内循环逐个关闭 | 改动直观 | 组件直接操作关闭细节，事件层次不一致 |
| B: 新增 `session:closeAll` 事件并由 `WorkspaceView` 调用 `cleanupAllSessions()` | 与现有 close/closeOthers 链路一致，复用现有清理逻辑 | 需要补一个事件类型 |
**决策**: 选择方案 B。  
**理由**: 保持终端标签菜单与工作区事件模型一致，避免在组件层直接堆叠会话清理逻辑。  

