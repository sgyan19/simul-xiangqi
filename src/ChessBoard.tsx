import { Piece, Position, Side, GamePhase, PIECE_NAMES } from './types';

interface ChessBoardProps {
  pieces: Piece[];
  selectedPiece: Piece | null;
  validMoves: Position[];
  currentOperatedSide: Side;
  phase: GamePhase;
  flipped: boolean;
  onSelectPiece: (piece: Piece) => void;
  onMovePiece: (to: Position) => void;
}

// 绘制棋盘背景和线条
const BoardBackground = ({ flipped }: { flipped: boolean }) => {
  const lines = [];
  
  // 横向线条 (10条)
  for (let i = 0; i < 10; i++) {
    lines.push(
      <line
        key={`h${i}`}
        x1="5%"
        y1={`${5 + i * 9}%`}
        x2="95%"
        y2={`${5 + i * 9}%`}
        stroke="#8B4513"
        strokeWidth="0.8"
      />
    );
  }

  // 竖向线条 (9条)
  for (let i = 0; i < 9; i++) {
    const x = 5 + i * 11.25;
    // 楚河汉界区域跳过
    if (i === 0 || i === 8) {
      // 边线到头
      lines.push(
        <line
          key={`v${i}`}
          x1={`${x}%`}
          y1="5%"
          x2={`${x}%`}
          y2="95%"
          stroke="#8B4513"
          strokeWidth="0.8"
        />
      );
    } else {
      // 上半部分
      lines.push(
        <line
          key={`v${i}t`}
          x1={`${x}%`}
          y1="5%"
          x2={`${x}%`}
          y2="45%"
          stroke="#8B4513"
          strokeWidth="0.8"
        />
      );
      // 下半部分
      lines.push(
        <line
          key={`v${i}b`}
          x1={`${x}%`}
          y1="55%"
          x2={`${x}%`}
          y2="95%"
          stroke="#8B4513"
          strokeWidth="0.8"
        />
      );
    }
  }

  // 九宫格斜线 - 红方（左上角）
  lines.push(
    <line key="palace1" x1="38.25%" y1="5%" x2="50%" y2="22%" stroke="#8B4513" strokeWidth="0.8" />,
    <line key="palace2" x1="50%" y1="5%" x2="38.25%" y2="22%" stroke="#8B4513" strokeWidth="0.8" />
  );

  // 九宫格斜线 - 红方（右上角）
  lines.push(
    <line key="palace3" x1="61.75%" y1="5%" x2="50%" y2="22%" stroke="#8B4513" strokeWidth="0.8" />,
    <line key="palace4" x1="50%" y1="5%" x2="61.75%" y2="22%" stroke="#8B4513" strokeWidth="0.8" />
  );

  // 九宫格斜线 - 黑方（左下角）
  lines.push(
    <line key="palace5" x1="38.25%" y1="95%" x2="50%" y2="78%" stroke="#8B4513" strokeWidth="0.8" />,
    <line key="palace6" x1="50%" y1="95%" x2="38.25%" y2="78%" stroke="#8B4513" strokeWidth="0.8" />
  );

  // 九宫格斜线 - 黑方（右下角）
  lines.push(
    <line key="palace7" x1="61.75%" y1="95%" x2="50%" y2="78%" stroke="#8B4513" strokeWidth="0.8" />,
    <line key="palace8" x1="50%" y1="95%" x2="61.75%" y2="78%" stroke="#8B4513" strokeWidth="0.8" />
  );

  // 炮位置标记 - 红方
  lines.push(
    <g key="cannon-markers-red">
      <rect x="14.5%" y="23.5%" width="2%" height="2%" fill="#8B4513" transform="rotate(45 15.5% 24.5%)" />,
      <rect x="80.5%" y="23.5%" width="2%" height="2%" fill="#8B4513" transform="rotate(45 81.5% 24.5%)" />,
    </g>
  );

  // 炮位置标记 - 黑方
  lines.push(
    <g key="cannon-markers-black">
      <rect x="14.5%" y="74.5%" width="2%" height="2%" fill="#8B4513" transform="rotate(45 15.5% 75.5%)" />,
      <rect x="80.5%" y="74.5%" width="2%" height="2%" fill="#8B4513" transform="rotate(45 81.5% 75.5%)" />,
    </g>
  );

  // 兵位置标记 - 红方
  for (let i = 0; i < 5; i++) {
    const x = 5 + i * 22.5;
    lines.push(
      <g key={`pawn-marker-red-${i}`}>
        <line x1={`${x - 1}%`} y1="32%" x2={`${x - 1.5}%`} y2="32.5%" stroke="#8B4513" strokeWidth="0.5" />,
        <line x1={`${x + 1}%`} y1="32%" x2={`${x + 1.5}%`} y2="32.5%" stroke="#8B4513" strokeWidth="0.5" />,
        <line x1={`${x - 1}%`} y1="35%" x2={`${x - 1.5}%`} y2="34.5%" stroke="#8B4513" strokeWidth="0.5" />,
        <line x1={`${x + 1}%`} y1="35%" x2={`${x + 1.5}%`} y2="34.5%" stroke="#8B4513" strokeWidth="0.5" />,
      </g>
    );
  }

  // 兵位置标记 - 黑方
  for (let i = 0; i < 5; i++) {
    const x = 5 + i * 22.5;
    lines.push(
      <g key={`pawn-marker-black-${i}`}>
        <line x1={`${x - 1}%`} y1="65%" x2={`${x - 1.5}%`} y2="65.5%" stroke="#8B4513" strokeWidth="0.5" />,
        <line x1={`${x + 1}%`} y1="65%" x2={`${x + 1.5}%`} y2="65.5%" stroke="#8B4513" strokeWidth="0.5" />,
        <line x1={`${x - 1}%`} y1="68%" x2={`${x - 1.5}%`} y2="67.5%" stroke="#8B4513" strokeWidth="0.5" />,
        <line x1={`${x + 1}%`} y1="68%" x2={`${x + 1.5}%`} y2="67.5%" stroke="#8B4513" strokeWidth="0.5" />,
      </g>
    );
  }

  return (
    <svg
      width="100%"
      height="100%"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: flipped ? 'rotate(180deg)' : 'none',
      }}
    >
      {lines}
      
      {/* 楚河汉界文字 */}
      <text
        x="30%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#8B4513"
        fontSize="14"
        fontFamily="'SimSun', 'STSong', serif"
        fontWeight="bold"
      >
        楚 河
      </text>
      <text
        x="70%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#8B4513"
        fontSize="14"
        fontFamily="'SimSun', 'STSong', serif"
        fontWeight="bold"
      >
        汉 界
      </text>
    </svg>
  );
};

