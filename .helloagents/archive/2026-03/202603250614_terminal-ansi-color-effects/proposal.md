# 变更提案: terminal-ansi-color-effects

## 元信息
```yaml
类型: 缺陷修复
方案类型: implementation
优先级: P1
状态: 已完成
状态说明: 已完成显式前景色字符绕过描边/阴影修复，并完成前后端构建验证
创建: 2026-03-25
```

---

## 1. 需求

### 背景
当前终端在启用文字描边或阴影后，ANSI 彩色输出视觉上会被统一的描边/阴影效果“压平”，看起来像所有字体都接近同一种颜色。用户希望保留黑绿主题下默认前景文字的装饰效果，但不能破坏终端原本的 ANSI 彩色语义。

### 目标
- 修复终端 ANSI 彩色字符被统一描边/阴影覆盖的问题。
- 仅让默认前景文字继续保留描边/阴影效果。
- 将相关终端文字效果的默认开关改为开启。

### 约束条件
```yaml
范围约束: 优先限制在前端终端组件与外观默认值配置，不改 SSH 数据流和终端主题结构
实现约束: 不改变 ANSI 颜色来源，只调整文字效果的应用范围
兼容约束: 兼容 xterm DOM renderer 当前的 class/style 输出方式
数据约束: 默认值变更只影响未保存该设置的新环境，不强行覆盖已有用户配置
```

### 验收标准
- [ ] 启用终端文字描边/阴影后，ANSI 彩色字符仍保留原有颜色层次
- [ ] 默认前景色文本仍可保留描边/阴影效果
- [ ] 终端文字效果默认开关改为开启
- [ ] 前端构建通过

---

## 2. 方案

### 技术方案
在 `Terminal.vue` 中收窄文字描边/阴影 CSS 选择器，不再对整行容器统一施加样式，而是仅对“未显式设置 ANSI 前景色”的字符片段应用样式。识别规则基于 xterm DOM renderer 的输出特征：ANSI 调色板颜色会产生 `xterm-fg-*` class，RGB 颜色会在字符节点上带 `style="color:..."`。同时在后端外观默认配置和前端缺省回退值中，把终端文字描边/阴影开关默认值改为开启。

### 影响范围
```yaml
涉及模块:
  - frontend: Terminal.vue 终端文字效果应用逻辑
  - frontend: appearance.store.ts 前端外观缺省回退
  - backend: appearance.repository.ts 外观默认值
预计变更文件: 3
```

### 风险评估
| 风险 | 等级 | 应对 |
|------|------|------|
| xterm 默认前景与 ANSI 颜色识别条件不完整 | 中 | 依据 xterm DOM renderer 实际 class/style 规则设计选择器，避免整行样式覆盖 |
| 移除行级样式后默认文本效果范围缩小 | 低 | 仅保留到字符 span 级别，确保默认文本仍有描边/阴影 |
| 默认开关改为开启影响旧用户认知 | 低 | 仅修改默认值与前端 fallback，不覆盖数据库中已有显式设置 |

### 实施结果
- `Terminal.vue` 新增显式前景色字符标记逻辑，利用 xterm DOM renderer 生成的 `xterm-fg-*` class 或内联 `style.color` 判断当前字符是否使用了显式前景色。
- 终端文字描边和阴影样式不再对整行容器统一施加，而是仅作用于默认前景文字；显式前景色字符会自动绕过这些效果，避免 ANSI 彩色文本被“压平”。
- `appearance.store.ts` 的前端回退值和 `appearance.repository.ts` 的后端默认值已将终端文字描边/阴影开关默认改为开启。
- `npm run build --workspace @nexus-terminal/frontend` 与 `npm run build --workspace @nexus-terminal/backend` 均通过。
