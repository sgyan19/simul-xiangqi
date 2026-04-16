import React, { ReactNode } from 'react';
import { Piece, Position, Side, GamePhase, PIECE_NAMES, Move, PendingAction } from './types';

interface ChessBoardProps {
  pieces: Piece[];
  selectedPiece: Piece | null;
  validMoves: Position[];
  currentOperatedSide: Side;
  phase: GamePhase;
  flipped: boolean;
  redPendingMove: Move | null;
  blackPendingMove: Move | null;
  lastMoveTargets: { red: Position | null; black: Position | null };
  onSelectPiece: (piece: Piece) => void;
  onMovePiece: (to: Position) => void;
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
  
  // 楚河汉界区域（row 4.5 附近）
  // 上半区域终点 y = 4 * CELL_HEIGHT = 44.44%
  // 下半区域起点 y = 5 * CELL_HEIGHT = 55.56%
  const riverTop = 4 * CELL_HEIGHT;      // 44.44%
  const riverBottom = 5 * CELL_HEIGHT;   // 55.56%
  
  // 横向线条 (10条)
  for (let i = 0; i < ROWS; i++) {
    const y = i * CELL_HEIGHT;
    let y2 = y;
    
    // 如果是楚河汉界附近的线，需要断开
    if (i === 4) {
      // 上半部分最后一条线，到楚河汉界顶部为止
      lines.push(
        <line
          key={`h${i}`}
          x1="0%"
          y1={`${y}%`}
          x2="100%"
          y2={`${y}%`}
          stroke="#8B4513"
          strokeWidth="0.7"
        />
      );
    } else if (i === 5) {
      // 下半部分第一条线，从楚河汉界底部开始
      lines.push(
        <line
          key={`h${i}`}
          x1="0%"
          y1={`${y}%`}
          x2="100%"
          y2={`${y}%`}
          stroke="#8B4513"
          strokeWidth="0.7"
        />
      );
    } else {
      lines.push(
        <line
          key={`h${i}`}
          x1="0%"
          y1={`${y}%`}
          x2="100%"
          y2={`${y}%`}
          stroke="#8B4513"
          strokeWidth="0.7"
        />
      );
    }
  }

