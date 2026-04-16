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
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          // 通知所有监听者连接成功
          const handler = this.handlers.get('connected');
          if (handler) {
            handler({});
          }
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
          console.log('WebSocket closed');
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
      console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
      setTimeout(() => {
        this.connect().catch(() => {
          // 重连失败
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

  on(type: string, handler: MessageHandler) {
    this.handlers.set(type, handler);
  }

  off(type: string) {
    this.handlers.delete(type);
  }

  send(type: string, payload?: unknown): void {
    console.log('[WS] Sending message:', type, payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, payload });
      console.log('[WS] Actual send:', message);
      this.ws.send(message);
    } else {
      console.warn('[WS] WebSocket not connected, readyState:', this.ws?.readyState);
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const wsClient = new WebSocketClient();
