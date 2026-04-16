import { Piece, PendingAction, Position } from '../types';
import { PieceRemovalRecord, RoundHistoryEntry, SettlementEvent, getPieceName, formatChessNotation } from './history';

// 长捉状态
export interface LongChaseState {
  redLastPiece: string | null;
  redLastTarget: string | null;
  redCaptureCount: number;
  blackLastPiece: string | null;
  blackLastTarget: string | null;
  blackCaptureCount: number;
}

// 结算结果
export interface SettlementResultData {
  pieces: Piece[];
  winner: 'red' | 'black' | 'draw' | null;
  reason: string;
  newChaseState: LongChaseState;
  historyEntry: RoundHistoryEntry;
}

// ==================== 棋子移动规则 ====================

const COLS = 9;
const ROWS = 10;

// 检查位置是否在棋盘内
const isOnBoard = (col: number, row: number): boolean => {
  return col >= 0 && col < COLS && row >= 0 && row < ROWS;
};

// 检查位置是否在九宫
const isInPalace = (col: number, row: number, side: 'red' | 'black'): boolean => {
  if (side === 'red') {
    return col >= 3 && col <= 5 && row >= 7 && row <= 9;
  }
  return col >= 3 && col <= 5 && row >= 0 && row <= 2;
};

// 获取某位置上的棋子
const getPieceAt = (col: number, row: number, pieces: Piece[]): Piece | undefined => {
  return pieces.find(p => p.position[0] === col && p.position[1] === row);
};

// 蹩马腿检查
const isHorseLegBlocked = (col: number, row: number, pieces: Piece[]): boolean => {
  return getPieceAt(col, row, pieces) !== undefined;
};

// 塞象眼检查
const isElephantEyeBlocked = (col: number, row: number, pieces: Piece[]): boolean => {
  return getPieceAt(col, row, pieces) !== undefined;
};

// 象不能过河
const isElephantCrossed = (row: number, side: 'red' | 'black'): boolean => {
  if (side === 'red') return row < 5;
  return row > 4;
};

// 蹩象眼检查
const isElephantBlocked = (col: number, row: number, pieces: Piece[]): boolean => {
  return getPieceAt(col, row, pieces) !== undefined;
};

/**
 * 获取棋子的有效移动位置列表
 */
export const getValidMoves = (piece: Piece, pieces: Piece[]): Position[] => {
  const moves: Position[] = [];
  const [col, row] = piece.position;

  switch (piece.type) {
    case 'king': {
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
      break;
    }
    case 'advisor': {
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
      break;
    }
    case 'elephant': {
      const movesConfig = [
        { leg: [+1, -1], target: [+2, -2] },
        { leg: [+1, +1], target: [+2, +2] },
        { leg: [-1, -1], target: [-2, -2] },
        { leg: [-1, +1], target: [-2, +2] },
      ];
      for (const config of movesConfig) {
        const legCol = col + config.leg[0];
        const legRow = row + config.leg[1];
        const targetCol = col + config.target[0];
        const targetRow = row + config.target[1];
        if (isOnBoard(targetCol, targetRow) && !isElephantCrossed(targetRow, piece.side)) {
          if (!isElephantBlocked(legCol, legRow, pieces)) {
            const target = getPieceAt(targetCol, targetRow, pieces);
            if (!target || target.side !== piece.side) {
              moves.push([targetCol, targetRow]);
            }
          }
        }
      }
      break;
    }
    case 'horse': {
      const movesConfig = [
        { leg: [0, 1], target: [1, 2] },
        { leg: [0, 1], target: [-1, 2] },
        { leg: [0, -1], target: [1, -2] },
        { leg: [0, -1], target: [-1, -2] },
        { leg: [1, 0], target: [2, 1] },
        { leg: [1, 0], target: [2, -1] },
        { leg: [-1, 0], target: [-2, 1] },
        { leg: [-1, 0], target: [-2, -1] },
      ];
      for (const config of movesConfig) {
        const legCol = col + config.leg[0];
        const legRow = row + config.leg[1];
        const targetCol = col + config.target[0];
        const targetRow = row + config.target[1];
        if (isOnBoard(targetCol, targetRow)) {
          if (!isHorseLegBlocked(legCol, legRow, pieces)) {
            const target = getPieceAt(targetCol, targetRow, pieces);
            if (!target || target.side !== piece.side) {
              moves.push([targetCol, targetRow]);
            }
          }
        }
      }
      break;
    }
    case 'chariot': {
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
            break;
          }
          moves.push([newCol, newRow]);
          newCol += dc;
          newRow += dr;
        }
      }
      break;
    }
    case 'cannon': {
      const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [dc, dr] of directions) {
        let newCol = col + dc;
        let newRow = row + dr;
        let foundPlatform = false;
        while (isOnBoard(newCol, newRow)) {
          const target = getPieceAt(newCol, newRow, pieces);
          if (!foundPlatform) {
            if (target) {
              foundPlatform = true;
            } else {
              moves.push([newCol, newRow]);
            }
          } else {
            if (target) {
              if (target.side !== piece.side) {
                moves.push([newCol, newRow]);
              }
              break;
            }
          }
          newCol += dc;
          newRow += dr;
        }
      }
      break;
    }
    case 'pawn': {
      const forward = piece.side === 'red' ? -1 : 1;
      const crossedRow = piece.side === 'red' ? 4 : 5;
      
      const forwardRow = row + forward;
      if (isOnBoard(col, forwardRow)) {
        const target = getPieceAt(col, forwardRow, pieces);
        if (!target || target.side !== piece.side) {
          moves.push([col, forwardRow]);
        }
      }
      
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
      break;
    }
  }

  return moves;
};

