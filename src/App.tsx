import { useState, useCallback, useEffect } from 'react';
import {
  GameState,
  Piece,
  Position,
  Side,
  Move,
  PendingAction,
  ActionType,
  INITIAL_PIECES,
  GamePhase,
} from './types';
import { getValidMoves, isCheck, isValidMove } from './chessLogic';
import { checkGameEnd, formatMove } from './gameLogic';
import { executeSettlement } from './shared/settlement';
import HistoryLog from './HistoryLog';
import { RoundHistoryEntry } from './shared/history';
import ChessBoard from './ChessBoard';

// WebSocket 客户端
type MessageHandler = (payload: unknown) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, MessageHandler> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${window.location.host}/ws`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const { type, payload } = data;
            const handler = this.handlers.get(type);
            if (handler) {
              handler(payload);
            }
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.attemptReconnect();
        };
      } catch (e) {
        reject(e);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
        this.connect().catch(() => {});
      }, 2000);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(type: string, payload?: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  on(type: string, handler: MessageHandler) {
    this.handlers.set(type, handler);
  }

  off(type: string) {
    this.handlers.delete(type);
  }
}

const wsClient = new WebSocketClient();

// 在线游戏状态
interface OnlineState {
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
  message: string;
}

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
  // 长捉限制
  redLastPiece: null,
  redLastTarget: null,
  redCaptureCount: 0,
  blackLastPiece: null,
  blackLastTarget: null,
  blackCaptureCount: 0,
});

const createInitialOnlineState = (): OnlineState => ({
  connected: false,
  roomId: null,
  side: null,
  pieces: INITIAL_PIECES.map(p => ({ ...p })),
  phase: 'strategy',
  redConfirmed: false,
  blackConfirmed: false,
  redPendingMove: null,
  blackPendingMove: null,
  winner: null,
  message: '',
});

function App() {
  const [gameMode, setGameMode] = useState<'local' | 'online'>('local');
  const [gameState, setGameState] = useState<GameState>(createInitialState);
  const [onlineState, setOnlineState] = useState<OnlineState>(createInitialOnlineState);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [viewSide, setViewSide] = useState<Side>('red');
  const [checkStatus, setCheckStatus] = useState<{ red: boolean; black: boolean }>({ red: false, black: false });
  const [roomInput, setRoomInput] = useState('');
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [history, setHistory] = useState<RoundHistoryEntry[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [lastMoveTargets, setLastMoveTargets] = useState<{ red: Position | null; black: Position | null }>({ red: null, black: null });

  // 显示提示
  const showMessage = useCallback((msg: string, duration = 2000) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), duration);
  }, []);

  // ===== 本地模式逻辑（来自 d39b70d）=====

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
    
    // 用户开始选择棋子时，清除目标框
    setLastMoveTargets({ red: null, black: null });
  }, [gameState.phase, gameState.selectedPiece, gameState.pieces, gameState.redConfirmed, gameState.blackConfirmed, viewSide, showMessage]);

  // 移动棋子
  const handleMovePiece = useCallback((to: Position) => {
    if (!gameState.selectedPiece || gameState.phase !== 'strategy') return;
    
    const selectedPiece = gameState.selectedPiece;
    const side = selectedPiece.side;
    
    // 判断行动类型：目标是敌方棋子则为吃子，否则为移动
    const targetPiece = gameState.pieces.find(p => 
      p.side !== side && p.position[0] === to[0] && p.position[1] === to[1]
    );
    const actionType: ActionType = targetPiece ? 'capture' : 'move';
    
    // 长捉检查：比较"谁在捉"+"捉谁"
    if (actionType === 'capture') {
      const isRed = side === 'red';
      const lastPiece = isRed ? gameState.redLastPiece : gameState.blackLastPiece;
      const lastTarget = isRed ? gameState.redLastTarget : gameState.blackLastTarget;
      const count = isRed ? gameState.redCaptureCount : gameState.blackCaptureCount;
      
      if (selectedPiece.id === lastPiece && targetPiece!.id === lastTarget && count >= 3) {
        showMessage('不允许长捉（3次）');
        return;
      }
    }
    
    const pendingMove: PendingAction = {
      from: selectedPiece.position,
      to,
      actionType,
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
  }, [gameState.selectedPiece, gameState.phase, gameState.pieces, gameState.redLastPiece, gameState.redLastTarget, gameState.redCaptureCount, gameState.blackLastPiece, gameState.blackLastTarget, gameState.blackCaptureCount, showMessage]);

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
      // 保存当前 pending moves（因为异步执行时会变化）
      const redMove = gameState.redPendingMove;
      const blackMove = gameState.blackPendingMove;
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { pieces: finalPieces, winner, reason, newChaseState, historyEntry } = executeSettlement(
        gameState.pieces,
        redMove,
        blackMove,
        {
          redLastPiece: gameState.redLastPiece,
          redLastTarget: gameState.redLastTarget,
          redCaptureCount: gameState.redCaptureCount,
          blackLastPiece: gameState.blackLastPiece,
          blackLastTarget: gameState.blackLastTarget,
          blackCaptureCount: gameState.blackCaptureCount,
        }
      );

      // 添加回合历史记录
      const roundNumber = history.length + 1;
      const entryWithRound: RoundHistoryEntry = {
        ...historyEntry,
        roundNumber,
      };
      setHistory(prev => [...prev, entryWithRound]);

      // 检查将军状态
      const redInCheck = isCheck('red', finalPieces);
      const blackInCheck = isCheck('black', finalPieces);
      setCheckStatus({ red: redInCheck, black: blackInCheck });

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
          redAction: prev.redPendingMove, 
          blackAction: prev.blackPendingMove, 
          captures: { red: [], black: [] },
          winner,
          reason 
        } : null,
        currentOperatedSide: winner ? prev.currentOperatedSide : 'red',
        redConfirmed: false,
        blackConfirmed: false,
        redPendingMove: null,
        blackPendingMove: null,
        // 更新长捉计数
        redLastPiece: newChaseState.redLastPiece,
        redLastTarget: newChaseState.redLastTarget,
        redCaptureCount: newChaseState.redCaptureCount,
        blackLastPiece: newChaseState.blackLastPiece,
        blackLastTarget: newChaseState.blackLastTarget,
        blackCaptureCount: newChaseState.blackCaptureCount,
      }));

      // 设置最后行动目标位置（用于显示目标框）
      setLastMoveTargets({
        red: redMove?.to || null,
        black: blackMove?.to || null,
      });

      if (finalMessage) {
        showMessage(finalMessage, 3000);
      }
    };

    doSettlement();
  }, [gameState.phase, gameState.pieces, gameState.redPendingMove, gameState.blackPendingMove, gameState.redLastPiece, gameState.redLastTarget, gameState.redCaptureCount, gameState.blackLastPiece, gameState.blackLastTarget, gameState.blackCaptureCount, showMessage, history.length]);

  // 本地模式：监听双方走棋，自动进入结算
  useEffect(() => {
    if (gameMode !== 'local') return;
    if (gameState.phase !== 'strategy') return;
    if (!gameState.redPendingMove || !gameState.blackPendingMove) return;
    
    // 双方都走棋后，自动进入结算阶段（延迟一小段时间让玩家看清箭头）
    const timer = setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        phase: 'settlement',
        message: '双方策略已锁定，开始结算...',
      }));
    }, 500);
    
    return () => clearTimeout(timer);
  }, [gameMode, gameState.phase, gameState.redPendingMove, gameState.blackPendingMove]);

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
    setHistory([]);
    setLastMoveTargets({ red: null, black: null });
    showMessage('游戏已重置', 1500);
  }, [showMessage]);

  // 获取显示用的棋子
  const getDisplayPieces = useCallback((): Piece[] => {
    return gameState.pieces;
  }, [gameState.pieces]);

  // ===== 在线模式逻辑 =====

  // 连接 WebSocket
  useEffect(() => {
    if (gameMode !== 'online') return;

    wsClient.connect()
      .then(() => {
        setOnlineState(prev => ({ ...prev, connected: true }));
      })
      .catch(() => {
        showMessage('连接失败，请刷新重试');
      });

    wsClient.on('room_created', (payload: any) => {
      // 确保pieces存在且有效
      const pieces = payload.pieces && payload.pieces.length > 0 
        ? payload.pieces 
        : INITIAL_PIECES.map(p => ({ ...p }));
      // 使用服务端发送的 phase（等待状态）
      const phase = payload.phase || 'waiting';
      setOnlineState(prev => ({ 
        ...prev, 
        roomId: payload.roomId, 
        side: payload.side || 'red',
        pieces: pieces,
        phase: phase,
        redConfirmed: false,
        blackConfirmed: false,
        redPendingMove: null,
        blackPendingMove: null,
      }));
      showMessage(`房间 ${payload.roomId} 已创建，你是${payload.side === 'red' ? '红方' : '黑方'}`);
    });

    wsClient.on('joined', (payload: any) => {
      // 确保pieces存在且有效
      const pieces = payload.pieces && payload.pieces.length > 0 
        ? payload.pieces 
        : INITIAL_PIECES.map(p => ({ ...p }));
      // 使用服务端发送的 phase，默认 strategy
      const phase = payload.phase || 'strategy';
      setOnlineState(prev => ({ 
        ...prev, 
        roomId: payload.roomId, 
        side: payload.side, 
        pieces: pieces,
        phase: phase,
        redConfirmed: false,
        blackConfirmed: false,
        redPendingMove: null,
        blackPendingMove: null,
      }));
      // 加入房间后，自动切换到自己的视角
      if (payload.side) {
        setViewSide(payload.side);
      }
      showMessage(`加入房间 ${payload.roomId}，你是${payload.side === 'red' ? '红方' : '黑方'}`);
      if (phase === 'strategy') {
        showMessage('双方已就位，可以开始对弈！');
      }
    });

    wsClient.on('room_state', (payload: any) => {
      // 确保pieces存在且有效
      const pieces = payload.pieces && payload.pieces.length > 0 
        ? payload.pieces 
        : (onlineState.pieces.length > 0 ? onlineState.pieces : INITIAL_PIECES.map(p => ({ ...p })));
      
      // 正确处理 null 值：检查字段是否存在，而不是使用 ?? 操作符
      const hasRedPendingMove = 'redPendingMove' in payload;
      const hasBlackPendingMove = 'blackPendingMove' in payload;
      
      // 检查是否进入新的策略阶段（新一回合），清除目标框
      const wasInSettlement = onlineState.phase === 'settlement' || onlineState.phase === 'ended';
      const isNowInStrategy = payload.phase === 'strategy';
      
      setOnlineState(prev => ({
        ...prev,
        pieces: pieces,
        phase: payload.phase ?? prev.phase,
        side: payload.side ?? prev.side,
        redConfirmed: payload.redConfirmed ?? prev.redConfirmed,
        blackConfirmed: payload.blackConfirmed ?? prev.blackConfirmed,
        redPendingMove: hasRedPendingMove ? payload.redPendingMove : prev.redPendingMove,
        blackPendingMove: hasBlackPendingMove ? payload.blackPendingMove : prev.blackPendingMove,
        winner: payload.winner ?? prev.winner,
      }));
      
      // 新一回合开始时清除目标框
      if (wasInSettlement && isNowInStrategy) {
        setLastMoveTargets({ red: null, black: null });
      }
      
      // 同步视角：每次收到房间状态时，都确保视角与玩家阵营一致
      if (payload.side) {
        setViewSide(payload.side);
      }
    });

    wsClient.on('opponent_move', (payload: any) => {
      showMessage('对方已走棋', 1500);
    });

    wsClient.on('game_start', () => {
      setOnlineState(prev => ({ ...prev, phase: 'strategy' }));
      showMessage('游戏开始！');
    });

    wsClient.on('game_over', (payload: any) => {
      const winnerText = payload.winner === 'draw' ? '和棋！' : 
                         payload.winner === 'red' ? '红方胜利！' : '黑方胜利！';
      showMessage(winnerText + (payload.reason ? ' ' + payload.reason : ''), 3000);
      
      // 设置最后行动目标位置（用于显示目标框）
      setLastMoveTargets({
        red: payload.redPendingMove?.to || null,
        black: payload.blackPendingMove?.to || null,
      });
    });

    wsClient.on('left_room', () => {
      setOnlineState(createInitialOnlineState());
      showMessage('对方离开了房间');
    });

    wsClient.on('error', (payload: any) => {
      showMessage(payload.message || '发生错误');
    });

    return () => {
      wsClient.disconnect();
    };
  }, [gameMode, showMessage]);

  // 在线模式：创建房间
  const handleCreateRoom = useCallback(() => {
    wsClient.send('create_room');
  }, []);

  // 在线模式：加入房间
  const handleJoinRoom = useCallback(() => {
    if (roomInput.trim()) {
      wsClient.send('join_room', { roomId: roomInput.trim().toUpperCase() });
    }
  }, [roomInput]);

  // 在线模式：离开房间
  const handleLeaveRoom = useCallback(() => {
    wsClient.send('leave_room');
    setOnlineState(createInitialOnlineState());
    setRoomInput('');
  }, []);

  // 在线模式：选择棋子
  const handleSelectPieceOnline = useCallback((piece: Piece) => {
    if (onlineState.phase !== 'strategy') return;
    if (!onlineState.side || piece.side !== onlineState.side) return;
    
    const isConfirmed = piece.side === 'red' ? onlineState.redConfirmed : onlineState.blackConfirmed;
    if (isConfirmed) {
      showMessage('本回合已走棋，等待对方操作');
      return;
    }

    if (selectedPiece?.id === piece.id) {
      setSelectedPiece(null);
      setValidMoves([]);
      return;
    }

    const moves = getValidMoves(piece, onlineState.pieces);
    setSelectedPiece(piece);
    setValidMoves(moves);
    
    // 用户开始选择棋子时，清除目标框
    setLastMoveTargets({ red: null, black: null });
  }, [onlineState.phase, onlineState.side, onlineState.redConfirmed, onlineState.blackConfirmed, onlineState.pieces, selectedPiece, showMessage]);

  // 在线模式：移动棋子
  const handleMovePieceOnline = useCallback((to: Position) => {
    if (!selectedPiece || !onlineState.roomId) return;
    
    const from = selectedPiece.position;
    wsClient.send('submit_move', { from, to });
    setSelectedPiece(null);
    setValidMoves([]);
  }, [selectedPiece, onlineState.roomId]);

  // 在线模式：结算
  const handleSettleOnline = useCallback(() => {
    wsClient.send('settle');
  }, []);

  // 在线模式：重走
  const handleRedoMoveOnline = useCallback(() => {
    wsClient.send('undo_move');
  }, []);

  // 在线模式：重置
  const handleResetOnline = useCallback(() => {
    wsClient.send('reset_game');
    setHistory([]);
    setGameState(createInitialState());
    setLastMoveTargets({ red: null, black: null });
  }, []);

  // 联机模式：监听双方走棋，自动结算
  useEffect(() => {
    if (gameMode !== 'online') return;
    if (onlineState.phase !== 'strategy') return;
    if (!onlineState.redPendingMove || !onlineState.blackPendingMove) return;
    
    // 双方都走棋后，自动结算（延迟一小段时间让玩家看清箭头）
    const timer = setTimeout(() => {
      wsClient.send('settle');
    }, 500);
    
    return () => clearTimeout(timer);
  }, [gameMode, onlineState.phase, onlineState.redPendingMove, onlineState.blackPendingMove]);

  // 获取当前游戏状态（根据模式）
  const currentPieces = gameMode === 'local' ? gameState.pieces : onlineState.pieces;
  const currentPhase = gameMode === 'local' ? gameState.phase : onlineState.phase;
  const currentRedConfirmed = gameMode === 'local' ? gameState.redConfirmed : onlineState.redConfirmed;
  const currentBlackConfirmed = gameMode === 'local' ? gameState.blackConfirmed : onlineState.blackConfirmed;
  const currentRedPendingMove = gameMode === 'local' ? gameState.redPendingMove : onlineState.redPendingMove;
  const currentBlackPendingMove = gameMode === 'local' ? gameState.blackPendingMove : onlineState.blackPendingMove;
  const currentWinner = gameMode === 'local' ? gameState.winner : onlineState.winner;

  const canSettle = currentRedPendingMove && currentBlackPendingMove && currentPhase === 'strategy';

  // 获取当前选中的棋子
  const currentSelectedPiece = gameMode === 'local' ? gameState.selectedPiece : selectedPiece;
  const currentValidMoves = gameMode === 'local' ? gameState.validMoves : validMoves;

  // 选择棋子的处理函数
  const handleSelect = gameMode === 'local' ? handleSelectPiece : handleSelectPieceOnline;
  const handleMove = gameMode === 'local' ? handleMovePiece : handleMovePieceOnline;
  const handleSettleFn = gameMode === 'local' ? handleSettle : handleSettleOnline;
  const handleRedoMoveFn = gameMode === 'local' ? handleRedoMove : handleRedoMoveOnline;
  const handleResetFn = gameMode === 'local' ? handleReset : handleResetOnline;

  return (
    <div className="app-container">
      {/* 顶部状态栏 */}
      <div className="status-bar">
        {/* 模式切换 */}
        <div style={{ display: 'flex', gap: '8px', marginRight: '10px' }}>
          <button
            className={`mode-btn ${gameMode === 'local' ? 'active' : ''}`}
            onClick={() => setGameMode('local')}
          >
            本地
          </button>
          <button
            className={`mode-btn ${gameMode === 'online' ? 'active' : ''}`}
            onClick={() => setGameMode('online')}
          >
            联机
          </button>
        </div>

        {/* 在线状态 */}
        {gameMode === 'online' && (
          <span className={`conn-status ${onlineState.connected ? 'online' : 'offline'}`}>
            {onlineState.connected ? '已连接' : '未连接'}
          </span>
        )}

        <div className="status-item">
          <span
            className={`status-dot red ${currentRedConfirmed ? 'confirmed' : 'waiting'}`}
          />
          <span>红方</span>
          {checkStatus.red && <span style={{ color: '#FF4444', fontWeight: 'bold' }}>被将军!</span>}
          {/* 联机模式不显示对方的具体行动 */}
          {currentRedPendingMove && (gameMode === 'local' || onlineState.side === 'red') && (
            <span style={{ fontSize: '10px', color: '#FFD700' }}>
              {formatMove(currentRedPendingMove)}
            </span>
          )}
          {/* 联机模式：只显示对方是否已走棋 */}
          {gameMode === 'online' && onlineState.side === 'black' && (
            <span style={{ fontSize: '10px', color: '#888' }}>
              {currentRedConfirmed ? '已走棋' : '等待中'}
            </span>
          )}
        </div>

        <span className={`phase-badge ${currentPhase}`}>
          {currentPhase === 'strategy' ? '策略阶段' : 
           currentPhase === 'settlement' ? '结算中' : '结束'}
        </span>

        <div className="status-item">
          <span
            className={`status-dot black ${currentBlackConfirmed ? 'confirmed' : 'waiting'}`}
          />
          <span>黑方</span>
          {checkStatus.black && <span style={{ color: '#FF4444', fontWeight: 'bold' }}>被将军!</span>}
          {/* 联机模式不显示对方的具体行动 */}
          {currentBlackPendingMove && (gameMode === 'local' || onlineState.side === 'black') && (
            <span style={{ fontSize: '10px', color: '#FFD700' }}>
              {formatMove(currentBlackPendingMove)}
            </span>
          )}
          {/* 联机模式：只显示对方是否已走棋 */}
          {gameMode === 'online' && onlineState.side === 'red' && (
            <span style={{ fontSize: '10px', color: '#888' }}>
              {currentBlackConfirmed ? '已走棋' : '等待中'}
            </span>
          )}
        </div>
      </div>

      {/* 在线模式房间信息（顶部小条） */}
      {gameMode === 'online' && onlineState.roomId && (
        <div className="room-info-bar">
          <span>房间号: <strong>{onlineState.roomId}</strong></span>
          <span className="divider">|</span>
          <span>你是: <strong style={{ color: onlineState.side === 'red' ? '#C41E3A' : '#333' }}>
            {onlineState.side === 'red' ? '红方' : onlineState.side === 'black' ? '黑方' : '观战'}
          </strong></span>
          <button className="btn btn-small" onClick={handleLeaveRoom}>
            离开
          </button>
        </div>
      )}

      {/* 棋盘 */}
      <ChessBoard
        pieces={currentPieces}
        selectedPiece={currentSelectedPiece}
        validMoves={currentValidMoves}
        currentOperatedSide={viewSide}
        phase={currentPhase}
        flipped={viewSide === 'black'}
        redPendingMove={gameMode === 'local' ? currentRedPendingMove : 
                        (gameMode === 'online' && onlineState.side === 'red' ? currentRedPendingMove : null)}
        blackPendingMove={gameMode === 'local' ? currentBlackPendingMove : 
                          (gameMode === 'online' && onlineState.side === 'black' ? currentBlackPendingMove : null)}
        lastMoveTargets={lastMoveTargets}
        onSelectPiece={handleSelect}
        onMovePiece={handleMove}
      />

      {/* 在线模式房间UI（棋盘下方） */}
      {gameMode === 'online' && !onlineState.roomId && (
        <div className="online-panel">
          <h3>联机对战</h3>
          <div className="room-actions">
            <button className="btn btn-primary" onClick={handleCreateRoom}>
              创建房间
            </button>
            <div className="divider-text">或</div>
            <input
              type="text"
              className="room-input"
              placeholder="输入房间号"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button className="btn btn-secondary" onClick={handleJoinRoom}>
              加入
            </button>
          </div>
        </div>
      )}

      {/* 控制面板 */}
      <div className="control-panel">
        <div className="view-switch">
          <button
            className={`view-btn ${viewSide === 'red' ? 'active' : ''}`}
            onClick={() => handleSwitchView(viewSide === 'red' ? 'black' : 'red')}
          >
            {viewSide === 'red' ? '红方视角' : '黑方视角'}
          </button>
        </div>
      </div>

      <div className="control-panel">
        {viewSide === 'red' && currentRedPendingMove && !currentRedConfirmed && gameMode === 'local' && (
          <button
            className="btn btn-reset"
            onClick={() => handleRedoMoveFn('red')}
          >
            红方重走
          </button>
        )}
        {viewSide === 'black' && currentBlackPendingMove && !currentBlackConfirmed && gameMode === 'local' && (
          <button
            className="btn btn-reset"
            onClick={() => handleRedoMoveFn('black')}
          >
            黑方重走
          </button>
        )}
        {gameMode === 'online' && onlineState.side && currentPhase === 'strategy' && (
          <button
            className="btn btn-reset"
            onClick={handleRedoMoveOnline}
          >
            重走
          </button>
        )}
      </div>

      <div className="control-panel">
        <button
          className="btn btn-settle"
          onClick={handleSettleFn}
          disabled={!canSettle}
        >
          {canSettle ? '自动结算中...' : '结算'}
        </button>
        <button className="btn btn-reset" onClick={handleResetFn}>
          重置
        </button>
      </div>

      <div className="control-panel" style={{ fontSize: '12px', color: '#AAA' }}>
        {currentPhase === 'strategy' && (
          <>
            当前视角：
            <span style={{ 
              color: viewSide === 'red' ? '#C41E3A' : '#666',
              fontWeight: 'bold'
            }}>
              {viewSide === 'red' ? '红方' : '黑方'}
            </span>
            {gameMode === 'online' && onlineState.side && (
              <span>（你的阵营：{onlineState.side === 'red' ? '红方' : '黑方'}）</span>
            )}
            {!currentRedPendingMove && !currentBlackPendingMove && ' - 请选择一个棋子移动'}
            {viewSide === 'red' && currentRedPendingMove && ' - 红方已走棋'}
            {viewSide === 'black' && currentBlackPendingMove && ' - 黑方已走棋'}
            {!canSettle && ' - 等待双方都走棋'}
            {canSettle && ' - 即将自动结算'}
          </>
        )}
      </div>

      <HistoryLog
        history={history}
        isExpanded={historyExpanded}
        onToggle={() => setHistoryExpanded(!historyExpanded)}
      />

      {showToast && <div className="toast">{showToast}</div>}

      {currentPhase === 'settlement' && (
        <div className="settlement-overlay">
          <div className="settlement-text">结算中...</div>
        </div>
      )}

      {currentPhase === 'ended' && currentWinner && (
        <div className="modal-overlay" onClick={handleResetFn}>
          <div className={`modal-content ${
            currentWinner === 'red' ? 'red-wins' :
            currentWinner === 'black' ? 'black-wins' : 'draw'
          }`}>
            <h2>
              {currentWinner === 'red' ? '红方胜利！' :
               currentWinner === 'black' ? '黑方胜利！' : '和棋！'}
            </h2>
            <button className="btn btn-confirm" onClick={handleResetFn}>
              重新开始
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
