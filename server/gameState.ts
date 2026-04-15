// 服务端游戏状态管理
// 负责棋盘规则、游戏逻辑、双人对战状态同步

import { Piece, Position, Side, PieceType, INITIAL_PIECES, ActionType, PendingAction } from '../src/types';
import { executeSettlement as sharedExecuteSettlement, LongChaseState } from '../src/shared/settlement';
import { RoundHistoryEntry } from '../src/shared/history';

// 待执行行动
interface ServerPendingAction {
  from: Position;
  to: Position;
  actionType: ActionType;
}

// 历史快照（用于悔棋）
interface HistorySnapshot {
  pieces: Piece[];
  gameRound: number;
  logicRound: number;
  lastMoveTargets: { red: Position | null; black: Position | null };
  checkStatus: { red: boolean; black: boolean };
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
  // 长捉限制
  redLastPiece: string | null;
  redLastTarget: string | null;
  redCaptureCount: number;
  blackLastPiece: string | null;
  blackLastTarget: string | null;
  blackCaptureCount: number;
  // 历史快照（用于悔棋）
  historySnapshots: HistorySnapshot[];
  // 悔棋请求状态
  undoRequestFrom: Side | null;  // 谁发起的悔棋请求
  undoRequestedTo: Side | null;   // 请求谁同意
  // 最后行动目标位置（用于客户端显示目标框）
  lastRedMoveTo: Position | null;
  lastBlackMoveTo: Position | null;
  // 对弈历史记录
  roundHistory: RoundHistoryEntry[];
  // 当前逻辑回合数
  logicRound: number;
}

// 棋盘尺寸
const COLS = 9;
const ROWS = 10;

// 检测是否为将军
const isKingInCheck = (side: Side, pieces: Piece[]): boolean => {
  const king = pieces.find(p => p.side === side && p.type === 'king');
  if (!king) return false;
  
  const opponentPieces = pieces.filter(p => p.side !== side);
  
  for (const piece of opponentPieces) {
    if (canCapture(piece, king.position, pieces)) {
      return true;
    }
  }
  return false;
};

