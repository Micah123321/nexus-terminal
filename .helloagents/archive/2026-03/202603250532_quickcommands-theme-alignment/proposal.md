# 变更提案: quickcommands-theme-alignment

## 元信息
```yaml
类型: 缺陷修复
方案类型: implementation
优先级: P2
状态: 已完成
状态说明: 已完成 QuickCommandsView 主题变量对齐、构建验证和知识库同步，待归档
创建: 2026-03-25
```

---

## 1. 需求

### 背景
快捷指令视图当前整体已接入主题变量体系，但局部交互按钮仍残留写死的颜色类，导致默认主题下的悬停和操作态与其他主题表现不一致，视觉语言不统一。

### 目标
- 仅修复 `packages/frontend/src/views/QuickCommandsView.vue`。
- 统一快捷指令视图内残留的硬编码色值，使其回到现有主题变量体系。
- 不调整快捷指令的数据逻辑、交互结构和其他组件。

### 约束条件
```yaml
范围约束: 仅限 QuickCommandsView.vue，禁止扩散到其它视图和组件
实现约束: 复用现有 bg-background/bg-border/text-foreground/text-text-secondary/bg-primary 等主题变量类
行为约束: 不改变搜索、分组、编辑、删除、右键菜单和发送命令逻辑
风险约束: 避免引入新的主题 token 或全局样式依赖
```

### 验收标准
- [ ] `QuickCommandsView.vue` 中残留的硬编码 hover/background 色值被替换为主题变量类
- [ ] 默认主题下快捷指令列表操作按钮、空状态按钮等视觉风格与当前主题体系一致
- [ ] 其他主题下不出现明显的对比度退化或交互态丢失
- [ ] 前端最小构建或类型校验可通过

---

## 2. 方案

### 技术方案
保留 `QuickCommandsView.vue` 的结构和行为，仅替换模板中与主题适配冲突的硬编码类。重点处理列表项操作按钮上的 `hover:bg-black/10` 以及与主题变量命名不一致的按钮 hover 类，统一改为当前项目已有的 `hover:bg-border`、`hover:text-foreground` 或 `hover:bg-primary/10` 体系，保证默认主题与其他主题都走同一套 CSS 变量映射。

### 影响范围
```yaml
涉及模块:
  - frontend: 快捷指令视图模板样式
预计变更文件: 1
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| 替换 hover 类后局部按钮层级感变弱 | 低 | 优先复用仓库中同类列表组件已采用的主题类组合 |
| 默认主题修好但紧凑模式下按钮显隐观感变化 | 低 | 保持原有显隐逻辑，仅改颜色类 |
| 漏掉同文件里的另一处硬编码样式 | 低 | 通过全文检索确认所有残留硬编码色值 |

### 实施结果
- `QuickCommandsView.vue` 的顶部添加按钮与空状态按钮统一切换到 `bg-button`、`text-button-text`、`hover:bg-button-hover`。
- 分组视图和平铺视图中的复制、编辑、删除按钮均移除了 `hover:bg-black/10`，改为 `hover:bg-border`。
- 前端 `npm run build --workspace @nexus-terminal/frontend` 通过。
- `vite preview` 可启动并打开登录页，但因本地认证/后端接口返回 500，未能在浏览器中直接进入快捷指令视图做目视验收。
