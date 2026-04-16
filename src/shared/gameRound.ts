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
 * - 找到最后一个悔棋记录
 * - 如果悔棋之后有新结算，说明是对那个回合的重新走，使用相同回合号
 * - 如果悔棋之后没有新结算，返回被撤销的回合号
 * - 如果没有悔棋，正常递增回合号
 */
export function calculateGameRound(history: RoundHistoryEntry[]): number {
  // 找到最后一个悔棋记录
  const lastUndoIndex = history.findLastIndex(
    entry => entry.events.some(e => e.description.includes('悔棋'))
  );
  
  if (lastUndoIndex >= 0) {
    // 有悔棋
    if (lastUndoIndex < history.length - 1) {
      // 悔棋之后有新结算，找到悔棋之后最近的那个非悔棋记录
      for (let i = history.length - 1; i > lastUndoIndex; i--) {
        const entry = history[i];
        if (!entry.events.some(e => e.description.includes('悔棋'))) {
          // 这就是新结算，使用它的 gameRound
          return entry.gameRound;
        }
      }
    }
    // 悔棋之后没有新结算，返回被撤销的回合号
    return history[lastUndoIndex].gameRound;
  }
  
  // 没有悔棋，正常递增
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
