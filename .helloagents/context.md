# 项目上下文

## 1. 基本信息

```yaml
名称: Nexus Terminal
描述: 基于 npm workspaces 的远程连接终端平台，提供 Web SSH、SFTP、RDP、VNC 与桌面端相关能力。
类型: Web应用
状态: 维护中
```

## 2. 技术上下文

```yaml
语言: TypeScript, Vue, Node.js
框架: Vue 3, Vite, Express 5
包管理器: npm workspaces
构建工具: Vite（frontend）, TypeScript 编译（backend/remote-gateway）, Docker Compose（部署）
```

### 主要依赖
| 依赖 | 版本 | 用途 |
|------|------|------|
| vue | ^3.3.0 | 前端应用框架 |
| vite | >=5.4.19 | 前端开发与构建 |
| pinia | ^3.0.2 | 前端状态管理 |
| element-plus | ^2.9.11 | 前端组件库 |
| xterm | ^5.3.0 | Web 终端渲染 |
| monaco-editor | ^0.52.2 | 在线文件编辑器 |
| express | ^5.1.0 | 后端 REST 服务 |
| express-session | ^1.18.1 | 登录会话管理 |
| sqlite3 | ^5.1.7 | 本地数据持久化 |
| ssh2 | ^1.16.0 | SSH/SFTP 连接能力 |
| guacamole-lite | ^0.7.3 | RDP/VNC 网关封装 |
| ws | ^8.18.1 | WebSocket 通信 |

## 3. 项目概述

### 核心功能
- 统一管理 SSH、SFTP、RDP、VNC 远程连接。
- 提供基于 Vue 3 的工作区、布局配置、主题定制和命令输入体验。
- 提供认证、2FA、Passkey、Captcha、IP 白名单/黑名单、通知和审计能力。
- 支持远程文件管理、在线编辑、快速命令、命令历史和 SSH 挂起会话。
- 使用独立 `remote-gateway` 服务为远程桌面连接生成加密令牌并对接 `guacd`。

### 项目边界
```yaml
范围内:
  - Web 前端、Node.js 后端、远程桌面网关三部分代码
  - Docker Compose 部署编排和运行时环境变量
  - 基于 SQLite/data 目录的本地持久化
范围外:
  - 自动化数据备份能力
  - 仓库内未出现的桌面端打包代码
  - 完整自动化测试体系（当前仓库未建立）
```

## 4. 开发约定

### 代码规范
```yaml
命名风格: TypeScript/JavaScript 代码以 camelCase 为主；Vue 组件使用 PascalCase；目录多为 kebab-case
文件命名: 后端常见 *.controller.ts / *.service.ts / *.repository.ts；前端 composable 使用 use*.ts；Pinia 使用 *.store.ts
目录组织: 根目录以 packages/* 划分应用；frontend 按 views/components/composables/stores 划分；backend 按业务域拆分子目录
```

### 错误处理
```yaml
错误码格式: 后端与 remote-gateway 主要返回 HTTP 状态码 + JSON error 字段；前端初始化失败时仍尝试挂载应用
日志级别: 以 console.log / console.warn / console.error 为主，关键启动失败直接 process.exit(1)
```

### 测试要求
```yaml
测试框架: 未配置统一测试框架
覆盖率要求: 未声明
测试文件位置: 当前仓库未建立系统化测试目录，变更后以 package 级 build 和手工冒烟验证为主
```

### Git规范
```yaml
分支策略: 仓库内未声明
提交格式: 仓库内未声明
```

## 5. 当前约束（源自历史决策）

> 这些是当前生效的技术约束，详细决策过程见对应方案包

| 约束 | 原因 | 决策来源 |
|------|------|---------|
| 暂无已归档方案包约束 | 知识库于 2026-03-25 首次初始化，后续决策应沉淀到 plan/archive | N/A |

## 6. 已知技术债务（可选）

> 主动识别的需要未来处理的技术问题

| 债务描述 | 优先级 | 来源 | 建议处理时机 |
|---------|--------|------|-------------|
| 根仓与子包均缺少成体系自动化测试，`test` 脚本未形成有效校验 | P1 | 仓库现状 | 涉及核心连接链路、认证或文件操作改造前优先补齐 |
| `packages/backend/src/index.ts` 同时承担环境初始化、数据库启动、路由装配与服务启动，入口职责偏重 | P2 | 代码结构扫描 | 后端进入中型重构或新增启动流程时拆分 |
| `packages/remote-gateway/src/server.ts` 以单文件承载配置、HTTP API、Guacamole 服务器与优雅退出逻辑 | P2 | 代码结构扫描 | 远程桌面能力继续扩展前拆出配置层和控制器层 |
