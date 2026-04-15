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
    king: 'shuai/jiang',
    advisor: 'shi',
    elephant: 'xiang',
    horse: 'ma',
    chariot: 'che',
    cannon: 'pao',
    pawn: 'bing/zu',
  };
  return names[pieceType] || pieceType;
};