/**
 * 检查某方阵营是否有棋子可以 capture 到指定位置
 * 区别于 move，capture 需要在路径上有炮台
 */
const findProtector = (
  side: 'red' | 'black',
  targetPos: Position,
  pieces: Piece[],
  excludePieceId?: string
): Piece | null => {
  const enemySide = side;
  
  // 找到所有敌方棋子
  const enemyPieces = pieces.filter(p => p.side === enemySide && p.id !== excludePieceId);
  
  // 检查是否有敌方棋子可以 capture 到目标位置
  for (const enemyPiece of enemyPieces) {
    const validMoves = getValidMoves(enemyPiece, pieces);
    // 检查是否有 move 可以到达目标
    // 注意：对于炮，move 和 capture 都可能被返回
    // 我们需要检查是否有炮台可以 capture 到这里
    if (validMoves.some(m => m[0] === targetPos[0] && m[1] === targetPos[1])) {
      // 进一步验证：检查是否有有效的炮台
      // 对于非炮棋子，只要在 validMoves 中就可以
      if (enemyPiece.type !== 'cannon') {
        return enemyPiece;
      }
      // 对于炮，需要确保炮台存在
      // 重新检查炮的 capture 能力
      const canCapture = checkCannonCapture(enemyPiece, targetPos, pieces);
      if (canCapture) {
        return enemyPiece;
      }
    }
  }
  
  return null;
};

/**
 * 检查炮是否可以 capture 到目标位置
 */
const checkCannonCapture = (cannon: Piece, targetPos: Position, pieces: Piece[]): boolean => {
  const [cCol, cRow] = cannon.position;
  const [tCol, tRow] = targetPos;
  
  // 必须是同一列或同一行
  if (cCol !== tCol && cRow !== tRow) {
    return false;
  }
  
  const dc = cCol === tCol ? 0 : (tCol - cCol) / Math.abs(tCol - cCol);
  const dr = cRow === tRow ? 0 : (tRow - cRow) / Math.abs(tRow - cRow);
  
  // 找到目标和起点之间的炮台
  let midCol = cCol + dc;
  let midRow = cRow + dr;
  let foundPlatform = false;
  
  while (midCol !== tCol || midRow !== tRow) {
    const midPiece = getPieceAt(midCol, midRow, pieces);
    if (midPiece) {
      if (foundPlatform) {
        // 已经找到炮台，又遇到棋子，不是有效的 capture
        return false;
      }
      foundPlatform = true;
    }
    midCol += dc;
    midRow += dr;
  }
  
  // 目标位置必须是敌方棋子
  const targetPiece = getPieceAt(tCol, tRow, pieces);
  if (!targetPiece || targetPiece.side === cannon.side) {
    return false;
  }
  
  // 需要有炮台且目标是敌方棋子
  return foundPlatform;
};