  // 竖向线条 (9条)
  for (let i = 0; i < COLS; i++) {
    const x = i * CELL_WIDTH;
    if (i === 0 || i === COLS - 1) {
      // 边线到头（中间楚河汉界区域断开）
      lines.push(
        <line
          key={`v${i}`}
          x1={`${x}%`}
          y1="0%"
          x2={`${x}%`}
          y2={`${riverTop}%`}
          stroke="#8B4513"
          strokeWidth="0.7"
        />
      );
      lines.push(
        <line
          key={`v${i}_bottom`}
          x1={`${x}%`}
          y1={`${riverBottom}%`}
          x2={`${x}%`}
          y2="100%"
          stroke="#8B4513"
          strokeWidth="0.7"
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
          y2={`${riverTop}%`}
          stroke="#8B4513"
          strokeWidth="0.7"
        />
      );
      // 下半部分（汉界以下）
      lines.push(
        <line
          key={`v${i}b`}
          x1={`${x}%`}
          y1={`${riverBottom}%`}
          x2={`${x}%`}
          y2="100%"
          stroke="#8B4513"
          strokeWidth="0.7"
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
    <line key="palace-red-1" x1={`${redPalaceX1}%`} y1={`${redPalaceTop}%`} x2={`${redPalaceX2}%`} y2={`${redPalaceBottom}%`} stroke="#8B4513" strokeWidth="0.7" />,
    <line key="palace-red-2" x1={`${redPalaceX2}%`} y1={`${redPalaceTop}%`} x2={`${redPalaceX1}%`} y2={`${redPalaceBottom}%`} stroke="#8B4513" strokeWidth="0.7" />
  );

  // 黑方九宫（上方，row 0-2，即视觉上的上方）
  const blackPalaceX1 = 3 * CELL_WIDTH;
  const blackPalaceX2 = 5 * CELL_WIDTH;
  const blackPalaceTop = 0 * CELL_HEIGHT;
  const blackPalaceBottom = 2 * CELL_HEIGHT;

  // 黑方九宫 X 形
  lines.push(
    <line key="palace-black-1" x1={`${blackPalaceX1}%`} y1={`${blackPalaceTop}%`} x2={`${blackPalaceX2}%`} y2={`${blackPalaceBottom}%`} stroke="#8B4513" strokeWidth="0.7" />,
    <line key="palace-black-2" x1={`${blackPalaceX2}%`} y1={`${blackPalaceTop}%`} x2={`${blackPalaceX1}%`} y2={`${blackPalaceBottom}%`} stroke="#8B4513" strokeWidth="0.7" />
  );

  // 绘制位置标记的辅助函数（L形直角拐角）
  const drawCornerMarks = (
    centerX: number,
    centerY: number,
    prefix: string,
    quadrants: ('tl' | 'tr' | 'bl' | 'br')[]
  ) => {
    const size = CELL_WIDTH * 0.2; // 直角边长度
    const thickness = CELL_WIDTH * 0.08; // 直角边宽度

    const quadrantDrawers: Record<string, JSX.Element[]> = {
      tl: [
        <line key={`${prefix}-tl-h`} x1={`${centerX - thickness}%`} y1={`${centerY - size}%`} x2={`${centerX - thickness}%`} y2={`${centerY - thickness}%`} stroke="#8B4513" strokeWidth="0.7" />,
        <line key={`${prefix}-tl-v`} x1={`${centerX - size}%`} y1={`${centerY - thickness}%`} x2={`${centerX - thickness}%`} y2={`${centerY - thickness}%`} stroke="#8B4513" strokeWidth="0.7" />
      ],
      tr: [
        <line key={`${prefix}-tr-h`} x1={`${centerX + thickness}%`} y1={`${centerY - size}%`} x2={`${centerX + thickness}%`} y2={`${centerY - thickness}%`} stroke="#8B4513" strokeWidth="0.7" />,
        <line key={`${prefix}-tr-v`} x1={`${centerX + size}%`} y1={`${centerY - thickness}%`} x2={`${centerX + thickness}%`} y2={`${centerY - thickness}%`} stroke="#8B4513" strokeWidth="0.7" />
      ],
      bl: [
        <line key={`${prefix}-bl-h`} x1={`${centerX - thickness}%`} y1={`${centerY + size}%`} x2={`${centerX - thickness}%`} y2={`${centerY + thickness}%`} stroke="#8B4513" strokeWidth="0.7" />,
        <line key={`${prefix}-bl-v`} x1={`${centerX - size}%`} y1={`${centerY + thickness}%`} x2={`${centerX - thickness}%`} y2={`${centerY + thickness}%`} stroke="#8B4513" strokeWidth="0.7" />
      ],
      br: [
        <line key={`${prefix}-br-h`} x1={`${centerX + thickness}%`} y1={`${centerY + size}%`} x2={`${centerX + thickness}%`} y2={`${centerY + thickness}%`} stroke="#8B4513" strokeWidth="0.7" />,
        <line key={`${prefix}-br-v`} x1={`${centerX + size}%`} y1={`${centerY + thickness}%`} x2={`${centerX + thickness}%`} y2={`${centerY + thickness}%`} stroke="#8B4513" strokeWidth="0.7" />
      ]
    };

    quadrants.forEach(q => lines.push(...quadrantDrawers[q]));
  };

  // 炮的位置标记（四个象限各画一个L形直角拐角）
  // 红炮：col 1, row 7 和 col 7, row 7
  // 黑炮：col 1, row 2 和 col 7, row 2
  const cannonPositions = [
    { col: 1, row: 2 },  // 黑炮1
    { col: 7, row: 2 },  // 黑炮2
    { col: 1, row: 7 },  // 红炮1
    { col: 7, row: 7 },  // 红炮2
  ];

  cannonPositions.forEach(({ col, row }, idx) => {
    const centerX = col * CELL_WIDTH;
    const centerY = row * CELL_HEIGHT;
    drawCornerMarks(centerX, centerY, `cannon-${idx}`, ['tl', 'tr', 'bl', 'br']);
  });

  // 兵/卒的位置标记
  // 红方兵：col 0, 2, 4, 6, 8，row 3
  // 黑方卒：col 0, 2, 4, 6, 8，row 6
  const pawnPositions = [
    { col: 0, row: 3 },  // 红边兵
    { col: 2, row: 3 },  // 红兵
    { col: 4, row: 3 },  // 红兵
    { col: 6, row: 3 },  // 红兵
    { col: 8, row: 3 },  // 红边兵
    { col: 0, row: 6 },  // 黑边卒
    { col: 2, row: 6 },  // 黑卒
    { col: 4, row: 6 },  // 黑卒
    { col: 6, row: 6 },  // 黑卒
    { col: 8, row: 6 },  // 黑边卒
  ];

  pawnPositions.forEach(({ col, row }, idx) => {
    const centerX = col * CELL_WIDTH;
    const centerY = row * CELL_HEIGHT;
    // 边卒/兵（col 0 或 col 8）只有两个象限（右侧/左侧超出棋盘，不用画）
    const quadrants: ('tl' | 'tr' | 'bl' | 'br')[] = col === 0
      ? ['tr', 'br'] // 边兵只有右上和右下
      : col === 8
        ? ['tl', 'bl'] // 边兵只有左上和解下
        : ['tl', 'tr', 'bl', 'br']; // 中间兵有四个象限
    drawCornerMarks(centerX, centerY, `pawn-${idx}`, quadrants);
  });

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
      
      {/* 楚河文字 - 居中在左侧格子中心 (col 2, x=22.22%) */}
      <text
        x="22.22%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#8B4513"
        fontSize="5"
        fontFamily="'SimSun', 'STSong', serif"
        fontWeight="bold"
      >
        楚 河
      </text>
      {/* 汉界文字 - 居中在右侧格子中心 (col 7, x=77.78%) */}
      <text
        x="77.78%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#8B4513"
        fontSize="5"
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

// 结算后显示的行动目标框
const TargetBox = ({
  position,
  side,
  flipped,
}: {
  position: Position;
  side: 'red' | 'black';
  flipped: boolean;
}) => {
  const { left, top } = getPosition(position[0], position[1], flipped);
  
  // 将百分比字符串转换为数值
  const leftVal = parseFloat(left);
  const topVal = parseFloat(top);
  
  // 棋子的尺寸（与 piece 组件保持一致）
  // piece 宽度是 11.11%，高度是 10%
  const boxWidth = 12;
  const boxHeight = 11;
  
  // 框的位置（居中于格子中心，偏移半个格子）
  const boxLeft = leftVal - boxWidth / 2;
  const boxTop = topVal - boxHeight / 2;
  
  // 阵营颜色（半透明边框）
  const borderColor = side === 'red' ? 'rgba(196, 30, 58, 0.6)' : 'rgba(26, 26, 26, 0.6)';
  
  return (
    <div
      style={{
        position: 'absolute',
        left: `${boxLeft}%`,
        top: `${boxTop}%`,
        width: `${boxWidth}%`,
        height: `${boxHeight}%`,
        border: `3px solid ${borderColor}`,
        borderRadius: '8px',
        backgroundColor: 'transparent',
        pointerEvents: 'none',
        zIndex: 15,
        boxSizing: 'border-box',
      }}
    />
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
  lastMoveTargets,
  onSelectPiece,
  onMovePiece,
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

        {/* 结算后显示的行动目标框 */}
        {lastMoveTargets.red && (
          <TargetBox position={lastMoveTargets.red} side="red" flipped={flipped} />
        )}
        {lastMoveTargets.black && (
          <TargetBox position={lastMoveTargets.black} side="black" flipped={flipped} />
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
          return (
            <ChessPiece
              key={piece.id}
              piece={piece}
              isSelected={selectedPiece?.id === piece.id}
              isSelectable={phase === 'strategy' && piece.side === currentOperatedSide}
              flipped={flipped}
              isInValidMoves={!!selectedPiece && isInValidMoves && piece.side !== currentOperatedSide}
              onClick={() => {
                if (isInValidMoves && selectedPiece) {
                  onMovePiece(piece.position);
                } else {
                  onSelectPiece(piece);
                }
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default ChessBoard;
