import React, { ReactNode } from 'react';
import { Piece, Position, Side, GamePhase, PIECE_NAMES, Move } from './types';

interface ChessBoardProps {
  pieces: Piece[];
  selectedPiece: Piece | null;
  validMoves: Position[];
  currentOperatedSide: Side;
  phase: GamePhase;
  flipped: boolean;
  redPendingMove: Move | null;
  blackPendingMove: Move | null;
  onSelectPiece: (piece: Piece) => void;
  onMovePiece: (to: Position) => void;
  redConfirmed?: boolean;
  blackConfirmed?: boolean;
}

// 棋盘尺寸常量
const COLS = 9;
const ROWS = 10;

// 计算格子中心的百分比位置
// 每个格子的中心点 = 格子索引 * CELL_PERCENT
const CELL_WIDTH = 100 / (COLS - 1);
const CELL_HEIGHT = 100 / (ROWS - 1);

// 坐标转换：逻辑坐标 -> 百分比
// 红方视角（flipped=false）：col从左到右，row从下到上
// 黑方视角（flipped=true）：col从右到左，row从上到下
const getPosition = (col: number, row: number, flipped: boolean): { left: string; top: string } => {
  const displayCol = flipped ? (COLS - 1 - col) : col;
  const displayRow = flipped ? (ROWS - 1 - row) : row;
  
  // 百分比位置（居中于格子中心）
  const left = `${displayCol * CELL_WIDTH}%`;
  const top = `${displayRow * CELL_HEIGHT}%`;
  
  return { left, top };
};

// 绘制棋盘背景
const BoardBackground = () => {
  const lines: ReactNode[] = [];
  
  // 横向线条 (10条)
  for (let i = 0; i < ROWS; i++) {
    lines.push(
      <line
        key={`h${i}`}
        x1="0%"
        y1={`${i * CELL_HEIGHT}%`}
        x2="100%"
        y2={`${i * CELL_HEIGHT}%`}
        stroke="#8B4513"
        strokeWidth="2"
      />
    );
  }

  // 竖向线条 (9条)
  for (let i = 0; i < COLS; i++) {
    const x = i * CELL_WIDTH;
    if (i === 0 || i === COLS - 1) {
      // 边线到头
      lines.push(
        <line
          key={`v${i}`}
          x1={`${x}%`}
          y1="0%"
          x2={`${x}%`}
          y2="100%"
          stroke="#8B4513"
          strokeWidth="2"
        />
      );
    } else {
      // 上半部分（楚河汉界以上）
      lines.push(
        <line
          key={`v${i}t`}
          x1={`${x}%`}
          y1="0%"
          x2={`${x}%`}
          y2={`${5 * CELL_HEIGHT}%`}
          stroke="#8B4513"
          strokeWidth="2"
        />
      );
      // 下半部分（汉界以下）
      lines.push(
        <line
          key={`v${i}b`}
          x1={`${x}%`}
          y1={`${5 * CELL_HEIGHT}%`}
          x2={`${x}%`}
          y2="100%"
          stroke="#8B4513"
          strokeWidth="2"
        />
      );
    }
  }

  // 九宫格斜线 - 红方（下方，row 7-9，即视觉上的下方）
  const redPalaceX1 = 3 * CELL_WIDTH;
  const redPalaceX2 = 5 * CELL_WIDTH;
  const redPalaceTop = 7 * CELL_HEIGHT;
  const redPalaceBottom = 9 * CELL_HEIGHT;
  const redPalaceCenter = 8 * CELL_HEIGHT;

  // 红方九宫 X 形
  lines.push(
    <line key="palace-red-1" x1={`${redPalaceX1}%`} y1={`${redPalaceTop}%`} x2={`${redPalaceX2}%`} y2={`${redPalaceBottom}%`} stroke="#8B4513" strokeWidth="2" />,
    <line key="palace-red-2" x1={`${redPalaceX2}%`} y1={`${redPalaceTop}%`} x2={`${redPalaceX1}%`} y2={`${redPalaceBottom}%`} stroke="#8B4513" strokeWidth="2" />
  );

  // 黑方九宫（上方，row 0-2，即视觉上的上方）
  const blackPalaceX1 = 3 * CELL_WIDTH;
  const blackPalaceX2 = 5 * CELL_WIDTH;
  const blackPalaceTop = 0 * CELL_HEIGHT;
  const blackPalaceBottom = 2 * CELL_HEIGHT;

  // 黑方九宫 X 形
  lines.push(
    <line key="palace-black-1" x1={`${blackPalaceX1}%`} y1={`${blackPalaceTop}%`} x2={`${blackPalaceX2}%`} y2={`${blackPalaceBottom}%`} stroke="#8B4513" strokeWidth="2" />,
    <line key="palace-black-2" x1={`${blackPalaceX2}%`} y1={`${blackPalaceTop}%`} x2={`${blackPalaceX1}%`} y2={`${blackPalaceBottom}%`} stroke="#8B4513" strokeWidth="2" />
  );

  // 楚河汉界区域
  // 楚河汉界是第5行的空白区域（第5行是楚河，第6行是汉界，但中间是空的）
  // 实际上楚河汉界是第5行（row=4或row=5）
  // 标准象棋中，楚河汉界在第5列和第6列之间

  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: 'absolute', top: 0, left: 0 }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {lines}
      
      {/* 楚河文字 */}
      <text
        x="22%"
        y="48%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#8B4513"
        fontSize="6"
        fontFamily="'SimSun', 'STSong', serif"
        fontWeight="bold"
      >
        楚 河
      </text>
      {/* 汉界文字 */}
      <text
        x="78%"
        y="48%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#8B4513"
        fontSize="6"
        fontFamily="'SimSun', 'STSong', serif"
        fontWeight="bold"
      >
        汉 界
      </text>
    </svg>
  );
};

