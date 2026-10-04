import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync('public/chess-play.js', 'utf8');
const initial = Array.from({ length: 64 }, (_, sq) => {
  const rank = Math.floor(sq / 8), back = ['r','n','b','q','k','b','n','r'];
  return { t: rank === 0 || rank === 7 ? back[sq % 8] : rank === 1 || rank === 6 ? 'p' : '', c: rank < 2 ? 'w' : rank > 5 ? 'b' : '' };
});
const engine = vm.createContext({});
vm.runInContext(source.replace('  if (!document) {', `
  globalThis.rules = { legalMoves, applyMove, revert, inCheck,
    load(value, rights = { wK: true, wQ: true, bK: true, bQ: true }, target = -1) { board = structuredClone(value); castle = rights; ep = target; },
    state() { return JSON.stringify({ board, castle, ep }); } };
  if (!document) {`), engine);
// Supply a clone helper explicitly to the isolated engine.
engine.structuredClone = structuredClone;
engine.rules.load(initial);
function perft(color, depth) {
  if (!depth) return 1;
  let count = 0;
  for (const move of engine.rules.legalMoves(color)) { const undo = engine.rules.applyMove(move); count += perft(color === 'w' ? 'b' : 'w', depth - 1); engine.rules.revert(undo); }
  return count;
}
assert.equal(perft('w', 1), 20);
assert.equal(perft('w', 2), 400);
assert.equal(perft('w', 3), 8902);
const before = engine.rules.state();
for (const move of engine.rules.legalMoves('w')) { const undo = engine.rules.applyMove(move); engine.rules.revert(undo); assert.equal(engine.rules.state(), before); }
const afterE4 = structuredClone(initial); afterE4[28] = afterE4[12]; afterE4[12] = { t: '', c: '' };
let actualReply;
engine.postMessage = move => { actualReply = move; };
engine.onmessage({ data: { board: afterE4, castle: { wK: true, wQ: true, bK: true, bQ: true }, ep: 20 } });
assert(engine.rules.legalMoves('b').some(move => move.from === actualReply.from && move.to === actualReply.to), 'The actual worker must return a legal reply');

