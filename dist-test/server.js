"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/server.ts
var import_http = require("http");
var import_express3 = __toESM(require("express"));

// server/routes/index.ts
var import_express = require("express");
var router = (0, import_express.Router)();
router.get("/api/hello", (req, res) => {
  res.json({
    message: "Hello from Express + Vite!",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
router.post("/api/data", (req, res) => {
  const requestData = req.body;
  res.json({
    success: true,
    data: requestData,
    receivedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
});
router.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    env: process.env.COZE_PROJECT_ENV,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var routes_default = router;

// server/vite.ts
var import_express2 = __toESM(require("express"));
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var import_vite2 = require("vite");

// vite.config.ts
var import_vite = require("vite");
var vite_config_default = (0, import_vite.defineConfig)({
  esbuild: {
    jsx: "automatic",
    jsxDev: false
  },
  server: {
    port: 5e3,
    host: "0.0.0.0",
    allowedHosts: true,
    watch: {
      usePolling: true,
      interval: 100
    }
  },
  build: {
    target: "esnext"
  },
  optimizeDeps: {
    include: ["react", "react-dom"]
  }
});

// server/vite.ts
var isDev = process.env.COZE_PROJECT_ENV !== "PROD";
async function setupViteMiddleware(app2) {
  const vite = await (0, import_vite2.createServer)({
    ...vite_config_default,
    server: {
      ...vite_config_default.server,
      middlewareMode: true
    },
    appType: "spa"
  });
  app2.use(vite.middlewares);
  console.log("\u{1F680} Vite dev server initialized");
}
function setupStaticServer(app2) {
  const distPath = import_path.default.resolve(process.cwd(), "dist");
  if (!import_fs.default.existsSync(distPath)) {
    console.error('\u274C dist folder not found. Please run "pnpm build" first.');
    process.exit(1);
  }
  app2.use(import_express2.default.static(distPath));
  app2.use((_req, res) => {
    res.sendFile(import_path.default.join(distPath, "index.html"));
  });
  console.log("\u{1F4E6} Serving static files from dist/");
}
async function setupVite(app2) {
  if (isDev) {
    await setupViteMiddleware(app2);
  } else {
    setupStaticServer(app2);
  }
}

// server/websocket.ts
var import_ws = require("ws");

// src/types.ts
var INITIAL_PIECES = [
  // 红方（下方，row 6-9）
  // 底线 row 9：车马象士将士象马车
  { type: "chariot", side: "red", position: [0, 9], id: "red-chariot-0" },
  { type: "horse", side: "red", position: [1, 9], id: "red-horse-0" },
  { type: "elephant", side: "red", position: [2, 9], id: "red-elephant-0" },
  { type: "advisor", side: "red", position: [3, 9], id: "red-advisor-0" },
  { type: "king", side: "red", position: [4, 9], id: "red-king" },
  { type: "advisor", side: "red", position: [5, 9], id: "red-advisor-1" },
  { type: "elephant", side: "red", position: [6, 9], id: "red-elephant-1" },
  { type: "horse", side: "red", position: [7, 9], id: "red-horse-1" },
  { type: "chariot", side: "red", position: [8, 9], id: "red-chariot-1" },
  // 炮 row 7
  { type: "cannon", side: "red", position: [1, 7], id: "red-cannon-0" },
  { type: "cannon", side: "red", position: [7, 7], id: "red-cannon-1" },
  // 兵 row 6
  { type: "pawn", side: "red", position: [0, 6], id: "red-pawn-0" },
  { type: "pawn", side: "red", position: [2, 6], id: "red-pawn-1" },
  { type: "pawn", side: "red", position: [4, 6], id: "red-pawn-2" },
  { type: "pawn", side: "red", position: [6, 6], id: "red-pawn-3" },
  { type: "pawn", side: "red", position: [8, 6], id: "red-pawn-4" },
  // 黑方（上方，row 0-3）
  // 底线 row 0：车马象士将士象马车
  { type: "chariot", side: "black", position: [0, 0], id: "black-chariot-0" },
  { type: "horse", side: "black", position: [1, 0], id: "black-horse-0" },
  { type: "elephant", side: "black", position: [2, 0], id: "black-elephant-0" },
  { type: "advisor", side: "black", position: [3, 0], id: "black-advisor-0" },
  { type: "king", side: "black", position: [4, 0], id: "black-king" },
  { type: "advisor", side: "black", position: [5, 0], id: "black-advisor-1" },
  { type: "elephant", side: "black", position: [6, 0], id: "black-elephant-1" },
  { type: "horse", side: "black", position: [7, 0], id: "black-horse-1" },
  { type: "chariot", side: "black", position: [8, 0], id: "black-chariot-1" },
  // 炮 row 2
  { type: "cannon", side: "black", position: [1, 2], id: "black-cannon-0" },
  { type: "cannon", side: "black", position: [7, 2], id: "black-cannon-1" },
  // 卒 row 3
  { type: "pawn", side: "black", position: [0, 3], id: "black-pawn-0" },
  { type: "pawn", side: "black", position: [2, 3], id: "black-pawn-1" },
  { type: "pawn", side: "black", position: [4, 3], id: "black-pawn-2" },
  { type: "pawn", side: "black", position: [6, 3], id: "black-pawn-3" },
  { type: "pawn", side: "black", position: [8, 3], id: "black-pawn-4" }
];

// src/shared/history.ts
var colToChinese = (col) => {
  const chinese = ["\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D", "\u4E03", "\u516B", "\u4E5D"];
  return chinese[col] || String(col);
};
var getPieceName = (pieceType, side) => {
  const names = {
    king: { red: "\u5E05", black: "\u5C06" },
    advisor: { red: "\u4ED5", black: "\u58EB" },
    elephant: { red: "\u76F8", black: "\u8C61" },
    horse: { red: "\u9A6C", black: "\u9A6C" },
    chariot: { red: "\u8F66", black: "\u8F66" },
    cannon: { red: "\u70AE", black: "\u70AE" },
    pawn: { red: "\u5175", black: "\u5352" }
  };
  if (side) {
    return names[pieceType]?.[side] || pieceType;
  }
  return names[pieceType]?.red || pieceType;
};
var getPieceNameWithId = (piece, side) => {
  const baseName = getPieceName(piece.type, side);
  const num = piece.id.split("-").pop() || "0";
  return `${baseName}${num}`;
};
var formatChessNotation = (from, to, pieceType, side) => {
  const pieceName = getPieceName(pieceType, side);
  const isRed = side === "red";
  const fromCol = isRed ? 9 - from[0] : from[0] + 1;
  const toCol = isRed ? 9 - to[0] : to[0] + 1;
  const isForward = isRed ? to[1] - from[1] < 0 : to[1] - from[1] > 0;
  const isHorizontal = from[1] === to[1];
  let result;
  if (isHorizontal) {
    result = pieceName + colToChinese(fromCol - 1) + "\u5E73" + colToChinese(toCol - 1);
  } else if (isForward) {
    const steps = Math.abs(to[1] - from[1]);
    result = pieceName + colToChinese(fromCol - 1) + "\u8FDB" + colToChinese(steps - 1);
  } else {
    const steps = Math.abs(to[1] - from[1]);
    result = pieceName + colToChinese(fromCol - 1) + "\u9000" + colToChinese(steps - 1);
  }
  return result;
};

// src/shared/settlement.ts
var canCapturePosition = (piece, targetPos, pieces) => {
  return canPieceCaptureAt(piece, targetPos, pieces);
};
var isInPalace = (col, row, side) => {
  if (side === "red") {
    return col >= 3 && col <= 5 && row >= 7 && row <= 9;
  }
  return col >= 3 && col <= 5 && row >= 0 && row <= 2;
};
var getPieceAt = (col, row, pieces) => {
  return pieces.find((p) => p.position[0] === col && p.position[1] === row);
};
var isElephantCrossed = (row, side) => {
  if (side === "red") return row < 5;
  return row > 4;
};
var isPathClearBetween = (fromCol, fromRow, toCol, toRow, pieces) => {
  if (fromCol !== toCol && fromRow !== toRow) {
    return false;
  }
  const dc = fromCol === toCol ? 0 : (toCol - fromCol) / Math.abs(toCol - fromCol);
  const dr = fromRow === toRow ? 0 : (toRow - fromRow) / Math.abs(toRow - fromRow);
  let col = fromCol + dc;
  let row = fromRow + dr;
  while (col !== toCol || row !== toRow) {
    const pieceAtPos = getPieceAt(col, row, pieces);
    if (pieceAtPos) {
      return false;
    }
    col += dc;
    row += dr;
  }
  return true;
};
var canPieceCaptureAt = (piece, targetPos, pieces) => {
  const [pCol, pRow] = piece.position;
  const [tCol, tRow] = targetPos;
  switch (piece.type) {
    case "king":
      if (Math.abs(tCol - pCol) + Math.abs(tRow - pRow) !== 1) return false;
      return isInPalace(tCol, tRow, piece.side);
    case "advisor":
      if (Math.abs(tCol - pCol) === 1 && Math.abs(tRow - pRow) === 1) {
        return isInPalace(tCol, tRow, piece.side);
      }
      return false;
    case "elephant":
      if (Math.abs(tCol - pCol) === 2 && Math.abs(tRow - pRow) === 2) {
        const midCol2 = (pCol + tCol) / 2;
        const midRow2 = (pRow + tRow) / 2;
        const midPiece = getPieceAt(midCol2, midRow2, pieces);
        if (!midPiece && !isElephantCrossed(tRow, piece.side)) {
          return true;
        }
      }
      return false;
    case "horse":
      const horseMoves = [
        { leg: [0, 1], target: [1, 2] },
        { leg: [0, 1], target: [-1, 2] },
        { leg: [0, -1], target: [1, -2] },
        { leg: [0, -1], target: [-1, -2] },
        { leg: [1, 0], target: [2, 1] },
        { leg: [1, 0], target: [2, -1] },
        { leg: [-1, 0], target: [-2, 1] },
        { leg: [-1, 0], target: [-2, -1] }
      ];
      for (const move of horseMoves) {
        const legCol = pCol + move.leg[0];
        const legRow = pRow + move.leg[1];
        const targetCol = pCol + move.target[0];
        const targetRow = pRow + move.target[1];
        if (targetCol === tCol && targetRow === tRow) {
          if (!getPieceAt(legCol, legRow, pieces)) {
            return true;
          }
        }
      }
      return false;
    case "chariot":
      if (isPathClearBetween(pCol, pRow, tCol, tRow, pieces)) {
        return true;
      }
      return false;
    case "cannon":
      if (pCol !== tCol && pRow !== tRow) return false;
      const dc = pCol === tCol ? 0 : (tCol - pCol) / Math.abs(tCol - pCol);
      const dr = pRow === tRow ? 0 : (tRow - pRow) / Math.abs(tRow - pRow);
      let midCol = pCol + dc;
      let midRow = pRow + dr;
      let foundPlatform = false;
      while (midCol !== tCol || midRow !== tRow) {
        const midPiece = getPieceAt(midCol, midRow, pieces);
        if (midPiece) {
          if (foundPlatform) {
            return false;
          }
          foundPlatform = true;
        }
        midCol += dc;
        midRow += dr;
      }
      return foundPlatform;
    case "pawn":
      const forward = piece.side === "red" ? -1 : 1;
      const crossedRow = piece.side === "red" ? 4 : 5;
      if (tCol === pCol && tRow === pRow + forward) {
        return true;
      }
      if (piece.side === "red" && pRow <= crossedRow || piece.side === "black" && pRow >= crossedRow) {
        if (tRow === pRow && (tCol === pCol - 1 || tCol === pCol + 1)) {
          return true;
        }
      }
      return false;
    default:
      return false;
  }
};
var executeSettlement = (pieces, redAction, blackAction, chaseState, redMovedPieceId = null, blackMovedPieceId = null) => {
  let finalPieces = pieces.map((p) => ({ ...p }));
  const redPieceRemoved = [];
  const blackPieceRemoved = [];
  const events = [];
  const redCaptureTargetPos = redAction?.actionType === "capture" ? [...redAction.to] : null;
  const blackCaptureTargetPos = blackAction?.actionType === "capture" ? [...blackAction.to] : null;
  const redTargetPieceId = redCaptureTargetPos ? pieces.find((p) => p.side === "black" && p.position[0] === redCaptureTargetPos[0] && p.position[1] === redCaptureTargetPos[1])?.id : null;
  const blackTargetPieceId = blackCaptureTargetPos ? pieces.find((p) => p.side === "red" && p.position[0] === blackCaptureTargetPos[0] && p.position[1] === blackCaptureTargetPos[1])?.id : null;
  const redMovedPieceIds = /* @__PURE__ */ new Set();
  const blackMovedPieceIds = /* @__PURE__ */ new Set();
  if (redMovedPieceId) redMovedPieceIds.add(redMovedPieceId);
  if (blackMovedPieceId) blackMovedPieceIds.add(blackMovedPieceId);
  if (redAction) {
    const redPiece = finalPieces.find(
      (p) => p.side === "red" && p.position[0] === redAction.from[0] && p.position[1] === redAction.from[1]
    );
    if (redPiece) {
      redPiece.position = [...redAction.to];
      const actionLabel = redAction.actionType === "capture" ? "\u6349" : "\u79FB\u52A8";
      events.push({
        type: "move",
        description: `[\u7EA2-${actionLabel}]${formatChessNotation(redAction.from, redAction.to, redPiece.type, "red")}`
      });
    }
  }
  if (blackAction) {
    const blackPiece = finalPieces.find(
      (p) => p.side === "black" && p.position[0] === blackAction.from[0] && p.position[1] === blackAction.from[1]
    );
    if (blackPiece) {
      blackPiece.position = [...blackAction.to];
      const actionLabel = blackAction.actionType === "capture" ? "\u6349" : "\u79FB\u52A8";
      events.push({
        type: "move",
        description: `[\u9ED1-${actionLabel}]${formatChessNotation(blackAction.from, blackAction.to, blackPiece.type, "black")}`
      });
    }
  }
  const toRemoveByMove = [];
  if (redAction?.actionType === "move" && blackAction?.actionType === "move") {
    if (redAction.to[0] === blackAction.to[0] && redAction.to[1] === blackAction.to[1]) {
      const movedRedPiece = finalPieces.find(
        (p) => p.side === "red" && p.position[0] === redAction.to[0] && p.position[1] === redAction.to[1]
      );
      const movedBlackPiece = finalPieces.find(
        (p) => p.side === "black" && p.position[0] === blackAction.to[0] && p.position[1] === blackAction.to[1]
      );
      if (movedRedPiece && movedBlackPiece) {
        if (movedRedPiece.type === "cannon" && movedBlackPiece.type === "cannon") {
          toRemoveByMove.push(movedRedPiece.id, movedBlackPiece.id);
          redPieceRemoved.push({ piece: { ...movedRedPiece }, reason: "exchange" });
          blackPieceRemoved.push({ piece: { ...movedBlackPiece }, reason: "exchange" });
          events.push({
            type: "collision",
            description: `[\u649E\u5151]\u7EA2\u70AE\u4E0E\u9ED1\u70AE\u649E\u5151`
          });
        } else if (movedRedPiece.type === "cannon") {
          toRemoveByMove.push(movedRedPiece.id);
          redPieceRemoved.push({ piece: { ...movedRedPiece }, reason: "exchange" });
          events.push({
            type: "collision",
            description: `[\u649E\u5151]\u7EA2${getPieceNameWithId(movedRedPiece, "red")}\u649E\u9ED1${getPieceNameWithId(movedBlackPiece, "black")}\uFF0C\u7EA2\u70AE\u6B7B`
          });
        } else if (movedBlackPiece.type === "cannon") {
          toRemoveByMove.push(movedBlackPiece.id);
          blackPieceRemoved.push({ piece: { ...movedBlackPiece }, reason: "exchange" });
          events.push({
            type: "collision",
            description: `[\u649E\u5151]\u9ED1${getPieceNameWithId(movedBlackPiece, "black")}\u649E\u7EA2${getPieceNameWithId(movedRedPiece, "red")}\uFF0C\u9ED1\u70AE\u6B7B`
          });
        } else {
          toRemoveByMove.push(movedRedPiece.id, movedBlackPiece.id);
          redPieceRemoved.push({ piece: { ...movedRedPiece }, reason: "exchange" });
          blackPieceRemoved.push({ piece: { ...movedBlackPiece }, reason: "exchange" });
          events.push({
            type: "collision",
            description: `[\u649E\u5151]\u7EA2${getPieceNameWithId(movedRedPiece, "red")}\u4E0E\u9ED1${getPieceNameWithId(movedBlackPiece, "black")}\u649E\u5151`
          });
        }
      }
    }
  }
  finalPieces = finalPieces.filter((p) => !toRemoveByMove.includes(p.id));
  const toRemoveByCapture = [];
  if (redAction?.actionType === "capture") {
    const enemyAtTarget = finalPieces.find(
      (p) => p.side === "black" && p.position[0] === redAction.to[0] && p.position[1] === redAction.to[1]
    );
    if (enemyAtTarget) {
      const redCapturer = pieces.find(
        (p) => p.side === "red" && p.position[0] === redAction.from[0] && p.position[1] === redAction.from[1]
      );
      blackPieceRemoved.push({
        piece: { ...enemyAtTarget },
        reason: "captured",
        removedBy: redCapturer ? { side: "red", pieceType: redCapturer.type, pieceId: redCapturer.id } : void 0
      });
      events.push({
        type: "capture",
        description: `[\u5403\u5B50]${formatChessNotation(redAction.from, redAction.to, redCapturer?.type || "unknown", "red")}\uFF0C\u76EE\u6807\uFF1A\u9ED1${getPieceNameWithId(enemyAtTarget, "black")}(${enemyAtTarget.id})`
      });
      toRemoveByCapture.push(enemyAtTarget.id);
    }
  }
  if (blackAction?.actionType === "capture") {
    const enemyAtTarget = finalPieces.find(
      (p) => p.side === "red" && p.position[0] === blackAction.to[0] && p.position[1] === blackAction.to[1]
    );
    if (enemyAtTarget) {
      const blackCapturer = pieces.find(
        (p) => p.side === "black" && p.position[0] === blackAction.from[0] && p.position[1] === blackAction.from[1]
      );
      redPieceRemoved.push({
        piece: { ...enemyAtTarget },
        reason: "captured",
        removedBy: blackCapturer ? { side: "black", pieceType: blackCapturer.type, pieceId: blackCapturer.id } : void 0
      });
      events.push({
        type: "capture",
        description: `[\u5403\u5B50]${formatChessNotation(blackAction.from, blackAction.to, blackCapturer?.type || "unknown", "black")}\uFF0C\u76EE\u6807\uFF1A\u7EA2${getPieceNameWithId(enemyAtTarget, "red")}(${enemyAtTarget.id})`
      });
      toRemoveByCapture.push(enemyAtTarget.id);
    }
  }
  finalPieces = finalPieces.filter((p) => !toRemoveByCapture.includes(p.id));
  const toRemoveByCounterAttack = [];
  const redCaptureSuccess = redAction?.actionType === "capture" && toRemoveByCapture.some((id) => {
    const piece = pieces.find((p) => p.id === id);
    return piece && piece.side === "black" && piece.position[0] === redAction.to[0] && piece.position[1] === redAction.to[1];
  });
  console.log("[\u9632\u53CD\u68C0\u67E5] \u7EA2\u65B9 capture:", {
    redAction,
    redCaptureSuccess,
    redActionTo: redAction?.to,
    toRemoveByCapture
  });
  if (redCaptureSuccess) {
    const redCapturerNewPos = [redAction.to[0], redAction.to[1]];
    const redCapturerInFinal = finalPieces.find(
      (p) => p.side === "red" && p.position[0] === redAction.to[0] && p.position[1] === redAction.to[1]
    );
    if (redCapturerInFinal) {
      console.log("[\u9632\u53CD\u68C0\u67E5] \u7EA2\u65B9\u5403\u5B50\u540E\u68C0\u67E5\u9ED1\u65B9\u53CD\u51FB:", {
        redCapturerNewPos,
        redCapturerInFinal: { id: redCapturerInFinal.id, type: redCapturerInFinal.type, pos: redCapturerInFinal.position },
        blackPieces: finalPieces.filter((p) => p.side === "black").map((p) => ({ id: p.id, type: p.type, pos: p.position }))
      });
      for (const blackPiece of finalPieces.filter((p) => p.side === "black")) {
        const movedThisTurn = blackMovedPieceIds.has(blackPiece.id);
        const canCapture2 = canCapturePosition(blackPiece, redCapturerNewPos, finalPieces);
        console.log("[\u9632\u53CD\u68C0\u67E5] \u68C0\u67E5\u9ED1\u65B9\u68CB\u5B50\u80FD\u5426\u653B\u51FB:", {
          blackPiece: { id: blackPiece.id, type: blackPiece.type, pos: blackPiece.position },
          targetPos: redCapturerNewPos,
          movedThisTurn,
          canCapture: canCapture2
        });
        if (!movedThisTurn && canCapture2) {
          toRemoveByCounterAttack.push(redCapturerInFinal.id);
          redPieceRemoved.push({
            piece: { ...redCapturerInFinal },
            reason: "counter_attack",
            removedBy: { side: "black", pieceType: blackPiece.type, pieceId: blackPiece.id }
          });
          events.push({
            type: "counter_attack",
            description: `[\u9632\u53CD]\u7EA2${getPieceNameWithId(redCapturerInFinal, "red")}(${redCapturerInFinal.id})\u88AB\u9ED1${getPieceNameWithId(blackPiece, "black")}(${blackPiece.id})\u53CD\u5403`
          });
          break;
        }
      }
    }
  }
  const blackCaptureSuccess = blackAction?.actionType === "capture" && toRemoveByCapture.some((id) => {
    const piece = pieces.find((p) => p.id === id);
    return piece && piece.side === "red" && piece.position[0] === blackAction.to[0] && piece.position[1] === blackAction.to[1];
  });
  if (blackCaptureSuccess) {
    const blackCapturerNewPos = [blackAction.to[0], blackAction.to[1]];
    const blackCapturerInFinal = finalPieces.find(
      (p) => p.side === "black" && p.position[0] === blackAction.to[0] && p.position[1] === blackAction.to[1]
    );
    if (blackCapturerInFinal) {
      for (const redPiece of finalPieces.filter((p) => p.side === "red")) {
        const movedThisTurn = redMovedPieceIds.has(redPiece.id);
        if (!movedThisTurn && canCapturePosition(redPiece, blackCapturerNewPos, finalPieces)) {
          toRemoveByCounterAttack.push(blackCapturerInFinal.id);
          blackPieceRemoved.push({
            piece: { ...blackCapturerInFinal },
            reason: "counter_attack",
            removedBy: { side: "red", pieceType: redPiece.type, pieceId: redPiece.id }
          });
          events.push({
            type: "counter_attack",
            description: `[\u9632\u53CD]\u9ED1${getPieceNameWithId(blackCapturerInFinal, "black")}(${blackCapturerInFinal.id})\u88AB\u7EA2${getPieceNameWithId(redPiece, "red")}(${redPiece.id})\u53CD\u5403`
          });
          break;
        }
      }
    }
  }
  finalPieces = finalPieces.filter((p) => !toRemoveByCounterAttack.includes(p.id));
  let newRedLastPiece = null;
  let newRedLastTarget = null;
  let newRedCaptureCount = 0;
  let newBlackLastPiece = null;
  let newBlackLastTarget = null;
  let newBlackCaptureCount = 0;
  if (redAction) {
    if (redAction.actionType === "move") {
      newRedLastPiece = null;
      newRedLastTarget = null;
      newRedCaptureCount = 0;
    } else {
      const pieceId = pieces.find((p) => p.side === "red" && p.position[0] === redAction.from[0] && p.position[1] === redAction.from[1])?.id || null;
      const targetId = pieces.find((p) => p.side === "black" && p.position[0] === redAction.to[0] && p.position[1] === redAction.to[1])?.id || null;
      if (pieceId === chaseState.redLastPiece && targetId === chaseState.redLastTarget) {
        newRedLastPiece = pieceId;
        newRedLastTarget = targetId;
        newRedCaptureCount = chaseState.redCaptureCount + 1;
      } else {
        newRedLastPiece = pieceId;
        newRedLastTarget = targetId;
        newRedCaptureCount = 1;
      }
    }
  }
  if (blackAction) {
    if (blackAction.actionType === "move") {
      newBlackLastPiece = null;
      newBlackLastTarget = null;
      newBlackCaptureCount = 0;
    } else {
      const pieceId = pieces.find((p) => p.side === "black" && p.position[0] === blackAction.from[0] && p.position[1] === blackAction.from[1])?.id || null;
      const targetId = pieces.find((p) => p.side === "red" && p.position[0] === blackAction.to[0] && p.position[1] === blackAction.to[1])?.id || null;
      if (pieceId === chaseState.blackLastPiece && targetId === chaseState.blackLastTarget) {
        newBlackLastPiece = pieceId;
        newBlackLastTarget = targetId;
        newBlackCaptureCount = chaseState.blackCaptureCount + 1;
      } else {
        newBlackLastPiece = pieceId;
        newBlackLastTarget = targetId;
        newBlackCaptureCount = 1;
      }
    }
  }
  const redKing = finalPieces.find((p) => p.type === "king" && p.side === "red");
  const blackKing = finalPieces.find((p) => p.type === "king" && p.side === "black");
  let winner = null;
  let reason = "";
  if (redKing && blackKing && redKing.position[0] === blackKing.position[0]) {
    const between = finalPieces.filter((p) => {
      if (p.type === "king") return false;
      return p.position[0] === redKing.position[0] && p.position[1] > Math.min(redKing.position[1], blackKing.position[1]) && p.position[1] < Math.max(redKing.position[1], blackKing.position[1]);
    });
    if (between.length === 0) {
      redPieceRemoved.push({ piece: { ...redKing }, reason: "face_off" });
      blackPieceRemoved.push({ piece: { ...blackKing }, reason: "face_off" });
      events.push({
        type: "face_off",
        description: "[\u5C06\u5BF9\u5C06]\u53CC\u65B9\u649E\u5151"
      });
      finalPieces = finalPieces.filter((p) => p.type !== "king");
      winner = "draw";
      reason = "\u5C06\u5E05\u5BF9\u9762\uFF0C\u53CC\u65B9\u540C\u65F6\u88AB\u5403";
    }
  }
  if (!winner) {
    if (!redKing) {
      winner = "black";
      reason = "\u7EA2\u5E05\u88AB\u5403\uFF0C\u9ED1\u65B9\u83B7\u80DC";
    } else if (!blackKing) {
      winner = "red";
      reason = "\u9ED1\u5C06\u88AB\u5403\uFF0C\u7EA2\u65B9\u83B7\u80DC";
    }
  }
  return {
    pieces: finalPieces,
    winner,
    reason,
    newChaseState: {
      redLastPiece: newRedLastPiece,
      redLastTarget: newRedLastTarget,
      redCaptureCount: newRedCaptureCount,
      blackLastPiece: newBlackLastPiece,
      blackLastTarget: newBlackLastTarget,
      blackCaptureCount: newBlackCaptureCount
    },
    historyEntry: {
      logicRound: 0,
      // 由调用方设置
      gameRound: 0,
      // 由调用方设置
      redAction,
      blackAction,
      redPieceRemoved,
      blackPieceRemoved,
      events,
      winner,
      endReason: reason || null,
      isGameEnd: winner !== null
    }
  };
};

// src/shared/gameRound.ts
function getNextLogicRound(history) {
  return history.length;
}

// src/shared/gameStore.ts
function createSettlementEntry(history, historyEntryBase, currentRound) {
  return {
    ...historyEntryBase,
    logicRound: getNextLogicRound(history),
    gameRound: currentRound
  };
}
function createUndoEntry(history, lastSnapshot) {
  return {
    logicRound: getNextLogicRound(history),
    gameRound: lastSnapshot.gameRound,
    redAction: null,
    blackAction: null,
    redPieceRemoved: [],
    blackPieceRemoved: [],
    events: [{
      type: "move",
      description: `[\u6094\u68CB]\u7B2C${lastSnapshot.gameRound}\u56DE\u5408\u88AB\u64A4\u9500`
    }],
    winner: null,
    endReason: null,
    isGameEnd: false
  };
}
function createSnapshotBeforeSettlement(pieces, history, currentRound, lastMoveTargets, checkStatus) {
  return {
    pieces: pieces.map((p) => ({ ...p })),
    gameRound: currentRound,
    logicRound: getNextLogicRound(history),
    lastMoveTargets: { ...lastMoveTargets },
    checkStatus: { ...checkStatus }
  };
}

// server/gameState.ts
var COLS = 9;
var ROWS = 10;
var isKingInCheck = (side, pieces) => {
  const king = pieces.find((p) => p.side === side && p.type === "king");
  if (!king) return false;
  const opponentPieces = pieces.filter((p) => p.side !== side);
  for (const piece of opponentPieces) {
    if (canCapture(piece, king.position, pieces)) {
      return true;
    }
  }
  return false;
};
var canCapture = (piece, targetPos, pieces) => {
  const [tCol, tRow] = targetPos;
  switch (piece.type) {
    case "king": {
      const [pCol, pRow] = piece.position;
      const dCol = Math.abs(tCol - pCol);
      const dRow = Math.abs(tRow - pRow);
      if (dCol + dRow !== 1) return false;
      if (piece.side === "red" && tRow < 7) return false;
      if (piece.side === "black" && tRow > 2) return false;
      return true;
    }
    case "chariot": {
      const [pCol, pRow] = piece.position;
      if (pCol !== tCol && pRow !== tRow) return false;
      const betweenCount = countPiecesBetween(piece.position, targetPos, pieces);
      return betweenCount === 0;
    }
    case "horse": {
      const [pCol, pRow] = piece.position;
      const dCol = Math.abs(tCol - pCol);
      const dRow = Math.abs(tRow - pRow);
      if (!(dCol === 1 && dRow === 2 || dCol === 2 && dRow === 1)) return false;
      const legCol = pCol + (tCol > pCol ? 1 : tCol < pCol ? -1 : 0);
      const legRow = pRow + (tRow > pRow ? 1 : tRow < pRow ? -1 : 0);
      if (pieces.some((p) => p.position[0] === legCol && p.position[1] === legRow)) return false;
      return true;
    }
    case "cannon": {
      const [pCol, pRow] = piece.position;
      if (pCol !== tCol && pRow !== tRow) return false;
      const betweenCount = countPiecesBetween(piece.position, targetPos, pieces);
      const targetPiece = pieces.find((p) => p.position[0] === tCol && p.position[1] === tRow);
      return targetPiece ? betweenCount === 1 : betweenCount === 0;
    }
    case "advisor": {
      const [pCol, pRow] = piece.position;
      const dCol = Math.abs(tCol - pCol);
      const dRow = Math.abs(tRow - pRow);
      if (dCol !== 1 || dRow !== 1) return false;
      if (piece.side === "red" && (tCol < 3 || tCol > 5 || tRow < 7)) return false;
      if (piece.side === "black" && (tCol < 3 || tCol > 5 || tRow > 2)) return false;
      return true;
    }
    case "elephant": {
      const [pCol, pRow] = piece.position;
      const dCol = Math.abs(tCol - pCol);
      const dRow = Math.abs(tRow - pRow);
      if (dCol !== 2 || dRow !== 2) return false;
      const eyeCol = (pCol + tCol) / 2;
      const eyeRow = (pRow + tRow) / 2;
      if (pieces.some((p) => p.position[0] === eyeCol && p.position[1] === eyeRow)) return false;
      if (piece.side === "red" && tRow < 5) return false;
      if (piece.side === "black" && tRow > 4) return false;
      return true;
    }
    case "pawn": {
      const [pCol, pRow] = piece.position;
      if (piece.side === "red") {
        if (tRow < pRow) return false;
        if (pRow < 5) {
          return tCol === pCol && tRow === pRow + 1;
        } else {
          return tCol === pCol && tRow === pRow + 1 || tRow === pRow && Math.abs(tCol - pCol) === 1;
        }
      } else {
        if (tRow > pRow) return false;
        if (pRow > 4) {
          return tCol === pCol && tRow === pRow - 1;
        } else {
          return tCol === pCol && tRow === pRow - 1 || tRow === pRow && Math.abs(tCol - pCol) === 1;
        }
      }
    }
    default:
      return false;
  }
};
var countPiecesBetween = (from, to, pieces) => {
  const [fCol, fRow] = from;
  const [tCol, tRow] = to;
  if (fCol !== tCol && fRow !== tRow) return -1;
  const cCol = Math.min(fCol, tCol);
  const maxCol = Math.max(fCol, tCol);
  const cRow = Math.min(fRow, tRow);
  const maxRow = Math.max(fRow, tRow);
  let count = 0;
  for (const p of pieces) {
    const [pCol, pRow] = p.position;
    if (pCol >= cCol && pCol <= maxCol && pRow >= cRow && pRow <= maxRow) {
      if (!(pCol === fCol && pRow === fRow) && !(pCol === tCol && pRow === tRow)) {
        count++;
      }
    }
  }
  return count;
};
var rooms = /* @__PURE__ */ new Map();
var generateRoomId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};
var createRoom = (roomId) => {
  const room = {
    id: roomId,
    redPlayer: null,
    blackPlayer: null,
    pieces: INITIAL_PIECES.map((p) => ({ ...p })),
    phase: "waiting",
    currentOperatedSide: "red",
    redConfirmed: false,
    blackConfirmed: false,
    redPendingMove: null,
    blackPendingMove: null,
    winner: null,
    createdAt: Date.now(),
    // 本回合移动的棋子 ID
    redMovedPieceId: null,
    blackMovedPieceId: null,
    // 长捉限制
    redLastPiece: null,
    redLastTarget: null,
    redCaptureCount: 0,
    blackLastPiece: null,
    blackLastTarget: null,
    blackCaptureCount: 0,
    // 历史快照
    historySnapshots: [],
    // 悔棋请求
    undoRequestFrom: null,
    undoRequestedTo: null,
    // 重置请求
    resetRequestFrom: null,
    resetRequestedTo: null,
    // 最后行动目标位置
    lastRedMoveTo: null,
    lastBlackMoveTo: null,
    // 对弈历史记录
    roundHistory: [],
    // 当前逻辑回合数
    logicRound: 0,
    // 当前游戏回合数
    gameRound: 1,
    // 将军状态
    redInCheck: false,
    blackInCheck: false
  };
  rooms.set(roomId, room);
  return room;
};
var getRoom = (roomId) => {
  return rooms.get(roomId);
};
var leaveRoom = (roomId, playerId) => {
  const room = rooms.get(roomId);
  if (!room) return;
  if (room.redPlayer === playerId) {
    room.redPlayer = null;
  }
  if (room.blackPlayer === playerId) {
    room.blackPlayer = null;
  }
  if (!room.redPlayer && !room.blackPlayer) {
    rooms.delete(roomId);
  }
};
var getPlayerSide = (room, playerId) => {
  if (room.redPlayer === playerId) return "red";
  if (room.blackPlayer === playerId) return "black";
  return null;
};
var isOnBoard = (col, row) => {
  return col >= 0 && col < COLS && row >= 0 && row < ROWS;
};
var isInPalace2 = (col, row, side) => {
  if (side === "red") {
    return col >= 3 && col <= 5 && row >= 7 && row <= 9;
  }
  return col >= 3 && col <= 5 && row >= 0 && row <= 2;
};
var getPieceAt2 = (col, row, pieces) => {
  return pieces.find((p) => p.position[0] === col && p.position[1] === row);
};
var isHorseLegBlocked = (col, row, pieces) => {
  return getPieceAt2(col, row, pieces) !== void 0;
};
var isElephantCrossed2 = (row, side) => {
  if (side === "red") return row < 5;
  return row > 4;
};
var isElephantBlocked = (col, row, pieces) => {
  return getPieceAt2(col, row, pieces) !== void 0;
};
var getValidMoves = (piece, pieces) => {
  const moves = [];
  const [col, row] = piece.position;
  switch (piece.type) {
    case "king": {
      const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [dc, dr] of directions) {
        const newCol = col + dc;
        const newRow = row + dr;
        if (isOnBoard(newCol, newRow) && isInPalace2(newCol, newRow, piece.side)) {
          const target = getPieceAt2(newCol, newRow, pieces);
          if (!target || target.side !== piece.side) {
            moves.push([newCol, newRow]);
          }
        }
      }
      break;
    }
    case "advisor": {
      const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (const [dc, dr] of directions) {
        const newCol = col + dc;
        const newRow = row + dr;
        if (isOnBoard(newCol, newRow) && isInPalace2(newCol, newRow, piece.side)) {
          const target = getPieceAt2(newCol, newRow, pieces);
          if (!target || target.side !== piece.side) {
            moves.push([newCol, newRow]);
          }
        }
      }
      break;
    }
    case "elephant": {
      const movesConfig = [
        { leg: [1, -1], target: [2, -2] },
        { leg: [1, 1], target: [2, 2] },
        { leg: [-1, -1], target: [-2, -2] },
        { leg: [-1, 1], target: [-2, 2] }
      ];
      for (const config of movesConfig) {
        const legCol = col + config.leg[0];
        const legRow = row + config.leg[1];
        const targetCol = col + config.target[0];
        const targetRow = row + config.target[1];
        if (isOnBoard(targetCol, targetRow) && !isElephantCrossed2(targetRow, piece.side)) {
          if (!isElephantBlocked(legCol, legRow, pieces)) {
            const target = getPieceAt2(targetCol, targetRow, pieces);
            if (!target || target.side !== piece.side) {
              moves.push([targetCol, targetRow]);
            }
          }
        }
      }
      break;
    }
    case "horse": {
      const movesConfig = [
        { leg: [0, 1], target: [1, 2] },
        { leg: [0, 1], target: [-1, 2] },
        { leg: [0, -1], target: [1, -2] },
        { leg: [0, -1], target: [-1, -2] },
        { leg: [1, 0], target: [2, 1] },
        { leg: [1, 0], target: [2, -1] },
        { leg: [-1, 0], target: [-2, 1] },
        { leg: [-1, 0], target: [-2, -1] }
      ];
      for (const config of movesConfig) {
        const legCol = col + config.leg[0];
        const legRow = row + config.leg[1];
        const targetCol = col + config.target[0];
        const targetRow = row + config.target[1];
        if (isOnBoard(targetCol, targetRow)) {
          if (!isHorseLegBlocked(legCol, legRow, pieces)) {
            const target = getPieceAt2(targetCol, targetRow, pieces);
            if (!target || target.side !== piece.side) {
              moves.push([targetCol, targetRow]);
            }
          }
        }
      }
      break;
    }
    case "chariot": {
      const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [dc, dr] of directions) {
        let newCol = col + dc;
        let newRow = row + dr;
        while (isOnBoard(newCol, newRow)) {
          const target = getPieceAt2(newCol, newRow, pieces);
          if (target) {
            if (target.side !== piece.side) {
              moves.push([newCol, newRow]);
            }
            break;
          }
          moves.push([newCol, newRow]);
          newCol += dc;
          newRow += dr;
        }
      }
      break;
    }
    case "cannon": {
      const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      for (const [dc, dr] of directions) {
        let newCol = col + dc;
        let newRow = row + dr;
        let foundPlatform = false;
        while (isOnBoard(newCol, newRow)) {
          const target = getPieceAt2(newCol, newRow, pieces);
          if (!foundPlatform) {
            if (target) {
              foundPlatform = true;
            } else {
              moves.push([newCol, newRow]);
            }
          } else {
            if (target) {
              if (target.side !== piece.side) {
                moves.push([newCol, newRow]);
              }
              break;
            }
          }
          newCol += dc;
          newRow += dr;
        }
      }
      break;
    }
    case "pawn": {
      const forward = piece.side === "red" ? -1 : 1;
      const crossedRow = piece.side === "red" ? 4 : 5;
      const forwardRow = row + forward;
      if (isOnBoard(col, forwardRow)) {
        const target = getPieceAt2(col, forwardRow, pieces);
        if (!target || target.side !== piece.side) {
          moves.push([col, forwardRow]);
        }
      }
      if (piece.side === "red" && row <= crossedRow || piece.side === "black" && row >= crossedRow) {
        for (const dc of [-1, 1]) {
          const newCol = col + dc;
          if (isOnBoard(newCol, row)) {
            const target = getPieceAt2(newCol, row, pieces);
            if (!target || target.side !== piece.side) {
              moves.push([newCol, row]);
            }
          }
        }
      }
      break;
    }
  }
  return moves;
};
var isValidMove = (piece, from, to, pieces) => {
  const validMoves = getValidMoves(piece, pieces);
  return validMoves.some((m) => m[0] === to[0] && m[1] === to[1]);
};
var submitMove = (roomId, playerId, from, to) => {
  const room = rooms.get(roomId);
  console.log("[GAME] submitMove called:", { roomId, playerId, from, to });
  if (!room) return { success: false, error: "\u623F\u95F4\u4E0D\u5B58\u5728" };
  if (room.phase !== "strategy") return { success: false, error: "\u5F53\u524D\u9636\u6BB5\u4E0D\u80FD\u79FB\u52A8" };
  const side = getPlayerSide(room, playerId);
  console.log("[GAME] playerSide:", { side, redPlayer: room.redPlayer, blackPlayer: room.blackPlayer });
  if (!side) return { success: false, error: "\u4F60\u4E0D\u662F\u623F\u95F4\u7684\u73A9\u5BB6" };
  console.log("[GAME] searching for piece:", { side, from, availablePieces: room.pieces.filter((p) => p.side === side).map((p) => ({ id: p.id, position: p.position })) });
  const piece = room.pieces.find((p) => p.side === side && p.position[0] === from[0] && p.position[1] === from[1]);
  if (!piece) {
    console.log("[GAME] piece not found at position:", { from, side, allPiecesAtFrom: room.pieces.filter((p) => p.position[0] === from[0] && p.position[1] === from[1]) });
    return { success: false, error: "\u8BE5\u4F4D\u7F6E\u6CA1\u6709\u4F60\u7684\u68CB\u5B50" };
  }
  console.log("[GAME] piece found:", piece);
  if (!isValidMove(piece, from, to, room.pieces)) {
    return { success: false, error: "\u79FB\u52A8\u4E0D\u5408\u6CD5" };
  }
  const enemyAtTarget = room.pieces.find((p) => p.side !== side && p.position[0] === to[0] && p.position[1] === to[1]);
  const actionType = enemyAtTarget ? "capture" : "move";
  if (actionType === "capture") {
    const isRed = side === "red";
    const lastPiece = isRed ? room.redLastPiece : room.blackLastPiece;
    const lastTarget = isRed ? room.redLastTarget : room.blackLastTarget;
    const count = isRed ? room.redCaptureCount : room.blackCaptureCount;
    if (piece.id === lastPiece && enemyAtTarget.id === lastTarget && count >= 3) {
      return { success: false, error: "\u4E0D\u5141\u8BB8\u957F\u6349\uFF083\u6B21\uFF09" };
    }
  }
  if (side === "red") {
    room.redPendingMove = { from, to, actionType };
    room.redConfirmed = true;
    room.redMovedPieceId = piece.id;
  } else {
    room.blackPendingMove = { from, to, actionType };
    room.blackConfirmed = true;
    room.blackMovedPieceId = piece.id;
  }
  if (room.redConfirmed && room.blackConfirmed) {
    room.phase = "settlement";
    executeSettlement2(room);
  }
  return { success: true };
};
var requestReset = (roomId, requesterSide) => {
  const room = rooms.get(roomId);
  if (!room) return { success: false, error: "\u623F\u95F4\u4E0D\u5B58\u5728" };
  if (room.phase === "waiting") return { success: false, error: "\u6E38\u620F\u5C1A\u672A\u5F00\u59CB" };
  room.resetRequestFrom = requesterSide;
  room.resetRequestedTo = requesterSide === "red" ? "black" : "red";
  return { success: true };
};
var respondToReset = (roomId, responderSide, accepted) => {
  const room = rooms.get(roomId);
  if (!room) return { success: false, error: "\u623F\u95F4\u4E0D\u5B58\u5728" };
  if (room.resetRequestFrom === null) {
    return { success: false, error: "\u6CA1\u6709\u5F85\u5904\u7406\u7684\u91CD\u7F6E\u8BF7\u6C42" };
  }
  if (room.resetRequestedTo !== responderSide) {
    return { success: false, error: "\u8FD9\u4E0D\u662F\u53D1\u7ED9\u4F60\u7684\u91CD\u7F6E\u8BF7\u6C42" };
  }
  if (accepted) {
    resetRoomFull(roomId);
  } else {
    room.resetRequestFrom = null;
    room.resetRequestedTo = null;
  }
  return { success: true };
};
var resetRoomFull = (roomId) => {
  const room = rooms.get(roomId);
  if (!room) return;
  room.pieces = INITIAL_PIECES.map((p) => ({ ...p }));
  room.phase = "strategy";
  room.currentOperatedSide = "red";
  room.redConfirmed = false;
  room.blackConfirmed = false;
  room.redPendingMove = null;
  room.blackPendingMove = null;
  room.winner = null;
  room.redMovedPieceId = null;
  room.blackMovedPieceId = null;
  room.redLastPiece = null;
  room.redLastTarget = null;
  room.redCaptureCount = 0;
  room.blackLastPiece = null;
  room.blackLastTarget = null;
  room.blackCaptureCount = 0;
  room.historySnapshots = [];
  room.roundHistory = [];
  room.gameRound = 1;
  room.logicRound = 0;
  room.redInCheck = false;
  room.blackInCheck = false;
  room.resetRequestFrom = null;
  room.resetRequestedTo = null;
  room.lastRedMoveTo = null;
  room.lastBlackMoveTo = null;
};
var undoMove = (roomId, playerId) => {
  const room = rooms.get(roomId);
  if (!room) return { success: false, error: "\u623F\u95F4\u4E0D\u5B58\u5728" };
  if (room.phase !== "strategy") return { success: false, error: "\u5F53\u524D\u9636\u6BB5\u4E0D\u80FD\u64A4\u9500" };
  const side = getPlayerSide(room, playerId);
  if (!side) return { success: false, error: "\u4F60\u4E0D\u662F\u623F\u95F4\u7684\u73A9\u5BB6" };
  if (side === "red") {
    room.redPendingMove = null;
    room.redConfirmed = false;
    room.redMovedPieceId = null;
  } else {
    room.blackPendingMove = null;
    room.blackConfirmed = false;
    room.blackMovedPieceId = null;
  }
  return { success: true };
};
var executeSettlement2 = (room) => {
  const redAction = room.redPendingMove ? {
    from: room.redPendingMove.from,
    to: room.redPendingMove.to,
    actionType: room.redPendingMove.actionType
  } : null;
  const blackAction = room.blackPendingMove ? {
    from: room.blackPendingMove.from,
    to: room.blackPendingMove.to,
    actionType: room.blackPendingMove.actionType
  } : null;
  const chaseState = {
    redLastPiece: room.redLastPiece,
    redLastTarget: room.redLastTarget,
    redCaptureCount: room.redCaptureCount,
    blackLastPiece: room.blackLastPiece,
    blackLastTarget: room.blackLastTarget,
    blackCaptureCount: room.blackCaptureCount
  };
  const snapshot = createSnapshotBeforeSettlement(
    room.pieces,
    room.roundHistory,
    room.gameRound,
    { red: room.lastRedMoveTo, black: room.lastBlackMoveTo },
    {
      red: isKingInCheck("red", room.pieces),
      black: isKingInCheck("black", room.pieces)
    }
  );
  const result = executeSettlement(
    room.pieces,
    redAction,
    blackAction,
    chaseState,
    room.redMovedPieceId,
    room.blackMovedPieceId
  );
  room.pieces = result.pieces;
  room.redLastPiece = result.newChaseState.redLastPiece;
  room.redLastTarget = result.newChaseState.redLastTarget;
  room.redCaptureCount = result.newChaseState.redCaptureCount;
  room.blackLastPiece = result.newChaseState.blackLastPiece;
  room.blackLastTarget = result.newChaseState.blackLastTarget;
  room.blackCaptureCount = result.newChaseState.blackCaptureCount;
  room.redInCheck = isKingInCheck("red", room.pieces);
  room.blackInCheck = isKingInCheck("black", room.pieces);
  room.historySnapshots.push(snapshot);
  const historyEntry = createSettlementEntry(room.roundHistory, result.historyEntry, room.gameRound);
  room.roundHistory.push(historyEntry);
  room.gameRound++;
  room.lastRedMoveTo = room.redPendingMove?.to || null;
  room.lastBlackMoveTo = room.blackPendingMove?.to || null;
  if (result.winner) {
    room.winner = result.winner;
    room.phase = "ended";
  } else {
    room.phase = "strategy";
    room.redConfirmed = false;
    room.blackConfirmed = false;
    room.redPendingMove = null;
    room.blackPendingMove = null;
    room.redMovedPieceId = null;
    room.blackMovedPieceId = null;
  }
};
var resetRoom = (roomId) => {
  const room = rooms.get(roomId);
  if (!room) return false;
  room.pieces = INITIAL_PIECES.map((p) => ({ ...p }));
  room.phase = "strategy";
  room.currentOperatedSide = "red";
  room.redConfirmed = false;
  room.blackConfirmed = false;
  room.redPendingMove = null;
  room.blackPendingMove = null;
  room.winner = null;
  room.redLastPiece = null;
  room.redLastTarget = null;
  room.redCaptureCount = 0;
  room.blackLastPiece = null;
  room.blackLastTarget = null;
  room.blackCaptureCount = 0;
  room.historySnapshots = [];
  room.roundHistory = [];
  room.gameRound = 1;
  room.lastRedMoveTo = null;
  room.lastBlackMoveTo = null;
  room.undoRequestFrom = null;
  room.undoRequestedTo = null;
  room.redInCheck = false;
  room.blackInCheck = false;
  return true;
};
var settleGame = (roomId) => {
  const room = rooms.get(roomId);
  if (!room) return { success: false };
  if (!room.redPendingMove || !room.blackPendingMove) {
    return { success: false };
  }
  executeSettlement2(room);
  return {
    success: true,
    winner: room.winner || void 0,
    reason: room.winner === "red" ? "\u7EA2\u5E05\u88AB\u5403" : room.winner === "black" ? "\u9ED1\u5C06\u88AB\u5403" : room.winner === "draw" ? "\u5C06\u5E05\u5BF9\u9762" : void 0
  };
};
var requestUndo = (roomId, requesterSide) => {
  const room = rooms.get(roomId);
  if (!room) return { success: false, error: "\u623F\u95F4\u4E0D\u5B58\u5728" };
  if (room.historySnapshots.length === 0) {
    return { success: false, error: "\u6CA1\u6709\u53EF\u6094\u68CB\u7684\u56DE\u5408" };
  }
  if (room.undoRequestFrom !== null) {
    return { success: false, error: "\u5DF2\u6709\u5F85\u5904\u7406\u7684\u6094\u68CB\u8BF7\u6C42" };
  }
  room.undoRequestFrom = requesterSide;
  room.undoRequestedTo = requesterSide === "red" ? "black" : "red";
  return { success: true };
};
var executeUndo = (room) => {
  if (room.historySnapshots.length === 0) return;
  const lastSnapshot = room.historySnapshots[room.historySnapshots.length - 1];
  room.pieces = lastSnapshot.pieces.map((p) => ({ ...p }));
  room.phase = "strategy";
  room.winner = null;
  room.redPendingMove = null;
  room.blackPendingMove = null;
  room.redConfirmed = false;
  room.blackConfirmed = false;
  room.redLastPiece = null;
  room.redLastTarget = null;
  room.redCaptureCount = 0;
  room.blackLastPiece = null;
  room.blackLastTarget = null;
  room.blackCaptureCount = 0;
  room.lastRedMoveTo = lastSnapshot.lastMoveTargets.red;
  room.lastBlackMoveTo = lastSnapshot.lastMoveTargets.black;
  room.historySnapshots.pop();
  const undoEntry = createUndoEntry(room.roundHistory, lastSnapshot);
  room.roundHistory.push(undoEntry);
  room.gameRound--;
  room.undoRequestFrom = null;
  room.undoRequestedTo = null;
};
var respondToUndo = (roomId, responderSide, accepted) => {
  const room = rooms.get(roomId);
  if (!room) return { success: false, error: "\u623F\u95F4\u4E0D\u5B58\u5728" };
  if (room.undoRequestFrom === null) {
    return { success: false, error: "\u6CA1\u6709\u5F85\u5904\u7406\u7684\u6094\u68CB\u8BF7\u6C42" };
  }
  if (room.undoRequestedTo !== responderSide) {
    return { success: false, error: "\u8FD9\u4E0D\u662F\u53D1\u7ED9\u4F60\u7684\u6094\u68CB\u8BF7\u6C42" };
  }
  if (accepted) {
    executeUndo(room);
  } else {
    room.undoRequestFrom = null;
    room.undoRequestedTo = null;
  }
  return { success: true };
};

// server/websocket.ts
var clients = /* @__PURE__ */ new Map();
var matchQueue = /* @__PURE__ */ new Set();
var initWebSocket = (server2) => {
  const wss = new import_ws.WebSocketServer({ server: server2, path: "/ws" });
  wss.on("connection", (ws) => {
    console.log("\u65B0\u7684 WebSocket \u8FDE\u63A5");
    clients.set(ws, { ws, roomId: null, side: null, inMatchmaking: false });
    ws.on("message", (data) => {
      console.log("[WS] \u6536\u5230\u539F\u59CB\u6D88\u606F:", data.toString());
      try {
        const message = JSON.parse(data.toString());
        console.log("[WS] \u89E3\u6790\u540E\u6D88\u606F:", message);
        handleMessage(ws, message);
      } catch (error) {
        console.error("\u89E3\u6790\u6D88\u606F\u5931\u8D25:", error);
        sendToClient(ws, { type: "error", payload: { message: "\u65E0\u6548\u7684\u6D88\u606F\u683C\u5F0F" } });
      }
    });
    ws.on("close", () => {
      handleDisconnect(ws);
    });
    ws.on("error", (error) => {
      console.error("WebSocket \u9519\u8BEF:", error);
    });
    sendToClient(ws, { type: "connected", payload: { message: "\u8FDE\u63A5\u6210\u529F" } });
  });
  return wss;
};
var playerIdCounter = 0;
var getPlayerId = (ws) => {
  if (!ws._playerId) {
    ws._playerId = `player_${++playerIdCounter}`;
  }
  return ws._playerId;
};
var tryMatchPlayers = () => {
  if (matchQueue.size < 2) return;
  const players = Array.from(matchQueue);
  const ws1 = players[0];
  const ws2 = players[1];
  matchQueue.delete(ws1);
  matchQueue.delete(ws2);
  const roomId = generateRoomId();
  const room = createRoom(roomId);
  const playerId1 = getPlayerId(ws1);
  const playerId2 = getPlayerId(ws2);
  const [redWs, blackWs] = Math.random() < 0.5 ? [ws1, ws2] : [ws2, ws1];
  const redPlayerId = getPlayerId(redWs);
  const blackPlayerId = getPlayerId(blackWs);
  room.redPlayer = redPlayerId;
  room.blackPlayer = blackPlayerId;
  room.phase = "strategy";
  const player1Info = clients.get(ws1);
  const player2Info = clients.get(ws2);
  if (player1Info) {
    player1Info.roomId = roomId;
    player1Info.side = ws1 === redWs ? "red" : "black";
    player1Info.inMatchmaking = false;
    clients.set(ws1, player1Info);
  }
  if (player2Info) {
    player2Info.roomId = roomId;
    player2Info.side = ws2 === redWs ? "red" : "black";
    player2Info.inMatchmaking = false;
    clients.set(ws2, player2Info);
  }
  sendToClient(ws1, {
    type: "match_found",
    payload: {
      roomId,
      side: player1Info?.side,
      pieces: room.pieces,
      isQuickMatch: true
    }
  });
  sendToClient(ws2, {
    type: "match_found",
    payload: {
      roomId,
      side: player2Info?.side,
      pieces: room.pieces,
      isQuickMatch: true
    }
  });
  console.log(`\u5FEB\u901F\u5339\u914D\u6210\u529F: \u623F\u95F4 ${roomId}, \u7EA2\u65B9: ${room.redPlayer}, \u9ED1\u65B9: ${room.blackPlayer}`);
};
var handleMessage = (ws, message) => {
  console.log("\u6536\u5230\u6D88\u606F:", message.type, message.payload);
  const playerId = getPlayerId(ws);
  let player = clients.get(ws);
  switch (message.type) {
    case "create_room": {
      const roomId = generateRoomId();
      const room = createRoom(roomId);
      const playerId2 = getPlayerId(ws);
      room.redPlayer = playerId2;
      if (player) {
        player.roomId = roomId;
        player.side = "red";
        clients.set(ws, player);
      }
      sendToClient(ws, {
        type: "room_created",
        payload: { roomId, side: "red", pieces: room.pieces, gameRound: room.gameRound }
      });
      broadcastRoomUpdate(room);
      break;
    }
    case "join_matchmaking": {
      if (player?.inMatchmaking) {
        return;
      }
      if (player?.roomId) {
        const room = getRoom(player.roomId);
        if (room) {
          leaveRoom(player.roomId, getPlayerId(ws));
          broadcastRoomUpdate(room);
        }
        player.roomId = null;
        player.side = null;
      }
      matchQueue.add(ws);
      if (player) {
        player.inMatchmaking = true;
        clients.set(ws, player);
      }
      sendToClient(ws, {
        type: "matchmaking_started",
        payload: { message: "\u6B63\u5728\u5339\u914D\u5BF9\u624B..." }
      });
      console.log(`\u73A9\u5BB6 ${getPlayerId(ws)} \u52A0\u5165\u5339\u914D\u961F\u5217\uFF0C\u5F53\u524D\u961F\u5217: ${matchQueue.size} \u4EBA`);
      tryMatchPlayers();
      break;
    }
    case "leave_matchmaking": {
      if (!player?.inMatchmaking) {
        return;
      }
      matchQueue.delete(ws);
      if (player) {
        player.inMatchmaking = false;
        clients.set(ws, player);
      }
      sendToClient(ws, {
        type: "matchmaking_cancelled",
        payload: { message: "\u5DF2\u53D6\u6D88\u5339\u914D" }
      });
      console.log(`\u73A9\u5BB6 ${getPlayerId(ws)} \u79BB\u5F00\u5339\u914D\u961F\u5217`);
      break;
    }
    case "join_room": {
      const { roomId } = message.payload;
      const playerId2 = getPlayerId(ws);
      const room = getRoom(roomId);
      if (!room) {
        sendToClient(ws, { type: "error", payload: { message: "\u623F\u95F4\u4E0D\u5B58\u5728" } });
        return;
      }
      if (!player) {
        player = { ws, roomId: null, side: null };
      }
      if (!room.redPlayer) {
        room.redPlayer = playerId2;
        player.side = "red";
      } else if (!room.blackPlayer) {
        room.blackPlayer = playerId2;
        player.side = "black";
      } else {
        sendToClient(ws, { type: "error", payload: { message: "\u623F\u95F4\u5DF2\u6EE1" } });
        return;
      }
      player.roomId = roomId;
      clients.set(ws, player);
      if (room.redPlayer && room.blackPlayer) {
        room.phase = "strategy";
      }
      sendToClient(ws, {
        type: "joined",
        payload: { roomId, side: player.side, pieces: room.pieces, phase: room.phase, gameRound: room.gameRound }
      });
      if (room.redPlayer && room.blackPlayer) {
        broadcastGameStart(room);
      }
      broadcastRoomUpdate(room);
      break;
    }
    case "leave_room": {
      if (player && player.roomId) {
        const room = getRoom(player.roomId);
        if (room) {
          leaveRoom(player.roomId, getPlayerId(ws));
          if (!room.redPlayer && !room.blackPlayer) {
          } else {
            broadcastRoomUpdate(room);
          }
        }
        player.roomId = null;
        player.side = null;
        clients.set(ws, player);
        sendToClient(ws, { type: "left_room" });
      }
      break;
    }
    case "start_game": {
      if (!player || !player.roomId) {
        sendToClient(ws, { type: "error", payload: { message: "\u4F60\u4E0D\u5728\u4EFB\u4F55\u623F\u95F4\u4E2D" } });
        return;
      }
      const room = getRoom(player.roomId);
      if (!room) {
        sendToClient(ws, { type: "error", payload: { message: "\u623F\u95F4\u4E0D\u5B58\u5728" } });
        return;
      }
      if (!room.redPlayer || !room.blackPlayer) {
        sendToClient(ws, { type: "error", payload: { message: "\u9700\u8981\u53CC\u65B9\u90FD\u5728\u624D\u80FD\u5F00\u59CB" } });
        return;
      }
      room.phase = "strategy";
      broadcastRoomUpdate(room);
      break;
    }
    case "submit_move": {
      if (!player || !player.roomId || !player.side) {
        console.log("[SERVER] submit_move rejected: player not in room", { playerId: getPlayerId(ws), player, roomId: player?.roomId, side: player?.side });
        sendToClient(ws, { type: "error", payload: { message: "\u4F60\u4E0D\u5728\u4EFB\u4F55\u623F\u95F4\u4E2D" } });
        return;
      }
      const { from, to } = message.payload;
      const playerId2 = getPlayerId(ws);
      console.log("[SERVER] submit_move received:", { playerId: playerId2, roomId: player.roomId, side: player.side, from, to });
      const result = submitMove(player.roomId, playerId2, from, to);
      console.log("[SERVER] submit_move result:", result);
      if (result.success) {
        const room = getRoom(player.roomId);
        if (room) {
          broadcastRoomUpdate(room);
          for (const [ws2, p2] of clients) {
            if (p2.roomId === room.id && p2.ws !== ws) {
              sendToClient(ws2, { type: "opponent_move", payload: {} });
            }
          }
        }
      } else {
        sendToClient(ws, { type: "error", payload: { message: result.error || "\u79FB\u52A8\u5931\u8D25" } });
      }
      break;
    }
    case "undo_move": {
      if (!player || !player.roomId || !player.side) {
        sendToClient(ws, { type: "error", payload: { message: "\u4F60\u4E0D\u5728\u4EFB\u4F55\u623F\u95F4\u4E2D" } });
        return;
      }
      const playerId2 = getPlayerId(ws);
      const result = undoMove(player.roomId, playerId2);
      if (result.success) {
        const room = getRoom(player.roomId);
        if (room) {
          broadcastRoomUpdate(room);
        }
      } else {
        sendToClient(ws, { type: "error", payload: { message: result.error || "\u64A4\u9500\u5931\u8D25" } });
      }
      break;
    }
    case "settle": {
      if (!player || !player.roomId) {
        sendToClient(ws, { type: "error", payload: { message: "\u4F60\u4E0D\u5728\u4EFB\u4F55\u623F\u95F4\u4E2D" } });
        return;
      }
      const room = getRoom(player.roomId);
      if (!room) {
        sendToClient(ws, { type: "error", payload: { message: "\u623F\u95F4\u4E0D\u5B58\u5728" } });
        return;
      }
      if (!room.redPendingMove || !room.blackPendingMove) {
        sendToClient(ws, { type: "error", payload: { message: "\u53CC\u65B9\u90FD\u9700\u8981\u5148\u8D70\u68CB" } });
        return;
      }
      const result = settleGame(player.roomId);
      if (result.success && room) {
        if (result.winner) {
          for (const [ws2, p2] of clients) {
            if (p2.roomId === room.id) {
              sendToClient(ws2, {
                type: "game_over",
                payload: {
                  winner: result.winner,
                  reason: result.reason
                }
              });
            }
          }
        }
        broadcastRoomUpdate(room);
      }
      break;
    }
    case "reset_game": {
      if (!player || !player.roomId) {
        sendToClient(ws, { type: "error", payload: { message: "\u4F60\u4E0D\u5728\u4EFB\u4F55\u623F\u95F4\u4E2D" } });
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
    case "request_undo": {
      if (!player || !player.roomId || !player.side) {
        sendToClient(ws, { type: "error", payload: { message: "\u4F60\u4E0D\u5728\u4EFB\u4F55\u623F\u95F4\u4E2D" } });
        return;
      }
      const result = requestUndo(player.roomId, player.side);
      if (result.success) {
        const room = getRoom(player.roomId);
        if (room) {
          for (const [ws2, p2] of clients) {
            if (p2.roomId === room.id && p2.ws !== ws) {
              sendToClient(ws2, {
                type: "undo_requested",
                payload: { from: player.side }
              });
            }
          }
          sendToClient(ws, {
            type: "undo_waiting",
            payload: { to: player.side === "red" ? "black" : "red" }
          });
        }
      } else {
        sendToClient(ws, { type: "error", payload: { message: result.error || "\u8BF7\u6C42\u5931\u8D25" } });
      }
      break;
    }
    case "respond_undo": {
      if (!player || !player.roomId || !player.side) {
        sendToClient(ws, { type: "error", payload: { message: "\u4F60\u4E0D\u5728\u4EFB\u4F55\u623F\u95F4\u4E2D" } });
        return;
      }
      const { accepted } = message.payload;
      const result = respondToUndo(player.roomId, player.side, accepted);
      if (result.success) {
        const room = getRoom(player.roomId);
        if (room) {
          for (const [ws2, p2] of clients) {
            if (p2.roomId === room.id) {
              sendToClient(ws2, {
                type: "undo_response",
                payload: {
                  accepted,
                  message: accepted ? "\u5BF9\u65B9\u540C\u610F\u4E86\u6094\u68CB\u8BF7\u6C42" : "\u5BF9\u65B9\u62D2\u7EDD\u4E86\u6094\u68CB\u8BF7\u6C42"
                }
              });
            }
          }
          broadcastRoomUpdate(room);
        }
      } else {
        sendToClient(ws, { type: "error", payload: { message: result.error || "\u64CD\u4F5C\u5931\u8D25" } });
      }
      break;
    }
    case "request_reset": {
      if (!player || !player.roomId || !player.side) {
        sendToClient(ws, { type: "error", payload: { message: "\u4F60\u4E0D\u5728\u4EFB\u4F55\u623F\u95F4\u4E2D" } });
        return;
      }
      const result = requestReset(player.roomId, player.side);
      if (result.success) {
        const room = getRoom(player.roomId);
        if (room) {
          for (const [ws2, p2] of clients) {
            if (p2.roomId === room.id) {
              sendToClient(ws2, {
                type: "reset_requested",
                payload: { from: player.side }
              });
            }
          }
        }
      } else {
        sendToClient(ws, { type: "error", payload: { message: result.error || "\u64CD\u4F5C\u5931\u8D25" } });
      }
      break;
    }
    case "respond_reset": {
      if (!player || !player.roomId || !player.side) {
        sendToClient(ws, { type: "error", payload: { message: "\u4F60\u4E0D\u5728\u4EFB\u4F55\u623F\u95F4\u4E2D" } });
        return;
      }
      const { accepted } = message.payload;
      const result = respondToReset(player.roomId, player.side, accepted);
      if (result.success) {
        const room = getRoom(player.roomId);
        if (room) {
          for (const [ws2, p2] of clients) {
            if (p2.roomId === room.id) {
              sendToClient(ws2, {
                type: "reset_response",
                payload: {
                  accepted,
                  message: accepted ? "\u5BF9\u65B9\u540C\u610F\u4E86\u91CD\u7F6E\u8BF7\u6C42\uFF0C\u6E38\u620F\u5DF2\u91CD\u7F6E" : "\u5BF9\u65B9\u62D2\u7EDD\u4E86\u91CD\u7F6E\u8BF7\u6C42"
                }
              });
            }
          }
          broadcastRoomUpdate(room);
        }
      } else {
        sendToClient(ws, { type: "error", payload: { message: result.error || "\u64CD\u4F5C\u5931\u8D25" } });
      }
      break;
    }
    default:
      sendToClient(ws, { type: "error", payload: { message: "\u672A\u77E5\u7684\u6D88\u606F\u7C7B\u578B" } });
  }
};
var handleDisconnect = (ws) => {
  const player = clients.get(ws);
  if (player?.inMatchmaking) {
    matchQueue.delete(ws);
    console.log("\u5339\u914D\u4E2D\u7684\u73A9\u5BB6\u65AD\u5F00\u8FDE\u63A5");
  }
  if (player && player.roomId) {
    const room = getRoom(player.roomId);
    if (room) {
      leaveRoom(player.roomId, getPlayerId(ws));
      for (const [ws2, p2] of clients) {
        if (p2.roomId === room.id && p2.ws !== ws) {
          sendToClient(ws2, { type: "left_room" });
        }
      }
    }
    console.log("\u73A9\u5BB6\u65AD\u5F00\u8FDE\u63A5:", player.side, player.roomId);
  }
  clients.delete(ws);
};
var sendToClient = (ws, message) => {
  if (ws.readyState === import_ws.WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
};
var broadcastRoomUpdate = (room) => {
  if (!room) return;
  for (const [ws, player] of clients) {
    if (player.roomId === room.id) {
      const side = getPlayerSide(room, getPlayerId(player.ws));
      sendRoomState(ws, room, side);
    }
  }
};
var sendRoomState = (ws, room, side) => {
  sendToClient(ws, {
    type: "room_state",
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
      // 游戏回合号（用于显示）
      gameRound: room.gameRound,
      // 将军状态
      checkStatus: {
        red: room.redInCheck,
        black: room.blackInCheck
      }
    }
  });
};
var broadcastGameStart = (room) => {
  for (const [ws, player] of clients) {
    if (player.roomId === room.id) {
      sendToClient(ws, { type: "game_start" });
    }
  }
};

// server/server.ts
var isDev2 = process.env.COZE_PROJECT_ENV !== "PROD";
var port = parseInt(process.env.PORT || "5000", 10);
var hostname = process.env.HOSTNAME || "localhost";
var app = (0, import_express3.default)();
var server = (0, import_http.createServer)(app);
async function startServer() {
  if (isDev2) {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        const ms = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${ms}ms`);
      });
      next();
    });
  }
  app.use(import_express3.default.json());
  app.use(import_express3.default.urlencoded({ extended: true }));
  app.use(routes_default);
  initWebSocket(server);
  await setupVite(app);
  app.use((err, req, res) => {
    console.error("Server error:", err);
    const status = "status" in err ? err.status || 500 : 500;
    res.status(status).json({
      error: err.message || "Internal server error"
    });
  });
  server.once("error", (err) => {
    console.error("Server error:", err);
    process.exit(1);
  });
  server.listen(port, "0.0.0.0", () => {
    console.log(`
\u2728 Server running at http://0.0.0.0:${port}`);
    console.log(`\u{1F4DD} WebSocket available at ws://0.0.0.0:${port}/ws`);
    console.log(`\u{1F4DD} Environment: ${isDev2 ? "development" : "production"}
`);
  });
  return server;
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
