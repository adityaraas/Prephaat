const StudyEmphasis = (() => {
  const groups = [
    ['concept', /\b(?:United Nations|Security Council|NATO|BRICS|G20|G7|ASEAN|SAARC|BIMSTEC|SCO|QUAD|IMEC|INSTC|UNESCO|UNHCR|IAEA|WTO|IMF|World Bank|ECOWAS|African Union|Sahel|Indo-Pacific|South China Sea|strategic autonomy|multilateralism)\b/gi],
    ['rights', /\b(?:Fundamental Rights|Fundamental Duties|Directive Principles(?: of State Policy)?|Preamble|Basic Structure|judicial review|separation of powers|federalism|sovereignty|democracy)\b/gi],
    ['concept', /\b(?:Harappan|Mauryan|Gupta|Mughal|Buddhism|Jainism|photosynthesis|biodiversity|ecosystem|inflation|fiscal deficit|monsoon|plate tectonics|accountability|integrity)\b/gi],
    ['fact', /\b(?:Article\s+\d+[A-Za-z]?(?:\(\d+\))?|\d+(?:\.\d+)?\s*(?:%|BCE\b|CE\b))|\b(?:not|only|except|must|cannot)\b/gi]
  ];
  function highlight(root) {
    if (!root?.querySelectorAll || typeof document.createTreeWalker !== 'function') return;
    for (const p of root.querySelectorAll('.note p, .deep-topic > p, .reading-prose p, .reading-table p, .exam-trap p')) {
      if (p.dataset.emphasized) continue;
      p.dataset.emphasized = 'true';
      const walker = document.createTreeWalker(p, 4);
      const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
      for (const node of nodes) {
        if (node.parentElement.closest('mark, strong, a, code')) continue;
        const hits = [];
        for (const [kind, pattern] of groups) for (const match of node.textContent.matchAll(pattern)) hits.push({start:match.index,end:match.index+match[0].length,kind,text:match[0]});
        hits.sort((a,b)=>a.start-b.start || b.end-a.end);
        if (!hits.length) continue;
        const fragment = document.createDocumentFragment(); let cursor = 0;
        for (const hit of hits) {
          if (hit.start < cursor) continue;
          fragment.append(document.createTextNode(node.textContent.slice(cursor,hit.start)));
          const mark = document.createElement('mark'); mark.className = `study-highlight highlight-${hit.kind}`;
          const bold = document.createElement('strong'); bold.textContent = hit.text; mark.append(bold); fragment.append(mark); cursor = hit.end;
        }
        fragment.append(document.createTextNode(node.textContent.slice(cursor))); node.replaceWith(fragment);
      }
    }
  }
  return {highlight};
})();