// 棋子组件
const ChessPieceComponent = ({
  piece,
  isSelected,
  isSelectable,
  onClick,
}: {
  piece: Piece;
  isSelected: boolean;
  isSelectable: boolean;
  onClick: () => void;
}) => {
  const [col, row] = piece.position;
  // 计算位置百分比
  const left = `${5 + col * 11.25 - 5.625}%`;
  const top = `${5 + row * 9 - 4.5}%`;

  const pieceName = PIECE_NAMES[piece.type][piece.side];

  return (
    <div
      className={`piece ${piece.side} ${isSelected ? 'selected' : ''} ${isSelectable ? 'selectable' : 'hidden'}`}
      style={{ left, top }}
      onClick={isSelectable ? onClick : undefined}
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
  onClick,
}: {
  position: Position;
  isCapture: boolean;
  onClick: () => void;
}) => {
  const [col, row] = position;
  const left = `${5 + col * 11.25 - 5.625}%`;
  const top = `${5 + row * 9 - 4.5}%`;

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

function ChessBoard({
  pieces,
  selectedPiece,
  validMoves,
  currentOperatedSide,
  phase,
  flipped,
  onSelectPiece,
  onMovePiece,
}: ChessBoardProps) {
  // 检查某个位置是否有可吃的棋子
  const getPieceAtPosition = (pos: Position): Piece | undefined => {
    return pieces.find(p => p.position[0] === pos[0] && p.position[1] === pos[1]);
  };

  const handleCellClick = (col: number, row: number) => {
    // 检查是否点击了己方棋子
    const clickedPiece = getPieceAtPosition([col, row]);
    
    if (clickedPiece && clickedPiece.side === currentOperatedSide) {
      onSelectPiece(clickedPiece);
    } else if (selectedPiece) {
      // 检查是否是可移动位置
      const isValid = validMoves.some(m => m[0] === col && m[1] === row);
      if (isValid) {
        onMovePiece([col, row]);
      }
    }
  };

  return (
    <div className={`board-container ${flipped ? 'flipped' : ''}`}>
      <div className="chess-board">
        {/* 棋盘背景 */}
        <BoardBackground flipped={flipped} />

        {/* 可移动位置指示 */}
        {selectedPiece && validMoves.map((move, idx) => {
          const targetPiece = getPieceAtPosition(move);
          return (
            <MoveIndicator
              key={`move-${idx}`}
              position={move}
              isCapture={!!targetPiece}
              onClick={() => onMovePiece(move)}
            />
          );
        })}

        {/* 棋子 */}
        {pieces.map(piece => (
          <ChessPieceComponent
            key={piece.id}
            piece={piece}
            isSelected={selectedPiece?.id === piece.id}
            isSelectable={phase === 'strategy' && piece.side === currentOperatedSide}
            onClick={() => onSelectPiece(piece)}
          />
        ))}
      </div>
    </div>
  );
}

export default ChessBoard;
