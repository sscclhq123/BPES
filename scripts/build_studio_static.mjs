// Export an already built, locally running vinext server for this static Vercel shell.
import {cp, mkdir, writeFile, access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const origin=new URL(process.argv[2]||'http://localhost:5203');
if(!['localhost','127.0.0.1'].includes(origin.hostname))throw Error('Use the local built server');
const root=new URL('../',import.meta.url);
const response=await fetch(origin);
if(!response.ok)throw Error(`Render failed: ${response.status}`);
const html=await response.text();
if(!html.includes('SALDDP')||!html.includes('/_next/static/'))throw Error('Unexpected render');
const assetDir=new URL('studio-source/dist/client/_next/',root);
await access(assetDir);
await mkdir(new URL('studio/_next/',root),{recursive:true});
await cp(assetDir,new URL('studio/_next/',root),{recursive:true});
await writeFile(new URL('studio/index.html',root),html);
console.log(`Exported ${fileURLToPath(new URL('studio/index.html',root))}`);
