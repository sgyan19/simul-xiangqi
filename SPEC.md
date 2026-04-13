# 暗棋对决 - 同时制象棋

## 1. Concept & Vision

一款创新的H5象棋游戏，核心创新在于**同时制对弈**：红黑双方在策略阶段完全隐藏彼此的操作，各自暗自走棋，最后同步结算。这种机制带来全新的博弈体验——你不仅要想好自己的棋，还要猜测对手的意图，做出最优决策。

视觉风格采用经典木质棋盘 + 现代扁平化棋子，简洁大气，适合移动端操作。

## 2. Design Language

### 色彩系统
```
--board-primary: #DEB887        // 木质棋盘底色
--board-line: #8B4513           // 棋盘线条
--board-border: #654321          // 棋盘边框
--piece-red: #C41E3A            // 红方棋子色
--piece-red-bg: #FFE4E1         // 红方棋子背景
--piece-black: #1A1A1A          // 黑方棋子色
--piece-black-bg: #F5F5DC        // 黑方棋子背景
--highlight: #FFD700            // 选中/高亮色
--danger: #FF4444               // 将军警告色
--success: #4CAF50              // 确认/成功色
--bg-page: #2C2C2C              // 页面背景
--text-primary: #FFFFFF         // 主文字
--text-muted: #AAAAAA           // 次要文字
```

### 字体
- 主字体：系统默认无衬线字体
- 棋子文字：宋体/黑体（传统感）

### 动效
- 棋子选中：scale(1.1) + box-shadow 增强
- 棋子移动：transition 0.3s ease
- 结算动画：棋子淡出 + 爆炸效果
- 将军提示：脉动红色边框

## 3. Layout & Structure

### 页面布局（移动端优先）
```
┌─────────────────────────────┐
│        顶部状态栏            │
│   红方确认状态 | 回合信息     │
├─────────────────────────────┤
│                             │
│         棋盘区域             │
│        (9×10格)             │
│                             │
├─────────────────────────────┤
│        操控面板              │
│  [切换视角] [确认策略] [重置] │
├─────────────────────────────┤
│      操作提示/结算结果       │
└─────────────────────────────┘
```

### 棋盘结构
- 标准中国象棋棋盘 9列 × 10行
- 楚河汉界居中分隔
- 炮/兵位置标记
- 九宫格斜线标记

## 4. Features & Interactions

### 4.1 核心游戏流程

#### 策略阶段
1. 系统随机决定先操作哪方（或由红方先手）
2. 当前操作方的棋子可点击选中
3. 点击目标位置移动棋子
4. 点击「确认策略」锁定当前操作
5. 切换到另一方继续策略

#### 结算阶段
1. 双方都确认后，同时执行移动
2. 检测冲突（同归于尽、将帅对杀等）
3. 判定胜负或继续

### 4.2 棋子与行棋规则

#### 红方棋子（下方）
| 棋子 | 数量 | 行棋规则 |
|------|------|----------|
| 帅 | 1 | 九宫内移动一格，横竖均可 |
| 仕 | 2 | 九宫内斜线移动一格 |
| 相 | 2 | 走"田"字，不能过河，塞象眼 |
| 马 | 2 | 走"日"字，蹩马腿 |
| 车 | 2 | 直线任意距离 |
| 炮 | 2 | 直线，吃子需隔一子（炮架） |
| 兵 | 5 | 未过河只能前进，过河可横向 |

#### 黑方棋子（上方，对称）
| 棋子 | 数量 | 行棋规则 |
|------|------|----------|
| 将 | 1 | 同帅 |
| 士 | 2 | 同仕 |
| 象 | 2 | 同相 |
| 马 | 2 | 同马 |
| 车 | 2 | 同车 |
| 炮 | 2 | 同炮 |
| 卒 | 5 | 未过河只能前进，过河可横向 |

### 4.3 特殊规则

#### 蹩马腿
- 马走动时，斜日字的对角有棋子阻挡则不能走

