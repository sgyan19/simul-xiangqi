import { useState, useCallback, useEffect } from 'react';
import {
  GameState,
  Piece,
  Position,
  Side,
  Move,
  INITIAL_PIECES,
} from './types';
import { getValidMoves, isCheck } from './chessLogic';
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

  // 显示提示
  const showMessage = useCallback((msg: string, duration = 2000) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), duration);
  }, []);

  // 选择棋子
  const handleSelectPiece = useCallback((piece: Piece) => {
    if (gameState.phase !== 'strategy') return;
    
    // 检查是否在自己的视角下操作
    const isOwnSide = viewSide === piece.side;
    if (!isOwnSide) {
      showMessage('请切换到己方视角操作');
      return;
    }
    
    // 检查该阵营是否已完成走棋
    const isConfirmed = piece.side === 'red' ? gameState.redConfirmed : gameState.blackConfirmed;
    if (isConfirmed) {
      // 如果已完成，可以重新走（撤销之前的）
      if (piece.side === 'red') {
        setGameState(prev => ({ ...prev, redConfirmed: false }));
      } else {
        setGameState(prev => ({ ...prev, blackConfirmed: false }));
      }
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
  }, [gameState.phase, gameState.selectedPiece, gameState.pieces, gameState.redConfirmed, gameState.blackConfirmed, viewSide, showMessage]);

  // 移动棋子（走棋即视为完成策略）
  const handleMovePiece = useCallback((to: Position) => {
    if (!gameState.selectedPiece || gameState.phase !== 'strategy') return;
    
    const selectedPiece = gameState.selectedPiece;
    const side = selectedPiece.side;
    
    // 走棋即视为完成策略
    const pendingMove: Move = {
      from: selectedPiece.position,
      to,
    };

    setGameState(prev => {
      const newState = { ...prev };
      // 记录移动
      if (side === 'red') {
        newState.redPendingMove = pendingMove;
        newState.redConfirmed = true;
      } else {
        newState.blackPendingMove = pendingMove;
        newState.blackConfirmed = true;
      }
      // 清除选中
      newState.selectedPiece = null;
      newState.validMoves = [];
      return newState;
    });
  }, [gameState.selectedPiece, gameState.phase, gameState.pieces, showMessage]);

  // 结算按钮
  const handleSettle = useCallback(() => {
    if (!gameState.redPendingMove || !gameState.blackPendingMove) {
      showMessage('双方都需要先走棋');
      return;
    }
    
    // 进入结算阶段
    setGameState(prev => ({
      ...prev,
      phase: 'settlement',
      message: '双方策略已锁定，开始结算...',
    }));
  }, [gameState.redPendingMove, gameState.blackPendingMove, showMessage]);

  // 重新走棋（撤销之前的走棋）
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
      // 延迟一下让用户看到结算动画
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 实际执行移动后的棋子状态
      let finalPieces = gameState.pieces.map(p => ({ ...p }));
      
      // 执行红方移动
      if (gameState.redPendingMove) {
        // 先移除目标位置的棋子
        finalPieces = finalPieces.filter(p => 
          !(p.position[0] === gameState.redPendingMove!.to[0] &&
            p.position[1] === gameState.redPendingMove!.to[1])
        );
        // 移动棋子
        finalPieces = finalPieces.map(p => {
          if (p.position[0] === gameState.redPendingMove!.from[0] &&
              p.position[1] === gameState.redPendingMove!.from[1]) {
            return { ...p, position: [...gameState.redPendingMove!.to] as Position };
          }
          return p;
        });
      }

      // 执行黑方移动
      if (gameState.blackPendingMove) {
        // 先移除目标位置的棋子
        finalPieces = finalPieces.filter(p => 
          !(p.position[0] === gameState.blackPendingMove!.to[0] &&
            p.position[1] === gameState.blackPendingMove!.to[1])
        );
        // 移动棋子
        finalPieces = finalPieces.map(p => {
          if (p.position[0] === gameState.blackPendingMove!.from[0] &&
              p.position[1] === gameState.blackPendingMove!.from[1]) {
            return { ...p, position: [...gameState.blackPendingMove!.to] as Position };
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
      if (!winner && gameState.redPendingMove && gameState.blackPendingMove) {
        if (gameState.redPendingMove.to[0] === gameState.blackPendingMove.to[0] &&
            gameState.redPendingMove.to[1] === gameState.blackPendingMove.to[1]) {
          // 移除在目标位置的棋子
          finalPieces = finalPieces.filter(
            p => !(p.position[0] === gameState.redPendingMove!.to[0] &&
                   p.position[1] === gameState.redPendingMove!.to[1])
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

      if (winner) {
        const winnerText = winner === 'draw' ? '和棋！' : winner === 'red' ? '红方胜利！' : '黑方胜利！';
        showMessage(winnerText + (reason ? ' ' + reason : ''), 3000);
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
    showMessage('游戏已重置', 1500);
  }, [showMessage]);

  // 获取显示用的棋子
  const getDisplayPieces = useCallback((): Piece[] => {
    return gameState.pieces;
  }, [gameState.pieces]);

  // 判断是否可以看到结算按钮
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

      {/* 操作面板 */}
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

      {/* 结算按钮 */}
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
            {!gameState.redPendingMove && !gameState.blackPendingMove && ' - 请选择一个棋子移动'}
            {viewSide === 'red' && gameState.redPendingMove && ' - 红方已走棋，可切换视角'}
            {viewSide === 'black' && gameState.blackPendingMove && ' - 黑方已走棋，可切换视角'}
            {!canSettle && ' - 等待双方都走棋'}
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
