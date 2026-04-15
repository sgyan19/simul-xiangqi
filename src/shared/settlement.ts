import { Piece, PendingAction, Position } from '../types';

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
    }
  }
  
  if (blackAction) {
    const blackPiece = finalPieces.find(p => 
      p.side === 'black' && p.position[0] === blackAction.from[0] && p.position[1] === blackAction.from[1]
    );
    if (blackPiece) {
      blackPiece.position = [...blackAction.to] as Position;
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
        // 炮撞炮：同归于尽
        if (movedRedPiece.type === 'cannon' && movedBlackPiece.type === 'cannon') {
          toRemoveByMove.push(movedRedPiece.id, movedBlackPiece.id);
        }
        // 炮撞其他子：炮被吃
        else if (movedRedPiece.type === 'cannon') {
          toRemoveByMove.push(movedRedPiece.id);
        }
        else if (movedBlackPiece.type === 'cannon') {
          toRemoveByMove.push(movedBlackPiece.id);
        }
        // 其他子撞其他子：同归于尽
        else {
          toRemoveByMove.push(movedRedPiece.id, movedBlackPiece.id);
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
      toRemoveByCapture.push(enemyAtTarget.id);
      
      // ===== 新增规则：保护判定 =====
      // 检查红方 capture 的位置是否有黑方其他棋子可以 capture 到
      // 且该棋子本回合策略阶段没有移动
      const redCapturer = pieces.find(p => 
        p.side === 'red' && p.position[0] === redAction.from[0] && p.position[1] === redAction.from[1]
      );
      
      if (redCapturer) {
        // 找到所有黑方棋子（除了被吃掉的）
        const remainingBlackPieces = pieces.filter(p => p.side === 'black' && p.id !== enemyAtTarget.id);
        
        // 检查是否有黑方棋子可以 capture 到红方 capture 位置
        for (const blackPiece of remainingBlackPieces) {
          // 检查这个棋子本回合是否移动了
          const movedThisTurn = blackAction && 
            blackAction.from[0] === blackPiece.position[0] && 
            blackAction.from[1] === blackPiece.position[1];
          
          if (!movedThisTurn) {
            // 这个棋子本回合没有移动，检查它是否可以 capture 到红方 capture 位置
            const canCapture = checkCannonCapture(blackPiece, redAction.to as Position, pieces) ||
              (blackPiece.type !== 'cannon' && getValidMoves(blackPiece, pieces).some(m => m[0] === redAction.to[0] && m[1] === redAction.to[1]));
            
            if (canCapture) {
              // 有保护，红方吃子方也被移除（相当于同归于尽）
              toRemoveByCapture.push(redCapturer.id);
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
      toRemoveByCapture.push(enemyAtTarget.id);
      
      // ===== 新增规则：保护判定 =====
      const blackCapturer = pieces.find(p => 
        p.side === 'black' && p.position[0] === blackAction.from[0] && p.position[1] === blackAction.from[1]
      );
      
      if (blackCapturer) {
        // 找到所有红方棋子（除了被吃掉的）
        const remainingRedPieces = pieces.filter(p => p.side === 'red' && p.id !== enemyAtTarget.id);
        
        // 检查是否有红方棋子可以 capture 到黑方 capture 位置
        for (const redPiece of remainingRedPieces) {
          // 检查这个棋子本回合是否移动了
          const movedThisTurn = redAction && 
            redAction.from[0] === redPiece.position[0] && 
            redAction.from[1] === redPiece.position[1];
          
          if (!movedThisTurn) {
            // 这个棋子本回合没有移动，检查它是否可以 capture 到黑方 capture 位置
            const canCapture = checkCannonCapture(redPiece, blackAction.to as Position, pieces) ||
              (redPiece.type !== 'cannon' && getValidMoves(redPiece, pieces).some(m => m[0] === blackAction.to[0] && m[1] === blackAction.to[1]));
            
            if (canCapture) {
              // 有保护，黑方吃子方也被移除（相当于同归于尽）
              toRemoveByCapture.push(blackCapturer.id);
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
  };
};
