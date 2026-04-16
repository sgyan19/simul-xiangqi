import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { RoundHistoryEntry, getPieceName } from './shared/history';
import { PendingAction } from './types';

interface HistoryLogProps {
  history: RoundHistoryEntry[];
  isExpanded: boolean;
  onToggle: () => void;
}

const getReasonLabel = (reason: string): string => {
  switch (reason) {
    case 'captured':
      return '被吃';
    case 'exchange':
      return '兑子';
    case 'counter_attack':
      return '防反';
    case 'face_off':
      return '将对将';
    default:
      return reason;
  }
};

// 导出历史记录为文本
const exportHistoryToText = (history: RoundHistoryEntry[]): string => {
  if (history.length === 0) {
    return '暂无对弈记录';
  }

  const sorted = [...history].sort((a, b) => a.logicRound - b.logicRound);
  const lines: string[] = [];
  
  lines.push('='.repeat(50));
  lines.push('同时制象棋对弈记录');
  lines.push('='.repeat(50));
  lines.push('');

  for (const entry of sorted) {
    lines.push(`--- 第 ${entry.gameRound} 回合 ---`);
    
    if (entry.redAction || entry.blackAction) {
      const redText = entry.redAction 
        ? `${entry.redAction.actionType === 'capture' ? '捉' : '移动'} ${entry.redAction.from}→${entry.redAction.to}`
        : 'pass';
      const blackText = entry.blackAction 
        ? `${entry.blackAction.actionType === 'capture' ? '捉' : '移动'} ${entry.blackAction.from}→${entry.blackAction.to}`
        : 'pass';
      
      lines.push(`红方: ${redText}`);
      lines.push(`黑方: ${blackText}`);
    }

    if (entry.events.length > 0) {
      for (const event of entry.events) {
        lines.push(`  [${event.type}] ${event.description}`);
      }
    }

    if (entry.redPieceRemoved.length > 0 || entry.blackPieceRemoved.length > 0) {
      const redRemoved = entry.redPieceRemoved.map(r => `红${getPieceName(r.piece.type, 'red')}(${getReasonLabel(r.reason)})`).join(', ');
      const blackRemoved = entry.blackPieceRemoved.map(r => `黑${getPieceName(r.piece.type, 'black')}(${getReasonLabel(r.reason)})`).join(', ');
      if (redRemoved) lines.push(`  红方损失: ${redRemoved}`);
      if (blackRemoved) lines.push(`  黑方损失: ${blackRemoved}`);
    }

    if (entry.endReason) {
      lines.push(`【结算】${entry.endReason}`);
    }

    lines.push('');
  }

  lines.push('='.repeat(50));
  lines.push('对弈结束');

  return lines.join('\n');
};

const getEventIcon = (type: string): string => {
  switch (type) {
    case 'move':
      return '→';
    case 'capture':
      return '⚔';
    case 'collision':
      return '💥';
    case 'counter_attack':
      return '🛡';
    case 'face_off':
      return '👑';
    default:
      return '•';
  }
};

