import { useState, useCallback, useEffect, useRef } from 'react';
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
import { HistorySnapshot, createSnapshotBeforeSettlement, createSettlementEntry, createUndoEntry } from './shared/gameStore';
import ChessBoard from './ChessBoard';
import { wsClient } from './wsClient';
import { playPickupSound, playPlaceSound, playCaptureSound, playDoubleCaptureSound, playSettleSound, setSoundEnabled } from './sounds';

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
  isMatchmaking: boolean; // 是否正在匹配中
  gameRound: number; // 游戏回合号
  // 本回合移动的棋子 ID（用于防反检查）
  redMovedPieceId: string | null;
  blackMovedPieceId: string | null;
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
  // 本回合移动的棋子 ID（用于防反检查）
  redMovedPieceId: null,
  blackMovedPieceId: null,
  // 长捉限制
  redLastPiece: null,
  redLastTarget: null,
  redCaptureCount: 0,
  blackLastPiece: null,
  blackLastTarget: null,
  blackCaptureCount: 0,
  // 历史快照（用于悔棋）
  historySnapshots: [],
  // 当前回合号
  currentRound: 1,
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
  isMatchmaking: false,
  gameRound: 1,
  // 本回合移动的棋子 ID（用于防反检查）
  redMovedPieceId: null,
  blackMovedPieceId: null,
});

