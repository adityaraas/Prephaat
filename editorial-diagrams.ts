import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {PutObjectCommand} from '@aws-sdk/client-s3';
import {s3,SURVEY_BUCKET} from './storage.ts';
let renderer: {svg:(analysis:unknown)=>string} | undefined;
export async function storeEditorialDiagram(id:string,analysis:unknown) {
  if(process.env.EDITORIAL_DIAGRAM_STORAGE === 'off' || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) return undefined;
  if(!/^[a-f0-9]{20}$/.test(id))throw new Error('Invalid diagram identifier');
  if(!renderer){
    const context=vm.createContext({});
    vm.runInContext(await readFile(new URL('./public/editorial-visuals.js',import.meta.url),'utf8')+'\nglobalThis.renderer=EditorialVisuals;',context);
    renderer=context.renderer;
  }
  const key=`editorials/diagrams/v1/${id}.svg`;
  await s3.send(new PutObjectCommand({Bucket:SURVEY_BUCKET,Key:key,Body:renderer!.svg(analysis),ContentType:'image/svg+xml'}),{abortSignal:AbortSignal.timeout(8000)});
  return key;
}