#### 塞象眼
- 相走"田"字中心点有棋子阻挡则不能走
- 相不能过河

#### 炮的走法
- 移动：直线任意距离，不能越子
- 吃子：直线移动，中间隔一子（炮架），目标位置是对方棋子

#### 将帅对面
- 将与帅在同一列且中间无子阻挡时，双方同时被吃 → 和棋

#### 同归于尽
- 双方移动到同一位置 → 双方棋子同时消失

### 4.4 胜负判定

```
判定优先级（同一回合内）：
1. 将帅同时被吃 → 和棋
2. 一方将帅被吃 → 该方输，另一方赢
3. 双方都将帅存活 → 回合结束，继续下一回合
```

### 4.5 交互细节

| 操作 | 响应 |
|------|------|
| 点击己方棋子 | 选中（高亮显示），显示可走位置 |
| 点击可走位置 | 移动棋子 |
| 点击不可走位置 | 取消选中 |
| 点击敌方棋子 | 无响应（隐藏模式下） |
| 点击确认按钮 | 锁定策略，切换视角 |
| 再次点击已选棋子 | 取消选中 |

### 4.6 视角切换

- 简化版：在同页面通过按钮切换红/黑视角
- 切换视角时，棋盘会旋转180°（翻转视角）
- 当前操作方可以看到自己的完整棋盘
- 隐藏模式：看不到对方的实际走法

## 5. Component Inventory

### 5.1 ChessBoard
- 9×10 网格棋盘
- 绘制楚河汉界、斜线、九宫标记
- 状态：normal / settlement（结算中）

### 5.2 ChessPiece
- 显示棋子图形（红/黑 + 汉字）
- 状态：normal / selected / movable / captured
- 支持触摸点击

### 5.3 MoveIndicator
- 显示可选的移动位置
- 状态：normal / capturable

### 5.4 StatusBar
- 当前回合信息
- 双方确认状态
- 将军警告

### 5.5 ControlPanel
- 视角切换按钮（红/黑）
- 确认策略按钮
- 重置游戏按钮

### 5.6 SettlementModal
- 结算结果显示
- 胜负/和棋提示
- 重新开始按钮

### 5.7 Toast
- 操作提示
- 将军警告

## 6. Technical Approach

### 技术栈
- Vite + React + TypeScript
- 纯 CSS（无 Tailwind，按项目规范）
- 移动端适配（触摸友好）

### 状态管理
```typescript
interface GameState {
  phase: 'strategy' | 'settlement' | 'ended';
  currentTurn: 'red' | 'black';
  redConfirmed: boolean;
  blackConfirmed: boolean;
  redBoard: Piece[][];  // 9×10
  blackBoard: Piece[][]; // 隐藏视角下的对方棋盘
  redMove: Move | null;
  blackMove: Move | null;
  winner: 'red' | 'black' | 'draw' | null;
  isCheck: boolean;
}

interface Piece {
  type: 'king' | 'advisor' | 'elephant' | 'horse' | 'chariot' | 'cannon' | 'pawn';
  side: 'red' | 'black';
  position: [number, number]; // [col, row]
}

interface Move {
  from: [number, number];
  to: [number, number];
}
```

### 核心函数
```typescript
// 合法性检查
isValidMove(piece: Piece, to: [number, number], board: Piece[][]): boolean
isValidHorse(piece: Piece, to: [number, number], board: Piece[][]): boolean
isValidCannon(piece: Piece, to: [number, number], board: Piece[][]): boolean
canCapture(piece: Piece, target: Piece): boolean

// 结算逻辑
resolveSettlement(redMove: Move, blackMove: Move, redBoard, blackBoard): SettlementResult
checkFaceToFace(redKing, blackGeneral): boolean
checkCollision(move1, move2): boolean

// 胜负判定
determineWinner(settlement: SettlementResult): 'red' | 'black' | 'draw' | null
```

### 坐标系统
- 列：0-8（从右到左，红方视角）
- 行：0-9（从下到上，红方视角）
- 黑方视角会翻转显示
