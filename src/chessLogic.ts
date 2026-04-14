import { Piece, Position, Side, PieceType } from './types';

// 棋盘边界
const BOARD_COLS = 9;
const BOARD_ROWS = 10;

// 九宫格边界
// 红方在下方（row 7-9），黑方在上方（row 0-2）
const RED_PALACE = { minCol: 3, maxCol: 5, minRow: 7, maxRow: 9 };
const BLACK_PALACE = { minCol: 3, maxCol: 5, minRow: 0, maxRow: 2 };

// 获取棋子移动方向增量
const getDirection = (side: Side, forward: number): number => side === 'red' ? forward : -forward;

// 检查位置是否在棋盘内
export const isOnBoard = (col: number, row: number): boolean => {
  return col >= 0 && col < BOARD_COLS && row >= 0 && row < BOARD_ROWS;
};

// 检查位置是否在己方九宫
export const isInPalace = (col: number, row: number, side: Side): boolean => {
  if (side === 'red') {
    return col >= RED_PALACE.minCol && col <= RED_PALACE.maxCol &&
           row >= RED_PALACE.minRow && row <= RED_PALACE.maxRow;
  }
  return col >= BLACK_PALACE.minCol && col <= BLACK_PALACE.maxCol &&
         row >= BLACK_PALACE.minRow && row <= BLACK_PALACE.maxRow;
};

// 检查象是否过河（象不能过楚河汉界）
// 楚河汉界在 row 4-5 之间，是分隔双方的"灰色地带"
// 红方区域：row 5-9（下方）
// 黑方区域：row 0-4（上方，楚河汉界算黑方这边）
export const isElephantCrossed = (row: number, side: Side): boolean => {
  if (side === 'red') return row < 5; // 红方象不能离开下方区域（不能过楚河汉界）
  return row > 4; // 黑方象不能离开上方区域（不能过楚河汉界）
};

// 获取某位置上的棋子
export const getPieceAt = (col: number, row: number, pieces: Piece[]): Piece | undefined => {
  return pieces.find(p => p.position[0] === col && p.position[1] === row);
};

// 计算两点之间的棋子数量（不包括起点和终点）
export const countPiecesBetween = (
  from: Position,
  to: Position,
  pieces: Piece[]
): number => {
  const [fromCol, fromRow] = from;
  const [toCol, toRow] = to;
  
  // 必须是在同一直线上
  if (fromCol !== toCol && fromRow !== toRow) {
    return -1; // 不在同一直线
  }

  const piecesBetween: Piece[] = [];
  const minCol = Math.min(fromCol, toCol);
  const maxCol = Math.max(fromCol, toCol);
  const minRow = Math.min(fromRow, toRow);
  const maxRow = Math.max(fromRow, toRow);

  for (const piece of pieces) {
    const [pCol, pRow] = piece.position;
    // 检查是否在两点之间（不包括端点）
    if (pCol >= minCol && pCol <= maxCol && pRow >= minRow && pRow <= maxRow) {
      if (pCol !== fromCol || pRow !== fromRow) {
        if (pCol !== toCol || pRow !== toRow) {
          piecesBetween.push(piece);
        }
      }
    }
  }

  return piecesBetween.length;
};

// 蹩马腿检查
const isHorseLegBlocked = (col: number, row: number, pieces: Piece[]): boolean => {
  return getPieceAt(col, row, pieces) !== undefined;
};

// 塞象眼检查
const isElephantEyeBlocked = (col: number, row: number, pieces: Piece[]): boolean => {
  return getPieceAt(col, row, pieces) !== undefined;
};

// 获取将帅的有效移动
const getKingMoves = (piece: Piece, pieces: Piece[]): Position[] => {
  const moves: Position[] = [];
  const [col, row] = piece.position;
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  for (const [dc, dr] of directions) {
    const newCol = col + dc;
    const newRow = row + dr;
    if (isOnBoard(newCol, newRow) && isInPalace(newCol, newRow, piece.side)) {
      const target = getPieceAt(newCol, newRow, pieces);
      if (!target || target.side !== piece.side) {
        moves.push([newCol, newRow]);
      }
    }
  }

  return moves;
};

