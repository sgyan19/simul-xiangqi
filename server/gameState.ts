// 服务端游戏状态管理
// 负责棋盘规则、游戏逻辑、双人对战状态同步

import { Piece, Position, Side, PieceType, INITIAL_PIECES, ActionType } from '../src/types';

// 待执行行动
interface ServerPendingAction {
  from: Position;
  to: Position;
  actionType: ActionType;
}

// 房间状态
export interface GameRoom {
  id: string;
  redPlayer: string | null;  // WebSocket ID
  blackPlayer: string | null; // WebSocket ID
  pieces: Piece[];
  phase: 'waiting' | 'strategy' | 'settlement' | 'ended';
  currentOperatedSide: Side;
  redConfirmed: boolean;
  blackConfirmed: boolean;
  redPendingMove: ServerPendingAction | null;
  blackPendingMove: ServerPendingAction | null;
  winner: Side | 'draw' | null;
  createdAt: number;
}

// 棋盘尺寸
const COLS = 9;
const ROWS = 10;

// 存储所有房间
const rooms: Map<string, GameRoom> = new Map();

// 生成房间ID
export const generateRoomId = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// 创建新房间
export const createRoom = (roomId: string): GameRoom => {
  const room: GameRoom = {
    id: roomId,
    redPlayer: null,
    blackPlayer: null,
    pieces: INITIAL_PIECES.map(p => ({ ...p })),
    phase: 'waiting',
    currentOperatedSide: 'red',
    redConfirmed: false,
    blackConfirmed: false,
    redPendingMove: null,
    blackPendingMove: null,
    winner: null,
    createdAt: Date.now(),
  };
  rooms.set(roomId, room);
  return room;
};

// 获取房间
export const getRoom = (roomId: string): GameRoom | undefined => {
  return rooms.get(roomId);
};

// 获取所有房间
export const getAllRooms = (): GameRoom[] => {
  return Array.from(rooms.values());
};

// 删除房间
export const deleteRoom = (roomId: string): void => {
  rooms.delete(roomId);
};

// 玩家加入房间
export const joinRoom = (roomId: string, playerId: string, side: Side): boolean => {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  if (side === 'red' && !room.redPlayer) {
    room.redPlayer = playerId;
    return true;
  }
  if (side === 'black' && !room.blackPlayer) {
    room.blackPlayer = playerId;
    return true;
  }
  return false;
};

// 玩家离开房间
export const leaveRoom = (roomId: string, playerId: string): void => {
  const room = rooms.get(roomId);
  if (!room) return;
  
  if (room.redPlayer === playerId) {
    room.redPlayer = null;
  }
  if (room.blackPlayer === playerId) {
    room.blackPlayer = null;
  }
  
  // 如果房间空了，删除房间
  if (!room.redPlayer && !room.blackPlayer) {
    rooms.delete(roomId);
  }
};

// 获取玩家所在房间
export const getPlayerRoom = (playerId: string): GameRoom | undefined => {
  for (const room of rooms.values()) {
    if (room.redPlayer === playerId || room.blackPlayer === playerId) {
      return room;
    }
  }
  return undefined;
};

// 验证玩家是否为某方
export const getPlayerSide = (room: GameRoom, playerId: string): Side | null => {
  if (room.redPlayer === playerId) return 'red';
  if (room.blackPlayer === playerId) return 'black';
  return null;
};

// ===== 行棋规则验证 =====

// 检查位置是否在棋盘内
const isOnBoard = (col: number, row: number): boolean => {
  return col >= 0 && col < COLS && row >= 0 && row < ROWS;
};

