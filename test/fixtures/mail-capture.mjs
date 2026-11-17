// Local-only mail transport for the HTTP double-opt-in test. Never contacts Resend.
import {appendFileSync} from 'node:fs';
globalThis.fetch=async (url,options)=>{
  if(String(url)!=='https://api.resend.com/emails')throw Error('Unexpected network call in mail test');
  appendFileSync(process.env.TEST_MAIL_CAPTURE,JSON.stringify(JSON.parse(options.body))+'\n');
  return new Response(JSON.stringify({id:'local-mail'}),{status:200});
};
