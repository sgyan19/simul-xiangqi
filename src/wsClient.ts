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

// 使用全局变量存储实例，确保热更新不会重新创建
declare global {
  var __wsClientInstance: WebSocketClient | undefined;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, MessageHandler> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isManualClose = false;
  private connectPromise: Promise<void> | null = null;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${window.location.host}/ws`;
  }

  connect(): Promise<void> {
    // 如果正在连接中，返回已有的 promise
    if (this.connectPromise) {
      return this.connectPromise;
    }
    
    this.connectPromise = new Promise((resolve, reject) => {
      try {
        // 如果已有连接且是 OPEN 状态，直接返回
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          resolve();
          return;
        }
        
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          // 通知所有监听者连接成功
          const handler = this.handlers.get('connected');
          if (handler) {
            handler({});
          }
          this.connectPromise = null;
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
          this.connectPromise = null;
          // 通知所有监听者连接断开（仅非手动关闭时）
          if (!this.isManualClose) {
            const handler = this.handlers.get('disconnected');
            if (handler) {
              handler({});
            }
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket 错误:', error);
          this.connectPromise = null;
          reject(error);
        };
      } catch (error) {
        this.connectPromise = null;
        reject(error);
      }
    });
    
    return this.connectPromise;
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
      setTimeout(() => {
        this.connect().catch(() => {
          // 重连失败，继续尝试
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      // 超过最大次数后，继续以固定间隔重连（每5秒尝试一次）
      console.log('继续尝试重连...');
      setTimeout(() => {
        this.reconnectAttempts = this.maxReconnectAttempts; // 保持触发"继续重连"逻辑
        this.attemptReconnect();
      }, 5000);
    }
  }

  disconnect(): void {
    this.isManualClose = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isManualClose = false;
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

// 使用全局单例，确保热更新不会重新创建实例
export const wsClient = globalThis.__wsClientInstance ?? (globalThis.__wsClientInstance = new WebSocketClient());