function App() {
  const [gameMode, setGameMode] = useState<'local' | 'online'>('local');
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
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
  
  // 使用 ref 存储悔棋所需的最新快照数据（避免闭包问题）
  const undoSnapshotRef = useRef<{ lastMoveTargets: { red: Position | null; black: Position | null }; checkStatus: { red: boolean; black: boolean } } | null>(null);
  
  // 联机模式悔棋请求状态
  const [undoRequestPending, setUndoRequestPending] = useState<{ from: 'red' | 'black' | null; waiting: boolean }>({ from: null, waiting: false });
  
  // 联机模式重置请求状态
  const [resetRequestPending, setResetRequestPending] = useState<{ from: 'red' | 'black' | null; waiting: boolean }>({ from: null, waiting: false });

  // 联机模式：用于跟踪需要重新选择的棋子（在取消确认后）
  const pendingReselectPieceRef = useRef<Piece | null>(null);
  
  // 联机模式：用于记录断线重连后是否需要自动发送匹配请求
  const pendingMatchOnReconnectRef = useRef(false);
  
  // 联机模式：追踪对方在线状态，用于检测对方离开
  const opponentOnlineRef = useRef<boolean | null>(null);

  // 切换游戏模式时清理状态
  const handleSetGameMode = useCallback((mode: 'local' | 'online') => {
    // 切换模式时清理所有相关状态
    setSelectedPiece(null);
    setValidMoves([]);
    setHistory([]);  // 清空对弈记录
    setLastMoveTargets({ red: null, black: null });  // 清空行动目标框
    setCheckStatus({ red: false, black: false });  // 清空将军状态
    setGameMode(mode);
  }, []);

  // 音效开关切换
  const handleToggleSound = useCallback(() => {
    const newValue = !soundEnabled;
    setSoundEnabledState(newValue);
    setSoundEnabled(newValue);
  }, [soundEnabled]);

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
    
    // 播放提棋子音效
    playPickupSound();
    
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
    
    // 播放落子音效（吃子用不同的音效）
    if (actionType === 'capture') {
      playCaptureSound();
    } else {
      playPlaceSound();
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
        newState.redMovedPieceId = selectedPiece.id; // 记录本回合移动的红方棋子
      } else {
        newState.blackPendingMove = pendingMove;
        newState.blackConfirmed = true;
        newState.blackMovedPieceId = selectedPiece.id; // 记录本回合移动的黑方棋子
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
        newState.redMovedPieceId = null; // 清除移动记录
      } else {
        newState.blackPendingMove = null;
        newState.blackConfirmed = false;
        newState.blackMovedPieceId = null; // 清除移动记录
      }
      return newState;
    });
  }, [gameState.phase]);

  // 悔棋：撤销上一回合的所有变化
  const handleUndoMove = useCallback(() => {
    if (gameState.phase !== 'strategy') return;
    if (gameState.historySnapshots.length === 0) {
      showMessage('没有可悔棋的回合');
      return;
    }
    
    // 获取上一个快照
    const lastSnapshot = gameState.historySnapshots[gameState.historySnapshots.length - 1];
    
    // 恢复棋盘状态
    setGameState(prev => {
      const newState: GameState = {
        ...prev,
        pieces: lastSnapshot.pieces.map(p => ({ ...p })),
        phase: 'strategy',
        winner: null,
        settlementResult: null,
        redPendingMove: null,
        blackPendingMove: null,
        redConfirmed: false,
        blackConfirmed: false,
        selectedPiece: null,
        validMoves: [],
        // 清除长捉状态
        redLastPiece: null,
        redLastTarget: null,
        redCaptureCount: 0,
        blackLastPiece: null,
        blackLastTarget: null,
        blackCaptureCount: 0,
        // 移除最后一个快照
        historySnapshots: prev.historySnapshots.slice(0, -1),
        // 恢复回合号
        currentRound: lastSnapshot.gameRound,
      };
      return newState;
    });
    
    // 使用共用模块创建悔棋记录
    const undoEntry = createUndoEntry(history, lastSnapshot);
    setHistory(prev => {
      console.log('[悔棋] 添加悔棋记录, 之前history长度:', prev.length);
      return [...prev, undoEntry];
    });
    
    // 从 ref 获取最新的行动框和将军状态
    const undoData = undoSnapshotRef.current;
    if (undoData) {
      console.log('[悔棋] 恢复行动框状态:', undoData.lastMoveTargets);
      setLastMoveTargets(undoData.lastMoveTargets);
      setCheckStatus(undoData.checkStatus);
    } else {
      // 如果 ref 为空，清空行动框
      console.log('[悔棋] ref为空，清空行动框');
      setLastMoveTargets({ red: null, black: null });
    }
    
    showMessage('悔棋成功');
  }, [gameState.phase, gameState.historySnapshots, showMessage]);

  // 执行结算
  useEffect(() => {
    if (gameState.phase !== 'settlement') return;

    const doSettlement = async () => {
      // 保存当前 pending moves（因为异步执行时会变化）
      const redMove = gameState.redPendingMove;
      const blackMove = gameState.blackPendingMove;
      
      // 使用共用模块创建快照
      const snapshotBeforeSettlement = createSnapshotBeforeSettlement(
        gameState.pieces,
        history,
        gameState.currentRound,
        lastMoveTargets,
        checkStatus
      );
      
      // 同时更新 ref（用于悔棋时获取最新状态）
      undoSnapshotRef.current = {
        lastMoveTargets: { ...lastMoveTargets },
        checkStatus: { ...checkStatus },
      };
      
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
        },
        gameState.redMovedPieceId,
        gameState.blackMovedPieceId
      );

      // 使用共用模块创建历史记录
      const entryWithRound = createSettlementEntry(history, historyEntry, gameState.currentRound);
      setHistory(prev => [...prev, entryWithRound]);

      // 结算后播放音效
      if (historyEntry.events.some(e => e.type === 'collision')) {
        // 同归于尽
        playDoubleCaptureSound();
      } else if (historyEntry.events.some(e => e.type === 'capture')) {
        // 吃子
        playCaptureSound();
      }

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
        // 清除本回合移动记录
        redMovedPieceId: null,
        blackMovedPieceId: null,
        // 更新长捉计数
        redLastPiece: newChaseState.redLastPiece,
        redLastTarget: newChaseState.redLastTarget,
        redCaptureCount: newChaseState.redCaptureCount,
        blackLastPiece: newChaseState.blackLastPiece,
        blackLastTarget: newChaseState.blackLastTarget,
        blackCaptureCount: newChaseState.blackCaptureCount,
        // 保存结算前的快照（用于悔棋）
        historySnapshots: [...prev.historySnapshots, snapshotBeforeSettlement],
        // 回合号+1
        currentRound: prev.currentRound + 1,
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

    // 监听连接断开消息
    wsClient.on('disconnected', (payload: any) => {
      console.log('收到连接断开消息:', payload);
      setOnlineState(prev => ({ ...prev, connected: false }));
    });

    // 监听连接成功消息
    wsClient.on('connected', (payload: any) => {
      console.log('收到连接成功消息:', payload);
      setOnlineState(prev => ({ ...prev, connected: true }));
      // 如果之前点击了快速匹配但断线了，重连成功后自动发送匹配请求
      if (pendingMatchOnReconnectRef.current) {
        pendingMatchOnReconnectRef.current = false;
        showMessage('连接已恢复，正在匹配...');
        wsClient.send('join_matchmaking');
      }
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
        // 确保 gameRound 是数字
        gameRound: typeof payload.gameRound === 'number' ? payload.gameRound : prev.gameRound,
      }));
      // 重置游戏状态（新房间开始）
      setHistory([]);
      setLastMoveTargets({ red: null, black: null });
      setCheckStatus({ red: false, black: false });
      setSelectedPiece(null);
      setValidMoves([]);
      showMessage(`房间 ${payload.roomId} 已创建，你是${payload.side === 'red' ? '红方' : '黑方'}`);
    });

    // 匹配开始
    wsClient.on('matchmaking_started', (payload: any) => {
      setOnlineState(prev => ({ ...prev, isMatchmaking: true }));
      showMessage('正在匹配对手...', 999999);
    });

    // 匹配取消
    wsClient.on('matchmaking_cancelled', (payload: any) => {
      setOnlineState(prev => ({ ...prev, isMatchmaking: false }));
      showMessage('已取消匹配');
    });

    // 匹配成功
    wsClient.on('match_found', (payload: any) => {
      const pieces = payload.pieces && payload.pieces.length > 0 
        ? payload.pieces 
        : INITIAL_PIECES.map(p => ({ ...p }));
      setOnlineState(prev => ({ 
        ...prev, 
        isMatchmaking: false,
        roomId: payload.roomId, 
        side: payload.side, 
        pieces: pieces,
        phase: 'strategy',
        redConfirmed: false,
        blackConfirmed: false,
        redPendingMove: null,
        blackPendingMove: null,
        message: '',
      }));
      // 匹配成功后，切换到自己的视角
      if (payload.side) {
        setViewSide(payload.side);
      }
      // 清除最后行动目标框（新游戏开始）
      setLastMoveTargets({ red: null, black: null });
      // 清除将军状态（新游戏开始）
      setCheckStatus({ red: false, black: false });
      showMessage(`匹配成功！你是${payload.side === 'red' ? '红方' : '黑方'}`, 3000);
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
        // 确保 gameRound 是数字
        gameRound: typeof payload.gameRound === 'number' ? payload.gameRound : prev.gameRound,
      }));
      // 加入房间后，自动切换到自己的视角
      if (payload.side) {
        setViewSide(payload.side);
      }
      // 重置游戏状态（新游戏开始）
      setHistory([]);
      setLastMoveTargets({ red: null, black: null });
      setCheckStatus({ red: false, black: false });
      setSelectedPiece(null);
      setValidMoves([]);
      showMessage(`加入房间 ${payload.roomId}，你是${payload.side === 'red' ? '红方' : '黑方'}`);
      if (phase === 'strategy') {
        showMessage('双方已就位，可以开始对弈！');
      }
    });

    wsClient.on('room_state', (payload: any) => {
      // 检测对方是否离开
      const currentSide = onlineState.side;
      const opponentWasOnline = opponentOnlineRef.current;
      if (currentSide === 'red' && payload.blackOnline === false && opponentWasOnline !== false) {
        showMessage('对方离开了房间');
        opponentOnlineRef.current = false;
      } else if (currentSide === 'black' && payload.redOnline === false && opponentWasOnline !== false) {
        showMessage('对方离开了房间');
        opponentOnlineRef.current = false;
      } else if (currentSide === 'red') {
        opponentOnlineRef.current = payload.blackOnline;
      } else if (currentSide === 'black') {
        opponentOnlineRef.current = payload.redOnline;
      }
      
      // 检查棋子位置是否发生变化，如果 selectedPiece 对应的棋子位置变了，需要清除选择
      let shouldClearSelection = false;
      if (selectedPiece) {
        const updatedPiece = (payload.pieces || []).find((p: Piece) => p.id === selectedPiece.id);
        if (!updatedPiece || 
            updatedPiece.position[0] !== selectedPiece.position[0] || 
            updatedPiece.position[1] !== selectedPiece.position[1]) {
          shouldClearSelection = true;
        }
      }
      
      // pieces 始终使用服务端数据
      const pieces = payload.pieces && payload.pieces.length > 0 
        ? payload.pieces 
        : (onlineState.pieces.length > 0 ? onlineState.pieces : INITIAL_PIECES.map(p => ({ ...p })));
      
      setOnlineState(prev => ({
        ...prev,
        pieces,
        phase: payload.phase ?? prev.phase,
        side: payload.side ?? prev.side,
        redConfirmed: payload.redConfirmed ?? prev.redConfirmed,
        blackConfirmed: payload.blackConfirmed ?? prev.blackConfirmed,
        // pendingMove 只在服务端返回有效数据时才更新
        redPendingMove: 'redPendingMove' in payload ? payload.redPendingMove : prev.redPendingMove,
        blackPendingMove: 'blackPendingMove' in payload ? payload.blackPendingMove : prev.blackPendingMove,
        winner: payload.winner ?? prev.winner,
        // 确保 gameRound 是数字
        gameRound: typeof payload.gameRound === 'number' ? payload.gameRound : prev.gameRound,
      }));
      
      // 同步将军状态
      if (payload.checkStatus && typeof payload.checkStatus === 'object') {
        setCheckStatus({
          red: Boolean(payload.checkStatus.red),
          black: Boolean(payload.checkStatus.black),
        });
      } else {
        const redInCheck = isCheck('red', pieces);
        const blackInCheck = isCheck('black', pieces);
        setCheckStatus({ red: redInCheck, black: blackInCheck });
      }
      
      // 同步目标框（服务端返回什么就显示什么）
      setLastMoveTargets({
        red: payload.lastRedMoveTo ?? null,
        black: payload.lastBlackMoveTo ?? null,
      });
      
      // 如果棋子位置发生变化，清除选中状态
      if (shouldClearSelection) {
        setSelectedPiece(null);
        setValidMoves([]);
      }
      
      // 同步历史记录
      if (payload.roundHistory && Array.isArray(payload.roundHistory)) {
        setHistory(payload.roundHistory);
      }
      
      // 同步视角
      if (payload.side) {
        setViewSide(payload.side);
      }

      // 处理待重新选择的棋子（取消确认后）
      const pendingPiece = pendingReselectPieceRef.current;
      if (pendingPiece) {
        pendingReselectPieceRef.current = null;
        // 从最新的 pieces 中找到该棋子
        const currentPiece = pieces.find((p: Piece) => p.id === pendingPiece.id);
        if (currentPiece) {
          const moves = getValidMoves(currentPiece, pieces);
          setSelectedPiece(currentPiece);
          setValidMoves(moves);
        }
      }
    });

    wsClient.on('opponent_move', (payload: any) => {
      showMessage('对方已走棋', 1500);
    });

    wsClient.on('game_start', () => {
      setOnlineState(prev => ({ ...prev, phase: 'strategy' }));
      // 重置游戏状态（确保新游戏开始时状态干净）
      setHistory([]);
      setLastMoveTargets({ red: null, black: null });
      setCheckStatus({ red: false, black: false });
      setSelectedPiece(null);
      setValidMoves([]);
      showMessage('游戏开始！');
    });

    wsClient.on('game_over', (payload: any) => {
      const winnerText = payload.winner === 'draw' ? '和棋！' : 
                         payload.winner === 'red' ? '红方胜利！' : '黑方胜利！';
      showMessage(winnerText + (payload.reason ? ' ' + payload.reason : ''), 3000);
      
      // 根据结果播放结算音效
      if (payload.events) {
        if (payload.events.some((e: any) => e.type === 'collision')) {
          playDoubleCaptureSound();
        } else if (payload.events.some((e: any) => e.type === 'capture')) {
          playCaptureSound();
        }
      }
      if (payload.winner === 'draw') {
        playSettleSound('draw');
      } else if (payload.winner === onlineState.side) {
        playSettleSound('win');
      } else {
        playSettleSound('lose');
      }
    });

    wsClient.on('left_room', () => {
      // 保留连接状态，只清空房间相关状态
      setOnlineState(prev => ({
        ...prev,
        roomId: null,
        side: null,
        pieces: INITIAL_PIECES.map(p => ({ ...p })),
        phase: 'strategy',
        redConfirmed: false,
        blackConfirmed: false,
        redPendingMove: null,
        blackPendingMove: null,
        winner: null,
        isMatchmaking: false,
        gameRound: 1,
        redMovedPieceId: null,
        blackMovedPieceId: null,
      }));
      // left_room 是给自己发的，表示"你离开了房间"
    });

    // 对方离开房间（收到 opponent_left 事件时）
    wsClient.on('opponent_left', (payload: any) => {
      console.log('收到对方离开事件:', payload);
      showMessage('对方离开了房间');
      opponentOnlineRef.current = false;
    });

    // 收到对方发起的悔棋请求
    wsClient.on('undo_requested', (payload: any) => {
      setUndoRequestPending({ from: payload.from, waiting: false });
    });

    // 发送悔棋请求后等待对方回应
    wsClient.on('undo_waiting', (payload: any) => {
      setUndoRequestPending({ from: onlineState.side, waiting: true });
    });

    // 悔棋请求的回应
    wsClient.on('undo_response', (payload: any) => {
      setUndoRequestPending({ from: null, waiting: false });
      showMessage(payload.message, 2000);
    });

    // 对方发起的重置请求
    wsClient.on('reset_requested', (payload: any) => {
      setResetRequestPending({ from: payload.from, waiting: false });
    });

    // 发送重置请求后等待对方回应
    wsClient.on('reset_waiting', (payload: any) => {
      setResetRequestPending({ from: onlineState.side, waiting: true });
    });

    // 重置请求的回应
    wsClient.on('reset_response', (payload: any) => {
      setResetRequestPending({ from: null, waiting: false });
      if (payload.accepted) {
        // 对方同意重置，重置本地状态
        setHistory([]);
        setLastMoveTargets({ red: null, black: null });
        setCheckStatus({ red: false, black: false });
        setSelectedPiece(null);
        setValidMoves([]);
      }
      showMessage(payload.message, 2000);
    });

    wsClient.on('error', (payload: any) => {
      showMessage(payload.message || '发生错误');
    });

    return () => {
      wsClient.disconnect();
    };
  }, [gameMode, showMessage]);

  // 在线模式：快速匹配
  const handleQuickMatch = useCallback(() => {
    if (!onlineState.connected) {
      // 记录需要自动匹配，重连成功后会自动发送
      pendingMatchOnReconnectRef.current = true;
      showMessage('连接已断开，正在重新连接...');
      return;
    }
    pendingMatchOnReconnectRef.current = false;
    console.log('handleQuickMatch called, connected:', onlineState.connected);
    wsClient.send('join_matchmaking');
  }, [onlineState.connected, showMessage]);

  // 在线模式：取消匹配
  const handleCancelMatch = useCallback(() => {
    wsClient.send('leave_matchmaking');
    pendingMatchOnReconnectRef.current = false;
  }, []);

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
    // 保留连接状态，只清空房间相关状态
    setOnlineState(prev => ({
      ...prev,
      roomId: null,
      side: null,
      pieces: INITIAL_PIECES.map(p => ({ ...p })),
      phase: 'strategy',
      redConfirmed: false,
      blackConfirmed: false,
      redPendingMove: null,
      blackPendingMove: null,
      winner: null,
      isMatchmaking: false,
      gameRound: 1,
      redMovedPieceId: null,
      blackMovedPieceId: null,
    }));
    setRoomInput('');
    pendingMatchOnReconnectRef.current = false;
  }, []);

  // 在线模式：选择棋子
  const handleSelectPieceOnline = useCallback((piece: Piece) => {
    if (onlineState.phase !== 'strategy') return;
    if (!onlineState.side || piece.side !== onlineState.side) return;
    
    const isConfirmed = piece.side === 'red' ? onlineState.redConfirmed : onlineState.blackConfirmed;
    if (isConfirmed) {
      // 对齐本地模式：已确认时允许重新走棋，先发送取消确认
      pendingReselectPieceRef.current = piece;
      wsClient.send('undo_move');
      return;
    }

    // 每次都从 onlineState.pieces 中获取最新的棋子对象，确保位置与服务端同步
    const currentPiece = onlineState.pieces.find(p => p.id === piece.id);
    if (!currentPiece) return; // 棋子可能被吃掉了

    if (selectedPiece?.id === piece.id) {
      setSelectedPiece(null);
      setValidMoves([]);
      return;
    }

    const moves = getValidMoves(currentPiece, onlineState.pieces);
    // 播放提棋子音效
    playPickupSound();
    setSelectedPiece(currentPiece);
    setValidMoves(moves);
  }, [onlineState.phase, onlineState.side, onlineState.redConfirmed, onlineState.blackConfirmed, onlineState.pieces, selectedPiece, showMessage]);

  // 在线模式：移动棋子
  const handleMovePieceOnline = useCallback((to: Position) => {
    if (!selectedPiece || !onlineState.roomId) {
      console.log('[DEBUG] handleMovePieceOnline early return:', { selectedPiece: !!selectedPiece, roomId: onlineState.roomId });
      return;
    }
    
    // 确保使用的是最新的棋子位置（从 onlineState.pieces 中获取）
    const currentPiece = onlineState.pieces.find(p => p.id === selectedPiece.id);
    if (!currentPiece) {
      console.log('[DEBUG] handleMovePieceOnline: piece not found in onlineState.pieces', { selectedPieceId: selectedPiece.id, availableIds: onlineState.pieces.map(p => p.id) });
      // 棋子可能已经被移除，重置状态
      setSelectedPiece(null);
      setValidMoves([]);
      return;
    }
    
    const from = currentPiece.position;
    console.log('[DEBUG] handleMovePieceOnline: submitting move', { 
      pieceId: currentPiece.id, 
      from, 
      to, 
      playerSide: onlineState.side,
      roomId: onlineState.roomId 
    });
    
    // 检测是吃子还是移动，播放相应音效
    const targetPiece = onlineState.pieces.find(p => 
      p.side !== currentPiece.side && p.position[0] === to[0] && p.position[1] === to[1]
    );
    if (targetPiece) {
      playCaptureSound();
    } else {
      playPlaceSound();
    }
    
    wsClient.send('submit_move', { from, to });
    setSelectedPiece(null);
    setValidMoves([]);
  }, [selectedPiece, onlineState.roomId, onlineState.pieces]);

  // 在线模式：结算
  const handleSettleOnline = useCallback(() => {
    wsClient.send('settle');
  }, []);

  // 在线模式：重走
  const handleRedoMoveOnline = useCallback(() => {
    wsClient.send('undo_move');
  }, []);

  // 在线模式：悔棋请求
  const handleRequestUndoOnline = useCallback(() => {
    wsClient.send('request_undo');
  }, []);

  // 在线模式：回应悔棋请求
  const handleRespondUndoOnline = useCallback((accepted: boolean) => {
    wsClient.send('respond_undo', { accepted });
    setUndoRequestPending({ from: null, waiting: false });
  }, []);

  // 在线模式：请求重置
  const handleRequestResetOnline = useCallback(() => {
    if (!onlineState.side) return;
    setResetRequestPending({ from: onlineState.side, waiting: true });
    wsClient.send('request_reset');
  }, [onlineState.side]);

  // 在线模式：回应重置请求
  const handleRespondResetOnline = useCallback((accepted: boolean) => {
    wsClient.send('respond_reset', { accepted });
    setResetRequestPending({ from: null, waiting: false });
  }, []);

  // 在线模式：重置（仅在游戏结束后或对方同意后调用）
  const handleResetOnline = useCallback(() => {
    wsClient.send('reset_game');
    setHistory([]);
    setGameState(createInitialState());
    setLastMoveTargets({ red: null, black: null });
    setSelectedPiece(null);
    setValidMoves([]);
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

  // 计算当前回合号（直接从状态读取，确保是数字）
  const currentRound = gameMode === 'local' 
    ? (typeof gameState.currentRound === 'number' ? gameState.currentRound : 1)
    : (typeof onlineState.gameRound === 'number' ? onlineState.gameRound : 1);
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
            onClick={() => handleSetGameMode('local')}
          >
            本地
          </button>
          <button
            className={`mode-btn ${gameMode === 'online' ? 'active' : ''}`}
            onClick={() => handleSetGameMode('online')}
          >
            联机
          </button>
        </div>

        {/* 音效开关 */}
        <button
          className={`mode-btn ${soundEnabled ? 'active' : ''}`}
          onClick={handleToggleSound}
          title={soundEnabled ? '音效已开启' : '音效已关闭'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>

        {/* 在线状态 */}
        {gameMode === 'online' && (
          <span className={`conn-status ${onlineState.connected ? 'online' : 'offline'}`} style={{ marginLeft: 'auto' }}>
            {onlineState.connected ? '已连接' : '未连接'}
          </span>
        )}
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

      {/* 红方状态 | 当前回合 | 黑方状态 */}
      <div className="game-info-row">
        <div className="side-status">
          <span className={`status-dot red ${currentRedConfirmed ? 'confirmed' : 'waiting'}`} />
          <span>红方</span>
          {checkStatus.red && <span className="check-warning">被将军!</span>}
          {currentRedPendingMove && (gameMode === 'local' || onlineState.side === 'red') && (
            <span className="move-hint">{formatMove(currentRedPendingMove)}</span>
          )}
          {gameMode === 'online' && onlineState.side === 'black' && (
            <span className="move-hint">{currentRedConfirmed ? '已走棋' : '等待中'}</span>
          )}
        </div>

        <div className="round-display">
          第 {currentRound} 回合
        </div>

        <div className="side-status">
          <span className={`status-dot black ${currentBlackConfirmed ? 'confirmed' : 'waiting'}`} />
          <span>黑方</span>
          {checkStatus.black && <span className="check-warning">被将军!</span>}
          {currentBlackPendingMove && (gameMode === 'local' || onlineState.side === 'black') && (
            <span className="move-hint">{formatMove(currentBlackPendingMove)}</span>
          )}
          {gameMode === 'online' && onlineState.side === 'red' && (
            <span className="move-hint">{currentBlackConfirmed ? '已走棋' : '等待中'}</span>
          )}
        </div>
      </div>

      {/* 阶段提示 */}
      <span className={`phase-badge ${currentPhase}`}>
        {currentPhase === 'strategy' ? '策略阶段' : 
         currentPhase === 'settlement' ? '结算中' : '结束'}
      </span>

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
      {gameMode === 'online' && !onlineState.roomId && !onlineState.isMatchmaking && (
        <div className="online-panel">
          <h3>联机对战</h3>
          <div className="room-actions">
            <button className="btn btn-primary" onClick={handleQuickMatch}>
              快速匹配
            </button>
            <div className="divider-text">或</div>
            <button className="btn btn-secondary" onClick={handleCreateRoom}>
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

      {/* 匹配中状态 */}
      {gameMode === 'online' && onlineState.isMatchmaking && (
        <div className="online-panel matchmaking">
          <div className="matchmaking-spinner"></div>
          <h3>正在匹配对手...</h3>
          <p>请稍候，系统正在为您寻找对手</p>
          <button className="btn btn-secondary" onClick={handleCancelMatch}>
            取消匹配
          </button>
        </div>
      )}

      {/* 控制面板 */}
      <div className="control-panel">
        <div className="view-switch">
          <button
            className={`view-btn ${viewSide === 'red' ? 'active' : ''}`}
            onClick={() => handleSwitchView(viewSide === 'red' ? 'black' : 'red')}
            disabled={gameMode === 'online'}
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
          <>
            <button
              className="btn btn-reset"
              onClick={handleRedoMoveOnline}
            >
              重走
            </button>
            <button
              className="btn btn-reset"
              onClick={handleRequestUndoOnline}
            >
              悔棋
            </button>
          </>
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
        {/* 本地/双人对战模式下的悔棋按钮 */}
        {gameMode !== 'online' && (
          <button
            className="btn btn-reset"
            onClick={handleUndoMove}
            disabled={gameState.historySnapshots.length === 0}
          >
            悔棋
          </button>
        )}
        {gameMode === 'online' ? (
          <button className="btn btn-reset" onClick={handleRequestResetOnline}>
            重置
          </button>
        ) : (
          <button className="btn btn-reset" onClick={handleReset}>
            重置
          </button>
        )}
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

      {/* 悔棋请求弹窗（等待对方同意） */}
      {gameMode === 'online' && undoRequestPending.waiting && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>等待对方同意...</h2>
            <p>请等待 {undoRequestPending.from === 'red' ? '黑方' : '红方'} 回应悔棋请求</p>
            <button className="btn btn-reset" onClick={() => setUndoRequestPending({ from: null, waiting: false })}>
              取消
            </button>
          </div>
        </div>
      )}

      {/* 收到悔棋请求弹窗 */}
      {gameMode === 'online' && undoRequestPending.from && !undoRequestPending.waiting && onlineState.side && undoRequestPending.from !== onlineState.side && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>悔棋请求</h2>
            <p>{undoRequestPending.from === 'red' ? '红方' : '黑方'} 请求悔棋，是否同意？</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn btn-confirm" onClick={() => handleRespondUndoOnline(true)}>
                同意
              </button>
              <button className="btn btn-reset" onClick={() => handleRespondUndoOnline(false)}>
                拒绝
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 重置请求弹窗（等待对方同意） */}
      {gameMode === 'online' && resetRequestPending.waiting && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>等待对方同意...</h2>
            <p>请等待 {resetRequestPending.from === 'red' ? '黑方' : '红方'} 回应重置请求</p>
            <button className="btn btn-reset" onClick={() => setResetRequestPending({ from: null, waiting: false })}>
              取消
            </button>
          </div>
        </div>
      )}

      {/* 收到重置请求弹窗 */}
      {gameMode === 'online' && resetRequestPending.from && !resetRequestPending.waiting && onlineState.side && resetRequestPending.from !== onlineState.side && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>重置请求</h2>
            <p>{resetRequestPending.from === 'red' ? '红方' : '黑方'} 请求重置游戏，是否同意？</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn btn-confirm" onClick={() => handleRespondResetOnline(true)}>
                同意
              </button>
              <button className="btn btn-reset" onClick={() => handleRespondResetOnline(false)}>
                拒绝
              </button>
            </div>
          </div>
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