/**
 * 检查两点之间的路径是否畅通（用于车、炮的路径检查）
 * 注意：检查的是原始 pieces 棋盘，不包括即将被吃掉的棋子
 */
const isPathClearBetween = (
  fromCol: number, fromRow: number,
  toCol: number, toRow: number,
  pieces: Piece[]
): boolean => {
  // 必须是同一行或同一列
  if (fromCol !== toCol && fromRow !== toRow) {
    return false;
  }
  
  const dc = fromCol === toCol ? 0 : (toCol - fromCol) / Math.abs(toCol - fromCol);
  const dr = fromRow === toRow ? 0 : (toRow - fromRow) / Math.abs(toRow - fromRow);
  
  let col = fromCol + dc;
  let row = fromRow + dr;
  
  // 遍历路径上的每个格子
  while (col !== toCol || row !== toRow) {
    const pieceAtPos = getPieceAt(col, row, pieces);
    if (pieceAtPos) {
      // 有棋子阻挡，路径不畅通
      return false;
    }
    col += dc;
    row += dr;
  }
  
  return true;
};

/**
 * 检查棋子能否 capture 到指定位置
 * 使用原始棋盘 pieces（capture 发生前）
 */
const canPieceCaptureAt = (piece: Piece, targetPos: Position, pieces: Piece[]): boolean => {
  const [pCol, pRow] = piece.position;
  const [tCol, tRow] = targetPos;
  
  switch (piece.type) {
    case 'king':
      // 将帅只能走一步，且必须在九宫内
      if (Math.abs(tCol - pCol) + Math.abs(tRow - pRow) !== 1) return false;
      return isInPalace(tCol, tRow, piece.side);
    
    case 'advisor':
      // 士斜走一步，且必须在九宫内
      if (Math.abs(tCol - pCol) === 1 && Math.abs(tRow - pRow) === 1) {
        return isInPalace(tCol, tRow, piece.side);
      }
      return false;
    
    case 'elephant':
      // 象田字走，过河限制
      if (Math.abs(tCol - pCol) === 2 && Math.abs(tRow - pRow) === 2) {
        const midCol = (pCol + tCol) / 2;
        const midRow = (pRow + tRow) / 2;
        const midPiece = getPieceAt(midCol, midRow, pieces);
        if (!midPiece && !isElephantCrossed(tRow, piece.side)) {
          return true;
        }
      }
      return false;
    
    case 'horse':
      // 马走日
      const horseMoves = [
        { leg: [0, 1], target: [1, 2] },
        { leg: [0, 1], target: [-1, 2] },
        { leg: [0, -1], target: [1, -2] },
        { leg: [0, -1], target: [-1, -2] },
        { leg: [1, 0], target: [2, 1] },
        { leg: [1, 0], target: [2, -1] },
        { leg: [-1, 0], target: [-2, 1] },
        { leg: [-1, 0], target: [-2, -1] },
      ];
      for (const move of horseMoves) {
        const legCol = pCol + move.leg[0];
        const legRow = pRow + move.leg[1];
        const targetCol = pCol + move.target[0];
        const targetRow = pRow + move.target[1];
        
        if (targetCol === tCol && targetRow === tRow) {
          // 检查蹩马腿
          if (!getPieceAt(legCol, legRow, pieces)) {
            return true;
          }
        }
      }
      return false;
    
    case 'chariot':
      // 车直线，路径畅通即可
      return isPathClearBetween(pCol, pRow, tCol, tRow, pieces);
    
    case 'cannon':
      // 炮吃子需要炮台，必须在同一行或同一列
      // 先验证是否在同一直线上
      if (pCol !== tCol && pRow !== tRow) return false;
      
      // 计算方向增量（只有不在同一点时才计算，否则会除以0）
      let dc = 0;
      let dr = 0;
      if (pCol !== tCol) {
        dc = (tCol - pCol) / Math.abs(tCol - pCol);
      }
      if (pRow !== tRow) {
        dr = (tRow - pRow) / Math.abs(tRow - pRow);
      }
      
      let midCol = pCol + dc;
      let midRow = pRow + dr;
      let foundPlatform = false;
      
      // 扫描路径上的每个位置（不包括起点和终点）
      while (midCol !== tCol || midRow !== tRow) {
        const midPiece = getPieceAt(midCol, midRow, pieces);
        if (midPiece) {
          if (foundPlatform) {
            return false; // 两个炮台，不行
          }
          foundPlatform = true;
        }
        midCol += dc;
        midRow += dr;
      }
      
      // 需要恰好一个炮台
      return foundPlatform;
    
    case 'pawn':
      // 兵
      const forward = piece.side === 'red' ? -1 : 1;
      const crossedRow = piece.side === 'red' ? 4 : 5;
      
      // 前进一格
      if (tCol === pCol && tRow === pRow + forward) {
        return true;
      }
      // 过河后可横向
      if ((piece.side === 'red' && pRow <= crossedRow) || (piece.side === 'black' && pRow >= crossedRow)) {
        if (tRow === pRow && (tCol === pCol - 1 || tCol === pCol + 1)) {
          return true;
        }
      }
      return false;
    
    default:
      return false;
  }
};

