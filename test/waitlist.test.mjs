import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';

test('double opt-in sends a one-use expiring link and exports only confirmed registrations',async()=>{
 const dir=await mkdtemp(tmpdir()+'/tensa-doi-'),base='http://127.0.0.1:3138',capture=dir+'/mail.jsonl';
 const child=spawn(process.execPath,['--import','./test/fixtures/mail-capture.mjs','server/server.mjs'],{env:{...process.env,NODE_ENV:'test',PORT:'3138',DATA_DIR:dir,ADMIN_PASSWORD:'fixture-password',RESEND_API_KEY:'fixture-key',MAIL_FROM:'TENSA <launch@example.com>',PUBLIC_URL:base,SHOP_OPERATOR:'Testanbieter',SHOP_ADDRESS:'Teststraße 1, 12345 Teststadt',CONTACT_EMAIL:'test@example.com',PRIVACY_RETENTION_TEXT:'Testfrist',TEST_MAIL_CAPTURE:capture},stdio:['ignore','pipe','pipe']});
 const post=(path,payload,origin)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify(payload)});
 let db;
 try{
  await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',()=>reject(Error('Mail test server exited')))});
  db=new DatabaseSync(dir+'/tensa.sqlite');
  for(const origin of ['https://www.tensa.shop','https://tensa.shop'])assert.equal((await post('/api/waitlist',{email:'',consent:false},origin)).status,400,'TENSA origins reach input validation');
  assert.equal((await post('/api/waitlist',{email:'',consent:false},'https://other.example')).status,403);
  assert.equal((await post('/api/waitlist',{email:'first@example.com',consent:true})).status,202);
  const mails=()=>readFile(capture,'utf8').then(s=>s.trim().split('\n').map(JSON.parse));
  let sent=await mails();assert.equal(sent.length,1);assert.deepEqual(sent[0].to,['first@example.com']);
  const token=new URL(sent[0].html.match(/href="([^"]+)"/)[1]).searchParams.get('token');
  let row=db.prepare('SELECT * FROM subscribers WHERE email=?').get('first@example.com');
  assert.equal(row.confirmed_at,null);assert.equal(row.discount,null);assert.equal(row.token_hash,createHash('sha256').update(token).digest('hex'));assert.notEqual(row.token_hash,token);
  const login=await post('/api/admin/login',{password:'fixture-password'});const headers={Cookie:login.headers.get('set-cookie').split(';')[0]};
  assert.doesNotMatch(await(await fetch(base+'/api/admin/export',{headers})).text(),/first@example.com/);
  await post('/api/waitlist',{email:'FIRST@example.com',consent:true});assert.equal((await mails()).length,1);
  assert.equal((await fetch(base+'/confirm?token='+token,{redirect:'manual'})).headers.get('location'),'/gate?confirmation=success');
  row=db.prepare('SELECT * FROM subscribers WHERE email=?').get('first@example.com');assert(row.confirmed_at);assert.equal(row.token_hash,null);assert.equal(row.discount_percent,15);
  assert.match(await(await fetch(base+'/api/admin/export',{headers})).text(),/first@example.com/);
  assert.equal((await fetch(base+'/confirm?token='+token,{redirect:'manual'})).headers.get('location'),'/gate?confirmation=expired');
  await post('/api/waitlist',{email:'expired@example.com',consent:true});sent=await mails();const expiredLink=sent.at(-1).html.match(/href="([^"]+)"/)[1];db.prepare('UPDATE subscribers SET token_expires=? WHERE email=?').run(Date.now()-1,'expired@example.com');
  assert.equal((await fetch(expiredLink,{redirect:'manual'})).headers.get('location'),'/gate?confirmation=expired');
  await post('/api/waitlist',{email:'trap@example.com',consent:true,website:'spam'});assert.equal(db.prepare('SELECT count(*) n FROM subscribers WHERE email=?').get('trap@example.com').n,0);
 }finally{db?.close();const exit=new Promise(resolve=>child.once('exit',resolve));child.kill();await exit;await rm(dir,{recursive:true,force:true})}
});
