export function employerCharge({kind='wallet',quantity=1,months=1,discounts={}}={}){
 if(kind==='wallet'){
  const jobs=Math.max(1,Math.min(50,Math.floor(Number(quantity)||1)));
  return {kind:'wallet',quantity:jobs,months:0,discount_percent:0,amount_kobo:550000*jobs};
 }
 const duration=Math.max(1,Math.min(12,Math.floor(Number(months)||1)));
 if(duration===12){
  const regularAnnual=5050000*12, annual=55000000;
  const discount=Number(((regularAnnual-annual)/regularAnnual*100).toFixed(2));
  return {kind:'unlimited',quantity:1,months:12,discount_percent:discount,amount_kobo:annual};
 }
 const tier=duration>=6?6:duration>=3?3:0;
 const discount=tier?Math.max(0,Math.min(50,Number(discounts[`unlimited_discount_${tier}m_percent`]||0))):0;
 return {kind:'unlimited',quantity:1,months:duration,discount_percent:discount,amount_kobo:Math.round(5050000*duration*(1-discount/100))};
}
