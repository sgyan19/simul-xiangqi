// WebSocket 客户端适配器
// 负责与服务端 WebSocket 通信

export interface RoomState {
  roomId: string;
  side: 'red' | 'black' | null;
  pieces: Array<{
    type: string;
    side: string;
    position: [number, number];
    id: string;
  }>;
  phase: 'waiting' | 'strategy' | 'settlement' | 'ended';
  redConfirmed: boolean;
  blackConfirmed: boolean;
  redPendingMove: { from: [number, number]; to: [number, number] } | null;
  blackPendingMove: { from: [number, number]; to: [number, number] } | null;
  winner: 'red' | 'black' | 'draw' | null;
  redOnline: boolean;
  blackOnline: boolean;
}

type MessageHandler = (payload: unknown) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, MessageHandler> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${window.location.host}/ws`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket 连接成功');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            const handler = this.handlers.get(message.type);
            if (handler) {
              handler(message.payload);
            }
          } catch (error) {
            console.error('解析消息失败:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket 连接关闭');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket 错误:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试重新连接... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => {
        this.connect().catch(() => {
          // 重连失败，等待下一次尝试
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }

  off(type: string): void {
    this.handlers.delete(type);
  }

  send(type: string, payload?: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.error('WebSocket 未连接');
    }
  }

  // 创建房间
  createRoom(): void {
    this.send('create_room');
  }

  // 加入房间
  joinRoom(roomId: string): void {
    this.send('join_room', { roomId });
  }

  // 选择阵营（创建房间后调用）
  chooseSide(side: 'red' | 'black'): void {
    this.send('choose_side', { side });
  }

  // 离开房间
  leaveRoom(): void {
    this.send('leave_room');
  }

  // 开始游戏
  startGame(): void {
    this.send('start_game');
  }

  // 提交移动
  submitMove(from: [number, number], to: [number, number]): void {
    this.send('submit_move', { from, to });
  }

  // 撤销移动
  undoMove(): void {
    this.send('undo_move');
  }

  // 重置游戏
  resetGame(): void {
    this.send('reset_game');
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// 导出单例
export const wsClient = new WebSocketClient();