// 获取仕的有效移动
const getAdvisorMoves = (piece: Piece, pieces: Piece[]): Position[] => {
  const moves: Position[] = [];
  const [col, row] = piece.position;
  const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

  for (const [dc, dr] of directions) {
    const newCol = col + dc;
    const newRow = row + dr;
    if (isOnBoard(newCol, newRow) && isInPalace(newCol, newRow, piece.side)) {
      const target = getPieceAt(newCol, newRow, pieces);
      if (!target || target.side !== piece.side) {
        moves.push([newCol, newRow]);
      }
    }
  }

  return moves;
};

// 获取象的有效移动
const getElephantMoves = (piece: Piece, pieces: Piece[]): Position[] => {
  const moves: Position[] = [];
  const [col, row] = piece.position;
  // 象走"田"字，对角线移动，有4个方向
  // 田字格的四个顶点：从(col,row)出发，leg是蹩象眼位置，target是目标位置
  // 田字中心 = (col+±1, row+±1)
  const movesConfig = [
    { leg: [+1, -1], target: [+2, -2] },  // 右上：田字中心(col+1,row-1)，目标(col+2,row-2)
    { leg: [+1, +1], target: [+2, +2] },  // 右下：田字中心(col+1,row+1)，目标(col+2,row+2)
    { leg: [-1, -1], target: [-2, -2] },  // 左上：田字中心(col-1,row-1)，目标(col-2,row-2)
    { leg: [-1, +1], target: [-2, +2] },  // 左下：田字中心(col-1,row+1)，目标(col-2,row+2)
  ];

  for (const config of movesConfig) {
    const legCol = col + config.leg[0];
    const legRow = row + config.leg[1];
    const targetCol = col + config.target[0];
    const targetRow = row + config.target[1];

    if (isOnBoard(targetCol, targetRow) && !isElephantCrossed(targetRow, piece.side)) {
      // 检查象眼是否被堵（蹩象眼）
      if (!isElephantEyeBlocked(legCol, legRow, pieces)) {
        const target = getPieceAt(targetCol, targetRow, pieces);
        if (!target || target.side !== piece.side) {
          moves.push([targetCol, targetRow]);
        }
      }
    }
  }

  return moves;
};

// 获取马的移动
const getHorseMoves = (piece: Piece, pieces: Piece[]): Position[] => {
  const moves: Position[] = [];
  const [col, row] = piece.position;
  // 马走"日"字，有8个方向
  const movesConfig = [
    { leg: [0, 1], target: [1, 2] },    // 右下
    { leg: [0, 1], target: [-1, 2] },   // 左下
    { leg: [0, -1], target: [1, -2] },  // 右右上
    { leg: [0, -1], target: [-1, -2] }, // 左上
    { leg: [1, 0], target: [2, 1] },    // 下右
    { leg: [1, 0], target: [2, -1] },   // 上右
    { leg: [-1, 0], target: [-2, 1] },  // 下左
    { leg: [-1, 0], target: [-2, -1] }, // 上左
  ];

  for (const config of movesConfig) {
    const legCol = col + config.leg[0];
    const legRow = row + config.leg[1];
    const targetCol = col + config.target[0];
    const targetRow = row + config.target[1];

    if (isOnBoard(targetCol, targetRow)) {
      // 检查蹩马腿
      if (!isHorseLegBlocked(legCol, legRow, pieces)) {
        const target = getPieceAt(targetCol, targetRow, pieces);
        if (!target || target.side !== piece.side) {
          moves.push([targetCol, targetRow]);
        }
      }
    }
  }

  return moves;
};

// 获取车的移动
const getChariotMoves = (piece: Piece, pieces: Piece[]): Position[] => {
  const moves: Position[] = [];
  const [col, row] = piece.position;
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  for (const [dc, dr] of directions) {
    let newCol = col + dc;
    let newRow = row + dr;
    
    while (isOnBoard(newCol, newRow)) {
      const target = getPieceAt(newCol, newRow, pieces);
      if (target) {
        if (target.side !== piece.side) {
          moves.push([newCol, newRow]);
        }
        break; // 有棋子就停止继续探测
      }
      moves.push([newCol, newRow]);
      newCol += dc;
      newRow += dr;
    }
  }

  return moves;
};

