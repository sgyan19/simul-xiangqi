// WebSocket 服务 - 处理实时游戏通信
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import {
  getRoom,
  getPlayerSide,
  joinRoom,
  leaveRoom,
  submitMove,
  undoMove,
  resetRoom,
  startGame,
  createRoom,
  generateRoomId,
  settleGame,
  addPlayerToRoom,
  requestUndo,
  respondToUndo,
  requestReset,
  respondToReset,
  requestRestart,
  cancelRestart,
} from './gameState';

interface WSMessage {
  type: string;
  payload?: unknown;
}

interface PlayerInfo {
  ws: WebSocket;
  roomId: string | null;
  side: 'red' | 'black' | null;
  inMatchmaking: boolean; // 是否在匹配中
}

// 存储所有连接的客户端
const clients: Map<WebSocket, PlayerInfo> = new Map();

// 匹配队列
const matchQueue: Set<WebSocket> = new Set();

// 初始化 WebSocket 服务
export const initWebSocket = (server: Server): WebSocketServer => {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('新的 WebSocket 连接');
    
    // 初始化玩家信息
    clients.set(ws, { ws, roomId: null, side: null, inMatchmaking: false });

    ws.on('message', (data: Buffer) => {
      console.log('[WS] 收到原始消息:', data.toString());
      try {
        const message: WSMessage = JSON.parse(data.toString());
        console.log('[WS] 解析后消息:', message);
        handleMessage(ws, message);
      } catch (error) {
        console.error('解析消息失败:', error);
        sendToClient(ws, { type: 'error', payload: { message: '无效的消息格式' } });
      }
    });

    ws.on('close', () => {
      handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket 错误:', error);
    });

    // 发送连接成功消息
    sendToClient(ws, { type: 'connected', payload: { message: '连接成功' } });
  });

  return wss;
};

// 玩家ID计数器
let playerIdCounter = 0;

// 获取玩家ID（使用唯一的递增ID）
const getPlayerId = (ws: WebSocket): string => {
  // 使用内部属性存储ID
  if (!(ws as any)._playerId) {
    (ws as any)._playerId = `player_${++playerIdCounter}`;
  }
  return (ws as any)._playerId;
};

// 尝试匹配玩家
const tryMatchPlayers = (): void => {
  if (matchQueue.size < 2) return;
  
  // 取队列中最先进入的两个玩家
  const players = Array.from(matchQueue);
  const ws1 = players[0];
  const ws2 = players[1];
  
  // 从队列中移除
  matchQueue.delete(ws1);
  matchQueue.delete(ws2);
  
  // 创建房间
  const roomId = generateRoomId();
  const room = createRoom(roomId);
  
  const playerId1 = getPlayerId(ws1);
  const playerId2 = getPlayerId(ws2);
  
  // 随机分配红黑方
  const [redWs, blackWs] = Math.random() < 0.5 ? [ws1, ws2] : [ws2, ws1];
  const redPlayerId = getPlayerId(redWs);
  const blackPlayerId = getPlayerId(blackWs);
  
  room.redPlayer = redPlayerId;
  room.blackPlayer = blackPlayerId;
  room.phase = 'strategy';
  
  // 更新客户端状态
  const player1Info = clients.get(ws1);
  const player2Info = clients.get(ws2);
  
  if (player1Info) {
    player1Info.roomId = roomId;
    player1Info.side = ws1 === redWs ? 'red' : 'black';
    player1Info.inMatchmaking = false;
    clients.set(ws1, player1Info);
  }
  
  if (player2Info) {
    player2Info.roomId = roomId;
    player2Info.side = ws2 === redWs ? 'red' : 'black';
    player2Info.inMatchmaking = false;
    clients.set(ws2, player2Info);
  }
  
  // 发送匹配成功和房间信息给双方
  sendToClient(ws1, {
    type: 'match_found',
    payload: {
      roomId,
      side: player1Info?.side,
      pieces: room.pieces,
      isQuickMatch: true
    }
  });
  
  sendToClient(ws2, {
    type: 'match_found',
    payload: {
      roomId,
      side: player2Info?.side,
      pieces: room.pieces,
      isQuickMatch: true
    }
  });
  
  console.log(`快速匹配成功: 房间 ${roomId}, 红方: ${room.redPlayer}, 黑方: ${room.blackPlayer}`);
};

