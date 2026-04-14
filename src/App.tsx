import { useState, useCallback, useEffect } from 'react';
import {
  GameState,
  Piece,
  Position,
  Side,
  Move,
  INITIAL_PIECES,
} from './types';
import { getValidMoves, isCheck, isValidMove } from './chessLogic';
import { checkGameEnd, formatMove } from './gameLogic';
import ChessBoard from './ChessBoard';

// 初始游戏状态
const createInitialState = (): GameState => ({
  phase: 'strategy',
  currentOperatedSide: 'red',
  redConfirmed: false,
  blackConfirmed: false,
  pieces: INITIAL_PIECES.map(p => ({ ...p })),
  redPendingMove: null,
  blackPendingMove: null,
  selectedPiece: null,
  validMoves: [],
  winner: null,
  settlementResult: null,
  message: '',
});

function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [viewSide, setViewSide] = useState<Side>('red');
  const [checkStatus, setCheckStatus] = useState<{ red: boolean; black: boolean }>({ red: false, black: false });

  // 显示提示
  const showMessage = useCallback((msg: string, duration = 2000) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), duration);
  }, []);

  // 选择棋子
  const handleSelectPiece = useCallback((piece: Piece) => {
    if (gameState.phase !== 'strategy') return;
    
    const isOwnSide = viewSide === piece.side;
    if (!isOwnSide) {
      showMessage('请切换到己方视角操作');
      return;
    }
    
    const isConfirmed = piece.side === 'red' ? gameState.redConfirmed : gameState.blackConfirmed;
    if (isConfirmed) {
      if (piece.side === 'red') {
        setGameState(prev => ({ ...prev, redConfirmed: false }));
      } else {
        setGameState(prev => ({ ...prev, blackConfirmed: false }));
      }
    }

    if (gameState.selectedPiece?.id === piece.id) {
      setGameState(prev => ({
        ...prev,
        selectedPiece: null,
        validMoves: [],
      }));
      return;
    }

    const validMoves = getValidMoves(piece, gameState.pieces);
    
    setGameState(prev => ({
      ...prev,
      selectedPiece: piece,
      validMoves,
    }));
  }, [gameState.phase, gameState.selectedPiece, gameState.pieces, gameState.redConfirmed, gameState.blackConfirmed, viewSide, showMessage]);

  // 移动棋子
  const handleMovePiece = useCallback((to: Position) => {
    if (!gameState.selectedPiece || gameState.phase !== 'strategy') return;
    
    const selectedPiece = gameState.selectedPiece;
    const side = selectedPiece.side;
    
    const pendingMove: Move = {
      from: selectedPiece.position,
      to,
    };

    setGameState(prev => {
      const newState = { ...prev };
      if (side === 'red') {
        newState.redPendingMove = pendingMove;
        newState.redConfirmed = true;
      } else {
        newState.blackPendingMove = pendingMove;
        newState.blackConfirmed = true;
      }
      newState.selectedPiece = null;
      newState.validMoves = [];
      return newState;
    });
  }, [gameState.selectedPiece, gameState.phase, showMessage]);

  // 结算按钮
  const handleSettle = useCallback(() => {
    if (!gameState.redPendingMove || !gameState.blackPendingMove) {
      showMessage('双方都需要先走棋');
      return;
    }
    
    setGameState(prev => ({
      ...prev,
      phase: 'settlement',
      message: '双方策略已锁定，开始结算...',
    }));
  }, [gameState.redPendingMove, gameState.blackPendingMove, showMessage]);

  // 重新走棋
  const handleRedoMove = useCallback((side: Side) => {
    if (gameState.phase !== 'strategy') return;
    
    setGameState(prev => {
      const newState = { ...prev };
      if (side === 'red') {
        newState.redPendingMove = null;
        newState.redConfirmed = false;
      } else {
        newState.blackPendingMove = null;
        newState.blackConfirmed = false;
      }
      return newState;
    });
  }, [gameState.phase]);

  // 执行结算
  useEffect(() => {
    if (gameState.phase !== 'settlement') return;

    const doSettlement = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pieces = gameState.pieces;
      const redMove = gameState.redPendingMove;
      const blackMove = gameState.blackPendingMove;
      
      console.log('=== 结算开始 ===');
      console.log('红方移动:', redMove);
      console.log('黑方移动:', blackMove);
      
      let finalPieces = pieces.map(p => ({ ...p }));
      
      // ===== 第一步：记录原始位置 =====
      const originalPositions: { [key: string]: Piece | null } = {};
      finalPieces.forEach(p => {
        const key = `${p.position[0]},${p.position[1]}`;
        originalPositions[key] = p;
      });
      
      // ===== 第二步：执行所有移动 =====
      console.log('执行前棋子数:', finalPieces.length);
      
      if (redMove) {
        const redPiece = finalPieces.find(p => 
          p.side === 'red' && p.position[0] === redMove.from[0] && p.position[1] === redMove.from[1]
        );
        if (redPiece) {
          console.log(`红方棋子 ${redPiece.id} 从 ${redMove.from} 移动到 ${redMove.to}`);
          finalPieces = finalPieces.map(p => {
            if (p.id === redPiece.id) {
              return { ...p, position: [...redMove.to] as Position };
            }
            return p;
          });
        }
      }
      
      if (blackMove) {
        const blackPiece = finalPieces.find(p => 
          p.side === 'black' && p.position[0] === blackMove.from[0] && p.position[1] === blackMove.from[1]
        );
        if (blackPiece) {
          console.log(`黑方棋子 ${blackPiece.id} 从 ${blackMove.from} 移动到 ${blackMove.to}`);
          finalPieces = finalPieces.map(p => {
            if (p.id === blackPiece.id) {
              return { ...p, position: [...blackMove.to] as Position };
            }
            return p;
          });
        }
      }
      
      console.log('执行后棋子数:', finalPieces.length);
      
      // ===== 第三步：处理重叠/吃子 =====
      // 规则：
      // - 目标位置原本有敌方棋子 → 敌方被吃，自己的存活
      // - 目标位置原本是空的，双方都移动到这里 → 同归于尽
      const toRemove: string[] = [];
      
      // 检查红方移动目标
      if (redMove) {
        const targetKey = `${redMove.to[0]},${redMove.to[1]}`;
        const originalAtTarget = originalPositions[targetKey];
        
        if (originalAtTarget) {
          // 目标位置原本有棋子
          if (originalAtTarget.side === 'black') {
            // 吃子：移除原有棋子
            console.log(`红方吃掉黑棋 ${originalAtTarget.id}`);
            toRemove.push(originalAtTarget.id);
          }
        } else {
          // 目标位置原本是空的，检查是否有黑棋也移动到这里
          const blackPieceAtTarget = finalPieces.find(p => 
            p.side === 'black' && p.position[0] === redMove.to[0] && p.position[1] === redMove.to[1]
          );
          if (blackPieceAtTarget) {
            // 双方都移动到这个空位，同归于尽
            const redPiece = finalPieces.find(p => 
              p.side === 'red' && p.position[0] === redMove.to[0] && p.position[1] === redMove.to[1]
            );
            console.log(`同归于尽：红${redPiece?.id} 和 黑${blackPieceAtTarget.id}`);
            toRemove.push(redPiece?.id, blackPieceAtTarget.id);
          }
        }
      }
      
      // 检查黑方移动目标
      if (blackMove) {
        const targetKey = `${blackMove.to[0]},${blackMove.to[1]}`;
        const originalAtTarget = originalPositions[targetKey];
        
        if (originalAtTarget) {
          // 目标位置原本有棋子
          if (originalAtTarget.side === 'red') {
            // 吃子：移除原有棋子
            console.log(`黑方吃掉红棋 ${originalAtTarget.id}`);
            toRemove.push(originalAtTarget.id);
          }
        } else {
          // 目标位置原本是空的，检查是否有红棋也移动到这里
          const redPieceAtTarget = finalPieces.find(p => 
            p.side === 'red' && p.position[0] === blackMove.to[0] && p.position[1] === blackMove.to[1]
          );
          if (redPieceAtTarget) {
            // 双方都移动到这个空位，同归于尽
            const blackPiece = finalPieces.find(p => 
              p.side === 'black' && p.position[0] === blackMove.to[0] && p.position[1] === blackMove.to[1]
            );
            console.log(`同归于尽：红${redPieceAtTarget.id} 和 黑${blackPiece?.id}`);
            toRemove.push(redPieceAtTarget.id, blackPiece?.id);
          }
        }
      }
      
      console.log('toRemove:', toRemove);
      finalPieces = finalPieces.filter(p => !toRemove.includes(p.id));
      console.log('最终棋子数:', finalPieces.length);

      // 检查将帅面对面
      const redKing = finalPieces.find(p => p.type === 'king' && p.side === 'red');
      const blackKing = finalPieces.find(p => p.type === 'king' && p.side === 'black');
      let winner: 'red' | 'black' | 'draw' | null = null;
      let reason = '';

      if (redKing && blackKing && redKing.position[0] === blackKing.position[0]) {
        const between = finalPieces.filter(p => {
          if (p.type === 'king') return false;
          return p.position[0] === redKing.position[0] &&
                 p.position[1] > Math.min(redKing.position[1], blackKing.position[1]) &&
                 p.position[1] < Math.max(redKing.position[1], blackKing.position[1]);
        });

        if (between.length === 0) {
          finalPieces = finalPieces.filter(p => p.type !== 'king');
          winner = 'draw';
          reason = '将帅对面，双方同时被吃';
        }
      }

      // 检查是否有一方将帅被吃
      if (!winner) {
        const { ended, winner: w } = checkGameEnd(finalPieces);
        if (ended) {
          winner = w;
          reason = w === 'red' ? '红帅被吃，黑方获胜' : w === 'black' ? '黑将被吃，红方获胜' : '和棋';
        }
      }

      // 检查将军状态
      const redInCheck = isCheck('red', finalPieces);
      const blackInCheck = isCheck('black', finalPieces);
      setCheckStatus({ red: redInCheck, black: blackInCheck });

      // 如果没有胜负，显示结算信息
      let finalMessage = '';
      if (winner) {
        const winnerText = winner === 'draw' ? '和棋！' : winner === 'red' ? '红方胜利！' : '黑方胜利！';
        finalMessage = winnerText + (reason ? ' ' + reason : '');
      }

      setGameState(prev => ({
        ...prev,
        pieces: finalPieces,
        phase: winner ? 'ended' : 'strategy',
        winner,
        settlementResult: winner ? { 
          redMove: prev.redPendingMove, 
          blackMove: prev.blackPendingMove, 
          captures: { red: [], black: [] },
          winner,
          reason 
        } : null,
        currentOperatedSide: winner ? prev.currentOperatedSide : 'red',
        redConfirmed: false,
        blackConfirmed: false,
        redPendingMove: null,
        blackPendingMove: null,
      }));

      if (finalMessage) {
        showMessage(finalMessage, 3000);
      }
    };

    doSettlement();
  }, [gameState.phase, gameState.pieces, gameState.redPendingMove, gameState.blackPendingMove, showMessage]);

  // 切换视角
  const handleSwitchView = useCallback((side: Side) => {
    setViewSide(side);
    if (gameState.phase === 'strategy') {
      setGameState(prev => ({ ...prev, currentOperatedSide: side }));
    }
  }, [gameState.phase]);

  // 重置游戏
  const handleReset = useCallback(() => {
    setGameState(createInitialState());
    setViewSide('red');
    setCheckStatus({ red: false, black: false });
    showMessage('游戏已重置', 1500);
  }, [showMessage]);

  // 获取显示用的棋子
  const getDisplayPieces = useCallback((): Piece[] => {
    return gameState.pieces;
  }, [gameState.pieces]);

  const canSettle = gameState.redPendingMove && gameState.blackPendingMove && 
                    gameState.phase === 'strategy';

  return (
    <div className="app-container">
      {/* 顶部状态栏 */}
      <div className="status-bar">
        <div className="status-item">
          <span
            className={`status-dot red ${gameState.redConfirmed ? 'confirmed' : 'waiting'}`}
          />
          <span>红方</span>
          {checkStatus.red && <span style={{ color: '#FF4444', fontWeight: 'bold' }}>被将军!</span>}
          {gameState.redPendingMove && (
            <span style={{ fontSize: '10px', color: '#FFD700' }}>
              {formatMove(gameState.redPendingMove)}
            </span>
          )}
        </div>

        <span className={`phase-badge ${gameState.phase}`}>
          {gameState.phase === 'strategy' ? '策略阶段' : 
           gameState.phase === 'settlement' ? '结算中' : '结束'}
        </span>

        <div className="status-item">
          <span
            className={`status-dot black ${gameState.blackConfirmed ? 'confirmed' : 'waiting'}`}
          />
          <span>黑方</span>
          {checkStatus.black && <span style={{ color: '#FF4444', fontWeight: 'bold' }}>被将军!</span>}
          {gameState.blackPendingMove && (
            <span style={{ fontSize: '10px', color: '#FFD700' }}>
              {formatMove(gameState.blackPendingMove)}
            </span>
          )}
        </div>
      </div>

      {/* 棋盘 */}
      <ChessBoard
        pieces={getDisplayPieces()}
        selectedPiece={gameState.selectedPiece}
        validMoves={gameState.validMoves}
        currentOperatedSide={viewSide}
        phase={gameState.phase}
        flipped={viewSide === 'black'}
        onSelectPiece={handleSelectPiece}
        onMovePiece={handleMovePiece}
      />

      {/* 控制面板 */}
      <div className="control-panel">
        <div className="view-switch">
          <button
            className={`view-btn ${viewSide === 'red' ? 'active' : ''}`}
            onClick={() => handleSwitchView('red')}
          >
            红方视角
          </button>
          <button
            className={`view-btn ${viewSide === 'black' ? 'active' : ''}`}
            onClick={() => handleSwitchView('black')}
          >
            黑方视角
          </button>
        </div>
      </div>

      <div className="control-panel">
        {viewSide === 'red' && gameState.redPendingMove && !gameState.redConfirmed && (
          <button
            className="btn btn-reset"
            onClick={() => handleRedoMove('red')}
          >
            红方重走
          </button>
        )}
        {viewSide === 'black' && gameState.blackPendingMove && !gameState.blackConfirmed && (
          <button
            className="btn btn-reset"
            onClick={() => handleRedoMove('black')}
          >
            黑方重走
          </button>
        )}
      </div>

      <div className="control-panel">
        <button
          className="btn btn-settle"
          onClick={handleSettle}
          disabled={!canSettle}
        >
          结算
        </button>
        <button className="btn btn-reset" onClick={handleReset}>
          重置
        </button>
      </div>

      <div className="control-panel" style={{ fontSize: '12px', color: '#AAA' }}>
        {gameState.phase === 'strategy' && (
          <>
            当前视角：
            <span style={{ 
              color: viewSide === 'red' ? '#C41E3A' : '#666',
              fontWeight: 'bold'
            }}>
              {viewSide === 'red' ? '红方' : '黑方'}
            </span>
            {!gameState.redPendingMove && !gameState.blackPendingMove && ' - 请选择一个棋子移动'}
            {viewSide === 'red' && gameState.redPendingMove && ' - 红方已走棋，可切换视角'}
            {viewSide === 'black' && gameState.blackPendingMove && ' - 黑方已走棋，可切换视角'}
            {!canSettle && ' - 等待双方都走棋'}
            {canSettle && ' - 可以点击结算'}
          </>
        )}
      </div>

      {showToast && <div className="toast">{showToast}</div>}

      {gameState.phase === 'settlement' && (
        <div className="settlement-overlay">
          <div className="settlement-text">结算中...</div>
        </div>
      )}

      {gameState.phase === 'ended' && gameState.winner && (
        <div className="modal-overlay" onClick={handleReset}>
          <div className={`modal-content ${
            gameState.winner === 'red' ? 'red-wins' :
            gameState.winner === 'black' ? 'black-wins' : 'draw'
          }`}>
            <h2>
              {gameState.winner === 'red' ? '红方胜利！' :
               gameState.winner === 'black' ? '黑方胜利！' : '和棋！'}
            </h2>
            <p>
              {gameState.settlementResult?.reason || '游戏结束'}
            </p>
            {gameState.redPendingMove && gameState.blackPendingMove && (
              <p style={{ fontSize: '12px', marginTop: '10px' }}>
                红方：{formatMove(gameState.redPendingMove)}<br />
                黑方：{formatMove(gameState.blackPendingMove)}
              </p>
            )}
            <button className="btn btn-confirm" onClick={handleReset}>
              重新开始
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