// 获取炮的移动
const getCannonMoves = (piece: Piece, pieces: Piece[]): Position[] => {
  const moves: Position[] = [];
  const [col, row] = piece.position;
  const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  for (const [dc, dr] of directions) {
    let newCol = col + dc;
    let newRow = row + dr;
    let foundPlatform = false; // 是否找到炮架

    while (isOnBoard(newCol, newRow)) {
      const target = getPieceAt(newCol, newRow, pieces);
      
      if (!foundPlatform) {
        if (target) {
          foundPlatform = true; // 第一个遇到的棋子作为炮架
        } else {
          moves.push([newCol, newRow]); // 移动不吃子
        }
      } else {
        // 已经找到炮架，只能吃子
        if (target) {
          if (target.side !== piece.side) {
            moves.push([newCol, newRow]);
          }
          break; // 无论吃不吃都停止
        }
      }
      
      newCol += dc;
      newRow += dr;
    }
  }

  return moves;
};

// 获取兵的移动
const getPawnMoves = (piece: Piece, pieces: Piece[]): Position[] => {
  const moves: Position[] = [];
  const [col, row] = piece.position;
  
  // 红方在下方（row 7-9），向上走是 row 减小
  // 黑方在上方（row 0-2），向下走是 row 增大
  const forward = piece.side === 'red' ? -1 : 1;
  
  // 过河线：楚河汉界在 row 4-5 之间
  // 红兵过河是到达 row <= 4（黑方区域）
  // 黑卒过河是到达 row >= 5（红方区域）
  const crossedRow = piece.side === 'red' ? 4 : 5;

  // 前进
  const forwardRow = row + forward;
  if (isOnBoard(col, forwardRow)) {
    const target = getPieceAt(col, forwardRow, pieces);
    if (!target || target.side !== piece.side) {
      moves.push([col, forwardRow]);
    }
  }

  // 过河后可以横向移动（到达对方阵地后）
  if ((piece.side === 'red' && row <= crossedRow) || (piece.side === 'black' && row >= crossedRow)) {
    for (const dc of [-1, 1]) {
      const newCol = col + dc;
      if (isOnBoard(newCol, row)) {
        const target = getPieceAt(newCol, row, pieces);
        if (!target || target.side !== piece.side) {
          moves.push([newCol, row]);
        }
      }
    }
  }

  return moves;
};

// 根据棋子类型获取有效移动
export const getValidMoves = (piece: Piece, pieces: Piece[]): Position[] => {
  switch (piece.type) {
    case 'king':
      return getKingMoves(piece, pieces);
    case 'advisor':
      return getAdvisorMoves(piece, pieces);
    case 'elephant':
      return getElephantMoves(piece, pieces);
    case 'horse':
      return getHorseMoves(piece, pieces);
    case 'chariot':
      return getChariotMoves(piece, pieces);
    case 'cannon':
      return getCannonMoves(piece, pieces);
    case 'pawn':
      return getPawnMoves(piece, pieces);
    default:
      return [];
  }
};

// 检查某个移动是否合法（用于结算时验证）
export const isValidMove = (piece: Piece, to: Position, pieces: Piece[]): boolean => {
  const validMoves = getValidMoves(piece, pieces);
  return validMoves.some(m => m[0] === to[0] && m[1] === to[1]);
};

// 检查是否将军
export const isCheck = (side: Side, pieces: Piece[]): boolean => {
  const king = pieces.find(p => p.type === 'king' && p.side === side);
  if (!king) return false;

  const opponentPieces = pieces.filter(p => p.side !== side);
  
  for (const piece of opponentPieces) {
    const moves = getValidMoves(piece, pieces);
    if (moves.some(m => m[0] === king.position[0] && m[1] === king.position[1])) {
      return true;
    }
  }

  return false;
};

// 检查将帅是否面对面
export const isFaceToFace = (pieces: Piece[]): boolean => {
  const redKing = pieces.find(p => p.type === 'king' && p.side === 'red');
  const blackKing = pieces.find(p => p.type === 'king' && p.side === 'black');
  
  if (!redKing || !blackKing) return false;
  
  // 必须在同一列
  if (redKing.position[0] !== blackKing.position[0]) return false;
  
  // 中间没有其他棋子
  const betweenCount = countPiecesBetween(redKing.position, blackKing.position, pieces);
  
  return betweenCount === 0;
};

// 检查位置是否有己方棋子
export const hasOwnPieceAt = (col: number, row: number, pieces: Piece[], side: Side): boolean => {
  const piece = getPieceAt(col, row, pieces);
  return piece !== undefined && piece.side === side;
};

// 检查位置是否有对方棋子
export const hasEnemyPieceAt = (col: number, row: number, pieces: Piece[], side: Side): boolean => {
  const piece = getPieceAt(col, row, pieces);
  return piece !== undefined && piece.side !== side;
};
