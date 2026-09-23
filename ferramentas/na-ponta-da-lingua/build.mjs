import { readFile, writeFile } from 'node:fs/promises';
const engine=await readFile(new URL('src/engine.mjs',import.meta.url),'utf8');
const app=await readFile(new URL('src/app.mjs',import.meta.url),'utf8');
const css=await readFile(new URL('src/style.css',import.meta.url),'utf8');
const page=await readFile(new URL('src/page.html',import.meta.url),'utf8');
// Two local modules, no third-party dependencies. Keep output usable as a standalone file.
const js=engine.replace(/^export /gm,'')+'\n'+app.replace(/^import .*from '\.\/engine\.mjs';\r?\n/,'');
if (js.toLowerCase().includes('</script')) throw new Error('Unexpected script terminator');
await writeFile(new URL('index.html',import.meta.url),page.replace('/*STYLE*/',css).replace('/*APP*/',()=>js));
