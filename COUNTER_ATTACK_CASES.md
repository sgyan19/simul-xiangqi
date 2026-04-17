# 防反特殊案例说明

## 基本规则回顾

### 防反结算流程
1. 基于 capture/move 结算后的棋盘状态进行检查
2. 检查每个 capturer 是否被敌方棋子攻击到
3. 被防反的棋子**打上待移除标记**，但**仍然留在棋盘上**
4. **打标记不改变棋盘状态**（不阻塞、不移除）
5. 所有防反标记打完后再**统一移除**

### 关键点
- 防反标记不干扰当前棋盘上的子力情况
- 被标记的棋子仍在棋盘上，可以阻挡、可以作为炮台
- 最后统一移除所有被打上防反标记的棋子

---

## 特殊案例分析

### 案例1：阻挡型

**场景：**
- 红A：capturer，本回合动了
- 黑B：capturer，本回合动了
- 黑C：未动，在红A和黑B之间

**初始状态（capture结算后）：**
```
黑C —— 黑B（待移除） —— 红A
```

**结算过程：**
1. 检查黑B：被红D攻击 → 打上待移除标记（但还在棋盘上）
2. 检查红A：黑C要攻击红A，但黑B在中间阻挡
3. 黑C打不到红A

**结果：红A不被防反**

**原因：** 黑B虽然被标记待移除，但仍在棋盘上阻挡黑C的攻击路径。

---

### 案例2：炮台式

**场景：**
- 红A：capturer，本回合动了
- 黑B：capturer，本回合动了
- 黑C：未动，是炮，位于红A同列/同行，黑B在黑C和红A之间

**初始状态（capture结算后）：**
```
黑C（炮）—— 黑B（待移除，炮台）—— 红A
```

**结算过程：**
1. 检查黑B：被红D攻击 → 打上待移除标记（但还在棋盘上）
2. 检查红A：黑C要攻击红A，需要炮台
3. 黑B虽然在待移除列表中，但**仍在棋盘上可以作为炮台**
4. 黑C借助黑B作为炮台，打到红A

**结果：红A被防反**

**原因：** 被防反标记的棋子仍在棋盘上，可以作为炮台帮助其他棋子攻击目标。

---

## 代码实现要点

当前代码（`src/shared/settlement.ts`）的实现：

```typescript
// 防反检查使用 finalPieces 数组
// finalPieces 包含所有被标记为待移除的棋子（还没移除）
for (const blackPiece of finalPieces.filter(p => p.side === 'black')) {
  const canCapture = canCapturePosition(blackPiece, redCapturerNewPos, finalPieces);
  if (!movedThisTurn && canCapture) {
    toRemoveByCounterAttack.push(redCapturerInFinal.id); // 打标记，不移除
  }
}

// 最后统一移除
finalPieces = finalPieces.filter(p => !toRemoveByCounterAttack.includes(p.id));
```

这样保证了：
1. 检查时，被防反的棋子仍然在数组中，可以阻挡或作为炮台
2. 统一移除时，所有打上标记的棋子才真正从数组中删除
