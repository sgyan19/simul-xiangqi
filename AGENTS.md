# 项目上下文

## 技术栈

- **核心**: Vite 7, TypeScript, React 19
- **UI**: 纯 CSS (无框架)
- **状态管理**: React hooks (useState, useCallback, useEffect)

## 目录结构

```
├── scripts/            # 构建与启动脚本
│   ├── build.sh        # 构建脚本
│   ├── dev.sh          # 开发环境启动脚本
│   ├── prepare.sh      # 预处理脚本
│   └── start.sh        # 生产环境启动脚本
├── server/             # 服务端逻辑
│   ├── routes/         # API 路由
│   ├── server.ts       # Express 服务入口
│   └── vite.ts         # Vite 中间件集成
├── src/                # 前端源码
│   ├── main.tsx        # React 应用入口
│   ├── App.tsx         # 主应用组件
│   ├── ChessBoard.tsx  # 棋盘组件
│   ├── types.ts        # 类型定义
│   ├── chessLogic.ts   # 行棋规则逻辑
│   ├── gameLogic.ts    # 游戏结算逻辑
│   └── index.css       # 全局样式
├── index.html          # 入口 HTML
├── package.json        # 项目依赖管理
├── tsconfig.json       # TypeScript 配置
├── vite.config.ts      # Vite 配置
└── SPEC.md             # 游戏规范文档
```

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

- 使用 React 19 + TypeScript 开发
- 纯 CSS 样式（无 Tailwind）
- 棋子使用 CSS flexbox 绝对定位布局
- 移动端优先设计

## 游戏核心机制

### 同时制对弈
1. 红黑双方各自策略阶段
2. 通过视角切换按钮操作双方
3. 双方都确认后进入结算阶段
4. 同时执行移动，判定胜负

### 行棋规则
- 蹩马腿、塞象眼
- 炮必须隔子吃子
- 将帅九宫内移动
- 兵过河后可横向移动

### 胜负判定
- 将帅被吃 = 输
- 将帅同时被吃 = 和棋
- 双方移动到同一位置 = 同归于尽
