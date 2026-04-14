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
        message: `你是${side === 'red' ? '红方' : '黑方'}` 
      }));
      showMessage(`已加入${side === 'red' ? '红方' : '黑方'}`, 2000);
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
    
    // 本地双人模式：检查该方是否已确认走棋
    const isConfirmed = piece.side === 'red' ? localState.redConfirmed : localState.blackConfirmed;
    if (isConfirmed) {
      showMessage('本回合已走棋，点击"重走"可撤销');
      return;
    }

    if (localState.selectedPiece?.id === piece.id) {
      setLocalState(prev => ({ ...prev, selectedPiece: null, validMoves: [] }));
      return;
    }

    // 本地模式：选择棋子即可移动（无需切换视角）
    setLocalState(prev => ({ ...prev, selectedPiece: piece, validMoves: [] }));
  }, [localState.phase, localState.redConfirmed, localState.blackConfirmed, localState.selectedPiece, showMessage]);

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

  // 渲染在线模式 - 简洁聚焦布局
  const renderOnlineMode = () => (
    <div className="online-mode">
      {/* 顶部：紧凑模式切换 */}
      <div className="online-topbar">
        <div className="mode-switch">
          <button 
            className={gameMode === 'local' ? 'active' : ''} 
            onClick={() => setGameMode('local')}
          >
            本地
          </button>
          <button 
            className={gameMode === 'online' ? 'active' : ''} 
            onClick={() => setGameMode('online')}
          >
            联机
          </button>
        </div>
        
        {/* 连接状态 */}
        <div className={`conn-indicator ${onlineState.connected ? 'online' : 'offline'}`}>
          {onlineState.connected ? '已连接' : '未连接'}
        </div>
      </div>

      {/* 棋盘 - 最大化显示 */}
      <div className="board-section">
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
      </div>

      {/* 底部信息栏 */}
      <div className="online-statusbar">
        {/* 房间/玩家状态 */}
        {onlineState.roomId ? (
          <div className="room-info">
            <span className="room-code">{onlineState.roomId}</span>
            <span className="divider">|</span>
            <span className={`player-tag ${onlineState.side}`}>
              {onlineState.side === 'red' ? '红方' : onlineState.side === 'black' ? '黑方' : '待加入'}
            </span>
            <span className="players">
              <span className={`dot ${onlineState.redOnline ? 'online' : ''}`}>红</span>
              <span className={`dot ${onlineState.blackOnline ? 'online' : ''}`}>黑</span>
            </span>
          </div>
        ) : (
          <div className="join-area">
            <input
              type="text"
              placeholder="房间号"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button className="join-btn" onClick={handleJoinRoom}>加入</button>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="action-row">
          {onlineState.roomId && !onlineState.side && (
            <>
              <button className="red-btn" onClick={() => wsClient.chooseSide('red')}>选红</button>
              <button className="black-btn" onClick={() => wsClient.chooseSide('black')}>选黑</button>
            </>
          )}
          {onlineState.roomId && onlineState.side && onlineState.phase === 'waiting' && (
            <button className="start-btn" onClick={handleStartGame} disabled={!onlineState.redOnline || !onlineState.blackOnline}>
              开始
            </button>
          )}
          {onlineState.phase === 'strategy' && (
            <button className="undo-btn" onClick={handleUndoMove}>重走</button>
          )}
          {onlineState.roomId && (
            <button className="leave-btn" onClick={handleLeaveRoom}>离开</button>
          )}
        </div>
      </div>

      {/* 视角切换 */}
      <div className="view-row">
        <button 
          className={`view-btn ${viewSide === 'red' ? 'active red' : ''}`}
          onClick={() => setViewSide('red')}
        >
          红视角
        </button>
        <button 
          className={`view-btn ${viewSide === 'black' ? 'active black' : ''}`}
          onClick={() => setViewSide('black')}
        >
          黑视角
        </button>
      </div>

      {/* Toast */}
      {showToast && <div className="toast">{showToast}</div>}
    </div>
  );

  // 渲染本地模式 - 与在线模式一致的简洁布局
  const renderLocalMode = () => (
    <div className="online-mode">
      {/* 顶部：模式切换 */}
      <div className="online-topbar">
        <div className="mode-switch">
          <button 
            className={gameMode === 'local' ? 'active' : ''} 
            onClick={() => setGameMode('local')}
          >
            本地
          </button>
          <button 
            className={gameMode === 'online' ? 'active' : ''} 
            onClick={() => setGameMode('online')}
          >
            联机
          </button>
        </div>
        
        {/* 状态指示 */}
        <div className="conn-indicator">
          {localState.phase === 'strategy' && (
            <>
              <span className={`player-tag ${localState.redConfirmed ? 'done' : 'red'}`}>
                红{localState.redConfirmed ? '✓' : '○'}
              </span>
              <span className={`player-tag ${localState.blackConfirmed ? 'done' : 'black'}`}>
                黑{localState.blackConfirmed ? '✓' : '○'}
              </span>
            </>
          )}
          {localState.phase === 'settlement' && '结算中...'}
          {localState.phase === 'ended' && localState.winner && (
            <span className="winner">
              {localState.winner === 'red' ? '红方胜' : localState.winner === 'black' ? '黑方胜' : '平局'}
            </span>
          )}
        </div>
      </div>

      {/* 棋盘 - 最大化显示 */}
      <div className="board-section">
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
          selectableSides={['red', 'black']} // 本地模式允许选择双方
        />
      </div>

      {/* 底部操作栏 */}
      <div className="online-statusbar">
        {/* 重新走棋按钮 */}
        <div className="action-row">
          {localState.redPendingMove && !localState.redConfirmed && (
            <button className="red-btn" onClick={() => handleUndoMoveLocal('red')}>
              红重走
            </button>
          )}
          {localState.blackPendingMove && !localState.blackConfirmed && (
            <button className="black-btn" onClick={() => handleUndoMoveLocal('black')}>
              黑重走
            </button>
          )}
        </div>

        {/* 主要操作 */}
        <div className="action-row">
          {localState.phase === 'strategy' && (
            <button 
              className="start-btn" 
              onClick={handleSettleLocal}
              disabled={!localState.redPendingMove || !localState.blackPendingMove}
            >
              结算
            </button>
          )}
          {localState.phase === 'ended' && (
            <button 
              className="start-btn" 
              onClick={() => setLocalState({
                phase: 'strategy',
                redConfirmed: false,
                blackConfirmed: false,
                pieces: INITIAL_PIECES.map(p => ({ ...p })),
                redPendingMove: null,
                blackPendingMove: null,
                winner: null,
                selectedPiece: null,
                validMoves: [],
              })}
            >
              重开
            </button>
          )}
        </div>
      </div>

      {/* 视角切换 */}
      <div className="view-row">
        <button 
          className={`view-btn ${viewSide === 'red' ? 'active red' : ''}`}
          onClick={() => setViewSide('red')}
        >
          红视角
        </button>
        <button 
          className={`view-btn ${viewSide === 'black' ? 'active black' : ''}`}
          onClick={() => setViewSide('black')}
        >
          黑视角
        </button>
      </div>

      {/* Toast */}
      {showToast && <div className="toast">{showToast}</div>}
    </div>
  );

  return gameMode === 'online' ? renderOnlineMode() : renderLocalMode();
}

export default App;
