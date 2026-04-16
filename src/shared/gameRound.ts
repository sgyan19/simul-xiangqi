/**
 * 共用的回合计算逻辑
 * 用于本地模式和联机模式
 */

import { RoundHistoryEntry } from './history';

/**
 * 计算下一个 logicRound
 * logicRound = history.length（在 push 之前），确保唯一且递增
 */
export function getNextLogicRound(history: RoundHistoryEntry[]): number {
  return history.length;
}

/**
 * 计算下一个 gameRound（用于显示）
 * 规则：
 * - 如果有悔棋记录，说明有回合被撤销了，新走的回合号 = 被撤销回合号 + 1
 * - 如果没有悔棋记录，基于非悔棋记录数计算新的回合号
 */
export function calculateGameRound(history: RoundHistoryEntry[]): number {
  const lastUndoEntry = [...history].reverse().find(
    entry => entry.events.some(e => e.description.includes('悔棋'))
  );
  
  if (lastUndoEntry) {
    // 有悔棋记录，新回合号 = 被撤销回合号 + 1
    return lastUndoEntry.gameRound + 1;
  }
  
  // 无悔棋记录，基于非悔棋记录数计算
  const validRoundCount = history.filter(
    entry => !entry.events.some(e => e.description.includes('悔棋'))
  ).length;
  
  return validRoundCount + 1;
}

/**
 * 计算悔棋记录的 gameRound
 * 悔棋记录使用被撤销回合的 gameRound
 */
export function getUndoGameRound(lastSnapshotGameRound: number): number {
  return lastSnapshotGameRound;
}
