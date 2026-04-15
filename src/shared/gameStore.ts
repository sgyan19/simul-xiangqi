/**
 * 游戏状态管理 - 共用逻辑
 * 包含初始棋盘、快照管理等共用代码
 */

import { Piece, Position } from '../types';
import { RoundHistoryEntry, SettlementEvent } from './history';
import { getNextLogicRound, calculateGameRound, getUndoGameRound } from './gameRound';

// ===== 历史快照 =====

export interface HistorySnapshot {
  pieces: Piece[];
  gameRound: number;
  logicRound: number;
  lastMoveTargets: { red: Position | null; black: Position | null };
  checkStatus: { red: boolean; black: boolean };
}

// ===== 回合记录创建 =====

/**
 * 创建结算后的回合记录
 */
export function createSettlementEntry(
  history: RoundHistoryEntry[],
  historyEntryBase: {
    redAction: any;
    blackAction: any;
    redPieceRemoved: any[];
    blackPieceRemoved: any[];
    events: SettlementEvent[];
    winner: 'red' | 'black' | 'draw' | null;
    endReason: string | null;
    isGameEnd: boolean;
  }
): RoundHistoryEntry {
  return {
    ...historyEntryBase,
    logicRound: getNextLogicRound(history),
    gameRound: calculateGameRound(history),
  };
}

/**
 * 创建悔棋记录
 */
export function createUndoEntry(
  history: RoundHistoryEntry[],
  lastSnapshot: HistorySnapshot
): RoundHistoryEntry {
  return {
    logicRound: getNextLogicRound(history),
    gameRound: getUndoGameRound(lastSnapshot.gameRound),
    redAction: null,
    blackAction: null,
    redPieceRemoved: [],
    blackPieceRemoved: [],
    events: [{
      type: 'move',
      description: `[悔棋]第${lastSnapshot.gameRound}回合被撤销`,
    }] as SettlementEvent[],
    winner: null,
    endReason: null,
    isGameEnd: false,
  };
}

/**
 * 创建结算前的快照
 */
export function createSnapshotBeforeSettlement(
  pieces: Piece[],
  history: RoundHistoryEntry[],
  lastMoveTargets: { red: Position | null; black: Position | null },
  checkStatus: { red: boolean; black: boolean }
): HistorySnapshot {
  return {
    pieces: pieces.map(p => ({ ...p })),
    gameRound: calculateGameRound(history),
    logicRound: getNextLogicRound(history),
    lastMoveTargets: { ...lastMoveTargets },
    checkStatus: { ...checkStatus },
  };
}
