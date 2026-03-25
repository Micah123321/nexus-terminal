# 任务清单: quickcommands-dynamic-variables

```yaml
@feature: quickcommands-dynamic-variables
@created: 2026-03-26
@status: completed
@mode: R2
```

## 进度概览

| 完成 | 失败 | 跳过 | 总数 |
|------|------|------|------|
| 6 | 0 | 0 | 6 |

---

## 任务列表

### 1. 共享解析能力

- [√] 1.1 新增快捷指令变量解析工具，统一处理自定义变量替换、动态变量解析与告警收集 | depends_on: []

### 2. 编辑弹窗动态变量区

- [√] 2.1 在 `packages/frontend/src/components/AddEditQuickCommandForm.vue` 中加入动态变量分组展示与点击插入能力 | depends_on: [1.1]
- [√] 2.2 将编辑弹窗内“执行”逻辑改为复用共享解析工具，并处理剪贴板/密码类变量告警 | depends_on: [2.1]

### 3. 列表执行链路统一

- [√] 3.1 在 `packages/frontend/src/views/QuickCommandsView.vue` 中改为复用共享解析工具，保证列表直接执行支持动态变量 | depends_on: [1.1]

### 4. 文案与验证

- [√] 4.1 更新 `packages/frontend/src/locales/zh-CN.json`、`packages/frontend/src/locales/en-US.json`、`packages/frontend/src/locales/ja-JP.json` 的动态变量说明文案 | depends_on: [2.2, 3.1]
- [√] 4.2 执行 `packages/frontend` 构建验证，确认类型检查与打包通过 | depends_on: [4.1]

---

## 执行日志

| 时间 | 任务 | 状态 | 备注 |
|------|------|------|------|
| 2026-03-26 00:42 | DESIGN | completed | 已确认动态变量需同时覆盖编辑弹窗执行与快捷指令列表直接执行 |
| 2026-03-26 01:05 | 1.1 | completed | 新增 `quickCommandTemplate.ts`，统一自定义变量与动态变量解析 |
| 2026-03-26 01:05 | 2.1/2.2 | completed | 编辑快捷指令弹窗新增动态变量区，并改为复用共享解析器 |
| 2026-03-26 01:06 | 3.1 | completed | 快捷指令列表执行、粘贴到终端和发送到全部服务器接入动态变量解析 |
| 2026-03-26 01:07 | 4.1 | completed | 已补齐 zh-CN / en-US / ja-JP 动态变量文案 |
| 2026-03-26 01:08 | 4.2 | completed | `npm run build` 通过，仅保留既有 chunk 体积告警 |

---

## 执行备注

> `create_package.py` 在当前环境执行失败且无可用输出，本方案包按模板结构手工创建。`${{password}}` 当前优先从活动 SSH 会话关联的已保存登录凭证解析；若前端运行态取不到明文密码，则回退为空串并给出警告，不阻断命令执行。
