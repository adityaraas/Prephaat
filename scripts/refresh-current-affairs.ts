import {writeFile} from 'node:fs/promises';
import {getCurrentAffairsArchive} from '../current-affairs.ts';

const archive=await getCurrentAffairsArchive();
if(!archive.liveAvailable)throw Error('No live sources responded. The existing published snapshot has been retained.');
await writeFile(new URL('../public/data/current-affairs-latest.json',import.meta.url),JSON.stringify(archive,null,2)+'\n');
const items=archive.months.flatMap(month=>month.items);
console.log(JSON.stringify({coverage:archive.range.end,latestSource:archive.latestPublished,issues:items.length,liveHeadlines:items.filter(item=>item.kind==='Live source headline').length}));
