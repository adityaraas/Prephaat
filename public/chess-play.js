(() => {
  const UNICODE = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
  const PST = {
    p: [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0],
    n: [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50],
    b: [-20,-10,-10,-10,-10,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,10,10,5,0,-10, -10,5,5,10,10,5,5,-10, -10,0,10,10,10,10,0,-10, -10,10,10,10,10,10,10,-10, -10,5,0,0,0,0,5,-10, -20,-10,-10,-10,-10,-10,-10,-20],
    r: [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0],
    q: [-20,-10,-10,-5,-5,-10,-10,-20, -10,0,0,0,0,0,0,-10, -10,0,5,5,5,5,0,-10, -5,0,5,5,5,5,0,-5, 0,0,5,5,5,5,0,-5, -10,5,5,5,5,5,0,-10, -10,0,5,0,0,0,0,-10, -20,-10,-10,-5,-5,-10,-10,-20],
    k: [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20],
  };
  const KNIGHT = [[1, 2], [1, -2], [-1, 2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]];
  const KING = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const BISHOP = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ROOK = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  const overlay = document.getElementById("chess-overlay");
  const boardEl = document.getElementById("chess-board");
  const statusEl = document.getElementById("chess-status");
  const openBtn = document.getElementById("bored-chess-open");
  if (!overlay || !boardEl || !openBtn) return;

  let board = [];
  let turn = "w";
  let castle = { wK: true, wQ: true, bK: true, bQ: true };
  let ep = -1;
  let selected = -1;
  let legalFrom = [];
  let lastMove = null;
  let over = "";
  let thinking = false;
  let animating = false;
  let squares = [];
  let dragFrom = -1;
  let skipClick = false;

  function fileOf(sq) {
    return sq % 8;
  }
  function rankOf(sq) {
    return (sq / 8) | 0;
  }
  function inBoard(f, r) {
    return f >= 0 && f < 8 && r >= 0 && r < 8;
  }
  function sqAt(f, r) {
    return r * 8 + f;
  }
  function other(c) {
    return c === "w" ? "b" : "w";
  }
  function cloneCastle() {
    return { wK: castle.wK, wQ: castle.wQ, bK: castle.bK, bQ: castle.bQ };
  }

  function startPos() {
    const empty = () => ({ t: "", c: "" });
    const p = (t, c) => ({ t, c });
    board = [];
    const back = ["r", "n", "b", "q", "k", "b", "n", "r"];
    for (let i = 0; i < 8; i++) board.push(p(back[i], "w"));
    for (let i = 0; i < 8; i++) board.push(p("p", "w"));
    for (let i = 0; i < 32; i++) board.push(empty());
    for (let i = 0; i < 8; i++) board.push(p("p", "b"));
    for (let i = 0; i < 8; i++) board.push(p(back[i], "b"));
    turn = "w";
    castle = { wK: true, wQ: true, bK: true, bQ: true };
    ep = -1;
    selected = -1;
    lastMove = null;
    over = "";
    thinking = false;
    animating = false;
    dragFrom = -1;
  }

  function findKing(color) {
    return board.findIndex((pc) => pc.t === "k" && pc.c === color);
  }

  function isAttacked(sq, by) {
    const f = fileOf(sq);
    const r = rankOf(sq);
    const dir = by === "w" ? 1 : -1;
    for (const df of [-1, 1]) {
      const nf = f + df;
      const nr = r - dir;
      if (inBoard(nf, nr)) {
        const pc = board[sqAt(nf, nr)];
        if (pc.t === "p" && pc.c === by) return true;
      }
    }
    for (const [df, dr] of KNIGHT) {
      const nf = f + df;
      const nr = r + dr;
      if (!inBoard(nf, nr)) continue;
      const pc = board[sqAt(nf, nr)];
      if (pc.t === "n" && pc.c === by) return true;
    }
    for (const [df, dr] of KING) {
      const nf = f + df;
      const nr = r + dr;
      if (!inBoard(nf, nr)) continue;
      const pc = board[sqAt(nf, nr)];
      if (pc.t === "k" && pc.c === by) return true;
    }
    for (const [df, dr] of BISHOP) {
      for (let s = 1; s < 8; s++) {
        const nf = f + df * s;
        const nr = r + dr * s;
        if (!inBoard(nf, nr)) break;
        const pc = board[sqAt(nf, nr)];
        if (!pc.t) continue;
        if (pc.c === by && (pc.t === "b" || pc.t === "q")) return true;
        break;
      }
    }
    for (const [df, dr] of ROOK) {
      for (let s = 1; s < 8; s++) {
        const nf = f + df * s;
        const nr = r + dr * s;
        if (!inBoard(nf, nr)) break;
        const pc = board[sqAt(nf, nr)];
        if (!pc.t) continue;
        if (pc.c === by && (pc.t === "r" || pc.t === "q")) return true;
        break;
      }
    }
    return false;
  }

  function inCheck(color) {
    const k = findKing(color);
    return k >= 0 && isAttacked(k, other(color));
  }

  function pushMove(list, from, to, extra = {}) {
    list.push({ from, to, ...extra });
  }

  function genPseudo(color) {
    const moves = [];
    const fwd = color === "w" ? 1 : -1;
    const startRank = color === "w" ? 1 : 6;
    const promoRank = color === "w" ? 7 : 0;
    for (let from = 0; from < 64; from++) {
      const pc = board[from];
      if (!pc.t || pc.c !== color) continue;
      const f = fileOf(from);
      const r = rankOf(from);
      if (pc.t === "p") {
        const n1 = sqAt(f, r + fwd);
        if (inBoard(f, r + fwd) && !board[n1].t) {
          if (r + fwd === promoRank) pushMove(moves, from, n1, { promo: "q" });
          else pushMove(moves, from, n1);
          const n2 = sqAt(f, r + fwd * 2);
          if (r === startRank && !board[n2].t) pushMove(moves, from, n2, { double: true });
        }
        for (const df of [-1, 1]) {
          const nf = f + df;
          const nr = r + fwd;
          if (!inBoard(nf, nr)) continue;
          const to = sqAt(nf, nr);
          if (board[to].t && board[to].c !== color) {
            if (nr === promoRank) pushMove(moves, from, to, { promo: "q" });
            else pushMove(moves, from, to);
          } else if (to === ep) {
            pushMove(moves, from, to, { ep: true });
          }
        }
      } else if (pc.t === "n") {
        for (const [df, dr] of KNIGHT) {
          const nf = f + df;
          const nr = r + dr;
          if (!inBoard(nf, nr)) continue;
          const to = sqAt(nf, nr);
          if (!board[to].t || board[to].c !== color) pushMove(moves, from, to);
        }
      } else if (pc.t === "k") {
        for (const [df, dr] of KING) {
          const nf = f + df;
          const nr = r + dr;
          if (!inBoard(nf, nr)) continue;
          const to = sqAt(nf, nr);
          if (!board[to].t || board[to].c !== color) pushMove(moves, from, to);
        }
        if (color === "w" && from === 4 && !inCheck("w")) {
          if (castle.wK && !board[5].t && !board[6].t && !isAttacked(5, "b") && !isAttacked(6, "b") && board[7].t === "r" && board[7].c === "w") {
            pushMove(moves, 4, 6, { castle: "K" });
          }
          if (castle.wQ && !board[3].t && !board[2].t && !board[1].t && !isAttacked(3, "b") && !isAttacked(2, "b") && board[0].t === "r" && board[0].c === "w") {
            pushMove(moves, 4, 2, { castle: "Q" });
          }
        }
        if (color === "b" && from === 60 && !inCheck("b")) {
          if (castle.bK && !board[61].t && !board[62].t && !isAttacked(61, "w") && !isAttacked(62, "w") && board[63].t === "r" && board[63].c === "b") {
            pushMove(moves, 60, 62, { castle: "k" });
          }
          if (castle.bQ && !board[59].t && !board[58].t && !board[57].t && !isAttacked(59, "w") && !isAttacked(58, "w") && board[56].t === "r" && board[56].c === "b") {
            pushMove(moves, 60, 58, { castle: "q" });
          }
        }
      } else {
        const rays = pc.t === "b" ? BISHOP : pc.t === "r" ? ROOK : [...BISHOP, ...ROOK];
        for (const [df, dr] of rays) {
          for (let s = 1; s < 8; s++) {
            const nf = f + df * s;
            const nr = r + dr * s;
            if (!inBoard(nf, nr)) break;
            const to = sqAt(nf, nr);
            if (!board[to].t) pushMove(moves, from, to);
            else {
              if (board[to].c !== color) pushMove(moves, from, to);
              break;
            }
          }
        }
      }
    }
    return moves;
  }

  function applyMove(move) {
    const piece = board[move.from];
    const captured = move.ep ? { ...board[move.to + (piece.c === "w" ? -8 : 8)] } : { ...board[move.to] };
    const undo = {
      from: move.from,
      to: move.to,
      piece: { ...piece },
      captured,
      epWas: ep,
      castle: cloneCastle(),
      epCapture: move.ep ? move.to + (piece.c === "w" ? -8 : 8) : -1,
      castleFlag: move.castle || "",
    };
    board[move.to] = { t: move.promo || piece.t, c: piece.c };
    board[move.from] = { t: "", c: "" };
    if (move.ep) board[undo.epCapture] = { t: "", c: "" };
    if (move.castle === "K") {
      board[5] = board[7];
      board[7] = { t: "", c: "" };
    } else if (move.castle === "Q") {
      board[3] = board[0];
      board[0] = { t: "", c: "" };
    } else if (move.castle === "k") {
      board[61] = board[63];
      board[63] = { t: "", c: "" };
    } else if (move.castle === "q") {
      board[59] = board[56];
      board[56] = { t: "", c: "" };
    }
    if (piece.t === "k") {
      if (piece.c === "w") {
        castle.wK = false;
        castle.wQ = false;
      } else {
        castle.bK = false;
        castle.bQ = false;
      }
    }
    if (piece.t === "r") {
      if (move.from === 0) castle.wQ = false;
      if (move.from === 7) castle.wK = false;
      if (move.from === 56) castle.bQ = false;
      if (move.from === 63) castle.bK = false;
    }
    if (captured.t === "r") {
      if (move.to === 0) castle.wQ = false;
      if (move.to === 7) castle.wK = false;
      if (move.to === 56) castle.bQ = false;
      if (move.to === 63) castle.bK = false;
    }
    ep = move.double ? move.from + (piece.c === "w" ? 8 : -8) : -1;
    return undo;
  }

  function revert(undo) {
    board[undo.from] = undo.piece;
    board[undo.to] = undo.epCapture >= 0 ? { t: "", c: "" } : undo.captured;
    if (undo.epCapture >= 0) board[undo.epCapture] = undo.captured;
    if (undo.castleFlag === "K") {
      board[7] = board[5];
      board[5] = { t: "", c: "" };
    } else if (undo.castleFlag === "Q") {
      board[0] = board[3];
      board[3] = { t: "", c: "" };
    } else if (undo.castleFlag === "k") {
      board[63] = board[61];
      board[61] = { t: "", c: "" };
    } else if (undo.castleFlag === "q") {
      board[56] = board[59];
      board[59] = { t: "", c: "" };
    }
    ep = undo.epWas;
    castle = undo.castle;
  }

  function legalMoves(color) {
    const out = [];
    for (const move of genPseudo(color)) {
      const undo = applyMove(move);
      if (!inCheck(color)) out.push(move);
      revert(undo);
    }
    return out;
  }

  function pst(type, sq, color) {
    const table = PST[type] || PST.p;
    const idx = color === "w" ? (7 - rankOf(sq)) * 8 + fileOf(sq) : sq;
    return table[idx];
  }

  function evaluate() {
    let score = 0;
    for (let sq = 0; sq < 64; sq++) {
      const pc = board[sq];
      if (!pc.t) continue;
      const val = VAL[pc.t] + pst(pc.t, sq, pc.c);
      score += pc.c === "b" ? val : -val;
    }
    return score;
  }

  function search(depth, alpha, beta, color) {
    const moves = legalMoves(color);
    if (!moves.length) {
      if (inCheck(color)) return color === "b" ? -99999 - depth : 99999 + depth;
      return 0;
    }
    if (depth === 0) return evaluate();
    moves.sort((a, b) => (board[b.to].t ? VAL[board[b.to].t] : 0) - (board[a.to].t ? VAL[board[a.to].t] : 0));
    if (color === "b") {
      let best = -Infinity;
      for (const move of moves) {
        const undo = applyMove(move);
        const val = search(depth - 1, alpha, beta, "w");
        revert(undo);
        if (val > best) best = val;
        if (best > alpha) alpha = best;
        if (alpha >= beta) break;
      }
      return best;
    }
    let best = Infinity;
    for (const move of moves) {
      const undo = applyMove(move);
      const val = search(depth - 1, alpha, beta, "b");
      revert(undo);
      if (val < best) best = val;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function computerMove() {
    const moves = legalMoves("b");
    if (!moves.length) return null;
    let best = [];
    let bestScore = -Infinity;
    const depth = moves.length > 28 ? 2 : 3;
    for (const move of moves) {
      const undo = applyMove(move);
      const score = search(depth - 1, -Infinity, Infinity, "w") + Math.random() * 4;
      revert(undo);
      if (score > bestScore + 8) {
        bestScore = score;
        best = [move];
      } else if (Math.abs(score - bestScore) <= 8) {
        if (score > bestScore) bestScore = score;
        best.push(move);
      }
    }
    return best[(Math.random() * best.length) | 0] || moves[0];
  }

  function finishIfOver() {
    const moves = legalMoves(turn);
    if (moves.length) {
      over = "";
      return false;
    }
    over = inCheck(turn)
      ? turn === "w"
        ? "Checkmate — computer wins."
        : "Checkmate — you win."
      : "Stalemate.";
    return true;
  }

  function statusText() {
    if (over) return over;
    if (thinking) return "Computer is thinking…";
    if (inCheck(turn)) return turn === "w" ? "Your king is in check." : "Computer is in check.";
    return turn === "w" ? "Your move (White)." : "Computer to move.";
  }

  function squareEl(sq) {
    return squares[sq];
  }

  function ensureBoard() {
    if (squares.length === 64 && boardEl.children.length >= 64) return;
    boardEl.innerHTML = "";
    squares = new Array(64);
    for (let rank = 7; rank >= 0; rank--) {
      for (let file = 0; file < 8; file++) {
        const sq = sqAt(file, rank);
        const light = (file + rank) % 2 === 1;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `chess-sq ${light ? "light" : "dark"}`;
        btn.dataset.sq = String(sq);
        const piece = document.createElement("span");
        piece.className = "chess-piece";
        btn.appendChild(piece);
        boardEl.appendChild(btn);
        squares[sq] = btn;
      }
    }
  }

  function paint(hideSq = -1) {
    ensureBoard();
    legalFrom = selected >= 0 && turn === "w" ? legalMoves("w").filter((m) => m.from === selected) : [];
    const legalTo = new Set(legalFrom.map((m) => m.to));
    statusEl.textContent = statusText();
    for (let sq = 0; sq < 64; sq++) {
      const btn = squares[sq];
      const pc = board[sq];
      const piece = btn.firstElementChild;
      const light = (fileOf(sq) + rankOf(sq)) % 2 === 1;
      btn.className = [
        "chess-sq",
        light ? "light" : "dark",
        selected === sq ? "sel" : "",
        legalTo.has(sq) ? "legal" : "",
        legalTo.has(sq) && pc.t ? "busy" : "",
        lastMove && (lastMove.from === sq || lastMove.to === sq) ? "last" : "",
      ]
        .filter(Boolean)
        .join(" ");
      if (!pc.t || sq === hideSq) {
        piece.textContent = "";
        piece.className = "chess-piece";
      } else {
        piece.textContent = UNICODE[pc.t];
        piece.className = `chess-piece ${pc.c === "w" ? "white" : "black"}`;
        piece.style.opacity = "";
      }
    }
  }

  function animateMove(move, done) {
    const fromBtn = squareEl(move.from);
    const toBtn = squareEl(move.to);
    const source = fromBtn?.querySelector(".chess-piece");
    if (!fromBtn || !toBtn || !source?.textContent) {
      applyMove(move);
      lastMove = { from: move.from, to: move.to };
      paint();
      done();
      return;
    }
    animating = true;
    const fromR = fromBtn.getBoundingClientRect();
    const toR = toBtn.getBoundingClientRect();
    const boardR = boardEl.getBoundingClientRect();
    const flyer = document.createElement("span");
    flyer.className = `${source.className} chess-flyer`;
    flyer.textContent = source.textContent;
    flyer.style.left = `${fromR.left - boardR.left}px`;
    flyer.style.top = `${fromR.top - boardR.top}px`;
    flyer.style.width = `${fromR.width}px`;
    flyer.style.height = `${fromR.height}px`;
    paint(move.from);
    const destPiece = toBtn.querySelector(".chess-piece");
    if (destPiece?.textContent) destPiece.style.opacity = "0.25";
    boardEl.appendChild(flyer);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flyer.style.transform = `translate(${toR.left - fromR.left}px, ${toR.top - fromR.top}px)`;
      });
    });
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      flyer.remove();
      applyMove(move);
      lastMove = { from: move.from, to: move.to };
      animating = false;
      paint();
      done();
    };
    flyer.addEventListener("transitionend", finish, { once: true });
    window.setTimeout(finish, 280);
  }

  function afterUserMove() {
    if (finishIfOver()) {
      paint();
      return;
    }
    thinking = true;
    paint();
    window.setTimeout(() => {
      const reply = computerMove();
      thinking = false;
      if (!reply) {
        turn = "w";
        finishIfOver();
        paint();
        return;
      }
      animateMove(reply, () => {
        turn = "w";
        finishIfOver();
        paint();
      });
    }, 160);
  }

  function playUser(to) {
    const move = legalFrom.find((m) => m.to === to);
    if (!move || animating) return;
    selected = -1;
    legalFrom = [];
    turn = "b";
    animating = true;
    skipClick = true;
    animateMove(move, afterUserMove);
  }

  function onSquare(sq) {
    if (over || thinking || animating || turn !== "w") return;
    if (selected >= 0 && legalFrom.some((m) => m.to === sq)) {
      playUser(sq);
      return;
    }
    if (board[sq].t && board[sq].c === "w") {
      selected = sq;
      paint();
      return;
    }
    selected = -1;
    paint();
  }

  function openGame() {
    startPos();
    overlay.hidden = false;
    ensureBoard();
    paint();
  }

  openBtn.addEventListener("click", openGame);
  document.getElementById("chess-new").addEventListener("click", () => {
    startPos();
    paint();
  });
  document.getElementById("chess-close").addEventListener("click", () => {
    overlay.hidden = true;
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) overlay.hidden = true;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) overlay.hidden = true;
  });
  boardEl.addEventListener("click", (event) => {
    if (skipClick) {
      skipClick = false;
      return;
    }
    const btn = event.target.closest("[data-sq]");
    if (btn) onSquare(Number(btn.dataset.sq));
  });
  boardEl.addEventListener("pointerdown", (event) => {
    const btn = event.target.closest("[data-sq]");
    if (!btn || over || thinking || animating || turn !== "w") return;
    const sq = Number(btn.dataset.sq);
    if (!(board[sq].t && board[sq].c === "w")) return;
    dragFrom = sq;
    selected = sq;
    paint();
    try {
      btn.setPointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
  });
  boardEl.addEventListener("pointerup", (event) => {
    if (dragFrom < 0) return;
    const from = dragFrom;
    dragFrom = -1;
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const btn = under?.closest?.("[data-sq]");
    const sq = btn ? Number(btn.dataset.sq) : from;
    if (sq !== from && legalFrom.some((m) => m.to === sq)) playUser(sq);
  });
})();
