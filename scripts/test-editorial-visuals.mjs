import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validateAnalysis,getEditorialDiagramKey} from '../editorials.ts';
const pack=JSON.parse(readFileSync('public/data/editorial-analysis.json','utf8'));
const context=vm.createContext({});vm.runInContext(readFileSync('public/editorial-visuals.js','utf8')+'\nglobalThis.visual=EditorialVisuals;',context);
for(const [id,note] of Object.entries(pack)){
  validateAnalysis(note);
  assert.equal(note.diagram.nodes.length,3);
  const svg=context.visual.svg(note);
  assert.match(svg,/role="img"/);assert.match(svg,/<desc /);assert(!/undefined|NaN|\ufffd/.test(svg));
  assert.equal(svg,readFileSync(`public/editorial-diagrams/${id}.svg`,'utf8'));
  assert.equal(await getEditorialDiagramKey(id),`editorials/diagrams/v1/${id}.svg`);
  const legacy={...note};delete legacy.diagram;assert.match(context.visual.svg(legacy),/Concept connections/);
}
const first=Object.values(pack)[0];
assert.throws(()=>validateAnalysis({...first,diagram:{...first.diagram,nodes:[]}}));
assert.throws(()=>validateAnalysis({...first,diagram:{...first.diagram,nodes:[...first.diagram.nodes,...first.diagram.nodes]}}));
assert.throws(()=>validateAnalysis({...first,summary:'word '.repeat(210)}));
const safe=context.visual.svg({diagram:{title:'<script>alert(1)</script>',center:'<img onerror=bad>',caption:'<script>',nodes:[{label:'<svg onload=bad>',detail:'A & B'}]}});
assert(!safe.includes('<script>'));assert(!safe.includes('<img '));assert.match(safe,/&amp;/);
assert.equal(await getEditorialDiagramKey('../private'),undefined);
assert.equal(await getEditorialDiagramKey('0'.repeat(20)),undefined);
console.log(`PASS: ${Object.keys(pack).length} diagram assets, accessible SVG, legacy fallback, escaped content, strict diagram validation and allowlisted storage keys.`);
