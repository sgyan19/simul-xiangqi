import { useState, useCallback, useEffect, useRef } from 'react';
import { Piece, Position, Side, Move, INITIAL_PIECES, GamePhase } from './types';
import { wsClient, RoomState } from './wsClient';
import ChessBoard from './ChessBoard';

// 在线游戏状态
interface OnlineGameState {
  connected: boolean;
  roomId: string | null;
  side: Side | null;
  pieces: Piece[];
  phase: GamePhase;
  redConfirmed: boolean;
  blackConfirmed: boolean;
  redPendingMove: Move | null;
  blackPendingMove: Move | null;
  winner: Side | 'draw' | null;
  redOnline: boolean;
  blackOnline: boolean;
  message: string;
}

function App() {
  const [onlineState, setOnlineState] = useState<OnlineGameState>({
    connected: false,
    roomId: null,
    side: null,
    pieces: INITIAL_PIECES.map(p => ({ ...p })),
    phase: 'waiting',
    redConfirmed: false,
    blackConfirmed: false,
    redPendingMove: null,
    blackPendingMove: null,
    winner: null,
    redOnline: false,
    blackOnline: false,
    message: '',
  });

  const [viewSide, setViewSide] = useState<Side>('red');
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [roomInput, setRoomInput] = useState('');
  const [gameMode, setGameMode] = useState<'local' | 'online'>('local');

  // 显示提示
  const showMessage = useCallback((msg: string, duration = 2000) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), duration);
  }, []);

  // WebSocket 连接
  useEffect(() => {
    if (gameMode !== 'online') return;

    wsClient.connect()
      .then(() => {
        setOnlineState(prev => ({ ...prev, connected: true, message: '已连接到服务器' }));
      })
      .catch(() => {
        showMessage('连接服务器失败', 3000);
      });

    // 监听消息
    wsClient.on('connected', () => {
      setOnlineState(prev => ({ ...prev, connected: true }));
    });

    wsClient.on('room_created', (payload: unknown) => {
      const { roomId } = payload as { roomId: string };
      setOnlineState(prev => ({ ...prev, roomId, message: `房间已创建: ${roomId}` }));
      showMessage(`房间号: ${roomId}`, 3000);
    });

    wsClient.on('joined', (payload: unknown) => {
      const { roomId, side } = payload as { roomId: string; side: Side };
      setOnlineState(prev => ({ 
        ...prev, 
        roomId, 
        side, 
        message: `已加入房间 ${roomId}，你是${side === 'red' ? '红方' : '黑方'}` 
      }));
    });

    wsClient.on('room_state', (payload: unknown) => {
      const state = payload as RoomState;
      setOnlineState(prev => ({
        ...prev,
        pieces: state.pieces as Piece[],
        phase: state.phase as GamePhase,
        redConfirmed: state.redConfirmed,
        blackConfirmed: state.blackConfirmed,
        redPendingMove: state.redPendingMove,
        blackPendingMove: state.blackPendingMove,
        winner: state.winner as Side | 'draw' | null,
        redOnline: state.redOnline,
        blackOnline: state.blackOnline,
        side: state.side || prev.side,
        message: state.phase === 'waiting' ? '等待玩家加入...' : '',
      }));
    });

    wsClient.on('error', (payload: unknown) => {
      const { message } = payload as { message: string };
      showMessage(message, 2000);
    });

    wsClient.on('left_room', () => {
      setOnlineState({
        connected: true,
        roomId: null,
        side: null,
        pieces: INITIAL_PIECES.map(p => ({ ...p })),
        phase: 'waiting',
        redConfirmed: false,
        blackConfirmed: false,
        redPendingMove: null,
        blackPendingMove: null,
        winner: null,
        redOnline: false,
        blackOnline: false,
        message: '',
      });
      setSelectedPiece(null);
      setValidMoves([]);
    });

    return () => {
      wsClient.disconnect();
    };
  }, [gameMode, showMessage]);

  // 在线模式：选择棋子
  const handleSelectPieceOnline = useCallback((piece: Piece) => {
    if (onlineState.phase !== 'strategy') return;
    if (!onlineState.side || piece.side !== onlineState.side) return;

    // 检查是否已经确认
    const isConfirmed = piece.side === 'red' ? onlineState.redConfirmed : onlineState.blackConfirmed;
    if (isConfirmed) {
      showMessage('本回合已走棋，点击"重新走棋"可撤销', 2000);
      return;
    }

    if (selectedPiece?.id === piece.id) {
      setSelectedPiece(null);
      setValidMoves([]);
      return;
    }

    // 简单的移动验证（实际验证在服务端）
    setSelectedPiece(piece);
    // 这里应该调用服务端的 getValidMoves，但目前简化为所有空格
    const moves: Position[] = [];
    setValidMoves(moves);
  }, [onlineState.phase, onlineState.side, onlineState.redConfirmed, onlineState.blackConfirmed, selectedPiece, showMessage]);

  // 在线模式：移动棋子
  const handleMovePieceOnline = useCallback((to: Position) => {
    if (!selectedPiece || !onlineState.roomId) return;

    const from = selectedPiece.position;
    wsClient.submitMove(from as [number, number], to as [number, number]);
    setSelectedPiece(null);
    setValidMoves([]);
  }, [selectedPiece, onlineState.roomId]);

  // 创建房间
  const handleCreateRoom = useCallback(() => {
    wsClient.createRoom();
  }, []);

  // 加入房间
  const handleJoinRoom = useCallback(() => {
    if (!roomInput.trim()) {
      showMessage('请输入房间号', 2000);
      return;
    }
    wsClient.joinRoom(roomInput.trim().toUpperCase());
    setRoomInput('');
  }, [roomInput, showMessage]);

  // 离开房间
  const handleLeaveRoom = useCallback(() => {
    wsClient.leaveRoom();
  }, []);

  // 开始游戏
  const handleStartGame = useCallback(() => {
    wsClient.startGame();
  }, []);

  // 重新走棋（撤销）
  const handleUndoMove = useCallback(() => {
    wsClient.undoMove();
  }, []);

  // 重置游戏
  const handleResetGame = useCallback(() => {
    wsClient.resetGame();
  }, []);

  // 本地模式的状态
  const [localState, setLocalState] = useState({
    phase: 'strategy' as GamePhase,
    redConfirmed: false,
    blackConfirmed: false,
    pieces: INITIAL_PIECES.map(p => ({ ...p })),
    redPendingMove: null as Move | null,
    blackPendingMove: null as Move | null,
    winner: null as Side | 'draw' | null,
    selectedPiece: null as Piece | null,
    validMoves: [] as Position[],
  });

  // 本地模式：选择棋子
  const handleSelectPieceLocal = useCallback((piece: Piece) => {
    if (localState.phase !== 'strategy') return;
    
    const isOwnSide = viewSide === piece.side;
    if (!isOwnSide) {
      showMessage('请切换到己方视角操作');
      return;
    }
    
    const isConfirmed = piece.side === 'red' ? localState.redConfirmed : localState.blackConfirmed;
    if (isConfirmed) {
      showMessage('本回合已走棋，点击"重新走"可撤销');
      return;
    }

    if (localState.selectedPiece?.id === piece.id) {
      setLocalState(prev => ({ ...prev, selectedPiece: null, validMoves: [] }));
      return;
    }

    // 计算有效移动
    const moves: Position[] = [];
    setLocalState(prev => ({ ...prev, selectedPiece: piece, validMoves: moves }));
  }, [localState.phase, localState.redConfirmed, localState.blackConfirmed, localState.selectedPiece, viewSide, showMessage]);

  // 本地模式：移动棋子
  const handleMovePieceLocal = useCallback((to: Position) => {
    if (!localState.selectedPiece) return;
    
    const selectedPiece = localState.selectedPiece;
    const side = selectedPiece.side;
    
    const pendingMove: Move = {
      from: selectedPiece.position,
      to,
    };

    setLocalState(prev => {
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
  }, [localState.selectedPiece]);

  // 重新走棋（本地）
  const handleUndoMoveLocal = useCallback((side: Side) => {
    setLocalState(prev => {
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
  }, []);

  // 结算
  const handleSettleLocal = useCallback(() => {
    if (!localState.redPendingMove || !localState.blackPendingMove) {
      showMessage('双方都需要先走棋');
      return;
    }
    setLocalState(prev => ({ ...prev, phase: 'settlement' }));
  }, [localState.redPendingMove, localState.blackPendingMove, showMessage]);

  // 渲染在线模式
  const renderOnlineMode = () => (
    <div className="app online-mode">
      {/* 模式切换 */}
      <div className="mode-switch">
        <button 
          className={gameMode === 'local' ? 'active' : ''} 
          onClick={() => setGameMode('local')}
        >
          本地模式
        </button>
        <button 
          className={gameMode === 'online' ? 'active' : ''} 
          onClick={() => setGameMode('online')}
        >
          在线模式
        </button>
      </div>

      {/* 连接状态 */}
      <div className="connection-status">
        <span className={`status-dot ${onlineState.connected ? 'connected' : 'disconnected'}`} />
        {onlineState.connected ? '已连接' : '未连接'}
      </div>

      {/* 房间信息 */}
      {onlineState.roomId ? (
        <div className="room-info">
          <div className="room-id">
            <span>房间号:</span>
            <strong>{onlineState.roomId}</strong>
          </div>
          <div className="player-side">
            你是: <strong className={onlineState.side || ''}>{onlineState.side === 'red' ? '红方' : onlineState.side === 'black' ? '黑方' : '观察者'}</strong>
          </div>
          <div className="player-status">
            <span className={onlineState.redOnline ? 'online' : 'offline'}>红方 {onlineState.redOnline ? '在线' : '离线'}</span>
            <span className={onlineState.blackOnline ? 'online' : 'offline'}>黑方 {onlineState.blackOnline ? '在线' : '离线'}</span>
          </div>
          
          {/* 操作按钮 */}
          <div className="action-buttons">
            {onlineState.phase === 'waiting' && onlineState.side && (
              <button onClick={handleStartGame} disabled={!onlineState.redOnline || !onlineState.blackOnline}>
                开始游戏
              </button>
            )}
            {onlineState.phase === 'strategy' && (
              <button onClick={handleUndoMove}>重新走棋</button>
            )}
            <button onClick={handleLeaveRoom} className="secondary">离开房间</button>
          </div>
        </div>
      ) : (
        <div className="room-actions">
          <button onClick={handleCreateRoom}>创建房间</button>
          <div className="join-room">
            <input
              type="text"
              placeholder="输入房间号"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button onClick={handleJoinRoom}>加入</button>
          </div>
        </div>
      )}

      {/* 提示信息 */}
      {onlineState.message && (
        <div className="message">{onlineState.message}</div>
      )}

      {/* 棋盘 */}
      <ChessBoard
        pieces={onlineState.pieces}
        selectedPiece={selectedPiece}
        validMoves={validMoves}
        currentOperatedSide={viewSide}
        phase={onlineState.phase}
        flipped={viewSide === 'black'}
        redPendingMove={onlineState.redPendingMove}
        blackPendingMove={onlineState.blackPendingMove}
        onSelectPiece={handleSelectPieceOnline}
        onMovePiece={handleMovePieceOnline}
      />

      {/* 控制面板 */}
      <div className="control-panel">
        <div className="view-switch">
          <button
            className={`view-btn ${viewSide === 'red' ? 'active' : ''}`}
            onClick={() => setViewSide('red')}
          >
            红方视角
          </button>
          <button
            className={`view-btn ${viewSide === 'black' ? 'active' : ''}`}
            onClick={() => setViewSide('black')}
          >
            黑方视角
          </button>
        </div>
      </div>

      {/* Toast */}
      {showToast && <div className="toast">{showToast}</div>}
    </div>
  );

  // 渲染本地模式
  const renderLocalMode = () => (
    <div className="app local-mode">
      {/* 模式切换 */}
      <div className="mode-switch">
        <button 
          className={gameMode === 'local' ? 'active' : ''} 
          onClick={() => setGameMode('local')}
        >
          本地模式
        </button>
        <button 
          className={gameMode === 'online' ? 'active' : ''} 
          onClick={() => setGameMode('online')}
        >
          在线模式
        </button>
      </div>

      {/* 状态栏 */}
      <div className="status-bar">
        <div className="confirm-status">
          <span className={`red ${localState.redConfirmed ? 'confirmed' : ''}`}>
            红方 {localState.redConfirmed ? '✓' : '○'}
          </span>
          <span className={`black ${localState.blackConfirmed ? 'confirmed' : ''}`}>
            黑方 {localState.blackConfirmed ? '✓' : '○'}
          </span>
        </div>
        {localState.redPendingMove && !localState.redConfirmed && (
          <button 
            className="undo-btn red" 
            onClick={() => handleUndoMoveLocal('red')}
          >
            红方重新走
          </button>
        )}
        {localState.blackPendingMove && !localState.blackConfirmed && (
          <button 
            className="undo-btn black" 
            onClick={() => handleUndoMoveLocal('black')}
          >
            黑方重新走
          </button>
        )}
      </div>

      {/* 棋盘 */}
      <ChessBoard
        pieces={localState.pieces}
        selectedPiece={localState.selectedPiece}
        validMoves={localState.validMoves}
        currentOperatedSide={viewSide}
        phase={localState.phase}
        flipped={viewSide === 'black'}
        redPendingMove={localState.redPendingMove}
        blackPendingMove={localState.blackPendingMove}
        onSelectPiece={handleSelectPieceLocal}
        onMovePiece={handleMovePieceLocal}
      />

      {/* 控制面板 */}
      <div className="control-panel">
        <div className="view-switch">
          <button
            className={`view-btn ${viewSide === 'red' ? 'active' : ''}`}
            onClick={() => setViewSide('red')}
          >
            红方视角
          </button>
          <button
            className={`view-btn ${viewSide === 'black' ? 'active' : ''}`}
            onClick={() => setViewSide('black')}
          >
            黑方视角
          </button>
        </div>
        
        <div className="game-controls">
          <button 
            className="settle-btn"
            onClick={handleSettleLocal}
            disabled={!localState.redPendingMove || !localState.blackPendingMove}
          >
            结算
          </button>
        </div>
      </div>

      {/* Toast */}
      {showToast && <div className="toast">{showToast}</div>}
    </div>
  );

  return gameMode === 'online' ? renderOnlineMode() : renderLocalMode();
}

export default App;