/**
 * 执行同时制象棋结算
 * @param pieces - 当前棋子数组
 * @param redAction - 红方行动
 * @param blackAction - 黑方行动
 * @param chaseState - 当前长捉状态
 * @returns 结算结果
 */
export const executeSettlement = (
  pieces: Piece[],
  redAction: PendingAction | null,
  blackAction: PendingAction | null,
  chaseState: LongChaseState
): SettlementResultData => {
  // 复制棋子数组
  let finalPieces = pieces.map(p => ({ ...p }));
  
  // ===== 历史记录追踪 =====
  const redPieceRemoved: PieceRemovalRecord[] = [];
  const blackPieceRemoved: PieceRemovalRecord[] = [];
  const events: SettlementEvent[] = [];
  
  // ===== 记录 capture 目标位置（用于后续检查保护） =====
  const redCaptureTargetPos: Position | null = redAction?.actionType === 'capture' 
    ? [...redAction.to] as Position 
    : null;
  const blackCaptureTargetPos: Position | null = blackAction?.actionType === 'capture'
    ? [...blackAction.to] as Position
    : null;
  
  // 记录被吃的棋子 ID（原始位置，用于查找保护）
  const redTargetPieceId = redCaptureTargetPos
    ? pieces.find(p => p.side === 'black' && p.position[0] === redCaptureTargetPos[0] && p.position[1] === redCaptureTargetPos[1])?.id
    : null;
  const blackTargetPieceId = blackCaptureTargetPos
    ? pieces.find(p => p.side === 'red' && p.position[0] === blackCaptureTargetPos[0] && p.position[1] === blackCaptureTargetPos[1])?.id
    : null;
  
  // ===== 第一步：执行所有移动（move 和 capture 都移动到目标位置） =====
  if (redAction) {
    const redPiece = finalPieces.find(p => 
      p.side === 'red' && p.position[0] === redAction.from[0] && p.position[1] === redAction.from[1]
    );
    if (redPiece) {
      redPiece.position = [...redAction.to] as Position;
      // 记录移动事件
      events.push({
        type: 'move',
        description: `[红-移动]${formatChessNotation(redAction.from, redAction.to, redPiece.type, 'red')}`,
      });
    }
  }
  
  if (blackAction) {
    const blackPiece = finalPieces.find(p => 
      p.side === 'black' && p.position[0] === blackAction.from[0] && p.position[1] === blackAction.from[1]
    );
    if (blackPiece) {
      blackPiece.position = [...blackAction.to] as Position;
      // 记录移动事件
      events.push({
        type: 'move',
        description: `[黑-移动]${formatChessNotation(blackAction.from, blackAction.to, blackPiece.type, 'black')}`,
      });
    }
  }
  
  // ===== 第二步：处理 move + move 冲突（只针对 move 类型的行动） =====
  const toRemoveByMove: string[] = [];
  
  if (redAction?.actionType === 'move' && blackAction?.actionType === 'move') {
    if (redAction.to[0] === blackAction.to[0] && redAction.to[1] === blackAction.to[1]) {
      const movedRedPiece = finalPieces.find(p => 
        p.side === 'red' && p.position[0] === redAction.to[0] && p.position[1] === redAction.to[1]
      );
      const movedBlackPiece = finalPieces.find(p => 
        p.side === 'black' && p.position[0] === blackAction.to[0] && p.position[1] === blackAction.to[1]
      );
      
      if (movedRedPiece && movedBlackPiece) {
        // 记录冲突事件
        events.push({
          type: 'collision',
          description: `[兑子]红${getPieceName(movedRedPiece.type, 'red')}与黑${getPieceName(movedBlackPiece.type, 'black')}同归于尽`,
        });
        
        // 炮撞炮：同归于尽
        if (movedRedPiece.type === 'cannon' && movedBlackPiece.type === 'cannon') {
          toRemoveByMove.push(movedRedPiece.id, movedBlackPiece.id);
          redPieceRemoved.push({ piece: { ...movedRedPiece }, reason: 'exchange' });
          blackPieceRemoved.push({ piece: { ...movedBlackPiece }, reason: 'exchange' });
        }
        // 炮撞其他子：炮被吃
        else if (movedRedPiece.type === 'cannon') {
          toRemoveByMove.push(movedRedPiece.id);
          redPieceRemoved.push({ piece: { ...movedRedPiece }, reason: 'exchange' });
        }
        else if (movedBlackPiece.type === 'cannon') {
          toRemoveByMove.push(movedBlackPiece.id);
          blackPieceRemoved.push({ piece: { ...movedBlackPiece }, reason: 'exchange' });
        }
        // 其他子撞其他子：同归于尽
        else {
          toRemoveByMove.push(movedRedPiece.id, movedBlackPiece.id);
          redPieceRemoved.push({ piece: { ...movedRedPiece }, reason: 'exchange' });
          blackPieceRemoved.push({ piece: { ...movedBlackPiece }, reason: 'exchange' });
        }
      }
    }
  }
  
  finalPieces = finalPieces.filter(p => !toRemoveByMove.includes(p.id));
  
  // ===== 第三步：处理 capture 吃子判定 =====
  const toRemoveByCapture: string[] = [];
  
  // 红方 capture
  if (redAction?.actionType === 'capture') {
    const enemyAtTarget = finalPieces.find(p => 
      p.side === 'black' && p.position[0] === redAction.to[0] && p.position[1] === redAction.to[1]
    );
    if (enemyAtTarget) {
      // 获取原始红方吃子棋子的信息
      const redCapturer = pieces.find(p => 
        p.side === 'red' && p.position[0] === redAction.from[0] && p.position[1] === redAction.from[1]
      );
      
      // 记录正常吃子
      blackPieceRemoved.push({
        piece: { ...enemyAtTarget },
        reason: 'captured',
        removedBy: redCapturer ? { side: 'red', pieceType: redCapturer.type, pieceId: redCapturer.id } : undefined,
      });
      
      events.push({
        type: 'capture',
        description: `[吃子]${formatChessNotation(redAction.from, redAction.to, redCapturer?.type || 'unknown', 'red')}，目标：黑${getPieceName(enemyAtTarget.type, 'black')}`,
      });
      
      toRemoveByCapture.push(enemyAtTarget.id);
      
      // ===== 新增规则：保护判定 =====
      // 红炮现在在 redAction.to 位置
      // 检查黑方其他棋子（不含被吃的 enemyAtTarget）能否 capture 这个位置
      // 用原始 pieces 检查（capture 前的棋盘）
      if (redCapturer) {
        // 找到所有黑方棋子（排除被吃掉的）
        const remainingBlackPieces = pieces.filter(p => p.side === 'black' && p.id !== enemyAtTarget.id);
        
        for (const blackPiece of remainingBlackPieces) {
          // 检查这个棋子本回合是否移动了
          let movedThisTurn = false;
          if (blackAction) {
            if (blackAction.from[0] === blackPiece.position[0] && 
                blackAction.from[1] === blackPiece.position[1]) {
              movedThisTurn = true;
            }
          }
          
          if (!movedThisTurn) {
            // 本回合没移动，检查这个棋子能否 capture 到红炮新位置
            const canCapture = canPieceCaptureAt(blackPiece, redAction.to as Position, pieces);
            
            if (canCapture) {
              // 红炮被保护，也移除红炮（防守反击）
              toRemoveByCapture.push(redCapturer.id);
              redPieceRemoved.push({
                piece: { ...redCapturer, position: [...redAction.to] as Position },
                reason: 'counter_attack',
                removedBy: { side: 'black', pieceType: blackPiece.type, pieceId: blackPiece.id },
              });
              events.push({
                type: 'counter_attack',
                description: `[防反]红${getPieceName(redCapturer.type, 'red')}被黑${getPieceName(blackPiece.type, 'black')}反吃`,
              });
              break;
            }
          }
        }
      }
    }
  }
  
  // 黑方 capture
  if (blackAction?.actionType === 'capture') {
    const enemyAtTarget = finalPieces.find(p => 
      p.side === 'red' && p.position[0] === blackAction.to[0] && p.position[1] === blackAction.to[1]
    );
    if (enemyAtTarget) {
      // 获取原始黑方吃子棋子的信息
      const blackCapturer = pieces.find(p => 
        p.side === 'black' && p.position[0] === blackAction.from[0] && p.position[1] === blackAction.from[1]
      );
      
      // 记录正常吃子
      redPieceRemoved.push({
        piece: { ...enemyAtTarget },
        reason: 'captured',
        removedBy: blackCapturer ? { side: 'black', pieceType: blackCapturer.type, pieceId: blackCapturer.id } : undefined,
      });
      
      events.push({
        type: 'capture',
        description: `[吃子]${formatChessNotation(blackAction.from, blackAction.to, blackCapturer?.type || 'unknown', 'black')}，目标：红${getPieceName(enemyAtTarget.type, 'red')}`,
      });
      
      toRemoveByCapture.push(enemyAtTarget.id);
      
      if (blackCapturer) {
        // 找到所有红方棋子（排除被吃的 enemyAtTarget）
        const allRedPieces = pieces.filter(p => p.side === 'red' && p.id !== enemyAtTarget.id);
        
        for (const redPiece of allRedPieces) {
          // 检查这个棋子本回合是否移动了
          let movedThisTurn = false;
          if (redAction) {
            if (redAction.from[0] === redPiece.position[0] && 
                redAction.from[1] === redPiece.position[1]) {
              movedThisTurn = true;
            }
          }
          
          if (!movedThisTurn) {
            // 本回合没移动，检查能否 capture 到黑炮新位置
            const canCapture = canPieceCaptureAt(redPiece, blackAction.to as Position, pieces);
            
            if (canCapture) {
              toRemoveByCapture.push(blackCapturer.id);
              blackPieceRemoved.push({
                piece: { ...blackCapturer, position: [...blackAction.to] as Position },
                reason: 'counter_attack',
                removedBy: { side: 'red', pieceType: redPiece.type, pieceId: redPiece.id },
              });
              events.push({
                type: 'counter_attack',
                description: `[防反]黑${getPieceName(blackCapturer.type, 'black')}被红${getPieceName(redPiece.type, 'red')}反吃`,
              });
              break;
            }
          }
        }
      }
    }
  }
  
  finalPieces = finalPieces.filter(p => !toRemoveByCapture.includes(p.id));
  
  // ===== 第四步：更新长捉计数 =====
  let newRedLastPiece: string | null = null;
  let newRedLastTarget: string | null = null;
  let newRedCaptureCount = 0;
  let newBlackLastPiece: string | null = null;
  let newBlackLastTarget: string | null = null;
  let newBlackCaptureCount = 0;

  // 红方
  if (redAction) {
    if (redAction.actionType === 'move') {
      newRedLastPiece = null;
      newRedLastTarget = null;
      newRedCaptureCount = 0;
    } else {
      const pieceId = pieces.find(p => p.side === 'red' && p.position[0] === redAction.from[0] && p.position[1] === redAction.from[1])?.id || null;
      const targetId = pieces.find(p => p.side === 'black' && p.position[0] === redAction.to[0] && p.position[1] === redAction.to[1])?.id || null;
      
      if (pieceId === chaseState.redLastPiece && targetId === chaseState.redLastTarget) {
        newRedLastPiece = pieceId;
        newRedLastTarget = targetId;
        newRedCaptureCount = chaseState.redCaptureCount + 1;
      } else {
        newRedLastPiece = pieceId;
        newRedLastTarget = targetId;
        newRedCaptureCount = 1;
      }
    }
  }

  // 黑方
  if (blackAction) {
    if (blackAction.actionType === 'move') {
      newBlackLastPiece = null;
      newBlackLastTarget = null;
      newBlackCaptureCount = 0;
    } else {
      const pieceId = pieces.find(p => p.side === 'black' && p.position[0] === blackAction.from[0] && p.position[1] === blackAction.from[1])?.id || null;
      const targetId = pieces.find(p => p.side === 'red' && p.position[0] === blackAction.to[0] && p.position[1] === blackAction.to[1])?.id || null;
      
      if (pieceId === chaseState.blackLastPiece && targetId === chaseState.blackLastTarget) {
        newBlackLastPiece = pieceId;
        newBlackLastTarget = targetId;
        newBlackCaptureCount = chaseState.blackCaptureCount + 1;
      } else {
        newBlackLastPiece = pieceId;
        newBlackLastTarget = targetId;
        newBlackCaptureCount = 1;
      }
    }
  }

  // ===== 第五步：检查将帅面对面和胜负 =====
  const redKing = finalPieces.find(p => p.type === 'king' && p.side === 'red');
  const blackKing = finalPieces.find(p => p.type === 'king' && p.side === 'black');
  let winner: 'red' | 'black' | 'draw' | null = null;
  let reason = '';

  // 将帅面对面
  if (redKing && blackKing && redKing.position[0] === blackKing.position[0]) {
    const between = finalPieces.filter(p => {
      if (p.type === 'king') return false;
      return p.position[0] === redKing.position[0] &&
             p.position[1] > Math.min(redKing.position[1], blackKing.position[1]) &&
             p.position[1] < Math.max(redKing.position[1], blackKing.position[1]);
    });

    if (between.length === 0) {
      // 记录将帅被移除
      redPieceRemoved.push({ piece: { ...redKing }, reason: 'face_off' });
      blackPieceRemoved.push({ piece: { ...blackKing }, reason: 'face_off' });
      events.push({
        type: 'face_off',
        description: '[将对将]双方同归于尽',
      });
      
      finalPieces = finalPieces.filter(p => p.type !== 'king');
      winner = 'draw';
      reason = '将帅对面，双方同时被吃';
    }
  }

  // 检查胜负（通过是否还有将帅）
  if (!winner) {
    if (!redKing) {
      winner = 'black';
      reason = '红帅被吃，黑方获胜';
    } else if (!blackKing) {
      winner = 'red';
      reason = '黑将被吃，红方获胜';
    }
  }

  return {
    pieces: finalPieces,
    winner,
    reason,
    newChaseState: {
      redLastPiece: newRedLastPiece,
      redLastTarget: newRedLastTarget,
      redCaptureCount: newRedCaptureCount,
      blackLastPiece: newBlackLastPiece,
      blackLastTarget: newBlackLastTarget,
      blackCaptureCount: newBlackCaptureCount,
    },
    historyEntry: {
      logicRound: 0, // 由调用方设置
      gameRound: 0, // 由调用方设置
      redAction,
      blackAction,
      redPieceRemoved,
      blackPieceRemoved,
      events,
      winner,
      endReason: reason || null,
      isGameEnd: winner !== null,
    },
  };
};
