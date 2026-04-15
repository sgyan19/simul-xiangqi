import { useEffect, useRef } from 'react';
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

  // 自动滚动到最新记录
  useEffect(() => {
    if (listRef.current && isExpanded) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [history.length, isExpanded]);

  return (
    <div className="history-log-container">
      <button className="history-toggle-btn" onClick={onToggle}>
        <span className="history-icon">📜</span>
        <span>对弈记录</span>
        <span className="history-count">{history.length}</span>
        <span className={`toggle-arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </button>

      {isExpanded && (
        <div className="history-log-list" ref={listRef}>
          {history.length === 0 ? (
            <div className="history-empty">暂无对弈记录</div>
          ) : (
            history.map((entry) => (
              <div key={entry.roundNumber} className="history-entry">
                <div className="history-round-header">
                  <span className="round-number">第 {entry.roundNumber} 回合</span>
                  {entry.isGameEnd && (
                    <span className="game-end-badge">
                      {entry.winner === 'draw' ? '平局' : entry.winner === 'red' ? '红胜' : '黑胜'}
                    </span>
                  )}
                </div>

                <div className="history-actions">
                  <div className={`action-line red ${!entry.redAction ? 'pass' : ''}`}>
                    <span className="side-dot red"></span>
                    <span className="action-text">
                      {entry.redAction
                        ? `${entry.redAction.actionType === 'capture' ? '吃' : '走'}`
                        : 'pass'}
                    </span>
                  </div>
                  <div className={`action-line black ${!entry.blackAction ? 'pass' : ''}`}>
                    <span className="side-dot black"></span>
                    <span className="action-text">
                      {entry.blackAction
                        ? `${entry.blackAction.actionType === 'capture' ? '吃' : '走'}`
                        : 'pass'}
                    </span>
                  </div>
                </div>

                {entry.events.length > 0 && (
                  <div className="history-events">
                    {entry.events.map((event, idx) => (
                      <div key={idx} className={`event-item ${event.type}`}>
                        <span className="event-icon">{getEventIcon(event.type)}</span>
                        <span className="event-desc">{event.description}</span>
                      </div>
                    ))}
                  </div>
                )}

                {(entry.redPieceRemoved.length > 0 || entry.blackPieceRemoved.length > 0) && (
                  <div className="history-captures">
                    <div className="capture-section">
                      {entry.redPieceRemoved.map((r, idx) => (
                        <div key={idx} className="capture-item red">
                          <span className="piece-name">红{getPieceName(r.piece.type)}</span>
                          <span className="reason-tag">{getReasonLabel(r.reason)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="capture-section">
                      {entry.blackPieceRemoved.map((r, idx) => (
                        <div key={idx} className="capture-item black">
                          <span className="piece-name">黑{getPieceName(r.piece.type)}</span>
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