// 处理消息
const handleMessage = (ws: WebSocket, message: WSMessage): void => {
  console.log('收到消息:', message.type, message.payload);
  const playerId = getPlayerId(ws);
  let player = clients.get(ws);

  switch (message.type) {
    case 'create_room': {
      const roomId = generateRoomId();
      const room = createRoom(roomId);
      const playerId = getPlayerId(ws);
      
      // 创建者自动作为红方
      room.redPlayer = playerId;
      
      if (player) {
        player.roomId = roomId;
        player.side = 'red';
        clients.set(ws, player);
      }
      
      sendToClient(ws, { 
        type: 'room_created', 
        payload: { roomId, side: 'red', pieces: room.pieces, gameRound: room.gameRound } 
      });
      
      broadcastRoomUpdate(room);
      break;
    }

    case 'join_matchmaking': {
      // 如果已在匹配中，不处理
      if (player?.inMatchmaking) {
        return;
      }
      
      // 如果已在房间中，先离开房间
      if (player?.roomId) {
        const room = getRoom(player.roomId);
        if (room) {
          leaveRoom(player.roomId, getPlayerId(ws));
          broadcastRoomUpdate(room);
        }
        player.roomId = null;
        player.side = null;
      }
      
      // 加入匹配队列
      matchQueue.add(ws);
      if (player) {
        player.inMatchmaking = true;
        clients.set(ws, player);
      }
      
      sendToClient(ws, {
        type: 'matchmaking_started',
        payload: { message: '正在匹配对手...' }
      });
      
      console.log(`玩家 ${getPlayerId(ws)} 加入匹配队列，当前队列: ${matchQueue.size} 人`);
      
      // 尝试匹配
      tryMatchPlayers();
      break;
    }

    case 'leave_matchmaking': {
      // 如果不在匹配中，不处理
      if (!player?.inMatchmaking) {
        return;
      }
      
      matchQueue.delete(ws);
      if (player) {
        player.inMatchmaking = false;
        clients.set(ws, player);
      }
      
      sendToClient(ws, {
        type: 'matchmaking_cancelled',
        payload: { message: '已取消匹配' }
      });
      
      console.log(`玩家 ${getPlayerId(ws)} 离开匹配队列`);
      break;
    }

    case 'join_room': {
      const { roomId } = message.payload as { roomId: string };
      const playerId = getPlayerId(ws);
      const room = getRoom(roomId);
      
      console.log(`[join_room] trying to join roomId=${roomId}, room exists: ${!!room}`);
      if (room) {
        console.log(`[join_room] room details: redPlayer=${room.redPlayer}, blackPlayer=${room.blackPlayer}`);
      }
      
      if (!room) {
        sendToClient(ws, { type: 'error', payload: { message: '房间不存在' } });
        return;
      }
      
      if (!player) {
        player = { ws, roomId: null, side: null };
      }
      
      // 检查红方位置
      if (!room.redPlayer) {
        room.redPlayer = playerId;
        player.side = 'red';
      } else if (!room.blackPlayer) {
        room.blackPlayer = playerId;
        player.side = 'black';
      } else {
        sendToClient(ws, { type: 'error', payload: { message: '房间已满' } });
        return;
      }
      
      player.roomId = roomId;
      clients.set(ws, player);
      
      // 检查是否双方都已加入，自动开始游戏
      if (room.redPlayer && room.blackPlayer) {
        room.phase = 'strategy';
      }
      
      sendToClient(ws, { 
        type: 'joined', 
        payload: { roomId, side: player.side, pieces: room.pieces, phase: room.phase, gameRound: room.gameRound } 
      });
      
      // 如果双方都已加入，发送 game_start 给双方
      if (room.redPlayer && room.blackPlayer) {
        broadcastGameStart(room);
      }
      
      // 通知房间内的其他玩家
      broadcastRoomUpdate(room);
      break;
    }

    case 'leave_room': {
      if (player && player.roomId) {
        const room = getRoom(player.roomId);
        const leaverSide = player.side; // 保存离开方的阵营
        const leaverId = getPlayerId(ws);
        console.log(`[leave_room] leaverId=${leaverId}, leaverSide=${leaverSide}, roomId=${player.roomId}`);
        console.log(`[leave_room] room before leave: redPlayer=${room?.redPlayer}, blackPlayer=${room?.blackPlayer}`);
        
        if (room) {
          // 先获取对手的 WebSocket（在 leaveRoom 之前，因为之后 room.redPlayer/blackPlayer 会被清空）
          const opponentSide = leaverSide === 'red' ? 'black' : 'red';
          const opponentId = opponentSide === 'red' ? room.redPlayer : room.blackPlayer;
          console.log(`[leave_room] opponentSide=${opponentSide}, opponentId=${opponentId}`);
          
          let opponentWs: WebSocket | null = null;
          
          if (opponentId) {
            for (const [wsClient] of clients) {
              if (getPlayerId(wsClient) === opponentId) {
                opponentWs = wsClient;
                break;
              }
            }
          }
          console.log(`[leave_room] opponentWs found: ${!!opponentWs}`);
          
          // 执行离开逻辑
          leaveRoom(player.roomId, leaverId);
          
          // 检查房间是否还存在
          const roomAfter = getRoom(player.roomId);
          console.log(`[leave_room] room after leave: ${roomAfter ? `exists, redPlayer=${roomAfter.redPlayer}, blackPlayer=${roomAfter.blackPlayer}` : 'deleted'}`);
          
          // 如果有对手在线，发送通知
          if (opponentWs) {
            console.log(`[leave_room] sending opponent_left to opponent`);
            sendToClient(opponentWs, { type: 'opponent_left', payload: { side: leaverSide } });
          }
        }
        
        player.roomId = null;
        player.side = null;
        clients.set(ws, player);
        
        sendToClient(ws, { type: 'left_room' });
      }
      break;
    }

    case 'start_game': {
      if (!player || !player.roomId) {
        sendToClient(ws, { type: 'error', payload: { message: '你不在任何房间中' } });
        return;
      }
      
      const room = getRoom(player.roomId);
      if (!room) {
        sendToClient(ws, { type: 'error', payload: { message: '房间不存在' } });
        return;
      }
      
      if (!room.redPlayer || !room.blackPlayer) {
        sendToClient(ws, { type: 'error', payload: { message: '需要双方都在才能开始' } });
        return;
      }
      
      room.phase = 'strategy';
      broadcastRoomUpdate(room);
      break;
    }

    case 'submit_move': {
      if (!player || !player.roomId || !player.side) {
        console.log('[SERVER] submit_move rejected: player not in room', { playerId: getPlayerId(ws), player, roomId: player?.roomId, side: player?.side });
        sendToClient(ws, { type: 'error', payload: { message: '你不在任何房间中' } });
        return;
      }
      
      const { from, to } = message.payload as { from: [number, number]; to: [number, number] };
      const playerId = getPlayerId(ws);
      console.log('[SERVER] submit_move received:', { playerId, roomId: player.roomId, side: player.side, from, to });
      const result = submitMove(player.roomId, playerId, from, to);
      console.log('[SERVER] submit_move result:', result);
      
      if (result.success) {
        const room = getRoom(player.roomId);
        if (room) {
          broadcastRoomUpdate(room);
          
          // 通知对手
          for (const [ws2, p2] of clients) {
            if (p2.roomId === room.id && p2.ws !== ws) {
              sendToClient(ws2, { type: 'opponent_move', payload: {} });
            }
          }
        }
      } else {
        sendToClient(ws, { type: 'error', payload: { message: result.error || '移动失败' } });
      }
      break;
    }

    case 'undo_move': {
      if (!player || !player.roomId || !player.side) {
        sendToClient(ws, { type: 'error', payload: { message: '你不在任何房间中' } });
        return;
      }
      
      const playerId = getPlayerId(ws);
      const result = undoMove(player.roomId, playerId);
      
      if (result.success) {
        const room = getRoom(player.roomId);
        if (room) {
          broadcastRoomUpdate(room);
        }
      } else {
        sendToClient(ws, { type: 'error', payload: { message: result.error || '撤销失败' } });
      }
      break;
    }

    case 'settle': {
      if (!player || !player.roomId) {
        sendToClient(ws, { type: 'error', payload: { message: '你不在任何房间中' } });
        return;
      }
      
      const room = getRoom(player.roomId);
      if (!room) {
        sendToClient(ws, { type: 'error', payload: { message: '房间不存在' } });
        return;
      }
      
      if (!room.redPendingMove || !room.blackPendingMove) {
        sendToClient(ws, { type: 'error', payload: { message: '双方都需要先走棋' } });
        return;
      }
      
      // 执行结算
      const result = settleGame(player.roomId);
      console.log('[SERVER] settleGame result:', JSON.stringify(result));
      
      if (result.success && room) {
        if (result.winner) {
          // 游戏结束
          console.log('[SERVER] Game over! Sending game_over to all clients in room:', room.id, 'winner:', result.winner);
          for (const [ws2, p2] of clients) {
            if (p2.roomId === room.id) {
              const msg = { 
                type: 'game_over', 
                payload: { 
                  winner: result.winner, 
                  reason: result.reason,
                } 
              };
              console.log('[SERVER] Sending game_over to client, msg:', JSON.stringify(msg));
              sendToClient(ws2, msg);
            }
          }
        } else {
          console.log('[SERVER] No winner, game continues');
        }
        broadcastRoomUpdate(room);
      } else {
        console.log('[SERVER] settleGame failed or room not found');
      }
      break;
    }

    case 'reset_game': {
      if (!player || !player.roomId) {
        sendToClient(ws, { type: 'error', payload: { message: '你不在任何房间中' } });
        return;
      }
      
      if (resetRoom(player.roomId)) {
        const room = getRoom(player.roomId);
        if (room) {
          broadcastRoomUpdate(room);
        }
      }
      break;
    }

    case 'request_undo': {
      if (!player || !player.roomId || !player.side) {
        sendToClient(ws, { type: 'error', payload: { message: '你不在任何房间中' } });
        return;
      }
      
      const result = requestUndo(player.roomId, player.side);
      
      if (result.success) {
        const room = getRoom(player.roomId);
        if (room) {
          // 通知对方有悔棋请求
          for (const [ws2, p2] of clients) {
            if (p2.roomId === room.id && p2.ws !== ws) {
              sendToClient(ws2, { 
                type: 'undo_requested', 
                payload: { from: player.side } 
              });
            }
          }
          // 通知请求方等待对方同意
          sendToClient(ws, { 
            type: 'undo_waiting', 
            payload: { to: player.side === 'red' ? 'black' : 'red' } 
          });
        }
      } else {
        sendToClient(ws, { type: 'error', payload: { message: result.error || '请求失败' } });
      }
      break;
    }

    case 'respond_undo': {
      if (!player || !player.roomId || !player.side) {
        sendToClient(ws, { type: 'error', payload: { message: '你不在任何房间中' } });
        return;
      }
      
      const { accepted } = message.payload as { accepted: boolean };
      const result = respondToUndo(player.roomId, player.side, accepted);
      
      if (result.success) {
        const room = getRoom(player.roomId);
        if (room) {
          // 通知双方悔棋结果
          for (const [ws2, p2] of clients) {
            if (p2.roomId === room.id) {
              sendToClient(ws2, { 
                type: 'undo_response', 
                payload: { 
                  accepted,
                  message: accepted ? '对方同意了悔棋请求' : '对方拒绝了悔棋请求'
                } 
              });
            }
          }
          // 广播房间更新
          broadcastRoomUpdate(room);
        }
      } else {
        sendToClient(ws, { type: 'error', payload: { message: result.error || '操作失败' } });
      }
      break;
    }

    case 'request_reset': {
      console.log('[SERVER] request_reset received from player:', getPlayerId(ws), 'side:', player?.side, 'phase:', player?.roomId ? getRoom(player.roomId)?.phase : 'no room');
      if (!player || !player.roomId || !player.side) {
        console.log('[SERVER] request_reset rejected: player or room or side missing');
        sendToClient(ws, { type: 'error', payload: { message: '你不在任何房间中' } });
        return;
      }
      
      const result = requestReset(player.roomId, player.side);
      console.log('[SERVER] requestReset result:', result);
      
      if (result.success) {
        const room = getRoom(player.roomId);
        console.log('[SERVER] requestReset success, room:', room?.id, 'sending reset_requested to opponent');
        if (room) {
          // 通知对方有重置请求
          let sent = false;
          for (const [ws2, p2] of clients) {
            console.log('[SERVER] checking client:', getPlayerId(ws2), 'roomId:', p2.roomId, 'current roomId:', room.id, 'isSelf:', ws2 === ws);
            if (p2.roomId === room.id && p2.ws !== ws) {
              const msg = { type: 'reset_requested', payload: { from: player.side } };
              console.log('[SERVER] Sending reset_requested to:', getPlayerId(ws2), 'msg:', JSON.stringify(msg));
              sendToClient(ws2, msg);
              sent = true;
            }
          }
          console.log('[SERVER] reset_requested sent:', sent);
          // 通知请求方等待对方同意
          sendToClient(ws, { 
            type: 'reset_waiting', 
            payload: { to: player.side === 'red' ? 'black' : 'red' } 
          });
        }
      } else {
        sendToClient(ws, { type: 'error', payload: { message: result.error || '请求失败' } });
      }
      break;
    }

    case 'respond_reset': {
      if (!player || !player.roomId || !player.side) {
        sendToClient(ws, { type: 'error', payload: { message: '你不在任何房间中' } });
        return;
      }
      
      const { accepted } = message.payload as { accepted: boolean };
      const result = respondToReset(player.roomId, player.side, accepted);
      
      if (result.success) {
        const room = getRoom(player.roomId);
        if (room) {
          // 通知双方重置结果
          for (const [ws2, p2] of clients) {
            if (p2.roomId === room.id) {
              sendToClient(ws2, { 
                type: 'reset_response', 
                payload: { 
                  accepted,
                  message: accepted ? '对方同意了重置请求，游戏已重置' : '对方拒绝了重置请求'
                } 
              });
            }
          }
          // 广播房间更新
          broadcastRoomUpdate(room);
        }
      } else {
        sendToClient(ws, { type: 'error', payload: { message: result.error || '操作失败' } });
      }
      break;
    }

    case 'request_restart': {
      if (!player || !player.roomId || !player.side) {
        sendToClient(ws, { type: 'error', payload: { message: '你不在任何房间中' } });
        return;
      }
      
      const result = requestRestart(player.roomId, player.side);
      
      if (!result.success) {
        sendToClient(ws, { type: 'error', payload: { message: result.error || '操作失败' } });
        return;
      }
      
      if (result.shouldReset) {
        // 双方都请求了重置，直接重置游戏
        const room = getRoom(player.roomId);
        if (room) {
          // 通知双方游戏重新开始
          for (const [ws2, p2] of clients) {
            if (p2.roomId === room.id) {
              sendToClient(ws2, { type: 'opponent_restart_requested' });
            }
          }
          // 广播房间更新（包含新的游戏状态）
          broadcastRoomUpdate(room);
        }
      } else {
        // 只有一方请求了，通知对方
        for (const [ws2, p2] of clients) {
          if (p2.roomId === player.roomId && p2.ws !== ws) {
            sendToClient(ws2, { type: 'restart_waiting' });
          }
        }
      }
      break;
    }

    case 'cancel_restart': {
      if (!player || !player.roomId || !player.side) {
        sendToClient(ws, { type: 'error', payload: { message: '你不在任何房间中' } });
        return;
      }
      
      const result = cancelRestart(player.roomId, player.side);
      
      if (!result.success) {
        sendToClient(ws, { type: 'error', payload: { message: result.error || '操作失败' } });
        return;
      }
      
      // 通知对方取消了请求
      for (const [ws2, p2] of clients) {
        if (p2.roomId === player.roomId && p2.ws !== ws) {
          sendToClient(ws2, { type: 'opponent_restart_cancelled' });
        }
      }
      break;
    }

    default:
      sendToClient(ws, { type: 'error', payload: { message: '未知的消息类型' } });
  }
};

