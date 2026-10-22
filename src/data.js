import Papa from 'papaparse'
// Expected columns: order_id,date,customer,region,product,quantity,unit_price[,sales_rep]
export function parseCsv(text){
  const {data}=Papa.parse(text.trim(),{header:true,skipEmptyLines:true,dynamicTyping:false})
  return normalize(data)
}
export function normalize(rows){
  return rows.map(r=>{
    const q=+r.quantity||0, p=+r.unit_price||0
    return {order_id:r.order_id, date:String(r.date).slice(0,10), customer:r.customer, region:r.region||'—', product:r.product, quantity:q, unit_price:p, revenue: r.revenue!=null&&r.revenue!==''? +r.revenue : q*p, sales_rep:r.sales_rep||''}
  }).filter(r=>r.date&&r.product&&r.customer)
}
export async function loadUrl(url){
  const res=await fetch(url); const ct=res.headers.get('content-type')||''
  if(ct.includes('json')){ const j=await res.json(); return normalize(Array.isArray(j)?j:j.data||[]) }
  return parseCsv(await res.text())
}
export const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0)
export const groupBy=(a,f)=>a.reduce((m,x)=>{const k=f(x);(m[k]||(m[k]=[])).push(x);return m},{})
export const fmt=n=>n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0})
