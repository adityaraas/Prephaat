import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';
const code=await readFile('public/theme.js','utf8');
function boot(saved, blocked=false){
  let init, change, writes=[];
  const select={value:'',addEventListener(event,cb){assert.equal(event,'change');change=cb;}};
  const status={textContent:''};
  const label={innerHTML:'',querySelector(selector){return selector==='select'?select:status;}};
  const host={append(node){assert.equal(node,label);}};
  const document={documentElement:{dataset:{}},getElementById:()=>null,querySelector:()=>host,createElement:()=>label,addEventListener(event,cb){assert.equal(event,'DOMContentLoaded');init=cb;}};
  const context=vm.createContext({document,localStorage:{getItem(){if(blocked)throw Error('blocked');return saved;},setItem(k,v){if(blocked)throw Error('blocked');writes.push([k,v]);}}});
  vm.runInContext(code,context);
  init();
  return {document,select,status,writes,change};
}
for(const name of ['forest','navy','plum']){
  const t=boot(name);assert.equal(t.document.documentElement.dataset.theme,name);assert.equal(t.select.value,name);
  t.select.value=name==='navy'?'plum':'navy';t.change();assert.equal(t.document.documentElement.dataset.theme,t.select.value);assert.equal(t.writes[0][1],t.select.value);
}
const invalid=boot('not-a-theme');assert.equal(invalid.select.value,'forest');
const denied=boot('navy',true);denied.select.value='plum';denied.change();assert.equal(denied.document.documentElement.dataset.theme,'plum');assert.match(denied.status.textContent,/storage is unavailable/);
for(const file of (await readdir('public')).filter(f=>f.endsWith('.html'))){
  const html=await readFile(`public/${file}`,'utf8');
  assert.equal((html.match(/href="\/theme.css"/g)||[]).length,1,`${file} theme missing or duplicate`);
  assert.equal((html.match(/src="\/theme.js"/g)||[]).length,1,`${file} theme script missing or duplicate`);
}
function luminance(hex){const rgb=hex.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
const css=await readFile('public/theme.css','utf8');
for(const name of ['forest','navy','plum']){
  const block=css.match(new RegExp('\\[data-theme="'+name+'"\\]\\{([^}]+)'))[1];
  const vars=Object.fromEntries([...block.matchAll(/--([\w-]+):(#\w+)/g)].map(m=>[m[1],m[2]]));
  for(const [a,b] of [['site-ink','site-bg'],['site-muted','site-card'],['site-on-header','site-header']]) assert.ok(contrast(vars[a],vars[b])>=4.5,`${name}: ${a} contrast`);
  assert.ok(contrast('#ffffff',vars['site-primary'])>=4.5,`${name}: primary button contrast`);
}
assert.ok(contrast('#604a18','#fff3c4')>=4.5);
console.log('PASS: all pages themed, three palette choices, persistence, blocked storage recovery and main text/button/yellow-highlight contrast.');
