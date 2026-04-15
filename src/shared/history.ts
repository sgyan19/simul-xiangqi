import { Piece, PendingAction } from '../types';

export type RemovalReason = 
  | 'captured'
  | 'exchange'
  | 'counter_attack'
  | 'face_off';

export interface PieceRemovalRecord {
  piece: Piece;
  reason: RemovalReason;
  removedBy?: {
    side: 'red' | 'black';
    pieceType: string;
    pieceId: string;
  };
}

export interface SettlementEvent {
  type: 'move' | 'capture' | 'collision' | 'counter_attack' | 'face_off';
  description: string;
}

export interface RoundHistoryEntry {
  logicRound: number;   // 逻辑回合，用于排序，每次操作递增
  gameRound: number;    // 游戏回合，用于显示
  redAction: PendingAction | null;
  blackAction: PendingAction | null;
  redPieceRemoved: PieceRemovalRecord[];
  blackPieceRemoved: PieceRemovalRecord[];
  events: SettlementEvent[];
  winner: 'red' | 'black' | 'draw' | null;
  endReason: string | null;
  isGameEnd: boolean;
}

// 将列号转换为中文数字（1-9 对应 一-九）
const colToChinese = (col: number): string => {
  const chinese = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return chinese[col] || String(col);
};

// 获取棋子名称（根据阵营返回单独的名称）
export const getPieceName = (pieceType: string, side?: 'red' | 'black'): string => {
  const names: Record<string, Record<string, string>> = {
    king: { red: '帅', black: '将' },
    advisor: { red: '仕', black: '士' },
    elephant: { red: '相', black: '象' },
    horse: { red: '马', black: '马' },
    chariot: { red: '车', black: '车' },
    cannon: { red: '炮', black: '炮' },
    pawn: { red: '兵', black: '卒' },
  };
  if (side) {
    return names[pieceType]?.[side] || pieceType;
  }
  return names[pieceType]?.red || pieceType;
};

// 格式化象棋术语（如"兵五进一"或"炮二平五"）
export const formatChessNotation = (
  from: [number, number],
  to: [number, number],
  pieceType: string,
  side: 'red' | 'black'
): string => {
  const pieceName = getPieceName(pieceType, side);
  
  const isRed = side === 'red';
  
  // 红方列：棋盘列 8->0 对应 一->九（从右到左编号）
  // 黑方列：棋盘列 0->8 对应 一->九（从右到左编号）
  // 统一转换为从己方右到左的列号 1-9
  const fromCol = isRed ? 9 - from[0] : from[0] + 1;
  const toCol = isRed ? 9 - to[0] : to[0] + 1;
  
  // 红方前进 row 减小，黑方前进 row 增加
  const isForward = isRed ? (to[1] - from[1] < 0) : (to[1] - from[1] > 0);
  const isHorizontal = from[1] === to[1];
  
  let result: string;
  
  if (isHorizontal) {
    // 平：列号变化
    result = pieceName + colToChinese(fromCol - 1) + '平' + colToChinese(toCol - 1);
  } else if (isForward) {
    // 进：向前移动
    const steps = Math.abs(to[1] - from[1]);
    result = pieceName + colToChinese(fromCol - 1) + '进' + colToChinese(steps - 1);
  } else {
    // 退：向后移动
    const steps = Math.abs(to[1] - from[1]);
    result = pieceName + colToChinese(fromCol - 1) + '退' + colToChinese(steps - 1);
  }
  
  return result;
};
