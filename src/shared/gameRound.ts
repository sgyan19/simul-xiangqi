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
 * - 如果最后一个非悔棋记录之后有悔棋，重新走应该显示相同的回合号
 * - 只有在成功走完一个回合后，才递增到下一个回合号
 */
export function calculateGameRound(history: RoundHistoryEntry[]): number {
  // 找到最后一个非悔棋记录的索引
  let lastNonUndoIndex = -1;
  for (let i = history.length - 1; i >= 0; i--) {
    if (!history[i].events.some(e => e.description.includes('悔棋'))) {
      lastNonUndoIndex = i;
      break;
    }
  }
  
  if (lastNonUndoIndex >= 0) {
    const lastNonUndoEntry = history[lastNonUndoIndex];
    // 检查最后一个非悔棋记录之后是否有悔棋
    const hasUndoAfterLastNonUndo = history.slice(lastNonUndoIndex + 1).some(
      entry => entry.events.some(e => e.description.includes('悔棋'))
    );
    
    if (hasUndoAfterLastNonUndo) {
      // 有悔棋，重新走同一个回合
      return lastNonUndoEntry.gameRound;
    }
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
