// Windows adapter for the canonical Sites packager; staging uses its own validator.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';
const [prepareHelper,archiveArg,expectedCommit]=process.argv.slice(2);
if(!prepareHelper||!archiveArg||!expectedCommit)throw Error('Usage: node scripts/package-portable.mjs PREPARE_HELPER ARCHIVE VERIFIED_COMMIT');
const project=fs.realpathSync(process.cwd()),archive=path.resolve(archiveArg);
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(commit!==expectedCommit||execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Source changed after verification.');
const runtime=fs.realpathSync(path.join(project,'.sites-runtime'));
if(!runtime.toLowerCase().startsWith((project+path.sep).toLowerCase()))throw Error('Runtime must stay inside the project.');
const stage=fs.mkdtempSync(path.join(runtime,'pack-'));
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
try{
 const output=path.join(stage,'dist');
 const kind=execFileSync(process.execPath,[path.resolve(prepareHelper),project,output],{encoding:'utf8'}).trim();
 const source=read(path.join(project,'.openai','hosting.json'));
 const builtPath=path.join(project,'dist','.openai','hosting.json');
 const built=fs.existsSync(builtPath)?read(builtPath):{};
 if(source.artifact_metadata!=null&&built.artifact_metadata!=null&&!isDeepStrictEqual(source.artifact_metadata,built.artifact_metadata))throw Error('Conflicting build attribution.');
 fs.mkdirSync(path.join(output,'.openai'),{recursive:true});
 const hostingPath=path.join(output,'.openai','hosting.json');
 const hosting=kind==='worker'?source:read(hostingPath);
 const attribution=built.artifact_metadata??source.artifact_metadata;
 if(attribution!=null)hosting.artifact_metadata=attribution;
 fs.writeFileSync(hostingPath,JSON.stringify(hosting,null,2)+'\n');
 if(fs.existsSync(path.join(project,'drizzle'))){
  const migrations=path.join(output,'.openai','drizzle');
  fs.cpSync(path.join(project,'drizzle'),migrations,{recursive:true});
  // D1 maintenance executors may separate statements at line boundaries.
  // Keep source migrations immutable; emit complete trigger bodies on one line.
  for(const filename of fs.readdirSync(migrations).filter(f=>f.endsWith('.sql'))){
   const file=path.join(migrations,filename),original=fs.readFileSync(file,'utf8');
   if(filename!=='0001_stock_guards.sql')continue;
   const sql=original.split('--> statement-breakpoint').map(block=>{
    const cleaned=block.replace(/^\s*--[^\r\n]*(?:\r?\n|$)/gm,'').trim();
    // The initial trigger migration failed before this Site was ever live.
    // Its stock behavior is now enforced by the atomic append in lib/stock.mjs.
    // Keep the historical source unchanged, and retain only the bounded indexes
    // in this pending deployment migration. The next migration defines balances.
    if(/^CREATE TRIGGER\b/i.test(cleaned))return null;
    if(/^CREATE INDEX\b/i.test(cleaned))return cleaned.replace(/^CREATE INDEX\s+/i,'CREATE INDEX IF NOT EXISTS ');
    return block;
   }).filter(block=>block!=null&&block.trim()).join('\n--> statement-breakpoint\n');
   fs.writeFileSync(file,sql+'\n');
  }
  execFileSync(process.execPath,[path.join(project,'scripts','check-stock.mjs'),migrations]);
 }
 fs.mkdirSync(path.dirname(archive),{recursive:true});
 const tar=process.platform==='win32'?path.join(process.env.SystemRoot||'C:/Windows','System32','tar.exe'):'tar';
 execFileSync(tar,['-C',stage,'-czf',archive,'dist']);
 const entries=execFileSync(tar,['-tzf',archive],{encoding:'utf8'}).split(/\r?\n/);
 if(!entries.includes('dist/.openai/hosting.json'))throw Error('Archive lacks hosting manifest.');
 if(kind==='worker'&&!entries.includes('dist/server/index.js'))throw Error('Archive lacks Worker entrypoint.');
 console.log(JSON.stringify({project_id:source.project_id,commit_sha:commit,archive}));
}finally{
 const resolved=fs.realpathSync(stage);
 if(!resolved.toLowerCase().startsWith((runtime+path.sep).toLowerCase()))throw Error('Cleanup target left the runtime directory.');
 fs.rmSync(resolved,{recursive:true,force:true});
}
