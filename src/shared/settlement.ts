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
  
  if (redAction?.actionType === 'capture') {
    const enemyAtTarget = finalPieces.find(p => 
      p.side === 'black' && p.position[0] === redAction.to[0] && p.position[1] === redAction.to[1]
    );
    if (enemyAtTarget) {
      toRemoveByCapture.push(enemyAtTarget.id);
    }
  }
  
  if (blackAction?.actionType === 'capture') {
    const enemyAtTarget = finalPieces.find(p => 
      p.side === 'red' && p.position[0] === blackAction.to[0] && p.position[1] === blackAction.to[1]
    );
    if (enemyAtTarget) {
      toRemoveByCapture.push(enemyAtTarget.id);
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
