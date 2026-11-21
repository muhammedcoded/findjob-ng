import test from 'node:test';
import assert from 'node:assert/strict';
import {employerCharge} from '../billing.mjs';

test('pay as you go wallet credits cost ₦5,500 each',()=>{
 assert.deepEqual(employerCharge({kind:'wallet',quantity:3}),{kind:'wallet',quantity:3,months:0,discount_percent:0,amount_kobo:1650000});
});
test('wallet quantity is bounded',()=>assert.equal(employerCharge({kind:'wallet',quantity:999}).quantity,50));
test('one month Unlimited costs ₦50,500',()=>assert.equal(employerCharge({kind:'unlimited',months:1}).amount_kobo,5050000));
test('longer Unlimited terms apply configured discounts',()=>{
 assert.equal(employerCharge({kind:'unlimited',months:3,discounts:{unlimited_discount_3m_percent:5}}).amount_kobo,14392500);
 assert.equal(employerCharge({kind:'unlimited',months:6,discounts:{unlimited_discount_6m_percent:10}}).amount_kobo,27270000);
 assert.equal(employerCharge({kind:'unlimited',months:12,discounts:{unlimited_discount_12m_percent:15}}).amount_kobo,51510000);
});
test('Unlimited duration is limited to twelve months',()=>assert.equal(employerCharge({kind:'unlimited',months:24}).months,12));
