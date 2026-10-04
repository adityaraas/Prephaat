import 'dotenv/config';
import {readFile,writeFile} from 'node:fs/promises';
import {putPublicFile} from '../storage.ts';
const pack=JSON.parse(await readFile('public/data/editorial-analysis.json','utf8'));
let uploaded=0;
for(const [id,note] of Object.entries(pack) as Array<[string,any]>){
  if(!/^[a-f0-9]{20}$/.test(id)||!note.diagram)continue;
  const key=`editorials/diagrams/v1/${id}.svg`;
  await putPublicFile(key,`public/editorial-diagrams/${id}.svg`,'image/svg+xml');
  note.diagramAsset=key;
  await writeFile('public/data/editorial-analysis.json',JSON.stringify(pack,null,2)+'\n');
  uploaded++;
}
console.log(`Stored ${uploaded} original diagrams in the configured S3 bucket.`);