// 棋子组件
const ChessPiece = ({
  piece,
  isSelected,
  isSelectable,
  flipped,
  isInValidMoves,
  onClick,
}: {
  piece: Piece;
  isSelected: boolean;
  isSelectable: boolean;
  flipped: boolean;
  isInValidMoves: boolean;
  onClick: () => void;
}) => {
  const { left, top } = getPosition(piece.position[0], piece.position[1], flipped);
  const pieceName = PIECE_NAMES[piece.type][piece.side];

  return (
    <div
      className={`piece ${piece.side} ${isSelected ? 'selected' : ''} ${isSelectable || isInValidMoves ? 'selectable' : 'hidden'} ${isInValidMoves ? 'can-capture' : ''}`}
      style={{ left, top }}
      onClick={isSelectable || isInValidMoves ? onClick : undefined}
    >
      <div className="piece-inner">
        {pieceName}
      </div>
    </div>
  );
};

// 移动指示器
const MoveIndicator = ({
  position,
  isCapture,
  flipped,
  onClick,
}: {
  position: Position;
  isCapture: boolean;
  flipped: boolean;
  onClick: () => void;
}) => {
  const { left, top } = getPosition(position[0], position[1], flipped);

  return (
    <div
      className={`move-indicator ${isCapture ? 'capture' : ''}`}
      style={{ left, top }}
      onClick={onClick}
    >
      <div className="move-dot" />
    </div>
  );
};

