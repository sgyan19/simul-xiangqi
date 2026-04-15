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
  roundNumber: number;
  redAction: PendingAction | null;
  blackAction: PendingAction | null;
  redPieceRemoved: PieceRemovalRecord[];
  blackPieceRemoved: PieceRemovalRecord[];
  events: SettlementEvent[];
  winner: 'red' | 'black' | 'draw' | null;
  endReason: string | null;
  isGameEnd: boolean;
}

export const getPieceName = (pieceType: string): string => {
  const names: Record<string, string> = {
    king: '帅/将',
    advisor: '仕/士',
    elephant: '相/象',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    pawn: '兵/卒',
  };
  return names[pieceType] || pieceType;
};

// 将列号转换为中文数字（红方视角：1-9 对应 一-九）
const colToChinese = (col: number): string => {
  const chinese = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
  return chinese[col] || String(col);
};

// 格式化象棋术语（如"兵五进一"或"炮2平5"）
export const formatChessNotation = (
  from: [number, number],
  to: [number, number],
  pieceType: string,
  side: 'red' | 'black'
): string => {
  const pieceName = getPieceName(pieceType);
  
  // 区分红黑方
  const isRed = side === 'red';
  
  // 红方列从右到左是 8->0，黑方列从右到左是 0->8
  // 为了统一术语，我们用从己方右到左的列号
  const fromCol = isRed ? 9 - from[0] : from[0] + 1;
  const toCol = isRed ? 9 - to[0] : to[0] + 1;
  
  // 红方前进是 row 减小，黑方前进是 row 增加
  const forward = isRed ? -1 : 1;
  
  let colStr: string;
  let stepStr: string;
  
  if (fromCol === toCol) {
    // 同一列：平
    colStr = String(isRed ? colToChinese(fromCol - 1) : fromCol);
    stepStr = '平' + String(isRed ? colToChinese(toCol - 1) : toCol);
  } else if ((to[1] - from[1]) * forward > 0) {
    // 前进
    const steps = Math.abs(to[1] - from[1]);
    colStr = String(isRed ? colToChinese(fromCol - 1) : fromCol);
    stepStr = '进' + (fromCol === toCol ? String(steps) : String(isRed ? colToChinese(toCol - 1) : toCol));
  } else {
    // 后退
    const steps = Math.abs(to[1] - from[1]);
    colStr = String(isRed ? colToChinese(fromCol - 1) : fromCol);
    stepStr = '退' + (fromCol === toCol ? String(steps) : String(isRed ? colToChinese(toCol - 1) : toCol));
  }
  
  return pieceName + colStr + stepStr;
};
