import { useEffect, useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { parseCsv, loadUrl, sum, groupBy, fmt } from './data'

const DOW=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
export default function App(){
  const [rows,setRows]=useState([]); const [src,setSrc]=useState('sample_sales.csv')
  const [from,setFrom]=useState(''); const [to,setTo]=useState('')
  const [region,setRegion]=useState('All'); const [product,setProduct]=useState(null); const [customer,setCustomer]=useState('')
  const [sort,setSort]=useState({k:'date',d:-1}); const [q,setQ]=useState('')
  useEffect(()=>{ loadUrl('./sample_sales.csv').then(setRows) },[])
  useEffect(()=>{ if(rows.length){ const ds=rows.map(r=>r.date).sort(); const last=ds.at(-1); const f30=new Date(new Date(last)-29*864e5).toISOString().slice(0,10); setFrom(f30<ds[0]?ds[0]:f30); setTo(last) } },[rows])
  const onFile=e=>{ const f=e.target.files[0]; if(!f) return; f.text().then(t=>{ setRows(parseCsv(t)); setSrc(f.name); setProduct(null); setCustomer('') }) }
  const onApi=()=>{ const u=prompt('API / CSV URL (JSON array or CSV with the same columns):'); if(u) loadUrl(u).then(r=>{setRows(r);setSrc(u)}).catch(e=>alert(e)) }
  const regions=['All',...new Set(rows.map(r=>r.region))]
  const f=useMemo(()=>rows.filter(r=>(!from||r.date>=from)&&(!to||r.date<=to)&&(region==='All'||r.region===region)),[rows,from,to,region])
  const fp=useMemo(()=>product?f.filter(r=>r.product===product):f,[f,product])
  // KPIs vs previous period of same length
  const days=from&&to?Math.max(1,(new Date(to)-new Date(from))/864e5+1):1
  const pFrom=from?new Date(new Date(from)-days*864e5).toISOString().slice(0,10):''
  const prev=!from?[]:rows.filter(r=>r.date>=pFrom&&r.date<from&&(region==='All'||r.region===region)&&(!product||r.product===product))
  const rev=sum(fp,r=>r.revenue), prevRev=sum(prev,r=>r.revenue)
  const orders=new Set(fp.map(r=>r.order_id)).size, custs=new Set(fp.map(r=>r.customer)).size
  const delta=prevRev?((rev-prevRev)/prevRev*100):0
  const daily=useMemo(()=>{const g=groupBy(fp,r=>r.date);return Object.keys(g).sort().map(d=>[d,Math.round(sum(g[d],r=>r.revenue))])},[fp])
  const byProd=useMemo(()=>{const g=groupBy(f,r=>r.product);return Object.entries(g).map(([k,v])=>[k,Math.round(sum(v,r=>r.revenue)),sum(v,r=>r.quantity)]).sort((a,b)=>b[1]-a[1])},[f])
  const byCust=useMemo(()=>{const g=groupBy(fp,r=>r.customer);return Object.entries(g).map(([k,v])=>({customer:k,region:v[0].region,orders:new Set(v.map(x=>x.order_id)).size,revenue:sum(v,r=>r.revenue),last:v.map(x=>x.date).sort().at(-1)}))},[fp])
  // heatmap: product x weekday
  const heat=useMemo(()=>{const prods=byProd.map(p=>p[0]);const m={};f.forEach(r=>{const w=(new Date(r.date).getDay()+6)%7;const k=prods.indexOf(r.product)+'_'+w;m[k]=(m[k]||0)+r.revenue});return {prods,data:Object.entries(m).map(([k,v])=>{const [p,w]=k.split('_');return [+w,+p,Math.round(v)]})}},[f,byProd])
  const maxHeat=Math.max(1,...heat.data.map(d=>d[2]))
  const custRows=byCust.filter(c=>c.customer.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>(a[sort.k]>b[sort.k]?1:-1)*sort.d)
  const hist=fp.filter(r=>r.customer===customer).sort((a,b)=>b.date.localeCompare(a.date))
  const th=(k,l,n)=><th className={n?'n':''} onClick={()=>setSort({k,d:sort.k===k?-sort.d:-1})}>{l}{sort.k===k?(sort.d>0?' ▲':' ▼'):''}</th>
  const exportCsv=()=>{const h='customer,region,orders,revenue,last_order\n'+custRows.map(c=>[c.customer,c.region,c.orders,c.revenue.toFixed(2),c.last].join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([h]));a.download='customers.csv';a.click()}
  return <>
    <header><h1>B2B Sales Dashboard</h1><span style={{fontSize:12,opacity:.8}}>Source: {src} · {rows.length} lines</span>
      <label className="btn">Upload CSV<input type="file" accept=".csv" hidden onChange={onFile}/></label>
      <button className="btn ghost" onClick={onApi}>Load from API</button>
      <a className="btn ghost" href="./sample_sales.csv" download style={{textDecoration:'none'}}>Sample CSV</a></header>
    <div className="filters">
      <label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label>
      <label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
      <label>Region<select value={region} onChange={e=>setRegion(e.target.value)}>{regions.map(r=><option key={r}>{r}</option>)}</select></label>
      <label>Product<select value={product||''} onChange={e=>setProduct(e.target.value||null)}><option value="">All products</option>{byProd.map(p=><option key={p[0]}>{p[0]}</option>)}</select></label>
      {product&&<span className="crumb" onClick={()=>setProduct(null)}>✕ clear product drill-down</span>}
    </div>
    <main>
      <div className="card kpi"><div className="l">Revenue</div><div className="v">{fmt(rev)}</div><div className={'d '+(delta>=0?'up':'down')}>{delta>=0?'▲':'▼'} {Math.abs(delta).toFixed(1)}% vs prev. period</div></div>
      <div className="card kpi"><div className="l">Orders</div><div className="v">{orders}</div><div className="d">{(orders/days).toFixed(1)} / day</div></div>
      <div className="card kpi"><div className="l">Avg order value</div><div className="v">{fmt(orders?rev/orders:0)}</div></div>
      <div className="card kpi"><div className="l">Active customers</div><div className="v">{custs}</div><div className="d">Latest day: {daily.at(-1)?.[0]} · {fmt(daily.at(-1)?.[1]||0)}</div></div>
      <div className="card w8"><h3>Daily sales {product?`— ${product}`:''}</h3>
        <ReactECharts style={{height:300}} option={{tooltip:{trigger:'axis'},grid:{left:60,right:20,top:20,bottom:60},dataZoom:[{type:'inside'},{type:'slider',height:18}],xAxis:{type:'category',data:daily.map(d=>d[0])},yAxis:{type:'value'},series:[{type:'bar',data:daily.map(d=>d[1]),itemStyle:{color:'#93b4f5'},name:'Revenue'},{type:'line',smooth:true,name:'7-day avg',showSymbol:false,data:daily.map((d,i)=>Math.round(sum(daily.slice(Math.max(0,i-6),i+1),x=>x[1])/Math.min(7,i+1))),lineStyle:{color:'#0f2a4a'}}]}}/></div>
      <div className="card w4"><h3>Revenue by product <small style={{color:'#6b7280'}}>(click to drill down)</small></h3>
        <ReactECharts style={{height:300}} onEvents={{click:e=>setProduct(e.name===product?null:e.name)}} option={{tooltip:{},grid:{left:130,right:20,top:10,bottom:20},xAxis:{type:'value',axisLabel:{formatter:v=>v>=1e6?v/1e6+'M':v/1e3+'k'}},yAxis:{type:'category',inverse:true,data:byProd.map(p=>p[0])},series:[{type:'bar',data:byProd.map(p=>({value:p[1],itemStyle:{color:p[0]===product?'#f59e0b':'#2f6fed'}}))}]}}/></div>
      <div className="card w6"><h3>Heatmap — revenue by product × weekday</h3>
        <ReactECharts style={{height:300}} option={{tooltip:{position:'top'},grid:{left:130,top:10,right:20,bottom:60},xAxis:{type:'category',data:DOW},yAxis:{type:'category',data:heat.prods},visualMap:{min:0,max:maxHeat,orient:'horizontal',left:'center',bottom:0,inRange:{color:['#eef4ff','#2f6fed','#b91c1c']}},series:[{type:'heatmap',data:heat.data,label:{show:true,formatter:p=>(p.value[2]/1000).toFixed(0)+'k',fontSize:10}}]}}/></div>
      <div className="card w6"><h3>Customers <input placeholder="search…" value={q} onChange={e=>setQ(e.target.value)} style={{float:'right'}}/> <button className="btn" style={{float:'right',marginRight:8,padding:'4px 8px'}} onClick={exportCsv}>Export</button></h3>
        <div className="scroll"><table><thead><tr>{th('customer','Customer')}{th('region','Region')}{th('orders','Orders',1)}{th('revenue','Revenue',1)}{th('last','Last order')}</tr></thead>
        <tbody>{custRows.map(c=><tr key={c.customer} onClick={()=>setCustomer(c.customer)} style={{cursor:'pointer',background:c.customer===customer?'#eef4ff':''}}><td>{c.customer}</td><td>{c.region}</td><td className="n">{c.orders}</td><td className="n">{fmt(c.revenue)}</td><td>{c.last}</td></tr>)}</tbody></table></div></div>
      <div className="card w12"><h3>Purchase history {customer?`— ${customer} (${hist.length} lines, ${fmt(sum(hist,r=>r.revenue))})`:'— click a customer above'}</h3>
        {customer&&<div className="scroll"><table><thead><tr><th>Date</th><th>Order</th><th>Product</th><th className="n">Qty</th><th className="n">Unit price</th><th className="n">Revenue</th><th>Rep</th></tr></thead>
        <tbody>{hist.map((r,i)=><tr key={i}><td>{r.date}</td><td>{r.order_id}</td><td>{r.product}</td><td className="n">{r.quantity}</td><td className="n">{fmt(r.unit_price)}</td><td className="n">{fmt(r.revenue)}</td><td>{r.sales_rep}</td></tr>)}</tbody></table></div>}</div>
    </main></>
}