export default function HistoryLog({ history, isExpanded, onToggle }: HistoryLogProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [sortDesc, setSortDesc] = useState(true); // 默认倒序

  // 根据排序顺序处理历史记录（使用 useMemo 避免不必要的重渲染）
  const sortedHistory = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.logicRound - b.logicRound);
    return sortDesc ? sorted.reverse() : sorted;
  }, [history, sortDesc]);

  // 自动滚动到最新/最旧记录
  useEffect(() => {
    if (listRef.current && isExpanded) {
      // 倒序时滚动到顶部（最新），正序时滚动到底部（最新）
      listRef.current.scrollTop = sortDesc ? 0 : listRef.current.scrollHeight;
    }
  }, [history.length, isExpanded, sortDesc]);

  // 导出历史记录
  const handleExport = useCallback(() => {
    const text = exportHistoryToText(history);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `象棋对弈记录_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [history]);

  return (
    <div className="history-log-container">
      <button className="history-toggle-btn" onClick={onToggle}>
        <span className="history-icon">📜</span>
        <span>对弈记录</span>
        <span className="history-count">{history.length}</span>
        <span className={`toggle-arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </button>

      {isExpanded && (
        <div className="history-log-header">
          <button 
            className={`sort-btn ${sortDesc ? 'active' : ''}`}
            onClick={() => setSortDesc(true)}
          >
            最新优先
          </button>
          <button 
            className={`sort-btn ${!sortDesc ? 'active' : ''}`}
            onClick={() => setSortDesc(false)}
          >
            最早优先
          </button>
          <button 
            className="export-btn"
            onClick={handleExport}
            disabled={history.length === 0}
          >
            Dump
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="history-log-list" ref={listRef}>
          {sortedHistory.length === 0 ? (
            <div className="history-empty">暂无对弈记录</div>
          ) : (
            sortedHistory.map((entry, idx) => (
              <div key={`history-${entry.logicRound}`} className="history-entry">
                <div className="history-round-header">
                  <span className="round-number">第 {entry.gameRound} 回合</span>
                  {entry.isGameEnd && (
                    <span className="game-end-badge">
                      {entry.winner === 'draw' ? '平局' : entry.winner === 'red' ? '红胜' : '黑胜'}
                    </span>
                  )}
                </div>

                {/* 检查是否是悔棋记录 */}
                {entry.events.some(e => e.description.includes('悔棋')) ? (
                  /* 悔棋记录只显示事件 */
                  entry.events.length > 0 && (
                    <div className="history-events">
                      {entry.events.map((event, idx) => {
                        return (
                          <div key={idx} className={`event-item ${event.type}`}>
                            <span className="event-icon">{getEventIcon(event.type)}</span>
                            <span className="event-desc">{event.description}</span>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                <div className="history-actions">
                  <div className={`action-line red ${!entry.redAction ? 'pass' : ''}`}>
                    <span className="side-dot red"></span>
                    <span className="action-text">
                      {entry.redAction
                        ? `${entry.redAction.actionType === 'capture' ? '捉' : '移动'}`
                        : 'pass'}
                    </span>
                  </div>
                  <div className={`action-line black ${!entry.blackAction ? 'pass' : ''}`}>
                    <span className="side-dot black"></span>
                    <span className="action-text">
                      {entry.blackAction
                        ? `${entry.blackAction.actionType === 'capture' ? '捉' : '移动'}`
                        : 'pass'}
                    </span>
                  </div>
                </div>
                )}

                {entry.events.length > 0 && (
                  <div className="history-events">
                    {entry.events.map((event, idx) => {
                      // 根据事件描述中的阵营前缀判断
                      const isRed = event.description.includes('红-');
                      const isBlack = event.description.includes('黑-');
                      return (
                        <div key={idx} className={`event-item ${event.type} ${isRed ? 'red-side' : ''} ${isBlack ? 'black-side' : ''}`}>
                          <span className="event-icon">{getEventIcon(event.type)}</span>
                          <span className="event-desc">{event.description}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(entry.redPieceRemoved.length > 0 || entry.blackPieceRemoved.length > 0) && (
                  <div className="history-captures">
                    <div className="capture-section">
                      {entry.redPieceRemoved.map((r, idx) => (
                        <div key={idx} className="capture-item red-removed">
                          <span className="piece-name">红{getPieceName(r.piece.type, 'red')}</span>
                          <span className="reason-tag">{getReasonLabel(r.reason)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="capture-section">
                      {entry.blackPieceRemoved.map((r, idx) => (
                        <div key={idx} className="capture-item black-removed">
                          <span className="piece-name">黑{getPieceName(r.piece.type, 'black')}</span>
                          <span className="reason-tag">{getReasonLabel(r.reason)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {entry.endReason && (
                  <div className="history-result">
                    {entry.endReason}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
