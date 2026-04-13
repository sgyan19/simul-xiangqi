// 棋子类型
export type PieceType = 'king' | 'advisor' | 'elephant' | 'horse' | 'chariot' | 'cannon' | 'pawn';

// 阵营
export type Side = 'red' | 'black';

// 位置坐标 [列, 行]
export type Position = [number, number];

// 棋子
export interface Piece {
  type: PieceType;
  side: Side;
  position: Position;
  id: string;
}

// 移动
export interface Move {
  from: Position;
  to: Position;
}

// 游戏阶段
export type GamePhase = 'strategy' | 'settlement' | 'ended';

// 胜负结果
export type Winner = Side | 'draw' | null;

// 结算结果
export interface SettlementResult {
  redMove: Move | null;
  blackMove: Move | null;
  captures: {
    red: Piece[];
    black: Piece[];
  };
  winner: Winner;
  reason: string;
}

// 游戏状态
export interface GameState {
  phase: GamePhase;
  currentOperatedSide: Side; // 当前操作方
  redConfirmed: boolean;
  blackConfirmed: boolean;
  pieces: Piece[]; // 所有棋子
  redPendingMove: Move | null; // 红方待执行移动
  blackPendingMove: Move | null; // 黑方待执行移动
  selectedPiece: Piece | null; // 选中的棋子
  validMoves: Position[]; // 可移动位置
  winner: Winner;
  settlementResult: SettlementResult | null;
  message: string; // 提示信息
}

// 棋子名称映射
export const PIECE_NAMES: Record<PieceType, Record<Side, string>> = {
  king: { red: '帅', black: '将' },
  advisor: { red: '仕', black: '士' },
  elephant: { red: '相', black: '象' },
  horse: { red: '马', black: '马' },
  chariot: { red: '车', black: '车' },
  cannon: { red: '炮', black: '炮' },
  pawn: { red: '兵', black: '卒' },
};

// 初始棋子位置
// 注意：row 0 在顶部，row 9 在底部
// 红方在下方（row 6-9），黑方在上方（row 0-3）
// 标准象棋布局
export const INITIAL_PIECES: Piece[] = [
  // 红方（下方，row 6-9）
  // 底线 row 9：车马象士将士象马车
  { type: 'chariot', side: 'red', position: [0, 9], id: 'red-chariot-0' },
  { type: 'horse', side: 'red', position: [1, 9], id: 'red-horse-0' },
  { type: 'elephant', side: 'red', position: [2, 9], id: 'red-elephant-0' },
  { type: 'advisor', side: 'red', position: [3, 8], id: 'red-advisor-0' },
  { type: 'king', side: 'red', position: [4, 9], id: 'red-king' },
  { type: 'advisor', side: 'red', position: [5, 8], id: 'red-advisor-1' },
  { type: 'elephant', side: 'red', position: [6, 9], id: 'red-elephant-1' },
  { type: 'horse', side: 'red', position: [7, 9], id: 'red-horse-1' },
  { type: 'chariot', side: 'red', position: [8, 9], id: 'red-chariot-1' },
  // 炮 row 7
  { type: 'cannon', side: 'red', position: [1, 7], id: 'red-cannon-0' },
  { type: 'cannon', side: 'red', position: [7, 7], id: 'red-cannon-1' },
  // 兵 row 6
  { type: 'pawn', side: 'red', position: [0, 6], id: 'red-pawn-0' },
  { type: 'pawn', side: 'red', position: [2, 6], id: 'red-pawn-1' },
  { type: 'pawn', side: 'red', position: [4, 6], id: 'red-pawn-2' },
  { type: 'pawn', side: 'red', position: [6, 6], id: 'red-pawn-3' },
  { type: 'pawn', side: 'red', position: [8, 6], id: 'red-pawn-4' },

  // 黑方（上方，row 0-3）
  // 底线 row 0：车马象士将士象马车
  { type: 'chariot', side: 'black', position: [0, 0], id: 'black-chariot-0' },
  { type: 'horse', side: 'black', position: [1, 0], id: 'black-horse-0' },
  { type: 'elephant', side: 'black', position: [2, 0], id: 'black-elephant-0' },
  { type: 'advisor', side: 'black', position: [3, 1], id: 'black-advisor-0' },
  { type: 'king', side: 'black', position: [4, 0], id: 'black-king' },
  { type: 'advisor', side: 'black', position: [5, 1], id: 'black-advisor-1' },
  { type: 'elephant', side: 'black', position: [6, 0], id: 'black-elephant-1' },
  { type: 'horse', side: 'black', position: [7, 0], id: 'black-horse-1' },
  { type: 'chariot', side: 'black', position: [8, 0], id: 'black-chariot-1' },
  // 炮 row 2
  { type: 'cannon', side: 'black', position: [1, 2], id: 'black-cannon-0' },
  { type: 'cannon', side: 'black', position: [7, 2], id: 'black-cannon-1' },
  // 卒 row 3
  { type: 'pawn', side: 'black', position: [0, 3], id: 'black-pawn-0' },
  { type: 'pawn', side: 'black', position: [2, 3], id: 'black-pawn-1' },
  { type: 'pawn', side: 'black', position: [4, 3], id: 'black-pawn-2' },
  { type: 'pawn', side: 'black', position: [6, 3], id: 'black-pawn-3' },
  { type: 'pawn', side: 'black', position: [8, 3], id: 'black-pawn-4' },
];