// 箭头组件
const MoveArrow = ({
  move,
  side,
  flipped,
}: {
  move: Move;
  side: 'red' | 'black';
  flipped: boolean;
}) => {
  const from = getPosition(move.from[0], move.from[1], flipped);
  const to = getPosition(move.to[0], move.to[1], flipped);
  
  // 将百分比转换为数值计算
  const fromX = parseFloat(from.left);
  const fromY = parseFloat(from.top);
  const toX = parseFloat(to.left);
  const toY = parseFloat(to.top);
  
  // 计算箭头参数
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // 箭头头部大小（相对于线长）
  const headSize = 3;
  const headAngle = 25; // 度数
  
  // 计算箭头头部点
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const angle1 = (angle + 180 + headAngle) * Math.PI / 180;
  const angle2 = (angle + 180 - headAngle) * Math.PI / 180;
  
  const head1X = toX + headSize * Math.cos(angle1);
  const head1Y = toY + headSize * Math.sin(angle1);
  const head2X = toX + headSize * Math.cos(angle2);
  const head2Y = toY + headSize * Math.sin(angle2);
  
  const color = side === 'red' ? '#e74c3c' : '#2c3e50';
  const id = `arrow-${side}-${move.from[0]}-${move.from[1]}-${move.to[0]}-${move.to[1]}`;
  
  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <marker
          id={id}
          markerWidth="4"
          markerHeight="4"
          refX="3"
          refY="2"
          orient="auto"
        >
          <path d={`M0,0 L0,4 L4,2 Z`} fill={color} />
        </marker>
      </defs>
      <line
        x1={`${fromX}%`}
        y1={`${fromY}%`}
        x2={`${toX - (dx / length) * headSize}%`}
        y2={`${toY - (dy / length) * headSize}%`}
        stroke={color}
        strokeWidth="1.5"
        markerEnd={`url(#${id})`}
        opacity="0.8"
      />
    </svg>
  );
};

function ChessBoard({
  pieces,
  selectedPiece,
  validMoves,
  currentOperatedSide,
  phase,
  flipped,
  redPendingMove,
  blackPendingMove,
  onSelectPiece,
  onMovePiece,
  redConfirmed,
  blackConfirmed,
}: ChessBoardProps) {
  // 检查某个位置是否有棋子
  const getPieceAtPosition = (col: number, row: number): Piece | undefined => {
    return pieces.find(p => p.position[0] === col && p.position[1] === row);
  };

  // 检查位置是否是有效移动
  const isValidMovePosition = (col: number, row: number): boolean => {
    return validMoves.some(m => m[0] === col && m[1] === row);
  };

  return (
    <div className="board-container" style={{ transform: 'none' }}>
      <div className="chess-board" style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* 棋盘背景 */}
        <BoardBackground />

        {/* 移动箭头 - 红方 */}
        {redPendingMove && (
          <MoveArrow move={redPendingMove} side="red" flipped={flipped} />
        )}

        {/* 移动箭头 - 黑方 */}
        {blackPendingMove && (
          <MoveArrow move={blackPendingMove} side="black" flipped={flipped} />
        )}

        {/* 可移动位置指示 */}
        {selectedPiece && validMoves.map((move, idx) => {
          const targetPiece = getPieceAtPosition(move[0], move[1]);
          return (
            <MoveIndicator
              key={`move-${idx}`}
              position={move}
              isCapture={!!targetPiece}
              flipped={flipped}
              onClick={() => onMovePiece(move)}
            />
          );
        })}

        {/* 棋子 */}
        {pieces.map(piece => {
          const isInValidMoves = validMoves.some(
            m => m[0] === piece.position[0] && m[1] === piece.position[1]
          );
          // 本地模式：只能选当前视角阵营的棋子，且该方未走棋
          // 在线模式：只能选 currentOperatedSide
          const isSelectable = phase === 'strategy' && piece.side === currentOperatedSide && (
            redConfirmed !== undefined 
              ? (piece.side === 'red' ? !redConfirmed : !blackConfirmed)
              : true
          );
          return (
            <ChessPiece
              key={piece.id}
              piece={piece}
              isSelected={selectedPiece?.id === piece.id}
              isSelectable={isSelectable}
              flipped={flipped}
              isInValidMoves={false} // 策略阶段不允许吃子
              onClick={() => {
                if (!isSelectable) return;
                onSelectPiece(piece);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default ChessBoard;
