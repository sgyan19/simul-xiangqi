import { GameState, Move, PendingAction, Piece, SettlementResult, Side, Winner, Position } from './types';
import { getPieceAt } from './chessLogic';

// 执行移动（克隆棋子数组后移动）
export const applyMove = (pieces: Piece[], move: Move): Piece[] => {
  const newPieces = pieces.map(p => ({ ...p }));
  const piece = newPieces.find(p => p.position[0] === move.from[0] && p.position[1] === move.from[1]);
  if (piece) {
    piece.position = [...move.to];
  }
  return newPieces;
};

// 执行移动并移除被吃的棋子
export const executeMove = (pieces: Piece[], move: Move): Piece[] => {
  // 找到被移动的棋子和目标位置的棋子
  const pieceToMove = pieces.find(
    p => p.position[0] === move.from[0] && p.position[1] === move.from[1]
  );
  
  if (!pieceToMove) return pieces;
  
  // 过滤掉目标位置的棋子，然后更新被移动棋子的位置
  const newPieces = pieces
    .filter(p => !(p.position[0] === move.to[0] && p.position[1] === move.to[1]))
    .map(p => {
      if (p.id === pieceToMove.id) {
        return { ...p, position: [...move.to] as Position };
      }
      return p;
    });
  
  return newPieces;
};

// 处理冲突：双方移动到同一位置
const handleCollision = (
  pieces: Piece[],
  redMove: Move | null,
  blackMove: Move | null
): { pieces: Piece[]; redCaptured: Piece[]; blackCaptured: Piece[] } => {
  let newPieces = [...pieces];
  const redCaptured: Piece[] = [];
  const blackCaptured: Piece[] = [];

  // 执行黑方移动
  if (blackMove) {
    const targetPiece = getPieceAt(blackMove.to[0], blackMove.to[1], newPieces);
    if (targetPiece) {
      blackCaptured.push({ ...targetPiece });
      newPieces = newPieces.filter(
        p => !(p.position[0] === targetPiece.position[0] && p.position[1] === targetPiece.position[1])
      );
    }
    
    const pieceToMove = newPieces.find(
      p => p.position[0] === blackMove.from[0] && p.position[1] === blackMove.from[1]
    );
    if (pieceToMove) {
      pieceToMove.position = [...blackMove.to];
    }
  }

  // 执行红方移动
  if (redMove) {
    const targetPiece = getPieceAt(redMove.to[0], redMove.to[1], newPieces);
    if (targetPiece) {
      redCaptured.push({ ...targetPiece });
      newPieces = newPieces.filter(
        p => !(p.position[0] === targetPiece.position[0] && p.position[1] === targetPiece.position[1])
      );
    }
    
    const pieceToMove = newPieces.find(
      p => p.position[0] === redMove.from[0] && p.position[1] === redMove.from[1]
    );
    if (pieceToMove) {
      pieceToMove.position = [...redMove.to];
    }
  }

  // 检查是否同归于尽（两个移动的目标位置相同）
  if (redMove && blackMove && 
      redMove.to[0] === blackMove.to[0] && 
      redMove.to[1] === blackMove.to[1]) {
    // 目标位置只有一个棋子（后执行的），需要移除
    // 由于上面已经处理了，现在目标位置应该是空的或者是最后一个移动的棋子
    // 如果两个移动到同一位置，先检查是否有冲突
    
    // 重新检查：移除在目标位置的双方棋子
    const finalPieces = newPieces.filter(
      p => !(p.position[0] === redMove.to[0] && p.position[1] === redMove.to[1])
    );
    
    // 返回同归于尽的结果
    return { 
      pieces: finalPieces, 
      redCaptured: [...redCaptured, ...blackCaptured], // 双方都被吃
      blackCaptured: [...blackCaptured, ...redCaptured]
    };
  }

  return { pieces: newPieces, redCaptured, blackCaptured };
};

