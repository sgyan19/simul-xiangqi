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
} from './gameState';

interface WSMessage {
  type: string;
  payload?: unknown;
}

interface PlayerInfo {
  ws: WebSocket;
  roomId: string | null;
  side: 'red' | 'black' | null;
}

// 存储所有连接的客户端
const clients: Map<WebSocket, PlayerInfo> = new Map();

// 初始化 WebSocket 服务
export const initWebSocket = (server: Server): WebSocketServer => {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('新的 WebSocket 连接');
    
    // 初始化玩家信息
    clients.set(ws, { ws, roomId: null, side: null });

    ws.on('message', (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
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

// 处理消息
const handleMessage = (ws: WebSocket, message: WSMessage): void => {
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
        payload: { roomId, side: 'red', pieces: room.pieces } 
      });
      
      broadcastRoomUpdate(room);
      break;
    }

    case 'join_room': {
      const { roomId } = message.payload as { roomId: string };
      const playerId = getPlayerId(ws);
      const room = getRoom(roomId);
      
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
        payload: { roomId, side: player.side, pieces: room.pieces, phase: room.phase } 
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
        if (room) {
          leaveRoom(player.roomId, getPlayerId(ws));
          
          // 如果房间空了，删除房间
          if (!room.redPlayer && !room.blackPlayer) {
            // 房间会被删除
          } else {
            broadcastRoomUpdate(room);
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
        sendToClient(ws, { type: 'error', payload: { message: '你不在任何房间中' } });
        return;
      }
      
      const { from, to } = message.payload as { from: [number, number]; to: [number, number] };
      const playerId = getPlayerId(ws);
      const result = submitMove(player.roomId, playerId, from, to);
      
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
      
      console.log('DEBUG settle: executing...');
      
      // 执行结算
      const result = settleGame(player.roomId);
      console.log('DEBUG settle: result:', result);
      console.log('DEBUG after settle: lastRedMoveTo:', room.lastRedMoveTo, 'lastBlackMoveTo:', room.lastBlackMoveTo);
      
      if (result.success && room) {
        if (result.winner) {
          // 游戏结束
          for (const [ws2, p2] of clients) {
            if (p2.roomId === room.id) {
              sendToClient(ws2, { 
                type: 'game_over', 
                payload: { 
                  winner: result.winner, 
                  reason: result.reason,
                } 
              });
            }
          }
        }
        broadcastRoomUpdate(room);
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

    default:
      sendToClient(ws, { type: 'error', payload: { message: '未知的消息类型' } });
  }
};

// 处理断开连接
const handleDisconnect = (ws: WebSocket): void => {
  const player = clients.get(ws);
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
  console.log('DEBUG broadcastRoomUpdate: lastRedMoveTo:', room.lastRedMoveTo, 'lastBlackMoveTo:', room.lastBlackMoveTo);
  
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
