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
 * - 同一回合被多次重走（多次悔药），一直显示相同编号
 * - 直到某次重走之后没有再悔药，才进入下一回合
 * 
 * 思路：用 pendingRound 追踪被重走的回合号，用 retries 追踪当前是第几次重试
 */
export function calculateGameRound(history: RoundHistoryEntry[]): number {
  // 找到最后一个非悔棋记录
  let lastNonUndoIndex = -1;
  let lastNonUndoRetries = 0; // 该结算时的 retries
  let retries = 0; // 当前的 retries
  
  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i];
    if (entry.events.some(e => e.description.includes('悔棋'))) {
      retries++;
    } else {
      // 找到非悔棋记录
      lastNonUndoIndex = i;
      lastNonUndoRetries = retries;
      break;
    }
  }
  
  if (lastNonUndoIndex >= 0) {
    // 检查该非悔棋记录之后是否有新的悔棋（新一轮重试）
    const totalRetries = history.filter(
      entry => entry.events.some(e => e.description.includes('悔棋'))
    ).length;
    
    if (totalRetries > lastNonUndoRetries) {
      // 有新的悔棋（进入了新一轮重试），继续显示被重走的回合号
      // 找到被重走的那个回合的编号
      for (let i = lastNonUndoIndex - 1; i >= 0; i--) {
        if (!history[i].events.some(e => e.description.includes('悔棋'))) {
          return history[i].gameRound;
        }
      }
      // 如果没找到（理论上不会），返回 1
      return 1;
    }
  }
  
  // 没有新的重试，正常递增
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