// 检测一个棋子是否能吃到指定位置
const canCapture = (piece: Piece, targetPos: Position, pieces: Piece[]): boolean => {
  const [tCol, tRow] = targetPos;
  
  switch (piece.type) {
    case 'king': {
      // 将帅只能走直线一步
      const [pCol, pRow] = piece.position;
      const dCol = Math.abs(tCol - pCol);
      const dRow = Math.abs(tRow - pRow);
      if (dCol + dRow !== 1) return false;
      // 不能出九宫
      if (piece.side === 'red' && tRow < 7) return false;
      if (piece.side === 'black' && tRow > 2) return false;
      // 不能同列面对面（将帅对脸）
      return true;
    }
    case 'chariot': {
      // 车走直线
      const [pCol, pRow] = piece.position;
      if (pCol !== tCol && pRow !== tRow) return false;
      const betweenCount = countPiecesBetween(piece.position, targetPos, pieces);
      return betweenCount === 0;
    }
    case 'horse': {
      // 马走日
      const [pCol, pRow] = piece.position;
      const dCol = Math.abs(tCol - pCol);
      const dRow = Math.abs(tRow - pRow);
      if (!((dCol === 1 && dRow === 2) || (dCol === 2 && dRow === 1))) return false;
      // 检查蹩马腿
      const legCol = pCol + (tCol > pCol ? 1 : tCol < pCol ? -1 : 0);
      const legRow = pRow + (tRow > pRow ? 1 : tRow < pRow ? -1 : 0);
      if (pieces.some(p => p.position[0] === legCol && p.position[1] === legRow)) return false;
      return true;
    }
    case 'cannon': {
      // 炮走直线，吃子必须隔一子
      const [pCol, pRow] = piece.position;
      if (pCol !== tCol && pRow !== tRow) return false;
      const betweenCount = countPiecesBetween(piece.position, targetPos, pieces);
      const targetPiece = pieces.find(p => p.position[0] === tCol && p.position[1] === tRow);
      return targetPiece ? betweenCount === 1 : betweenCount === 0;
    }
    case 'advisor': {
      // 士走斜线一步
      const [pCol, pRow] = piece.position;
      const dCol = Math.abs(tCol - pCol);
      const dRow = Math.abs(tRow - pRow);
      if (dCol !== 1 || dRow !== 1) return false;
      // 不能出九宫
      if (piece.side === 'red' && (tCol < 3 || tCol > 5 || tRow < 7)) return false;
      if (piece.side === 'black' && (tCol < 3 || tCol > 5 || tRow > 2)) return false;
      return true;
    }
    case 'elephant': {
      // 象走田字
      const [pCol, pRow] = piece.position;
      const dCol = Math.abs(tCol - pCol);
      const dRow = Math.abs(tRow - pRow);
      if (dCol !== 2 || dRow !== 2) return false;
      // 检查塞象眼
      const eyeCol = (pCol + tCol) / 2;
      const eyeRow = (pRow + tRow) / 2;
      if (pieces.some(p => p.position[0] === eyeCol && p.position[1] === eyeRow)) return false;
      // 不能过河
      if (piece.side === 'red' && tRow < 5) return false;
      if (piece.side === 'black' && tRow > 4) return false;
      return true;
    }
    case 'pawn': {
      // 兵过河后可横走
      const [pCol, pRow] = piece.position;
      if (piece.side === 'red') {
        if (tRow < pRow) return false;
        if (pRow < 5) {
          // 未过河只能前进
          return tCol === pCol && tRow === pRow + 1;
        } else {
          // 过河后可横走
          return (tCol === pCol && tRow === pRow + 1) || (tRow === pRow && Math.abs(tCol - pCol) === 1);
        }
      } else {
        if (tRow > pRow) return false;
        if (pRow > 4) {
          // 未过河只能前进
          return tCol === pCol && tRow === pRow - 1;
        } else {
          // 过河后可横走
          return (tCol === pCol && tRow === pRow - 1) || (tRow === pRow && Math.abs(tCol - pCol) === 1);
        }
      }
    }
    default:
      return false;
  }
};

