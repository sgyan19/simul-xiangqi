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

// 处理消息
const handleMessage = (ws: WebSocket, message: WSMessage): void => {
  const player = clients.get(ws);
  if (!player) return;

  switch (message.type) {
    case 'create_room': {
      const newRoom = createRoom(generateRoomId());
      // 创建房间后，玩家进入房间但未选择阵营
      const player = clients.get(ws);
      if (player) {
        player.roomId = newRoom.id;
        player.side = null; // 尚未选择阵营
        clients.set(ws, player);
      }
      // 发送房间创建成功消息，不分配阵营
      sendToClient(ws, { type: 'room_created', payload: { roomId: newRoom.id } });
      break;
    }

    case 'choose_side': {
      const { side } = message.payload as { side: 'red' | 'black' };
      const player = clients.get(ws);
      if (!player || !player.roomId) {
        sendToClient(ws, { type: 'error', payload: { message: '你不在任何房间中' } });
        return;
      }
      
      const room = getRoom(player.roomId);
      if (!room) {
        sendToClient(ws, { type: 'error', payload: { message: '房间不存在' } });
        return;
      }
      
      // 检查选择的阵营是否可用
      if (side === 'red' && room.redPlayer) {
        sendToClient(ws, { type: 'error', payload: { message: '红方已有玩家' } });
        return;
      }
      if (side === 'black' && room.blackPlayer) {
        sendToClient(ws, { type: 'error', payload: { message: '黑方已有玩家' } });
        return;
      }
      
      // 检查是否已经在其他阵营
      if (player.side) {
        // 离开之前的阵营
        if (player.side === 'red') room.redPlayer = null;
        else room.blackPlayer = null;
      }
      
      // 加入新阵营
      if (side === 'red') {
        room.redPlayer = ws.toString();
      } else {
        room.blackPlayer = ws.toString();
      }
      player.side = side;
      clients.set(ws, player);
      
      sendToClient(ws, { type: 'joined', payload: { roomId: player.roomId, side } });
      broadcastRoomUpdate(room);
      break;
    }

    case 'join_room': {
      const { roomId } = message.payload as { roomId: string };
      const playerId = ws.toString();
      const room = getRoom(roomId);
      const player = clients.get(ws);
      if (!player) return;
      
      if (!room) {
        sendToClient(ws, { type: 'error', payload: { message: '房间不存在' } });
        return;
      }
      
      // 如果已经有 side，说明是重连
      if (player.side) {
        const currentSide = player.side;
        player.roomId = roomId;
        sendRoomState(ws, room, currentSide);
        return;
      }
      
      // 检查红方位置是否可用
      if (!room.redPlayer) {
        room.redPlayer = playerId;
        player.side = 'red';
        player.roomId = roomId;
        clients.set(ws, player);
        sendToClient(ws, { type: 'joined', payload: { roomId, side: 'red' } });
        broadcastRoomUpdate(room);
      } else if (!room.blackPlayer) {
        room.blackPlayer = playerId;
        player.side = 'black';
        player.roomId = roomId;
        clients.set(ws, player);
        sendToClient(ws, { type: 'joined', payload: { roomId, side: 'black' } });
        broadcastRoomUpdate(room);
      } else {
        sendToClient(ws, { type: 'error', payload: { message: '房间已满' } });
      }
      break;
    }

    case 'leave_room': {
      if (player.roomId) {
        leaveRoom(player.roomId, ws.toString());
        player.roomId = null;
        player.side = null;
        clients.set(ws, player);
        sendToClient(ws, { type: 'left_room' });
      }
      break;
    }

    case 'start_game': {
      if (!player.roomId) {
        sendToClient(ws, { type: 'error', payload: { message: '你不在任何房间中' } });
        return;
      }
      
      const room = getRoom(player.roomId);
      if (!room) {
        sendToClient(ws, { type: 'error', payload: { message: '房间不存在' } });
        return;
      }
      
      if (startGame(player.roomId)) {
        broadcastRoomUpdate(room);
      } else {
        sendToClient(ws, { type: 'error', payload: { message: '无法开始游戏，需要双方都在线' } });
      }
      break;
    }

    case 'submit_move': {
      if (!player.roomId || !player.side) {
        sendToClient(ws, { type: 'error', payload: { message: '你不在任何房间中' } });
        return;
      }
      
      const { from, to } = message.payload as { from: [number, number]; to: [number, number] };
      const result = submitMove(player.roomId, ws.toString(), from, to);
      
      if (result.success) {
        const room = getRoom(player.roomId);
        if (room) {
          broadcastRoomUpdate(room);
        }
      } else {
        sendToClient(ws, { type: 'error', payload: { message: result.error } });
      }
      break;
    }

    case 'undo_move': {
      if (!player.roomId || !player.side) {
        sendToClient(ws, { type: 'error', payload: { message: '你不在任何房间中' } });
        return;
      }
      
      const result = undoMove(player.roomId, ws.toString());
      
      if (result.success) {
        const room = getRoom(player.roomId);
        if (room) {
          broadcastRoomUpdate(room);
        }
      } else {
        sendToClient(ws, { type: 'error', payload: { message: result.error } });
      }
      break;
    }

    case 'reset_game': {
      if (!player.roomId) {
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

    default:
      sendToClient(ws, { type: 'error', payload: { message: '未知的消息类型' } });
  }
};

// 处理断开连接
const handleDisconnect = (ws: WebSocket): void => {
  const player = clients.get(ws);
  if (player && player.roomId) {
    // 标记玩家离线，但不立即离开房间
    // 玩家可以重新连接
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
const broadcastRoomUpdate = (room: { id: string; redPlayer: string | null; blackPlayer: string | null }): void => {
  for (const [ws, player] of clients) {
    if (player.roomId === room.id) {
      const side = getPlayerSide(room, player.ws.toString());
      sendRoomState(ws, room, side);
    }
  }
};

// 发送房间状态给单个玩家
const sendRoomState = (ws: WebSocket, room: {
  id: string;
  redPlayer: string | null;
  blackPlayer: string | null;
  pieces: unknown[];
  phase: string;
  redConfirmed: boolean;
  blackConfirmed: boolean;
  redPendingMove: { from: [number, number]; to: [number, number] } | null;
  blackPendingMove: { from: [number, number]; to: [number, number] } | null;
  winner: string | null;
}, side: 'red' | 'black' | null): void => {
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
    },
  });
};

// 获取当前连接数
export const getConnectionCount = (): number => {
  return clients.size;
};
