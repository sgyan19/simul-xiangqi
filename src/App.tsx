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
  const [pendingMove, setPendingMove] = useState<{ from: Position; to: Position } | null>(null);

  // 显示提示
  const showMessage = useCallback((msg: string, duration = 2000) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), duration);
  }, []);

  // 选择棋子
  const handleSelectPiece = useCallback((piece: Piece) => {
    if (gameState.phase !== 'strategy') return;
    if (gameState.currentOperatedSide !== piece.side) return;
    
    // 检查当前操作方是否已确认
    const isConfirmed = piece.side === 'red' 
      ? gameState.redConfirmed 
      : gameState.blackConfirmed;
    if (isConfirmed) {
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
      setPendingMove(null);
      return;
    }

    // 计算有效移动
    const validMoves = getValidMoves(piece, gameState.pieces);
    
    setGameState(prev => ({
      ...prev,
      selectedPiece: piece,
      validMoves,
    }));
  }, [gameState.phase, gameState.currentOperatedSide, gameState.redConfirmed, gameState.blackConfirmed, gameState.selectedPiece, gameState.pieces, showMessage]);

  // 移动棋子（只是记录，不实际移动）
  const handleMovePiece = useCallback((to: Position) => {
    if (!gameState.selectedPiece || gameState.phase !== 'strategy') return;
    
    const { selectedPiece, currentOperatedSide } = gameState;
    
    // 记录待执行移动
    const move: Move = {
      from: selectedPiece.position,
      to,
    };

    setPendingMove({ from: selectedPiece.position, to });
    
    // 检查将军
    // 模拟移动后的棋盘
    const piecesCopy = gameState.pieces.map(p => ({ ...p }));
    const pieceToMove = piecesCopy.find(p => p.id === selectedPiece.id);
    if (pieceToMove) {
      pieceToMove.position = [...to];
    }
    if (isCheck(currentOperatedSide === 'red' ? 'black' : 'red', piecesCopy)) {
      showMessage('将军！', 1500);
    }
  }, [gameState.selectedPiece, gameState.phase, gameState.currentOperatedSide, gameState.pieces, showMessage]);

  // 确认策略
  const handleConfirm = useCallback(() => {
    const { currentOperatedSide } = gameState;
    
    if (!pendingMove) {
      showMessage('请先选择棋子并移动');
      return;
    }
    
    setGameState(prev => {
      const newState = { ...prev };
      
      if (currentOperatedSide === 'red') {
        newState.redPendingMove = pendingMove;
        newState.redConfirmed = true;
        newState.currentOperatedSide = 'black';
      } else {
        newState.blackPendingMove = pendingMove;
        newState.blackConfirmed = true;
      }

      // 双方都确认，进入结算
      if (newState.redConfirmed && newState.blackConfirmed) {
        newState.phase = 'settlement';
        newState.message = '双方策略已锁定，开始结算...';
      } else {
        newState.message = `${currentOperatedSide === 'red' ? '黑方' : '红方'}请策略...`;
      }

      return {
        ...newState,
        selectedPiece: null,
        validMoves: [],
      };
    });

    setPendingMove(null);
  }, [gameState.currentOperatedSide, pendingMove, showMessage]);

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
  }, [gameState.phase, gameState.redPendingMove, gameState.blackPendingMove, gameState.pieces, showMessage]);

  // 切换视角
  const handleSwitchView = useCallback((side: Side) => {
    setViewSide(side);
    if (gameState.phase === 'strategy' && !gameState.redConfirmed) {
      setGameState(prev => ({ ...prev, currentOperatedSide: side }));
    }
  }, [gameState.phase, gameState.redConfirmed]);

  // 重置游戏
  const handleReset = useCallback(() => {
    setGameState(createInitialState());
    setViewSide('red');
    setPendingMove(null);
    showMessage('游戏已重置', 1500);
  }, [showMessage]);

  // 获取显示用的棋子（有pendingMove时显示预览）
  const getDisplayPieces = useCallback((): Piece[] => {
    let pieces = gameState.pieces;
    
    // 如果有待执行移动，显示预览
    if (pendingMove) {
      pieces = pieces.map(p => {
        if (p.position[0] === pendingMove.from[0] && p.position[1] === pendingMove.from[1]) {
          return { ...p, position: [...pendingMove.to] as Position };
        }
        return p;
      });
    }
    
    return pieces;
  }, [gameState.pieces, pendingMove]);

  // 检查位置是否有可吃的敌方棋子
  const canCaptureAt = (pos: Position): boolean => {
    const piece = gameState.pieces.find(p => 
      p.position[0] === pos[0] && p.position[1] === pos[1]
    );
    return !!piece && piece.side !== gameState.currentOperatedSide;
  };

  return (
    <div className="app-container">
      {/* 顶部状态栏 */}
      <div className="status-bar">
        <div className="status-item">
          <span
            className={`status-dot red ${gameState.redConfirmed ? 'confirmed' : 'waiting'}`}
          />
          <span>红方</span>
          {gameState.redConfirmed && <span style={{ fontSize: '10px', color: '#4CAF50' }}>已确认</span>}
          {gameState.redPendingMove && <span style={{ fontSize: '10px', color: '#FFD700' }}>已走</span>}
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
          {gameState.blackConfirmed && <span style={{ fontSize: '10px', color: '#4CAF50' }}>已确认</span>}
          {gameState.blackPendingMove && <span style={{ fontSize: '10px', color: '#FFD700' }}>已走</span>}
        </div>
      </div>

      {/* 棋盘 */}
      <ChessBoard
        pieces={getDisplayPieces()}
        selectedPiece={gameState.selectedPiece}
        validMoves={gameState.validMoves}
        currentOperatedSide={gameState.currentOperatedSide}
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

      {/* 确认按钮 */}
      <div className="control-panel">
        <button
          className={`btn ${
            gameState.currentOperatedSide === 'red' ? 'btn-red' : 'btn-black'
          } ${(gameState.currentOperatedSide === 'red' ? gameState.redConfirmed : gameState.blackConfirmed) ? 'locked' : ''}`}
          onClick={handleConfirm}
          disabled={
            gameState.phase !== 'strategy' ||
            (gameState.currentOperatedSide === 'red' && gameState.redConfirmed) ||
            (gameState.currentOperatedSide === 'black' && gameState.blackConfirmed) ||
            !pendingMove
          }
        >
          {gameState.redConfirmed && gameState.currentOperatedSide === 'black'
            ? '红方已确认'
            : gameState.blackConfirmed && gameState.currentOperatedSide === 'red'
            ? '黑方已确认'
            : '确认策略'}
        </button>

        <button className="btn btn-reset" onClick={handleReset}>
          重置
        </button>
      </div>

      {/* 提示信息 */}
      <div className="control-panel" style={{ fontSize: '12px', color: '#AAA' }}>
        {gameState.phase === 'strategy' && (
          <>
            当前操作：
            <span style={{ 
              color: gameState.currentOperatedSide === 'red' ? '#C41E3A' : '#666',
              fontWeight: 'bold'
            }}>
              {gameState.currentOperatedSide === 'red' ? '红方' : '黑方'}
            </span>
            {!pendingMove && ' - 请选择一个棋子移动'}
            {pendingMove && gameState.currentOperatedSide === 'red' && 
              ` - ${formatMove(pendingMove)}`}
            {pendingMove && gameState.currentOperatedSide === 'black' && 
              ` - ${formatMove(pendingMove)}`}
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