// 处理断开连接
const handleDisconnect = (ws: WebSocket): void => {
  const player = clients.get(ws);
  
  // 如果在匹配队列中，移除
  if (player?.inMatchmaking) {
    matchQueue.delete(ws);
    console.log('匹配中的玩家断开连接');
  }
  
  if (player && player.roomId) {
    const room = getRoom(player.roomId);
    if (room) {
      leaveRoom(player.roomId, getPlayerId(ws));
      
      // 通知房间内的其他玩家
      for (const [ws2, p2] of clients) {
        if (p2.roomId === room.id && p2.ws !== ws) {
          sendToClient(ws2, { type: 'left_room' });
        }
      }
    }
    console.log('玩家断开连接:', player.side, player.roomId);
  }
  clients.delete(ws);
};

// 发送消息给客户端
const sendToClient = (ws: WebSocket, message: WSMessage): void => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
};

// 广播房间状态给所有相关玩家
const broadcastRoomUpdate = (room: ReturnType<typeof getRoom>): void => {
  if (!room) return;
  
  for (const [ws, player] of clients) {
    if (player.roomId === room.id) {
      const side = getPlayerSide(room, getPlayerId(player.ws));
      sendRoomState(ws, room, side);
    }
  }
};

// 发送房间状态给单个玩家
const sendRoomState = (ws: WebSocket, room: NonNullable<ReturnType<typeof getRoom>>, side: 'red' | 'black' | null): void => {
  sendToClient(ws, {
    type: 'room_state',
    payload: {
      roomId: room.id,
      side,
      pieces: room.pieces,
      phase: room.phase,
      redConfirmed: room.redConfirmed,
      blackConfirmed: room.blackConfirmed,
      redPendingMove: room.redPendingMove,
      blackPendingMove: room.blackPendingMove,
      winner: room.winner,
      redOnline: !!room.redPlayer,
      blackOnline: !!room.blackPlayer,
      // 最后行动目标位置
      lastRedMoveTo: room.lastRedMoveTo,
      lastBlackMoveTo: room.lastBlackMoveTo,
      // 对弈历史记录
      roundHistory: room.roundHistory,
      // 游戏回合号（用于显示）
      gameRound: room.gameRound,
      // 将军状态
      checkStatus: {
        red: room.redInCheck,
        black: room.blackInCheck,
      },
    },
  });
};

// 广播游戏开始给所有相关玩家
const broadcastGameStart = (room: NonNullable<ReturnType<typeof getRoom>>): void => {
  for (const [ws, player] of clients) {
    if (player.roomId === room.id) {
      sendToClient(ws, { type: 'game_start' });
    }
  }
};

// 获取当前连接数
export const getConnectionCount = (): number => {
  return clients.size;
};
