import {test} from 'node:test';
import assert from 'node:assert/strict';
import {legalPage,legalProfile} from '../server/legal.mjs';

test('imprint contains operator and contact details, not the privacy policy',()=>{
 const env={SHOP_OPERATOR:'Sample <operator>',SHOP_ADDRESS:'Teststraße 1\n12345 Musterstadt',CONTACT_EMAIL:'test@example.com',PRIVACY_RETENTION_TEXT:'Testfrist'};
 const html=legalPage('imprint',env);
 assert.match(html,/Sample &lt;operator&gt;/);assert.match(html,/Teststraße 1<br>12345 Musterstadt/);assert.match(html,/mailto:test@example.com/);
 assert.doesNotMatch(html,/Double-Opt-in|Speicherdauer|Hosting und E-Mail/);
 assert(legalProfile(env).complete);
});
test('privacy uses the supplied retention policy and reports missing details honestly',()=>{
 assert.match(legalPage('privacy',{PRIVACY_RETENTION_TEXT:'Unbestätigte Einträge: 7 Tage.'}),/Unbestätigte Einträge: 7 Tage/);
 assert.match(legalPage('privacy',{}),/noch unvollständig/);
 assert.equal(legalProfile({SHOP_OPERATOR:'TENSA',CONTACT_EMAIL:'test@example.com'}).complete,false);
});
