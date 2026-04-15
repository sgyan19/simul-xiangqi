import { Piece, PendingAction } from '../types';

export type RemovalReason = 
  | 'captured'
  | 'exchange'
  | 'counter_attack'
  | 'face_off';

export interface PieceRemovalRecord {
  piece: Piece;
  reason: RemovalReason;
  removedBy?: {
    side: 'red' | 'black';
    pieceType: string;
    pieceId: string;
  };
}

export interface SettlementEvent {
  type: 'move' | 'capture' | 'collision' | 'counter_attack' | 'face_off';
  description: string;
}

export interface RoundHistoryEntry {
  roundNumber: number;
  redAction: PendingAction | null;
  blackAction: PendingAction | null;
  redPieceRemoved: PieceRemovalRecord[];
  blackPieceRemoved: PieceRemovalRecord[];
  events: SettlementEvent[];
  winner: 'red' | 'black' | 'draw' | null;
  endReason: string | null;
  isGameEnd: boolean;
}

export const getPieceName = (pieceType: string): string => {
  const names: Record<string, string> = {
    king: '帅/将',
    advisor: '仕/士',
    elephant: '相/象',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    pawn: '兵/卒',
  };
  return names[pieceType] || pieceType;
};