// 计算两点之间的棋子数量
const countPiecesBetween = (from: Position, to: Position, pieces: Piece[]): number => {
  const [fCol, fRow] = from;
  const [tCol, tRow] = to;
  
  if (fCol !== tCol && fRow !== tRow) return -1; // 不在同一直线
  
  const cCol = Math.min(fCol, tCol);
  const maxCol = Math.max(fCol, tCol);
  const cRow = Math.min(fRow, tRow);
  const maxRow = Math.max(fRow, tRow);
  
  let count = 0;
  for (const p of pieces) {
    const [pCol, pRow] = p.position;
    if (pCol >= cCol && pCol <= maxCol && pRow >= cRow && pRow <= maxRow) {
      if (!(pCol === fCol && pRow === fRow) && !(pCol === tCol && pRow === tRow)) {
        count++;
      }
    }
  }
  return count;
};

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
    // 长捉限制
    redLastPiece: null,
    redLastTarget: null,
    redCaptureCount: 0,
    blackLastPiece: null,
    blackLastTarget: null,
    blackCaptureCount: 0,
    // 历史快照
    historySnapshots: [],
    // 悔棋请求
    undoRequestFrom: null,
    undoRequestedTo: null,
    // 最后行动目标位置
    lastRedMoveTo: null,
    lastBlackMoveTo: null,
    // 对弈历史记录
    roundHistory: [],
    // 当前逻辑回合数
    logicRound: 0,
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
  
  // 长捉检查：比较"谁在捉"+"捉谁"
  if (actionType === 'capture') {
    const isRed = side === 'red';
    const lastPiece = isRed ? room.redLastPiece : room.blackLastPiece;
    const lastTarget = isRed ? room.redLastTarget : room.blackLastTarget;
    const count = isRed ? room.redCaptureCount : room.blackCaptureCount;
    
    if (piece.id === lastPiece && enemyAtTarget!.id === lastTarget && count >= 3) {
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
  // 转换 ServerPendingAction 为 PendingAction
  const redAction = room.redPendingMove ? {
    from: room.redPendingMove.from,
    to: room.redPendingMove.to,
    actionType: room.redPendingMove.actionType,
  } : null;
  
  const blackAction = room.blackPendingMove ? {
    from: room.blackPendingMove.from,
    to: room.blackPendingMove.to,
    actionType: room.blackPendingMove.actionType,
  } : null;
  
  const chaseState: LongChaseState = {
    redLastPiece: room.redLastPiece,
    redLastTarget: room.redLastTarget,
    redCaptureCount: room.redCaptureCount,
    blackLastPiece: room.blackLastPiece,
    blackLastTarget: room.blackLastTarget,
    blackCaptureCount: room.blackCaptureCount,
  };
  
  // 保存结算前的快照（用于悔棋）
  // logicRound 应该基于 roundHistory.length（累积的记录数）
  const currentLogicRound = room.roundHistory.length;
  
  // gameRound 计算逻辑：
  // - 如果有悔棋记录，说明有回合被撤销了，新走的应该重新走被撤销的那个回合
  // - 如果没有悔棋记录，基于非悔棋记录数计算新的回合号
  const lastUndoEntry = [...room.roundHistory].reverse().find(
    entry => entry.events.some(e => e.description.includes('悔棋'))
  );
  const currentGameRound = lastUndoEntry 
    ? lastUndoEntry.gameRound  // 使用被撤销的回合号
    : room.roundHistory.filter(entry => !entry.events.some(e => e.description.includes('悔棋'))).length + 1;
  
  const snapshot: HistorySnapshot = {
    pieces: room.pieces.map(p => ({ ...p })),
    gameRound: currentGameRound,
    logicRound: currentLogicRound,
    // 保存当前的行动框状态（上一回合的目标位置）
    lastMoveTargets: { 
      red: room.lastRedMoveTo, 
      black: room.lastBlackMoveTo 
    },
    // 保存当前的将军状态
    checkStatus: { 
      red: isKingInCheck('red', room.pieces), 
      black: isKingInCheck('black', room.pieces) 
    },
  };
  
  // 使用共享结算逻辑
  const result = sharedExecuteSettlement(room.pieces, redAction, blackAction, chaseState);
  
  // 更新房间状态
  room.pieces = result.pieces;
  room.redLastPiece = result.newChaseState.redLastPiece;
  room.redLastTarget = result.newChaseState.redLastTarget;
  room.redCaptureCount = result.newChaseState.redCaptureCount;
  room.blackLastPiece = result.newChaseState.blackLastPiece;
  room.blackLastTarget = result.newChaseState.blackLastTarget;
  room.blackCaptureCount = result.newChaseState.blackCaptureCount;
  
  // 判断是否是重走（当前 gameRound 是否已有结算记录，排除悔棋记录）
  const isRedo = room.roundHistory.some(
    entry => entry.gameRound === currentGameRound && !entry.events.some(e => e.description.includes('悔棋'))
  );
  
  // 保存快照
  room.historySnapshots.push(snapshot);
  
  // 保存历史记录
  const historyEntry: RoundHistoryEntry = {
    ...result.historyEntry,
    logicRound: currentLogicRound,
    gameRound: currentGameRound,
  };
  room.roundHistory.push(historyEntry);
  
  // 保存目标位置（用于客户端显示目标框，在清空pendingMove之前）
  room.lastRedMoveTo = room.redPendingMove?.to || null;
  room.lastBlackMoveTo = room.blackPendingMove?.to || null;
  
  if (result.winner) {
    room.winner = result.winner;
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
  // 重置长捉计数
  room.redLastPiece = null;
  room.redLastTarget = null;
  room.redCaptureCount = 0;
  room.blackLastPiece = null;
  room.blackLastTarget = null;
  room.blackCaptureCount = 0;
  // 重置历史快照
  room.historySnapshots = [];
  // 重置对弈历史记录
  room.roundHistory = [];
  // 重置最后行动目标
  room.lastRedMoveTo = null;
  room.lastBlackMoveTo = null;
  // 重置悔棋请求
  room.undoRequestFrom = null;
  room.undoRequestedTo = null;
  
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

// 请求悔棋
export const requestUndo = (roomId: string, requesterSide: Side): { success: boolean; error?: string } => {
  const room = rooms.get(roomId);
  if (!room) return { success: false, error: '房间不存在' };
  
  // 检查是否有可悔棋的回合
  if (room.historySnapshots.length === 0) {
    return { success: false, error: '没有可悔棋的回合' };
  }
  
  // 已经有待处理的悔棋请求
  if (room.undoRequestFrom !== null) {
    return { success: false, error: '已有待处理的悔棋请求' };
  }
  
  // 设置悔棋请求
  room.undoRequestFrom = requesterSide;
  room.undoRequestedTo = requesterSide === 'red' ? 'black' : 'red';
  
  return { success: true };
};

// 执行悔棋
const executeUndo = (room: GameRoom): void => {
  if (room.historySnapshots.length === 0) return;
  
  // 获取最后一个快照
  const lastSnapshot = room.historySnapshots[room.historySnapshots.length - 1];
  
  // 恢复到快照状态
  room.pieces = lastSnapshot.pieces.map(p => ({ ...p }));
  room.phase = 'strategy';
  room.winner = null;
  room.redPendingMove = null;
  room.blackPendingMove = null;
  room.redConfirmed = false;
  room.blackConfirmed = false;
  // 清除长捉状态
  room.redLastPiece = null;
  room.redLastTarget = null;
  room.redCaptureCount = 0;
  room.blackLastPiece = null;
  room.blackLastTarget = null;
  room.blackCaptureCount = 0;
  
  // 恢复行动框状态（显示上一回合的目标位置）
  room.lastRedMoveTo = lastSnapshot.lastMoveTargets.red;
  room.lastBlackMoveTo = lastSnapshot.lastMoveTargets.black;
  
  // 移除最后一个快照
  room.historySnapshots.pop();
  
  // 添加悔棋记录（使用 logicRound 排序，显示 gameRound）
  // logicRound = roundHistory.length（在 push 之前），确保唯一且递增
  const undoLogicRound = room.roundHistory.length;
  const undoEntry: RoundHistoryEntry = {
    logicRound: undoLogicRound,
    gameRound: lastSnapshot.gameRound,
    redAction: null,
    blackAction: null,
    redPieceRemoved: [],
    blackPieceRemoved: [],
    events: [{
      type: 'move',
      description: `[悔棋]第${lastSnapshot.gameRound}回合被撤销`,
    }],
    winner: null,
    endReason: null,
    isGameEnd: false,
  };
  room.roundHistory.push(undoEntry);
  
  // 清除悔棋请求
  room.undoRequestFrom = null;
  room.undoRequestedTo = null;
};

// 回应悔棋请求
export const respondToUndo = (roomId: string, responderSide: Side, accepted: boolean): { success: boolean; error?: string } => {
  const room = rooms.get(roomId);
  if (!room) return { success: false, error: '房间不存在' };
  
  // 检查是否有待处理的悔棋请求
  if (room.undoRequestFrom === null) {
    return { success: false, error: '没有待处理的悔棋请求' };
  }
  
  // 检查是否是发给自己的请求
  if (room.undoRequestedTo !== responderSide) {
    return { success: false, error: '这不是发给你的悔棋请求' };
  }
  
  if (accepted) {
    // 执行悔棋
    executeUndo(room);
  } else {
    // 拒绝悔棋，清除请求状态
    room.undoRequestFrom = null;
    room.undoRequestedTo = null;
  }
  
  return { success: true };
};