class Element {
  constructor(id = '') { this.id = id; this.children = []; this.dataset = {}; this.events = {}; this.attributes = {}; this.style = { removeProperty(key) { delete this[key]; } }; this.className = ''; this.textContent = ''; this.disabled = false; this.hidden = false; }
  get classList() { const self = this; return { add(...names) { self.className += ' ' + names.join(' '); }, remove(...names) { self.className = self.className.split(' ').filter(n => !names.includes(n)).join(' '); } }; }
  set innerHTML(value) { this.children = []; }
  get firstElementChild() { return this.children[0]; }
  get offsetWidth() { return 50; }
  get offsetHeight() { return 50; }
  appendChild(el) { el.parent = this; this.children.push(el); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(el => el !== this); }
  querySelector() { return this.children[0]; }
  querySelectorAll(selector) { return this.children.filter(el => el.className.includes(selector.slice(1))); }
  addEventListener(name, cb) { this.events[name] = cb; }
  setAttribute(name, value) { this.attributes[name] = value; }
  getBoundingClientRect() { const sq = Number(this.dataset.sq) || 0; return { left: sq % 8 * 50, top: (7 - Math.floor(sq / 8)) * 50, width: 50, height: 50 }; }
  focus() { document.activeElement = this; }
  closest() { return this.dataset.sq === undefined ? this.parent?.closest() : this; }
  setPointerCapture() {}
  cloneNode() { const el = new Element(); el.className = this.className; el.textContent = this.textContent; return el; }
}
const ids = ['chess-overlay','chess-board','chess-status','bored-chess-open','chess-undo','chess-new','chess-close','chess-moves'];
const elements = new Map(ids.map(id => [id, new Element(id)]));
const document = { body: new Element(), getElementById: id => elements.get(id), createElement: () => new Element(), addEventListener() {} };
let nextTimer = 0, worker;
const timers = new Map(), frames = new Map();
const ui = vm.createContext({ document, structuredClone,
  window: { matchMedia: () => ({ matches: false }) },
  setTimeout(cb, delay) { const id = ++nextTimer; timers.set(id, { cb, delay }); return id; }, clearTimeout: id => timers.delete(id),
  requestAnimationFrame(cb) { const id = ++nextTimer; frames.set(id, cb); return id; }, cancelAnimationFrame: id => frames.delete(id),
  Worker: class { constructor() { worker = this; } postMessage(value) { this.position = structuredClone(value); } terminate() { this.terminated = true; } },
});
vm.runInContext(source.replace(/\}\)\(\);\s*$/, `globalThis.game = { onSquare, state: () => ({ board: structuredClone(board), turn, history: history.length, thinking, animating }) }; })();`), ui);
const fire = id => elements.get(id).events.click({});
function tick(delay) { const task = [...timers.entries()].find(([, task]) => task.delay === delay); assert(task, `Expected timer ${delay}`); timers.delete(task[0]); task[1].cb(); }
fire('bored-chess-open');
assert.equal(elements.get('chess-board').children.length, 64);
ui.game.onSquare(12); ui.game.onSquare(28); // e2-e4
const staleAnimation = [...timers.values()].find(task => task.delay === 240).cb;
fire('chess-new'); staleAnimation();
assert.equal(ui.game.state().history, 0, 'An old animation must not change a new game');
assert.equal(ui.game.state().board[12].t, 'p');
ui.game.onSquare(12); ui.game.onSquare(28); tick(240); tick(100);
assert(worker.position && ui.game.state().thinking, 'Computer calculation is dispatched to a worker');
worker.onmessage({ data: { from: 52, to: 36, double: true } }); tick(240);
assert.equal(ui.game.state().turn, 'w');
assert.equal(ui.game.state().history, 2);
// The next real click must select a piece, rather than being silently consumed.
elements.get('chess-board').events.click({ target: elements.get('chess-board').children.find(el => el.dataset.sq === '6') });
assert(elements.get('chess-board').children.find(el => el.dataset.sq === '6').className.includes('sel'));
fire('chess-undo');
assert.equal(ui.game.state().history, 0);
assert.deepEqual(ui.game.state().board, initial);
ui.game.onSquare(12); ui.game.onSquare(28); tick(240); tick(100);
const staleWorker = worker;
fire('chess-new'); staleWorker.onmessage({ data: { from: 52, to: 36 } });
assert.equal(ui.game.state().history, 0, 'An old computer reply must not change a new game');
assert(staleWorker.terminated);
fire('chess-close'); fire('bored-chess-open');
assert.equal(elements.get('chess-overlay').hidden, false);
const boardElement = elements.get('chess-board');
const e2 = boardElement.children.find(el => el.dataset.sq === '12');
const e4 = boardElement.children.find(el => el.dataset.sq === '28');
document.elementFromPoint = () => e4;
boardElement.events.pointerdown({ target: e2, pointerId: 1, button: 0, clientX: 225, clientY: 325 });
boardElement.events.pointermove({ pointerId: 1, clientX: 225, clientY: 225 });
// Flush both leftover animation frames and the current drag frame.
while (frames.size) { const [id, callback] = frames.entries().next().value; frames.delete(id); callback(); }
assert(boardElement.children.some(el => el.className.includes('chess-drag-piece') && el.style.transform.includes('translate3d')));
boardElement.events.pointerup({ pointerId: 1, clientX: 225, clientY: 225 });
assert.equal(ui.game.state().board[28].t, 'p');
assert.equal(ui.game.state().history, 1);
assert(!boardElement.children.some(el => el.className.includes('chess-drag-piece')));
tick(0);
fire('chess-undo');
assert.equal(ui.game.state().history, 0, 'Undo can also cancel a pending computer turn');
console.log('PASS: legal opening trees (20/400/8902), reversible moves, worker dispatch, consecutive clicks, undo, resume and cancellation of stale animations/computer replies.');
