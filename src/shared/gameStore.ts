/**
 * 游戏状态管理 - 共用逻辑
 * 包含初始棋盘、快照管理等共用代码
 */

import { Piece, Position } from '../types';
import { RoundHistoryEntry, SettlementEvent } from './history';
import { getNextLogicRound } from './gameRound';

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
  },
  currentRound: number
): RoundHistoryEntry {
  return {
    ...historyEntryBase,
    logicRound: getNextLogicRound(history),
    gameRound: currentRound,
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
    gameRound: lastSnapshot.gameRound,
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
  currentRound: number,
  lastMoveTargets: { red: Position | null; black: Position | null },
  checkStatus: { red: boolean; black: boolean }
): HistorySnapshot {
  return {
    pieces: pieces.map(p => ({ ...p })),
    gameRound: currentRound,
    logicRound: getNextLogicRound(history),
    lastMoveTargets: { ...lastMoveTargets },
    checkStatus: { ...checkStatus },
  };
}