// 检查位置是否在九宫
const isInPalace = (col: number, row: number, side: Side): boolean => {
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
const isElephantCrossed = (row: number, side: Side): boolean => {
  if (side === 'red') return row < 5;
  return row > 4;
};

// 蹩象眼检查
const isElephantBlocked = (col: number, row: number, pieces: Piece[]): boolean => {
  return getPieceAt(col, row, pieces) !== undefined;
};

// 获取有效移动
const getValidMoves = (piece: Piece, pieces: Piece[]): Position[] => {
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

// 验证移动是否合法
export const isValidMove = (piece: Piece, from: Position, to: Position, pieces: Piece[]): boolean => {
  const validMoves = getValidMoves(piece, pieces);
  return validMoves.some(m => m[0] === to[0] && m[1] === to[1]);
};

// ===== 游戏逻辑 =====

// 提交移动
export const submitMove = (roomId: string, playerId: string, from: Position, to: Position): { success: boolean; error?: string } => {
  const room = rooms.get(roomId);
  if (!room) return { success: false, error: '房间不存在' };
  if (room.phase !== 'strategy') return { success: false, error: '当前阶段不能移动' };
  
  const side = getPlayerSide(room, playerId);
  if (!side) return { success: false, error: '你不是房间的玩家' };
  
  // 从 room.pieces 中获取最新的棋子数据（确保引用正确）
  const piece = room.pieces.find(p => p.side === side && p.position[0] === from[0] && p.position[1] === from[1]);
  if (!piece) return { success: false, error: '该位置没有你的棋子' };
  
  // 验证移动合法性
  if (!isValidMove(piece, from, to, room.pieces)) {
    return { success: false, error: '移动不合法' };
  }
  
  // 判断行动类型：目标是敌方棋子则为吃子，否则为移动
  const enemyAtTarget = room.pieces.find(p => p.side !== side && p.position[0] === to[0] && p.position[1] === to[1]);
  const actionType: ActionType = enemyAtTarget ? 'capture' : 'move';
  
  // 长捉检查：如果是要 capture，检查同一棋子是否连续 capture 同一目标 3 次
  if (actionType === 'capture') {
    const { lastCaptureTarget, captureSameTargetCount } = piece;
    if (lastCaptureTarget && 
        lastCaptureTarget[0] === to[0] && 
        lastCaptureTarget[1] === to[1] && 
        captureSameTargetCount >= 3) {
      return { success: false, error: '不允许长捉（3次）' };
    }
  }
  
  // 记录移动
  if (side === 'red') {
    room.redPendingMove = { from, to, actionType };
    room.redConfirmed = true;
  } else {
    room.blackPendingMove = { from, to, actionType };
    room.blackConfirmed = true;
  }
  
  // 如果双方都确认，进入结算阶段
  if (room.redConfirmed && room.blackConfirmed) {
    room.phase = 'settlement';
    executeSettlement(room);
  }
  
  return { success: true };
};

// 撤销移动
export const undoMove = (roomId: string, playerId: string): { success: boolean; error?: string } => {
  const room = rooms.get(roomId);
  if (!room) return { success: false, error: '房间不存在' };
  if (room.phase !== 'strategy') return { success: false, error: '当前阶段不能撤销' };
  
  const side = getPlayerSide(room, playerId);
  if (!side) return { success: false, error: '你不是房间的玩家' };
  
  if (side === 'red') {
    room.redPendingMove = null;
    room.redConfirmed = false;
  } else {
    room.blackPendingMove = null;
    room.blackConfirmed = false;
  }
  
  return { success: true };
};

// 执行结算
const executeSettlement = (room: GameRoom): void => {
  const redAction = room.redPendingMove;
  const blackAction = room.blackPendingMove;
  
  // 复制棋子数组
  let finalPieces = room.pieces.map(p => ({ ...p }));
  
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
    // 两个都是 move，检查目标是否相同
    if (redAction.to[0] === blackAction.to[0] && redAction.to[1] === blackAction.to[1]) {
      // 找到移动后的棋子
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
  
  // 先移除因 move 冲突被吃的棋子
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
    // 如果目标位置没有敌方子，capture 扑空
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
  finalPieces = finalPieces.map(p => {
    let newPiece = { ...p };
    
    // 找到这个棋子对应的行动
    const isRedPiece = p.side === 'red';
    const myAction = isRedPiece ? redAction : blackAction;
    const originalPiece = room.pieces.find(op => op.id === p.id);
    
    if (!originalPiece || !myAction) {
      // 没有行动，重置计数
      newPiece.lastCaptureTarget = null;
      newPiece.captureSameTargetCount = 0;
      return newPiece;
    }
    
    if (myAction.actionType === 'move') {
      // move 重置计数
      newPiece.lastCaptureTarget = null;
      newPiece.captureSameTargetCount = 0;
    } else if (myAction.actionType === 'capture') {
      // capture 处理长捉
      // 检查是否吃子成功（目标位置原本有敌方子）
      const isCaptureHit = room.pieces.some(op => op.side !== p.side && op.position[0] === myAction.to[0] && op.position[1] === myAction.to[1]);
      
      if (isCaptureHit) {
        // 吃子成功，重置计数
        newPiece.lastCaptureTarget = null;
        newPiece.captureSameTargetCount = 0;
      } else {
        // 扑空，增加计数
        if (originalPiece.lastCaptureTarget && 
            originalPiece.lastCaptureTarget[0] === myAction.to[0] && 
            originalPiece.lastCaptureTarget[1] === myAction.to[1]) {
          // 连续同一目标
          newPiece.captureSameTargetCount = originalPiece.captureSameTargetCount + 1;
        } else {
          // 新目标
          newPiece.captureSameTargetCount = 1;
        }
        newPiece.lastCaptureTarget = [...myAction.to] as Position;
      }
    }
    
    return newPiece;
  });

  // 更新棋子
  room.pieces = finalPieces;
  
  // 检查胜负
  const redKing = finalPieces.find(p => p.type === 'king' && p.side === 'red');
  const blackKing = finalPieces.find(p => p.type === 'king' && p.side === 'black');
  
  if (!redKing && !blackKing) {
    room.winner = 'draw';
    room.phase = 'ended';
  } else if (!redKing) {
    room.winner = 'black';
    room.phase = 'ended';
  } else if (!blackKing) {
    room.winner = 'red';
    room.phase = 'ended';
  } else {
    // 重置状态，继续游戏
    room.phase = 'strategy';
    room.redConfirmed = false;
    room.blackConfirmed = false;
    room.redPendingMove = null;
    room.blackPendingMove = null;
  }
};

// 重置房间
export const resetRoom = (roomId: string): boolean => {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  room.pieces = INITIAL_PIECES.map(p => ({ ...p }));
  room.phase = 'waiting';
  room.currentOperatedSide = 'red';
  room.redConfirmed = false;
  room.blackConfirmed = false;
  room.redPendingMove = null;
  room.blackPendingMove = null;
  room.winner = null;
  
  return true;
};

// 开始游戏
export const startGame = (roomId: string): boolean => {
  const room = rooms.get(roomId);
  if (!room) return false;
  if (!room.redPlayer || !room.blackPlayer) return false;
  
  room.phase = 'strategy';
  return true;
};

// 添加玩家到房间
export const addPlayerToRoom = (roomId: string, playerId: string, side: Side): boolean => {
  const room = rooms.get(roomId);
  if (!room) return false;
  
  if (side === 'red') {
    room.redPlayer = playerId;
  } else {
    room.blackPlayer = playerId;
  }
  return true;
};

// 手动触发结算（由玩家点击结算按钮触发）
export const settleGame = (roomId: string): { success: boolean; winner?: Side | 'draw'; reason?: string } => {
  const room = rooms.get(roomId);
  if (!room) return { success: false };
  if (!room.redPendingMove || !room.blackPendingMove) {
    return { success: false };
  }
  
  // 执行结算
  executeSettlement(room);
  
  return { 
    success: true, 
    winner: room.winner || undefined,
    reason: room.winner === 'red' ? '红帅被吃' : 
            room.winner === 'black' ? '黑将被吃' : 
            room.winner === 'draw' ? '将帅对面' : undefined
  };
};