// 核心结算逻辑
export const resolveSettlement = (
  pieces: Piece[],
  redMove: Move | null,
  blackMove: Move | null
): SettlementResult => {
  let resultPieces = [...pieces.map(p => ({ ...p }))];
  const redCaptured: Piece[] = [];
  const blackCaptured: Piece[] = [];
  let winner: Winner = null;
  let reason = '';

  // 1. 先检查将帅面对面（同时被吃）
  // 模拟移动后的状态来检查
  const simulatedPieces = [...pieces.map(p => ({ ...p }))];
  
  // 应用红方移动
  if (redMove) {
    const redPiece = simulatedPieces.find(
      p => p.position[0] === redMove.from[0] && p.position[1] === redMove.from[1]
    );
    if (redPiece) {
      redPiece.position = [...redMove.to];
    }
  }
  
  // 应用黑方移动
  if (blackMove) {
    const blackPiece = simulatedPieces.find(
      p => p.position[0] === blackMove.from[0] && p.position[1] === blackMove.from[1]
    );
    if (blackPiece) {
      blackPiece.position = [...blackMove.to];
    }
  }

  // 找到移动后的将帅位置
  const redKing = simulatedPieces.find(p => p.type === 'king' && p.side === 'red');
  const blackKing = simulatedPieces.find(p => p.type === 'king' && p.side === 'black');

  // 2. 执行移动并处理吃子
  // 先移除目标位置的棋子
  if (redMove) {
    const target = resultPieces.find(
      p => p.position[0] === redMove.to[0] && p.position[1] === redMove.to[1]
    );
    if (target) {
      if (target.side === 'red') {
        redCaptured.push({ ...target });
      } else {
        blackCaptured.push({ ...target });
      }
      resultPieces = resultPieces.filter(
        p => !(p.position[0] === redMove.to[0] && p.position[1] === redMove.to[1])
      );
    }
  }

  if (blackMove) {
    const target = resultPieces.find(
      p => p.position[0] === blackMove.to[0] && p.position[1] === blackMove.to[1]
    );
    if (target) {
      if (target.side === 'red') {
        redCaptured.push({ ...target });
      } else {
        blackCaptured.push({ ...target });
      }
      resultPieces = resultPieces.filter(
        p => !(p.position[0] === blackMove.to[0] && p.position[1] === blackMove.to[1])
      );
    }
  }

  // 然后执行移动
  if (redMove) {
    const piece = resultPieces.find(
      p => p.position[0] === redMove.from[0] && p.position[1] === redMove.from[1]
    );
    if (piece) {
      piece.position = [...redMove.to];
    }
  }

  if (blackMove) {
    const piece = resultPieces.find(
      p => p.position[0] === blackMove.from[0] && p.position[1] === blackMove.from[1]
    );
    if (piece) {
      piece.position = [...blackMove.to];
    }
  }

  // 3. 检查将帅面对面
  const finalRedKing = resultPieces.find(p => p.type === 'king' && p.side === 'red');
  const finalBlackKing = resultPieces.find(p => p.type === 'king' && p.side === 'black');

  if (finalRedKing && finalBlackKing) {
    if (finalRedKing.position[0] === finalBlackKing.position[0]) {
      // 检查中间是否有其他棋子
      const betweenPieces = resultPieces.filter(p => {
        if (p.type === 'king') return false;
        const col = p.position[0];
        const row = p.position[1];
        const minRow = Math.min(finalRedKing.position[1], finalBlackKing.position[1]);
        const maxRow = Math.max(finalRedKing.position[1], finalBlackKing.position[1]);
        return col === finalRedKing.position[0] && row > minRow && row < maxRow;
      });

      if (betweenPieces.length === 0) {
        // 将帅面对面，同时被吃
        redCaptured.push({ ...finalRedKing });
        blackCaptured.push({ ...finalBlackKing });
        resultPieces = resultPieces.filter(p => p.type !== 'king');
        winner = 'draw';
        reason = '将帅面对面，双方同时被吃';
      }
    }
  }

  // 4. 如果没有和棋，检查是否有一方将帅被吃
  if (!winner) {
    if (!finalRedKing) {
      winner = 'black';
      reason = '红帅被吃，黑方获胜';
    } else if (!finalBlackKing) {
      winner = 'red';
      reason = '黑将被吃，红方获胜';
    }
  }

  // 5. 检查同归于尽（双方移动到同一位置）
  if (!winner && redMove && blackMove) {
    if (redMove.to[0] === blackMove.to[0] && redMove.to[1] === blackMove.to[1]) {
      // 找到在目标位置的棋子并移除
      const captured = resultPieces.filter(
        p => p.position[0] === redMove.to[0] && p.position[1] === redMove.to[1]
      );
      
      for (const c of captured) {
        if (c.side === 'red') {
          redCaptured.push(c);
        } else {
          blackCaptured.push(c);
        }
      }
      
      resultPieces = resultPieces.filter(
        p => !(p.position[0] === redMove.to[0] && p.position[1] === redMove.to[1])
      );
      
      // 如果移除的是将帅
      const capturedKings = captured.filter(p => p.type === 'king');
      if (capturedKings.length === 2) {
        winner = 'draw';
        reason = '双方棋子同归于尽';
      } else if (capturedKings.length === 1) {
        winner = capturedKings[0].side === 'red' ? 'black' : 'red';
        reason = capturedKings[0].side === 'red' ? '红帅被吃' : '黑将被吃';
      }
    }
  }

  return {
    redMove,
    blackMove,
    captures: { red: redCaptured, black: blackCaptured },
    winner,
    reason,
  };
};

// 检查游戏是否结束
export const checkGameEnd = (pieces: Piece[]): { ended: boolean; winner: Winner } => {
  const redKing = pieces.find(p => p.type === 'king' && p.side === 'red');
  const blackKing = pieces.find(p => p.type === 'king' && p.side === 'black');

  if (!redKing || !blackKing) {
    if (!redKing && !blackKing) {
      return { ended: true, winner: 'draw' };
    }
    return { ended: true, winner: redKing ? 'red' : 'black' };
  }

  return { ended: false, winner: null };
};

// 获取当前操作方的提示信息
export const getCurrentHint = (state: GameState): string => {
  if (state.phase === 'strategy') {
    if (state.currentOperatedSide === 'red') {
      if (state.redConfirmed) {
        return '等待黑方确认策略...';
      }
      return '红方策略阶段 - 选择棋子移动';
    } else {
      if (state.blackConfirmed) {
        return '等待红方确认策略...';
      }
      return '黑方策略阶段 - 选择棋子移动';
    }
  } else if (state.phase === 'settlement') {
    return '结算中...';
  } else {
    return '游戏结束';
  }
};

// 格式化移动为中文描述
export const formatMove = (move: Move | PendingAction): string => {
  const cols = '九八七六五四三二一'.split('');
  const rows = '零一二三四五六七八九'.split('');
  const fromDesc = cols[move.from[0]] + rows[9 - move.from[1]];
  const toDesc = cols[move.to[0]] + rows[9 - move.to[1]];
  return `${fromDesc} → ${toDesc}`;
};
