const EditorialVisuals = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function model(analysis) {
    if (analysis.diagram) return analysis.diagram;
    return {title:'Concept connections',caption:'A study concept map: branches organise related ideas, rather than imply a causal sequence.',center:'Understand the issue',nodes:analysis.concepts.slice(0,3).map(concept=>({label:concept.term,detail:concept.explanation}))};
  }
  function lines(value,width=34) {
    const result=[];let line='';
    for(const word of String(value).split(/\s+/)){if(line&&(line+' '+word).length>width){result.push(line);line=word;}else line+=(line?' ':'')+word;}
    if(line)result.push(line);return result;
  }
  function svg(analysis) {
    const diagram=model(analysis),nodes=diagram.nodes.slice(0,4);
    const heights=nodes.map(node=>Math.max(125,70+lines(node.label,55).length*25+lines(node.detail,76).length*21));
    const height=140+heights.reduce((sum,h)=>sum+h+20,0);
    const label=(value,x,y,width,size,color)=>lines(value,width).map((line,index)=>`<text x="${x}" y="${y+index*(size+7)}" font-family="Arial, sans-serif" font-size="${size}" fill="${color}">${esc(line)}</text>`).join('');
    let offset=145;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 ${height}" role="img" aria-labelledby="ed-diagram-title ed-diagram-desc"><title id="ed-diagram-title">${esc(diagram.title)}</title><desc id="ed-diagram-desc">${esc(diagram.caption)} ${nodes.map(node=>esc(node.label+': '+node.detail)).join(' ')}</desc><rect width="760" height="${height}" rx="20" fill="#f1f6f0"/><rect x="30" y="28" width="700" height="82" rx="14" fill="#244f42"/>${label(diagram.center,52,61,52,22,'#ffffff')}${nodes.map((node,index)=>{const y=offset;offset+=heights[index]+20;return `<path d="M65 110V${y+50}H98" stroke="#91aa96" stroke-width="3" fill="none"/><rect x="100" y="${y}" width="630" height="${heights[index]}" rx="12" fill="#ffffff" stroke="#b9cdbd"/>${label(node.label,120,y+30,55,18,'#244f42')}${label(node.detail,120,y+40+lines(node.label,55).length*25,76,14,'#374a3d')}`;}).join('')}</svg>`;
  }
  return {model,svg};
})();
