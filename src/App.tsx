import { useState, useCallback, useEffect } from 'react';
import {
  GameState,
  Piece,
  Position,
  Side,
  Move,
  INITIAL_PIECES,
  PIECE_NAMES,
} from './types';
import { getValidMoves, isCheck } from './chessLogic';
import { resolveSettlement, checkGameEnd, formatMove } from './gameLogic';
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
  const [pendingMoves, setPendingMoves] = useState<{ red: { from: Position; to: Position } | null; black: { from: Position; to: Position } | null }>({
    red: null,
    black: null,
  });

  // 显示提示
  const showMessage = useCallback((msg: string, duration = 2000) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), duration);
  }, []);

  // 检查是否可以操作某方棋子
  const canOperateSide = useCallback((side: Side): boolean => {
    // 只有在策略阶段才能操作
    if (gameState.phase !== 'strategy') return false;
    // 已确认策略后不能操作
    if (side === 'red' && gameState.redConfirmed) return false;
    if (side === 'black' && gameState.blackConfirmed) return false;
    return true;
  }, [gameState.phase, gameState.redConfirmed, gameState.blackConfirmed]);

  // 选择棋子
  const handleSelectPiece = useCallback((piece: Piece) => {
    if (gameState.phase !== 'strategy') return;
    
    // 检查是否在自己的视角下操作
    const isOwnSide = viewSide === piece.side;
    if (!isOwnSide) {
      showMessage('请切换到己方视角操作');
      return;
    }
    
    // 检查是否可以操作该阵营
    if (!canOperateSide(piece.side)) {
      showMessage('已确认策略，无法修改');
      return;
    }

    // 如果点击已选中的棋子，取消选中
    if (gameState.selectedPiece?.id === piece.id) {
      setGameState(prev => ({
        ...prev,
        selectedPiece: null,
        validMoves: [],
      }));
      return;
    }

    // 计算有效移动
    const validMoves = getValidMoves(piece, gameState.pieces);
    
    setGameState(prev => ({
      ...prev,
      selectedPiece: piece,
      validMoves,
    }));
  }, [gameState.phase, viewSide, canOperateSide, gameState.selectedPiece, gameState.pieces, showMessage]);

  // 移动棋子（只是记录，不实际移动）
  const handleMovePiece = useCallback((to: Position) => {
    if (!gameState.selectedPiece || gameState.phase !== 'strategy') return;
    
    const { selectedPiece } = gameState;
    const side = selectedPiece.side;
    
    // 记录待执行移动
    const move: Move = {
      from: selectedPiece.position,
      to,
    };

    // 更新 pendingMoves
    setPendingMoves(prev => ({
      ...prev,
      [side]: { from: selectedPiece.position, to },
    }));
    
    // 检查将军
    // 模拟移动后的棋盘
    const piecesCopy = gameState.pieces.map(p => ({ ...p }));
    const pieceToMove = piecesCopy.find(p => p.id === selectedPiece.id);
    if (pieceToMove) {
      pieceToMove.position = [...to];
    }
    const opponentSide = side === 'red' ? 'black' : 'red';
    if (isCheck(opponentSide, piecesCopy)) {
      showMessage('将军！', 1500);
    }
    
    // 清除选中
    setGameState(prev => ({
      ...prev,
      selectedPiece: null,
      validMoves: [],
    }));
  }, [gameState.selectedPiece, gameState.phase, gameState.pieces, showMessage]);

  // 确认本方策略
  const handleConfirm = useCallback((side: Side) => {
    if (!canOperateSide(side)) {
      showMessage('无法确认策略');
      return;
    }
    
    const pendingMove = side === 'red' ? pendingMoves.red : pendingMoves.black;
    if (!pendingMove) {
      showMessage('请先选择棋子并移动');
      return;
    }
    
    setGameState(prev => {
      const newState = { ...prev };
      if (side === 'red') {
        newState.redConfirmed = true;
      } else {
        newState.blackConfirmed = true;
      }
      return newState;
    });
    
    showMessage(`${side === 'red' ? '红方' : '黑方'}策略已确认`);
  }, [canOperateSide, pendingMoves, showMessage]);

  // 取消确认（重新走棋）
  const handleUnconfirm = useCallback((side: Side) => {
    if (gameState.phase !== 'strategy') return;
    
    setGameState(prev => {
      const newState = { ...prev };
      if (side === 'red') {
        newState.redConfirmed = false;
      } else {
        newState.blackConfirmed = false;
      }
      return newState;
    });
    
    setPendingMoves(prev => ({
      ...prev,
      [side]: null,
    }));
  }, [gameState.phase]);

  // 结算按钮
  const handleSettle = useCallback(() => {
    if (!pendingMoves.red || !pendingMoves.black) {
      showMessage('双方都需要先走棋');
      return;
    }
    
    // 双方都必须确认
    if (!gameState.redConfirmed || !gameState.blackConfirmed) {
      showMessage('双方都需要确认策略');
      return;
    }
    
    // 进入结算阶段
    setGameState(prev => ({
      ...prev,
      phase: 'settlement',
      message: '双方策略已锁定，开始结算...',
    }));
  }, [pendingMoves, gameState.redConfirmed, gameState.blackConfirmed, showMessage]);

  // 执行结算
  useEffect(() => {
    if (gameState.phase !== 'settlement') return;

    const doSettlement = async () => {
      // 延迟一下让用户看到结算动画
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 实际执行移动后的棋子状态
      let finalPieces = gameState.pieces.map(p => ({ ...p }));
      
      // 执行红方移动
      if (pendingMoves.red) {
        // 先移除目标位置的棋子
        finalPieces = finalPieces.filter(p => 
          !(p.position[0] === pendingMoves.red!.to[0] &&
            p.position[1] === pendingMoves.red!.to[1])
        );
        // 移动棋子
        finalPieces = finalPieces.map(p => {
          if (p.position[0] === pendingMoves.red!.from[0] &&
              p.position[1] === pendingMoves.red!.from[1]) {
            return { ...p, position: [...pendingMoves.red!.to] as Position };
          }
          return p;
        });
      }

      // 执行黑方移动
      if (pendingMoves.black) {
        // 先移除目标位置的棋子
        finalPieces = finalPieces.filter(p => 
          !(p.position[0] === pendingMoves.black!.to[0] &&
            p.position[1] === pendingMoves.black!.to[1])
        );
        // 移动棋子
        finalPieces = finalPieces.map(p => {
          if (p.position[0] === pendingMoves.black!.from[0] &&
              p.position[1] === pendingMoves.black!.from[1]) {
            return { ...p, position: [...pendingMoves.black!.to] as Position };
          }
          return p;
        });
      }

      // 检查将帅面对面
      const redKing = finalPieces.find(p => p.type === 'king' && p.side === 'red');
      const blackKing = finalPieces.find(p => p.type === 'king' && p.side === 'black');
      let winner: 'red' | 'black' | 'draw' | null = null;
      let reason = '';

      if (redKing && blackKing && redKing.position[0] === blackKing.position[0]) {
        // 检查中间是否有棋子
        const between = finalPieces.filter(p => {
          if (p.type === 'king') return false;
          return p.position[0] === redKing.position[0] &&
                 p.position[1] > Math.min(redKing.position[1], blackKing.position[1]) &&
                 p.position[1] < Math.max(redKing.position[1], blackKing.position[1]);
        });

        if (between.length === 0) {
          // 将帅对面，同时移除
          finalPieces = finalPieces.filter(p => p.type !== 'king');
          winner = 'draw';
          reason = '将帅对面，双方同时被吃';
        }
      }

      // 检查同归于尽（双方移动到同一位置）
      if (!winner && pendingMoves.red && pendingMoves.black) {
        if (pendingMoves.red.to[0] === pendingMoves.black.to[0] &&
            pendingMoves.red.to[1] === pendingMoves.black.to[1]) {
          // 移除在目标位置的棋子
          finalPieces = finalPieces.filter(
            p => !(p.position[0] === pendingMoves.red!.to[0] &&
                   p.position[1] === pendingMoves.red!.to[1])
          );
          
          // 检查是否有将帅被吃
          const capturedKings = finalPieces.filter(p => p.type === 'king');
          if (capturedKings.length === 0) {
            winner = 'draw';
            reason = '双方棋子同归于尽';
          } else if (capturedKings.length === 1) {
            winner = capturedKings[0].side === 'red' ? 'black' : 'red';
            reason = capturedKings[0].side === 'red' ? '红帅被吃' : '黑将被吃';
          }
        }
      }

      // 如果没有和棋，检查是否有一方将帅被吃
      if (!winner) {
        const { ended, winner: w } = checkGameEnd(finalPieces);
        if (ended) {
          winner = w;
          reason = w === 'red' ? '红帅被吃，黑方获胜' : w === 'black' ? '黑将被吃，红方获胜' : '和棋';
        }
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

      // 重置待执行移动
      setPendingMoves({ red: null, black: null });

      if (winner) {
        const winnerText = winner === 'draw' ? '和棋！' : winner === 'red' ? '红方胜利！' : '黑方胜利！';
        showMessage(winnerText + (reason ? ' ' + reason : ''), 3000);
      }
    };

    doSettlement();
  }, [gameState.phase, gameState.pieces, pendingMoves, showMessage]);

  // 切换视角
  const handleSwitchView = useCallback((side: Side) => {
    setViewSide(side);
    // 自动切换当前操作方
    if (gameState.phase === 'strategy') {
      setGameState(prev => ({ ...prev, currentOperatedSide: side }));
    }
  }, [gameState.phase]);

  // 重置游戏
  const handleReset = useCallback(() => {
    setGameState(createInitialState());
    setViewSide('red');
    setPendingMoves({ red: null, black: null });
    showMessage('游戏已重置', 1500);
  }, [showMessage]);

  // 获取显示用的棋子（有pendingMove时显示预览）
  const getDisplayPieces = useCallback((): Piece[] => {
    return gameState.pieces;
  }, [gameState.pieces]);

  // 检查位置是否有可吃的敌方棋子
  const canCaptureAt = (pos: Position): boolean => {
    const piece = gameState.pieces.find(p => 
      p.position[0] === pos[0] && p.position[1] === pos[1]
    );
    return !!piece && piece.side !== gameState.currentOperatedSide;
  };

  // 判断是否可以看到结算按钮
  const canSettle = pendingMoves.red && pendingMoves.black && 
                    gameState.redConfirmed && gameState.blackConfirmed;

  return (
    <div className="app-container">
      {/* 顶部状态栏 */}
      <div className="status-bar">
        <div className="status-item">
          <span
            className={`status-dot red ${gameState.redConfirmed ? 'confirmed' : 'waiting'}`}
          />
          <span>红方</span>
          {pendingMoves.red && (
            <span style={{ fontSize: '10px', color: '#FFD700' }}>
              {formatMove(pendingMoves.red)}
            </span>
          )}
          {gameState.redConfirmed && (
            <span style={{ fontSize: '10px', color: '#4CAF50' }}>已确认</span>
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
          {pendingMoves.black && (
            <span style={{ fontSize: '10px', color: '#FFD700' }}>
              {formatMove(pendingMoves.black)}
            </span>
          )}
          {gameState.blackConfirmed && (
            <span style={{ fontSize: '10px', color: '#4CAF50' }}>已确认</span>
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
        {/* 视角切换 */}
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

      {/* 当前操作方控制 */}
      <div className="control-panel">
        {viewSide === 'red' && (
          <>
            {!gameState.redConfirmed ? (
              <>
                <button
                  className="btn btn-red"
                  onClick={() => handleConfirm('red')}
                  disabled={!pendingMoves.red || gameState.phase !== 'strategy'}
                >
                  确认策略
                </button>
                {pendingMoves.red && (
                  <button
                    className="btn btn-reset"
                    onClick={() => {
                      setPendingMoves(prev => ({ ...prev, red: null }));
                      showMessage('红方已重新走棋');
                    }}
                  >
                    重走
                  </button>
                )}
              </>
            ) : (
              <button
                className="btn btn-reset"
                onClick={() => handleUnconfirm('red')}
              >
                红方取消确认
              </button>
            )}
          </>
        )}
        {viewSide === 'black' && (
          <>
            {!gameState.blackConfirmed ? (
              <>
                <button
                  className="btn btn-black"
                  onClick={() => handleConfirm('black')}
                  disabled={!pendingMoves.black || gameState.phase !== 'strategy'}
                >
                  确认策略
                </button>
                {pendingMoves.black && (
                  <button
                    className="btn btn-reset"
                    onClick={() => {
                      setPendingMoves(prev => ({ ...prev, black: null }));
                      showMessage('黑方已重新走棋');
                    }}
                  >
                    重走
                  </button>
                )}
              </>
            ) : (
              <button
                className="btn btn-reset"
                onClick={() => handleUnconfirm('black')}
              >
                黑方取消确认
              </button>
            )}
          </>
        )}
      </div>

      {/* 结算按钮 */}
      <div className="control-panel">
        <button
          className="btn btn-settle"
          onClick={handleSettle}
          disabled={!canSettle || gameState.phase !== 'strategy'}
        >
          结算
        </button>
        <button className="btn btn-reset" onClick={handleReset}>
          重置
        </button>
      </div>

      {/* 提示信息 */}
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
            {!pendingMoves[viewSide] && ' - 请选择一个棋子移动'}
            {pendingMoves[viewSide] && ' - ' + formatMove(pendingMoves[viewSide]!)}
            {!canSettle && ' - 等待双方都走棋并确认'}
            {canSettle && ' - 可以点击结算'}
          </>
        )}
      </div>

      {/* Toast 提示 */}
      {showToast && <div className="toast">{showToast}</div>}

      {/* 结算遮罩 */}
      {gameState.phase === 'settlement' && (
        <div className="settlement-overlay">
          <div className="settlement-text">结算中...</div>
        </div>
      )}

      {/* 游戏结束弹窗 */}
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
            {pendingMoves.red && pendingMoves.black && (
              <p style={{ fontSize: '12px', marginTop: '10px' }}>
                红方：{formatMove(pendingMoves.red)}<br />
                黑方：{formatMove(pendingMoves.black)}
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
