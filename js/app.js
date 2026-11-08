// Pennylog app: state, storage, views and events.
(() => {
"use strict";
/* ---------- constants ---------- */
const CURRENCIES=["EUR","USD","GBP","SEK","NOK","LKR","INR"];
const NCOL=10;
// Suggested categories. Names are taken from the current language when the budget is first set up.
const DEFAULTS=()=>({currency:"EUR",cats:[
  {id:"c-housing",key:"housing",kind:"exp",budget:900,color:1},{id:"c-groceries",key:"groceries",kind:"exp",budget:400,color:2},
  {id:"c-transport",key:"transport",kind:"exp",budget:150,color:3},{id:"c-utilities",key:"utilities",kind:"exp",budget:120,color:4},
  {id:"c-eating",key:"eating",kind:"exp",budget:120,color:5},{id:"c-health",key:"health",kind:"exp",budget:60,color:6},
  {id:"c-shopping",key:"shopping",kind:"exp",budget:100,color:7},{id:"c-fun",key:"fun",kind:"exp",budget:60,color:8},
  {id:"c-subs",key:"subs",kind:"exp",budget:40,color:9},{id:"c-savings",key:"savings",kind:"exp",budget:0,color:10},
  {id:"c-other",key:"other",kind:"exp",budget:50,color:3},
  {id:"c-salary",key:"salary",kind:"inc",budget:0,color:2},{id:"c-side",key:"side",kind:"inc",budget:0,color:8},{id:"c-otherinc",key:"otherinc",kind:"inc",budget:0,color:9}
].map(c=>({...c,name:t("cat_"+c.key)})),bills:[]});

/* ---------- helpers ---------- */
const $=(s,el=document)=>el.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const clone=o=>JSON.parse(JSON.stringify(o));
const num=v=>{const n=parseFloat(String(v??"").replace(/\s/g,"").replace("−","-").replace(",","."));return isFinite(n)?n:0};
const r2=n=>Math.round(num(n)*100)/100;
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const ym=d=>d.getFullYear()+"-"+pad(d.getMonth()+1);
const today=()=>ymd(new Date());
const parseYm=k=>{const [y,m]=k.split("-").map(Number);return new Date(y,m-1,1)};
const shiftYm=(k,n)=>{const d=parseYm(k);d.setMonth(d.getMonth()+n);return ym(d)};
const daysIn=k=>{const d=parseYm(k);return new Date(d.getFullYear(),d.getMonth()+1,0).getDate()};
const cap=s=>s?s[0].toLocaleUpperCase(locale())+s.slice(1):s;
const mLabel=(k,o={month:"long",year:"numeric"})=>cap(parseYm(k).toLocaleDateString(locale(),o));
const dLabel=s=>{const td=today(),y=ymd(new Date(Date.now()-864e5));if(s===td)return t("today");if(s===y)return t("yesterday");const [a,b,c]=s.split("-").map(Number);return cap(new Date(a,b-1,c).toLocaleDateString(locale(),{weekday:"short",day:"numeric",month:"short"}))};
const norm=s=>String(s||"").trim().toLowerCase();
let FMT=null,FMT0=null;
const setFmt=c=>{try{FMT=new Intl.NumberFormat(locale(),{style:"currency",currency:c});FMT0=new Intl.NumberFormat(locale(),{style:"currency",currency:c,maximumFractionDigits:0})}catch{FMT=FMT0=new Intl.NumberFormat(locale(),{minimumFractionDigits:2,maximumFractionDigits:2})}};
const money=(n,whole)=>(whole?FMT0:FMT).format(r2(n)).replace("-","−");
const sym=()=>{try{return (FMT.formatToParts(0).find(p=>p.type==="currency")||{}).value||""}catch{return ""}};
const zero=()=>(0).toLocaleString(locale(),{minimumFractionDigits:2});
const col=i=>`var(--c${((i||1)-1)%NCOL+1})`;
const ls={get(k,f){try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};
function toast(msg){document.querySelectorAll(".toast").forEach(x=>x.remove());const el=document.createElement("div");el.className="toast";el.setAttribute("role","status");el.textContent=msg;document.body.appendChild(el);setTimeout(()=>el.remove(),2600)}
function armed(btn,fn){
  if(btn.classList.contains("armed")){fn();return}
  const old=btn.textContent;btn.classList.add("armed");btn.textContent=t("tapConfirm");
  setTimeout(()=>{if(btn.isConnected){btn.classList.remove("armed");btn.textContent=old}},3000);
}

/* ---------- state + storage ---------- */
// Inside Claude the budget is saved to the viewer's account (private per person); anywhere else it stays in this browser.
const S={mode:"pending",settings:null,settingsLoaded:false,tx:[],txLoaded:false,goals:[],month:ym(new Date()),tab:"month",q:"",filter:"all"};
const Store={
  db:null,uid:null,
  async init(){
    let db=null,user=null;
    try{ if(window.claude?.use){ [db,user]=await Promise.all([window.claude.use("db"),window.claude.use("user")]); } }catch{}
    let id=null; try{ id=user?await user.id():null }catch{}
    if(db&&id){
      this.db=db; this.uid=id; S.mode="cloud";
      const base="data/users/"+id;
      db.doc(base+"/settings").onSnapshot(s=>{S.settings=s.exists?s.data():null;S.settingsLoaded=true;render()},e=>this.err(e));
      db.doc(base+"/goals").onSnapshot(s=>{S.goals=s.exists?(s.data().list||[]):[];render()},e=>this.err(e));
      db.doc(base+"/profile").collection("tx").orderBy("date","desc").limit(3000)
        .onSnapshot(q=>{S.tx=q.docs.map(d=>d.data()).filter(Boolean);S.txLoaded=true;render()},e=>this.err(e));
    }else{
      S.mode="local"; S.settings=ls.get("pennylog.settings",null); S.tx=ls.get("pennylog.tx",[]); S.goals=ls.get("pennylog.goals",[]);
      S.settingsLoaded=S.txLoaded=true;
    }
    render();
  },
  err(e){
    const c=e?.code;
    toast(c==="quota_exceeded"?t("errFull"):c==="revoked"||c==="not_granted"||c==="invalid_argument"?t("errViewOnly"):t("errSave"));
  },
  base(){return "data/users/"+this.uid},
  async saveSettings(s){
    S.settings=s; render();
    if(S.mode==="cloud"){try{await this.db.doc(this.base()+"/settings").set(s)}catch(e){this.err(e)}}
    else ls.set("pennylog.settings",s);
  },
  async saveTx(x){
    x.updatedAt=Date.now();
    S.tx=[x,...S.tx.filter(y=>y.id!==x.id)]; render();
    if(S.mode==="cloud"){try{await this.db.doc(this.base()+"/profile").collection("tx").doc(x.id).set(x)}catch(e){this.err(e)}}
    else ls.set("pennylog.tx",S.tx);
  },
  async deleteTx(id){
    S.tx=S.tx.filter(x=>x.id!==id); render();
    if(S.mode==="cloud"){try{await this.db.doc(this.base()+"/profile").collection("tx").doc(id).delete()}catch(e){this.err(e)}}
    else ls.set("pennylog.tx",S.tx);
  },
  async saveGoals(list){
    S.goals=list; render();
    if(S.mode==="cloud"){try{await this.db.doc(this.base()+"/goals").set({list})}catch(e){this.err(e)}}
    else ls.set("pennylog.goals",list);
  }
};

/* ---------- derived ---------- */
const cfg=()=>S.settings||DEFAULTS();
const cats=kind=>cfg().cats.filter(c=>!kind||c.kind===kind);
const catById=id=>cfg().cats.find(c=>c.id===id)||{id,name:t("uncategorised"),kind:"exp",budget:0,color:3};
const monthTx=k=>S.tx.filter(x=>x.date&&x.date.startsWith(k));
const sum=(list,type)=>list.filter(x=>x.type===type).reduce((a,x)=>a+num(x.amount),0);
const spentBy=list=>{const m=new Map();list.filter(x=>x.type==="exp").forEach(x=>m.set(x.cat,(m.get(x.cat)||0)+num(x.amount)));return m};
const totalBudget=()=>cats("exp").reduce((a,c)=>a+num(c.budget),0);
const expectedIncome=()=>cats("inc").reduce((a,c)=>a+num(c.budget),0);
const level=(spent,budget)=>budget<=0?(spent>0?"over":"ok"):spent>budget?"over":spent>=budget*.85?"close":"ok";
const isCurrent=k=>k===ym(new Date());
const monthFrac=k=>{const cur=ym(new Date());if(k<cur)return 1;if(k>cur)return 0;return new Date().getDate()/daysIn(k)};
const billPaid=(b,k)=>S.tx.some(x=>x.billId===b.id&&x.date.startsWith(k));
const billDate=(b,k)=>k+"-"+pad(Math.min(Math.max(1,parseInt(b.day)||1),daysIn(k)));
const overCount=k=>{const sp=spentBy(monthTx(k));return cats("exp").filter(c=>level(sp.get(c.id)||0,num(c.budget))==="over").length};
const niceMax=v=>{if(v<=0)return 100;const p=Math.pow(10,Math.floor(Math.log10(v)));const f=v/p;return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p};

/* ---------- views ---------- */
function monthNav(title){
  return `<div class="mnav"><button class="icon-btn" data-mshift="-1" aria-label="${esc(t("prevMonth"))}">‹</button>
    <div class="grow" style="text-align:center"><div class="eyebrow">${esc(title)}</div><h1>${esc(mLabel(S.month))}</h1></div>
    <button class="icon-btn" data-mshift="1" aria-label="${esc(t("nextMonth"))}">›</button></div>
    ${!isCurrent(S.month)?`<div style="text-align:center;margin-top:-4px"><button class="btn sm ghost" data-mnow>${t("backToNow")}</button></div>`:""}`;
}
function welcome(){
  return `<div class="card stack">
    <div><h2>${t("setupTitle")}</h2><p class="muted" style="margin:4px 0 0;font-size:14px">${t("setupHelp")}</p></div>
    <div class="chips">${DEFAULTS().cats.filter(c=>c.kind==="exp"&&c.budget).slice(0,6).map(c=>`<span class="chip">${esc(c.name)} ${money(c.budget,1)}</span>`).join("")}<span class="chip">${t("more")}</span></div>
    <button class="btn primary block" id="useDefaults">${t("useSuggested")}</button>
    <button class="btn block" data-editcats>${t("setOwn")}</button>
  </div>`;
}
function viewMonth(){
  if(!S.txLoaded||!S.settingsLoaded) return `<div class="empty">${t("loadingBudget")}</div>`;
  const list=monthTx(S.month), inc=sum(list,"inc"), exp=sum(list,"exp"), tb=totalBudget(), ei=expectedIncome();
  const frac=monthFrac(S.month), used=tb>0?exp/tb:0;
  const useIncome=inc>0||ei>0;
  const left=useIncome?inc-exp:tb-exp;
  const sp=spentBy(list);
  const top=[...sp].sort((a,b)=>b[1]-a[1]).slice(0,6);
  const bills=(cfg().bills||[]).slice().sort((a,b)=>a.day-b.day);
  const unpaid=bills.filter(b=>!billPaid(b,S.month));
  let paceChip="";
  if(tb>0){ if(exp>tb) paceChip=`<span class="chip bad">${t("overBudget")}</span>`;
    else if(frac<1&&used>frac+.08) paceChip=`<span class="chip warn">${t("aheadOfPace")}</span>`;
    else paceChip=`<span class="chip ok">${t("onTrack")}</span>`; }
  const recent=list.slice().sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||0)-(a.createdAt||0)).slice(0,5);
  const daysLeft=Math.max(1,daysIn(S.month)-new Date().getDate()+1);
  return `<div class="stack">
    ${monthNav(isCurrent(S.month)?cap(new Date().toLocaleDateString(locale(),{weekday:"long",day:"numeric",month:"long"})):t("month"))}
    ${!S.settings&&!S.tx.length?welcome():""}
    <section class="card hero">
      <div class="spread"><div class="eyebrow">${useIncome?t("leftFromIncome"):t("leftInBudget")}</div>${paceChip}</div>
      <div class="big ${left<0?"neg":""}">${money(left)}</div>
      <div class="muted" style="font-size:13px">${useIncome?t("inOut",{i:money(inc),o:money(exp)})+(ei>inc&&isCurrent(S.month)?" · "+t("moreExpected",{a:money(ei-inc)}):""):t("spentOf",{s:money(exp),b:money(tb)})}</div>
    </section>
    <div class="stats">
      <div class="stat"><div class="v pos">${money(inc,1)}</div><div class="k">${t("income")}</div></div>
      <div class="stat"><div class="v">${money(exp,1)}</div><div class="k">${t("spent")}</div></div>
      <div class="stat"><div class="v">${inc>0?Math.round((inc-exp)/inc*100)+" %":"—"}</div><div class="k">${t("savingsRate")}</div></div>
    </div>
    ${tb>0?`<section class="card stack" style="gap:10px">
      <div class="spread"><h3>${t("budgetPace")}</h3><span class="muted num" style="font-size:13px">${money(exp,1)} / ${money(tb,1)}</span></div>
      <div class="bar lvl-${level(exp,tb)}" style="height:12px"><b style="width:${Math.min(100,used*100)}%"></b>${frac>0&&frac<1?`<span class="pace" style="left:${frac*100}%" title="${esc(t("today"))}"></span>`:""}</div>
      <p class="muted" style="margin:0;font-size:13px">${t("paceText",{u:Math.round(used*100),m:frac<1&&frac>0?Math.round(frac*100):null})} ${exp<=tb?t("leftToSpend",{a:money(tb-exp),d:frac<1&&frac>0?money((tb-exp)/daysLeft):null}):t("overTotal",{a:money(exp-tb)})}</p>
      ${chart(list,tb)}
    </section>`:""}
    ${bills.length?`<section class="card"><div class="spread" style="margin-bottom:4px"><h3>${t("billsThisMonth")}</h3><span class="eyebrow">${t("nPaid",{p:bills.length-unpaid.length,n:bills.length})}</span></div>
      ${bills.map(b=>billRow(b)).join("")}</section>`:""}
    <section class="card"><div class="spread" style="margin-bottom:2px"><h3>${t("whereItWent")}</h3><a href="#budget" style="font-size:13px;font-weight:600">${t("allCategories")}</a></div>
      ${top.length?top.map(([id,v])=>{const c=catById(id),b=num(c.budget);return `<div class="catrow lvl-${level(v,b)}">
        <div class="catname"><i class="dot" style="background:${col(c.color)}"></i><span>${esc(c.name)}</span></div><span class="money">${money(v)}</span>
        <div class="bar"><b style="width:${Math.min(100,b>0?v/b*100:(exp?v/exp*100:0))}%;${b>0?"":`background:${col(c.color)}`}"></b></div>
        <div class="sub">${b>0?(v>b?`<span style="color:var(--bad);font-weight:600">${t("overBy",{a:money(v-b)})}</span> · ${t("budgetOf",{b:money(b,1)})}`:t("leftOf",{a:money(b-v),b:money(b,1)})):t("shareNoBudget",{p:Math.round(v/exp*100)})}</div></div>`}).join("")
      :`<div class="empty" style="margin-top:8px">${t("nothingSpent",{m:esc(mLabel(S.month,{month:"long"}))})}</div>`}
    </section>
    ${recent.length?`<div><div class="spread" style="padding:0 2px 6px"><div class="eyebrow">${t("latest")}</div><a href="#spend" style="font-size:13px;font-weight:600">${t("seeAll",{n:list.length})}</a></div><div class="txlist">${recent.map(txRow).join("")}</div></div>`:""}
  </div>`;
}
function chart(list,tb){
  const n=daysIn(S.month), cur=isCurrent(S.month), last=cur?new Date().getDate():(S.month<ym(new Date())?n:0);
  if(!last) return "";
  const daily=Array(n+1).fill(0); list.filter(x=>x.type==="exp").forEach(x=>{const d=parseInt(x.date.slice(8,10));if(d>=1&&d<=n)daily[d]+=num(x.amount)});
  const cum=[0]; for(let d=1;d<=n;d++) cum[d]=cum[d-1]+daily[d];
  const W=380,H=180,L=56,R=16,T=10,B=24, ymax=niceMax(Math.max(tb,cum[last])*1.05);
  const x=d=>L+(d/n)*(W-L-R), y=v=>T+(1-v/ymax)*(H-T-B);
  const pts=[]; for(let d=0;d<=last;d++) pts.push(`${x(d).toFixed(1)},${y(cum[d]).toFixed(1)}`);
  const area=`M${x(0)},${y(0)} L${pts.join(" L")} L${x(last)},${y(0)} Z`;
  const ticks=[0,ymax/2,ymax];
  const xt=[1,Math.ceil(n/2),n];
  const endC=cum[last]>tb*(last/n)+0.01?"var(--warn)":"var(--accent)";
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t("chartAria"))}">
    ${ticks.map(v=>`<line class="grid" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end">${esc(money(v,1))}</text>`).join("")}
    ${xt.map(d=>`<text x="${x(d)}" y="${H-6}" text-anchor="middle">${esc(new Date(parseYm(S.month).getFullYear(),parseYm(S.month).getMonth(),d).toLocaleDateString(locale(),{day:"numeric",month:"short"}))}</text>`).join("")}
    <line x1="${x(0)}" y1="${y(0)}" x2="${x(n)}" y2="${y(tb)}" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 5" fill="none"/>
    <path d="${area}" fill="var(--accent-soft)" stroke="none"/>
    <polyline points="${pts.join(" ")}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(last)}" cy="${y(cum[last])}" r="5" fill="${endC}" stroke="var(--surface)" stroke-width="2"/>
  </svg>
  <div class="legend"><span><i></i>${t("spentSoFar")}</span><span><i class="dash"></i>${t("evenPace",{a:esc(money(tb,1))})}</span></div>`;
}
function billRow(b,editable){
  const paid=billPaid(b,S.month), c=catById(b.cat), d=Math.min(parseInt(b.day)||1,daysIn(S.month));
  const late=!paid&&isCurrent(S.month)&&d<new Date().getDate();
  return `<div class="bill ${paid?"paid":""}">
    <div class="cal"><small>${esc(parseYm(S.month).toLocaleDateString(locale(),{month:"short"}).replace(".","").toUpperCase())}</small><b>${d}</b></div>
    <div style="min-width:0"><div class="bn" style="font-weight:600;overflow-wrap:anywhere">${esc(b.name)}</div><div class="muted" style="font-size:12px"><span class="money">${money(b.amount)}</span> · ${esc(c.name)}${late?` · <span style="color:var(--bad);font-weight:600">${t("overdue")}</span>`:""}</div></div>
    <div class="row" style="gap:4px;flex-wrap:nowrap">${editable?`<button class="btn sm ghost" data-billedit="${esc(b.id)}">${t("edit")}</button>`:""}${paid?`<span class="chip ok">${t("paid")}</span>`:`<button class="btn sm" data-billpay="${esc(b.id)}">${t("markPaid")}</button>`}</div>
  </div>`;
}
function txRow(x){
  const c=catById(x.cat), title=x.note||c.name;
  return `<button class="tx" data-tx="${esc(x.id)}"><span class="ico" style="background:${col(c.color)}">${esc((c.name||"?")[0].toUpperCase())}</span>
    <span style="min-width:0"><span class="t1" style="display:block">${esc(title)}</span><span class="t2">${x.note?esc(c.name)+" · ":""}${dLabel(x.date)}${x.billId?" · "+t("billTag"):""}${x.goalId?" · "+t("goalTag"):""}</span></span>
    <span class="money ${x.type==="inc"?"pos":""}">${x.type==="inc"?"+":"−"}${money(x.amount).replace("−","")}</span></button>`;
}

function viewSpend(){
  if(!S.txLoaded) return `<div class="empty">${t("loadingTx")}</div>`;
  const all=monthTx(S.month);
  const used=[...new Set(all.map(x=>x.cat))].map(catById);
  let list=all;
  if(S.filter==="exp"||S.filter==="inc") list=list.filter(x=>x.type===S.filter);
  else if(S.filter!=="all") list=list.filter(x=>x.cat===S.filter);
  if(S.q) list=list.filter(x=>norm(x.note).includes(norm(S.q))||norm(catById(x.cat).name).includes(norm(S.q)));
  list=list.slice().sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||0)-(a.createdAt||0));
  const days=new Map(); list.forEach(x=>{if(!days.has(x.date))days.set(x.date,[]);days.get(x.date).push(x)});
  return `<div class="stack">
    ${monthNav(t("tabSpend"))}
    <div class="stats">
      <div class="stat"><div class="v">${money(sum(list,"exp"),1)}</div><div class="k">${t("out")}</div></div>
      <div class="stat"><div class="v pos">${money(sum(list,"inc"),1)}</div><div class="k">${t("in")}</div></div>
      <div class="stat"><div class="v">${list.length}</div><div class="k">${t("transactions")}</div></div>
    </div>
    <input class="field" id="search" type="search" placeholder="${esc(t("searchPh"))}" value="${esc(S.q)}" aria-label="${esc(t("searchAria"))}">
    <div class="chips" role="group" aria-label="${esc(t("filter"))}">
      <button class="fchip" data-filter="all" aria-pressed="${S.filter==="all"}">${t("all")}</button>
      <button class="fchip" data-filter="exp" aria-pressed="${S.filter==="exp"}">${t("spending")}</button>
      <button class="fchip" data-filter="inc" aria-pressed="${S.filter==="inc"}">${t("income")}</button>
      ${used.map(c=>`<button class="fchip" data-filter="${esc(c.id)}" aria-pressed="${S.filter===c.id}">${esc(c.name)}</button>`).join("")}
    </div>
    ${list.length?`<div>${[...days].map(([d,ts])=>{const net=ts.reduce((a,x)=>a+(x.type==="inc"?1:-1)*num(x.amount),0);return `<div class="dayhead"><span>${dLabel(d)}</span><span class="money" style="text-transform:none;letter-spacing:0">${net>0?"+":""}${money(net)}</span></div><div class="txlist">${ts.map(txRow).join("")}</div>`}).join("")}</div>`
      :`<div class="empty">${all.length?t("noMatch"):t("noTx",{m:esc(mLabel(S.month,{month:"long"}))})}</div>`}
  </div>`;
}

function viewBudget(){
  if(!S.txLoaded||!S.settingsLoaded) return `<div class="empty">${t("loadingBudget")}</div>`;
  const list=monthTx(S.month), sp=spentBy(list), tb=totalBudget(), exp=sum(list,"exp");
  const ec=cats("exp").slice().sort((a,b)=>{const la=level(sp.get(a.id)||0,num(a.budget)),lb=level(sp.get(b.id)||0,num(b.budget));const o={over:0,close:1,ok:2};return o[la]-o[lb]||num(b.budget)-num(a.budget)});
  const shown=ec.filter(c=>num(c.budget)>0||(sp.get(c.id)||0)>0);
  const hidden=ec.length-shown.length;
  const incByCat=new Map(); list.filter(x=>x.type==="inc").forEach(x=>incByCat.set(x.cat,(incByCat.get(x.cat)||0)+num(x.amount)));
  const ic=cats("inc").filter(c=>num(c.budget)>0||(incByCat.get(c.id)||0)>0);
  const bills=(cfg().bills||[]).slice().sort((a,b)=>a.day-b.day);
  const billTotal=bills.reduce((a,b)=>a+num(b.amount),0);
  return `<div class="stack">
    ${monthNav(t("tabBudget"))}
    ${!S.settings&&!S.tx.length?welcome():""}
    <div class="stats">
      <div class="stat"><div class="v">${money(tb,1)}</div><div class="k">${t("budgeted")}</div></div>
      <div class="stat"><div class="v">${money(exp,1)}</div><div class="k">${t("spent")}</div></div>
      <div class="stat"><div class="v" style="color:${exp>tb?"var(--bad)":"var(--good)"}">${money(tb-exp,1)}</div><div class="k">${exp>tb?t("over"):t("remaining")}</div></div>
    </div>
    <section class="card">
      <div class="spread" style="margin-bottom:2px"><h3>${t("spendingCats")}</h3><button class="btn sm" data-editcats>${t("editBudgets")}</button></div>
      ${shown.map(c=>{const v=sp.get(c.id)||0,b=num(c.budget),lv=level(v,b);return `<div class="catrow lvl-${lv}">
        <div class="catname"><i class="dot" style="background:${col(c.color)}"></i><span>${esc(c.name)}</span>${lv==="over"?`<span class="chip bad">${t("over")}</span>`:lv==="close"?`<span class="chip warn">${t("close_")}</span>`:""}</div>
        <span class="money">${money(v,1)} <span class="muted">/ ${b>0?money(b,1):"—"}</span></span>
        <div class="bar"><b style="width:${b>0?Math.min(100,v/b*100):100}%"></b></div>
        <div class="sub">${b>0?(v>b?t("overBy",{a:money(v-b)}):t("left",{a:money(b-v)})):t("noBudgetSet")}</div></div>`}).join("")}
      ${hidden?`<p class="muted" style="margin:8px 0 0;font-size:12px">${t("hiddenCats",{n:hidden})}</p>`:""}
    </section>
    <section class="card">
      <div class="spread" style="margin-bottom:2px"><h3>${t("income")}</h3><span class="muted" style="font-size:13px">${t("receivedExpected")}</span></div>
      ${ic.length?ic.map(c=>{const v=incByCat.get(c.id)||0,b=num(c.budget);return `<div class="catrow" style="--lvl:var(--good)">
        <div class="catname"><i class="dot" style="background:${col(c.color)}"></i><span>${esc(c.name)}</span></div>
        <span class="money pos">${money(v,1)} <span class="muted">/ ${b>0?money(b,1):"—"}</span></span>
        ${b>0?`<div class="bar"><b style="width:${Math.min(100,v/b*100)}%"></b></div>`:""}</div>`}).join("")
        :`<p class="muted" style="margin:6px 0 0;font-size:14px">${t("incomeHelp")}</p>`}
    </section>
    <section class="card">
      <div class="spread" style="margin-bottom:4px"><div><h3>${t("recurringBills")}</h3>${bills.length?`<div class="muted" style="font-size:12px">${t("perMonth",{a:`<span class="money">${money(billTotal)}</span>`})}</div>`:""}</div><button class="btn sm" data-billedit="">${t("addBill")}</button></div>
      ${bills.length?bills.map(b=>billRow(b,true)).join(""):`<p class="muted" style="margin:6px 0 0;font-size:14px">${t("billsHelp")}</p>`}
    </section>
  </div>`;
}

function viewGoals(){
  const g=S.goals;
  const saved=g.reduce((a,x)=>a+num(x.saved),0), target=g.reduce((a,x)=>a+num(x.target),0);
  return `<div class="stack">
    <div class="spread"><div><h1>${t("goalsTitle")}</h1><p class="muted" style="margin:2px 0 0;font-size:14px">${g.length?t("savedOf",{s:`<span class="money">${money(saved,1)}</span>`,t:`<span class="money">${money(target,1)}</span>`}):t("goalsSub")}</p></div><button class="btn primary" data-goaledit="">${t("addGoal")}</button></div>
    ${g.length?g.map(goalCard).join(""):`<div class="card stack"><h3>${t("goalsEmptyTitle")}</h3>
      <p class="muted" style="margin:0;font-size:14px">${t("goalsEmptyHelp")}</p>
      <button class="btn primary block" data-goaledit="">${t("createGoal")}</button></div>`}
  </div>`;
}
function goalCard(x){
  const tg=num(x.target), s=num(x.saved), p=tg>0?Math.min(1,s/tg):0, done=s>=tg&&tg>0;
  let plan="";
  if(done) plan=`<span class="chip ok">${t("goalReached")}</span>`;
  else if(x.deadline){ const now=new Date(), [y,m]=x.deadline.split("-").map(Number); const months=(y-now.getFullYear())*12+(m-1-now.getMonth())+1;
    plan=months>0?`<span>${t("perMonthBy",{a:`<b class="money">${money((tg-s)/months)}</b>`,d:esc(mLabel(x.deadline,{month:"short",year:"numeric"}))})}</span>`:`<span style="color:var(--bad);font-weight:600">${t("datePassed")}</span> · ${t("toGo",{a:`<span class="money">${money(tg-s)}</span>`})}`; }
  else plan=`<span>${t("toGo",{a:`<span class="money">${money(tg-s)}</span>`})}</span>`;
  const R=26,C=2*Math.PI*R;
  return `<section class="card goal stack" style="gap:10px">
    <div class="ring-row">
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${R}" fill="none" stroke="var(--sunk)" stroke-width="7"/>
        <circle cx="32" cy="32" r="${R}" fill="none" stroke="${done?"var(--good)":col(x.color||1)}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(C*p).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 32 32)"/>
        <text x="32" y="36.5" text-anchor="middle" style="font:600 13px var(--body);fill:var(--ink)">${Math.round(p*100)}%</text></svg>
      <div class="grow"><h3 style="overflow-wrap:anywhere">${esc(x.name)}</h3><div><span class="bigsm">${money(s)}</span> <span class="muted">${t("ofAmount",{a:money(tg,1)})}</span></div></div>
    </div>
    <div class="muted" style="font-size:13px">${plan}</div>
    <div class="row"><button class="btn sm primary" data-goaladd="${esc(x.id)}">${t("addMoney")}</button><button class="btn sm" data-goaledit="${esc(x.id)}">${t("edit")}</button></div>
  </section>`;
}

/* ---------- sheets ---------- */
function sheet(html,onClick){
  const host=$("#sheetHost");
  host.innerHTML=`<div class="sheet-bg" id="sheetBg">${html}</div>`;
  const close=()=>{host.innerHTML="";host.onclick=null};
  host.onclick=ev=>{const tg=ev.target;if(tg.id==="sheetBg"||tg.closest("[data-close]")){close();return}onClick&&onClick(ev,close)};
  return close;
}
function editTx(id,preset){
  const src=S.tx.find(x=>x.id===id);
  const tx=src?clone(src):{id:uid("t"),type:"exp",amount:"",cat:"",date:isCurrent(S.month)?today():S.month+"-01",note:"",createdAt:Date.now(),...(preset||{})};
  const draw=()=>{
    const list=cats(tx.type); if(!list.some(c=>c.id===tx.cat)) tx.cat=(list.find(c=>c.id==="c-groceries"||c.id==="c-salary")||list[0]||{}).id||"";
    const title=src?t("editTx"):t("addTx");
    return `<form class="sheet stack" id="txForm" role="dialog" aria-label="${esc(title)}" autocomplete="off">
      <div class="spread"><h2>${title}</h2><button class="btn ghost" type="button" data-close>${t("close")}</button></div>
      <div class="seg" role="group" aria-label="${esc(t("type"))}"><button type="button" data-type="exp" aria-pressed="${tx.type==="exp"}">${t("spending")}</button><button type="button" data-type="inc" aria-pressed="${tx.type==="inc"}">${t("income")}</button></div>
      <label class="amt" for="txAmt"><span>${esc(sym())}</span><input id="txAmt" inputmode="decimal" placeholder="${zero()}" value="${tx.amount===""?"":esc(String(r2(tx.amount)))}" aria-label="${esc(t("amount"))}"></label>
      <div class="lbl">${t("category")}<div class="catpick" role="group" aria-label="${esc(t("category"))}">${list.map(c=>`<button type="button" data-cat="${esc(c.id)}" aria-pressed="${c.id===tx.cat}"><i class="dot" style="background:${col(c.color)}"></i>${esc(c.name)}</button>`).join("")}</div></div>
      <div class="form-grid">
        <label>${t("date")}<input class="field" type="date" id="txDate" value="${esc(tx.date)}"></label>
        <label>${t("note")}<input class="field" id="txNote" value="${esc(tx.note)}" placeholder="${esc(tx.type==="inc"?t("noteIncPh"):t("noteExpPh"))}" list="noteList"></label>
      </div>
      <datalist id="noteList">${[...new Set(S.tx.map(x=>x.note).filter(Boolean))].slice(0,60).map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
      <button class="btn primary block" type="submit" style="min-height:50px;font-size:16px">${src?t("saveChanges"):t("save")}</button>
      ${src?`<button class="btn ghost danger block" type="button" id="txDel">${t("deleteTx")}</button>`:""}
    </form>`;
  };
  const keep=()=>{const a=$("#txAmt");if(a)tx.amount=a.value;const d=$("#txDate");if(d)tx.date=d.value;const n=$("#txNote");if(n)tx.note=n.value};
  const mount=()=>{
    const close=sheet(draw(),(ev,close)=>{
      const b=ev.target.closest("button"); if(!b) return;
      if(b.dataset.type){keep();tx.type=b.dataset.type;tx.cat="";mount();setTimeout(()=>$("#txAmt")?.focus(),20);return}
      if(b.dataset.cat){tx.cat=b.dataset.cat;$("#txForm").querySelectorAll("[data-cat]").forEach(x=>x.setAttribute("aria-pressed",x===b));return}
      if(b.id==="txDel") armed(b,()=>{close();Store.deleteTx(tx.id);toast(t("txDeleted"))});
    });
    $("#txForm").onsubmit=async ev=>{
      ev.preventDefault(); keep();
      const amt=r2(Math.abs(num(tx.amount))); if(!amt){$("#txAmt").focus();toast(t("needAmount"));return}
      if(!/^\d{4}-\d{2}-\d{2}$/.test(tx.date)) tx.date=today();
      const out={...tx,amount:amt,note:String(tx.note||"").trim()};
      close(); await Store.saveTx(out);
      if(!src){ S.month=out.date.slice(0,7); toast(t(out.type==="inc"?"incomeSaved":"spendingSaved",{a:money(amt)})); }
      if(out.type==="exp"){ const c=catById(out.cat),b=num(c.budget); if(b>0){ const v=spentBy(monthTx(out.date.slice(0,7))).get(c.id)||0; if(v>b) setTimeout(()=>toast(t("catOver",{c:c.name,a:money(v-b)})),1400); } }
    };
    if(!src) setTimeout(()=>$("#txAmt")?.focus(),40);
  };
  mount();
}
function editCats(){
  const s=clone(cfg());
  const draw=()=>`<form class="sheet stack" id="catForm" role="dialog" aria-label="${esc(t("monthlyBudgets"))}" autocomplete="off">
    <div class="spread"><h2>${t("monthlyBudgets")}</h2><button class="btn ghost" type="button" data-close>${t("close")}</button></div>
    <p class="muted" style="margin:0;font-size:13px">${t("budgetsHelp")}</p>
    ${[["exp",t("spendingLimit")],["inc",t("incomeExpected")]].map(([k,lab])=>`<div class="eyebrow" style="margin-top:6px">${lab}</div>
      ${s.cats.map((c,i)=>c.kind!==k?"":`<div class="ed-cat" data-i="${i}">
        <button type="button" class="swatch" data-swatch="${i}" style="background:${col(c.color)}" aria-label="${esc(t("changeColor",{c:c.name}))}"></button>
        <input id="cn-${esc(c.id)}" data-k="name" value="${esc(c.name)}" aria-label="${esc(t("catName"))}">
        <input id="cb-${esc(c.id)}" data-k="budget" inputmode="decimal" value="${num(c.budget)||""}" placeholder="0" class="num" style="text-align:right" aria-label="${esc(t("catAmount",{c:c.name}))}">
        <button type="button" class="btn sm ghost danger" data-rmcat="${i}" aria-label="${esc(t("removeCat",{c:c.name}))}">×</button></div>`).join("")}
      <button type="button" class="btn sm" data-addcat="${k}" style="align-self:flex-start">${k==="exp"?t("addExpCat"):t("addIncCat")}</button>`).join("")}
    <div class="card spread" style="padding:10px 14px"><span>${t("totalBudget")}</span><b class="money" id="catTotal">${money(s.cats.filter(c=>c.kind==="exp").reduce((a,c)=>a+num(c.budget),0))}</b></div>
    <button class="btn primary block" type="submit" style="min-height:48px">${t("saveBudgets")}</button>
  </form>`;
  const read=()=>document.querySelectorAll("#catForm .ed-cat").forEach(row=>{const c=s.cats[+row.dataset.i];row.querySelectorAll("input").forEach(inp=>{c[inp.dataset.k]=inp.dataset.k==="budget"?r2(Math.max(0,num(inp.value))):inp.value})});
  const mount=()=>{
    sheet(draw(),(ev)=>{
      const b=ev.target.closest("button"); if(!b) return;
      if(b.dataset.swatch){read();const c=s.cats[+b.dataset.swatch];c.color=(c.color%NCOL)+1;b.style.background=col(c.color);return}
      if(b.dataset.addcat){read();const c={id:uid("c-"),name:"",kind:b.dataset.addcat,budget:0,color:(s.cats.length%NCOL)+1};s.cats.push(c);mount();setTimeout(()=>document.getElementById("cn-"+c.id)?.focus(),30);return}
      if(b.dataset.rmcat){read();const c=s.cats[+b.dataset.rmcat];const used=S.tx.some(x=>x.cat===c.id);
        if(used){toast(t("catInUse",{c:c.name||t("thisCat")}));return}
        s.cats.splice(+b.dataset.rmcat,1);mount();return}
    });
    $("#catForm").addEventListener("input",()=>{read();$("#catTotal").textContent=money(s.cats.filter(c=>c.kind==="exp").reduce((a,c)=>a+num(c.budget),0))});
    $("#catForm").onsubmit=ev=>{ev.preventDefault();read();s.cats=s.cats.filter(c=>String(c.name).trim()).map(c=>({...c,name:String(c.name).trim()}));
      if(!s.cats.some(c=>c.kind==="exp")||!s.cats.some(c=>c.kind==="inc")){toast(t("keepOneEach"));return}
      $("#sheetHost").innerHTML="";Store.saveSettings(s);toast(t("budgetsSaved"))};
  };
  mount();
}
function editBill(id){
  const s=clone(cfg()); s.bills=s.bills||[];
  const src=s.bills.find(b=>b.id===id);
  const b=src||{id:uid("b"),name:"",amount:"",day:1,cat:(cats("exp").find(c=>c.id==="c-housing"||c.id==="c-utilities")||cats("exp")[0]).id};
  const title=src?t("editBill"):t("newBill");
  sheet(`<form class="sheet stack" id="billForm" role="dialog" aria-label="${esc(title)}" autocomplete="off">
    <div class="spread"><h2>${title}</h2><button class="btn ghost" type="button" data-close>${t("close")}</button></div>
    <div class="form-grid">
      <label class="full">${t("name")}<input class="field" id="bName" value="${esc(b.name)}" placeholder="${esc(t("billNamePh"))}" required></label>
      <label>${t("amountIn",{s:esc(sym())})}<input class="field num" id="bAmt" inputmode="decimal" value="${b.amount===""?"":r2(b.amount)}" placeholder="${zero()}"></label>
      <label>${t("dueDay")}<input class="field num" id="bDay" inputmode="numeric" value="${esc(b.day)}"></label>
      <label class="full">${t("category")}<select class="field" id="bCat">${cats("exp").map(c=>`<option value="${esc(c.id)}" ${c.id===b.cat?"selected":""}>${esc(c.name)}</option>`).join("")}</select></label>
    </div>
    <button class="btn primary block" type="submit" style="min-height:48px">${src?t("saveBill"):t("addBillBtn")}</button>
    ${src?`<button class="btn ghost danger block" type="button" id="bDel">${t("removeBill")}</button>`:""}
  </form>`,(ev,close)=>{const tg=ev.target.closest("button");if(tg?.id==="bDel")armed(tg,()=>{close();s.bills=s.bills.filter(x=>x.id!==b.id);Store.saveSettings(s);toast(t("billRemoved"))})});
  $("#billForm").onsubmit=ev=>{ev.preventDefault();
    const name=$("#bName").value.trim(), amount=r2(Math.abs(num($("#bAmt").value))), day=Math.min(31,Math.max(1,parseInt($("#bDay").value)||1));
    if(!name){$("#bName").focus();return} if(!amount){$("#bAmt").focus();toast(t("needBillAmount"));return}
    const out={...b,name,amount,day,cat:$("#bCat").value};
    s.bills=src?s.bills.map(x=>x.id===b.id?out:x):[...s.bills,out];
    $("#sheetHost").innerHTML="";Store.saveSettings(s);toast(src?t("billSaved"):t("billAdded",{n:name}))};
  setTimeout(()=>$("#bName")?.focus(),40);
}
async function payBill(id){
  const b=(cfg().bills||[]).find(x=>x.id===id); if(!b||billPaid(b,S.month)) return;
  const d=isCurrent(S.month)?(billDate(b,S.month)<today()?billDate(b,S.month):today()):billDate(b,S.month);
  await Store.saveTx({id:uid("t"),type:"exp",amount:r2(b.amount),cat:b.cat,date:d,note:b.name,billId:b.id,createdAt:Date.now()});
  toast(t("billPaidToast",{n:b.name,a:money(b.amount)}));
}
function editGoal(id){
  const src=S.goals.find(g=>g.id===id);
  const g=src?clone(src):{id:uid("g"),name:"",target:"",saved:0,deadline:"",color:(S.goals.length%NCOL)+1,createdAt:Date.now()};
  const title=src?t("editGoal"):t("newGoal");
  sheet(`<form class="sheet stack" id="goalForm" role="dialog" aria-label="${esc(title)}" autocomplete="off">
    <div class="spread"><h2>${title}</h2><button class="btn ghost" type="button" data-close>${t("close")}</button></div>
    <div class="form-grid">
      <label class="full">${t("name")}<input class="field" id="gName" value="${esc(g.name)}" placeholder="${esc(t("goalNamePh"))}" required></label>
      <label>${t("targetIn",{s:esc(sym())})}<input class="field num" id="gTarget" inputmode="decimal" value="${g.target===""?"":r2(g.target)}" placeholder="0"></label>
      <label>${t("savedSoFar")}<input class="field num" id="gSaved" inputmode="decimal" value="${r2(g.saved)||""}" placeholder="0"></label>
      <label class="full">${t("reachBy")}<input class="field" type="month" id="gDeadline" value="${esc(g.deadline||"")}"></label>
    </div>
    <button class="btn primary block" type="submit" style="min-height:48px">${src?t("saveGoal"):t("createGoal")}</button>
    ${src?`<button class="btn ghost danger block" type="button" id="gDel">${t("deleteGoal")}</button>`:""}
  </form>`,(ev,close)=>{const tg=ev.target.closest("button");if(tg?.id==="gDel")armed(tg,()=>{close();Store.saveGoals(S.goals.filter(x=>x.id!==g.id));toast(t("goalDeleted"))})});
  $("#goalForm").onsubmit=ev=>{ev.preventDefault();
    const name=$("#gName").value.trim(), target=r2(Math.abs(num($("#gTarget").value)));
    if(!name){$("#gName").focus();return} if(!target){$("#gTarget").focus();toast(t("needTarget"));return}
    const out={...g,name,target,saved:r2(Math.max(0,num($("#gSaved").value))),deadline:$("#gDeadline").value||""};
    $("#sheetHost").innerHTML="";Store.saveGoals(src?S.goals.map(x=>x.id===g.id?out:x):[...S.goals,out]);toast(src?t("goalSaved"):t("goalCreated",{n:name}))};
  setTimeout(()=>$("#gName")?.focus(),40);
}
function addToGoal(id){
  const g=S.goals.find(x=>x.id===id); if(!g) return;
  const sav=cats("exp").find(c=>c.id==="c-savings")||cats("exp").find(c=>/saving|säästö|spar/i.test(c.name));
  sheet(`<form class="sheet stack" id="gaForm" role="dialog" aria-label="${esc(t("addTo",{n:g.name}))}" autocomplete="off">
    <div class="spread"><h2>${esc(t("addTo",{n:g.name}))}</h2><button class="btn ghost" type="button" data-close>${t("close")}</button></div>
    <div class="seg" role="group" aria-label="${esc(t("direction"))}"><button type="button" data-dir="in" aria-pressed="true">${t("putIn")}</button><button type="button" data-dir="out" aria-pressed="false">${t("takeOut")}</button></div>
    <label class="amt" for="gaAmt"><span>${esc(sym())}</span><input id="gaAmt" inputmode="decimal" placeholder="${zero()}" aria-label="${esc(t("amount"))}"></label>
    <label class="row" style="flex-wrap:nowrap;font-size:14px;cursor:pointer" id="gaRecRow"><input type="checkbox" id="gaRec" ${sav?"checked":""} style="width:20px;height:20px;accent-color:var(--accent)"><span>${t("logAsSpending",{c:`<b>${esc(sav?sav.name:t("cat_savings"))}</b>`})}</span></label>
    <button class="btn primary block" type="submit" style="min-height:48px">${t("save")}</button>
  </form>`,(ev)=>{const b=ev.target.closest("button");if(b?.dataset.dir){$("#gaForm").querySelectorAll("[data-dir]").forEach(x=>x.setAttribute("aria-pressed",x===b));$("#gaRecRow").hidden=b.dataset.dir==="out"}});
  $("#gaForm").onsubmit=async ev=>{ev.preventDefault();
    const amt=r2(Math.abs(num($("#gaAmt").value))); if(!amt){$("#gaAmt").focus();return}
    const out=$("#gaForm [data-dir='out']").getAttribute("aria-pressed")==="true";
    const rec=!out&&$("#gaRec").checked;
    $("#sheetHost").innerHTML="";
    const ng={...g,saved:r2(Math.max(0,num(g.saved)+(out?-amt:amt)))};
    await Store.saveGoals(S.goals.map(x=>x.id===g.id?ng:x));
    if(rec){ const s=clone(cfg()); let c=s.cats.find(x=>x.kind==="exp"&&(x.id==="c-savings"||/saving|säästö|spar/i.test(x.name)));
      if(!c){c={id:"c-savings",name:t("cat_savings"),kind:"exp",budget:0,color:10};s.cats.push(c);await Store.saveSettings(s)}
      await Store.saveTx({id:uid("t"),type:"exp",amount:amt,cat:c.id,date:today(),note:t("toGoal",{n:g.name}),goalId:g.id,createdAt:Date.now()}); }
    toast(ng.saved>=num(ng.target)&&!out?t("goalReachedToast",{n:g.name}):t(out?"tookFrom":"addedTo",{a:money(amt),n:g.name}))};
  setTimeout(()=>$("#gaAmt")?.focus(),40);
}
function openSettings(){
  const s=cfg();
  sheet(`<div class="sheet stack" role="dialog" aria-label="${esc(t("settings"))}">
    <div class="spread"><h2>${t("settings")}</h2><button class="btn ghost" type="button" data-close>${t("close")}</button></div>
    <label class="lbl">${t("currency")}<select class="field" id="curSel">${CURRENCIES.map(c=>`<option ${c===s.currency?"selected":""}>${c}</option>`).join("")}</select></label>
    <div class="card stack" style="gap:8px">
      <h3>${t("export")}</h3>
      <p class="muted" style="margin:0;font-size:13px">${t("exportHelp")}</p>
      <div class="row"><button class="btn sm" data-csv="month">${t("monthCsv",{m:esc(mLabel(S.month))})}</button><button class="btn sm" data-csv="all">${t("allCsv")}</button></div>
    </div>
    <div class="card stack" style="gap:8px">
      <h3>${t("backup")}</h3>
      <p class="muted" style="margin:0;font-size:13px">${t("backupHelp")}</p>
      <div class="row"><button class="btn sm" id="backupBtn">${t("saveBackup")}</button><button class="btn sm" id="restoreBtn">${t("loadBackup")}</button></div>
    </div>
    <p class="muted" style="margin:0;font-size:12px">${S.mode==="cloud"?t("storedCloud"):t("storedLocal")}</p>
  </div>`,(ev)=>{const b=ev.target.closest("button");if(!b)return;
    if(b.dataset.csv) exportCsv(b.dataset.csv);
    if(b.id==="backupBtn") exportBackup();
    if(b.id==="restoreBtn") $("#importFile").click();
  });
  $("#curSel").onchange=ev=>{const n=clone(cfg());n.currency=ev.target.value;Store.saveSettings(n);toast(t("currencySet",{c:n.currency}))};
}
async function saveFile(filename,data,mime){
  let dl=null; try{ dl=window.claude?.use?await window.claude.use("downloads"):null }catch{}
  if(dl){ try{ await dl.save({filename,data}); toast(t("fileSaved")) }catch(e){ if(e?.code!=="declined") toast(t("fileFailed")) } return }
  try{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type:mime}));a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);toast(t("fileSaved"))}
  catch{toast(t("downloadBlocked"))}
}
function exportCsv(scope){
  const list=(scope==="month"?monthTx(S.month):S.tx).slice().sort((a,b)=>a.date.localeCompare(b.date));
  if(!list.length){toast(t("nothingToExport"));return}
  const q=v=>{v=String(v??"");return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const rows=[[t("csvDate"),t("csvType"),t("category"),t("amount"),t("currency"),t("note")],...list.map(x=>[x.date,x.type==="inc"?t("income"):t("spending"),catById(x.cat).name,(x.type==="inc"?1:-1)*r2(x.amount),cfg().currency,x.note||""])];
  saveFile(`pennylog-${scope==="month"?S.month:"all"}.csv`,rows.map(r=>r.map(q).join(",")).join("\n"),"text/csv");
}
function exportBackup(){
  saveFile("pennylog-backup-"+today()+".json",JSON.stringify({app:"pennylog",version:1,exportedAt:new Date().toISOString(),settings:cfg(),goals:S.goals,tx:S.tx},null,1),"application/json");
}
$("#importFile").onchange=async ev=>{
  const f=ev.target.files[0]; ev.target.value=""; if(!f) return;
  let d; try{d=JSON.parse(await f.text())}catch{toast(t("notBackup"));return}
  if(!d||d.app!=="pennylog"||!Array.isArray(d.tx)){toast(t("notBackup"));return}
  toast(t("loadingBackup"));
  if(d.settings&&Array.isArray(d.settings.cats)) await Store.saveSettings(d.settings);
  if(Array.isArray(d.goals)&&d.goals.length) await Store.saveGoals(d.goals);
  const have=new Set(S.tx.map(x=>x.id)); let n=0;
  for(const x of d.tx){ if(x&&x.id&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&isFinite(x.amount)&&!have.has(x.id)){ await Store.saveTx(x); n++; } }
  $("#sheetHost").innerHTML=""; toast(t("backupLoaded",{n}));
};

/* ---------- render ---------- */
function render(){
  setFmt(cfg().currency||"EUR");
  const tab=(location.hash||"#month").slice(1); S.tab=["month","spend","budget","goals"].includes(tab)?tab:"month";
  document.querySelectorAll("nav.tabs a").forEach(a=>{if(a.dataset.tab===S.tab)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
  const sync=$("#sync"); sync.className="sync "+(S.mode==="cloud"?"cloud":"");
  sync.querySelector("span").textContent=S.mode==="cloud"?t("syncCloud"):S.mode==="local"?t("syncLocal"):t("loading");
  const oc=S.txLoaded?overCount(ym(new Date())):0; const bb=$("#badgeBudget"); bb.hidden=!oc; bb.textContent=oc;
  $("#fab").hidden=S.tab==="goals";
  const ae=document.activeElement, fid=ae&&ae.id&&$("#main").contains(ae)?ae.id:null, sel=fid&&ae.selectionStart!=null?[ae.selectionStart,ae.selectionEnd]:null;
  $("#main").innerHTML=S.tab==="spend"?viewSpend():S.tab==="budget"?viewBudget():S.tab==="goals"?viewGoals():viewMonth();
  if(fid){const el=document.getElementById(fid);if(el){el.focus({preventScroll:true});if(sel)try{el.setSelectionRange(...sel)}catch{}}}
}

/* ---------- events ---------- */
const main=$("#main");
main.addEventListener("click",async ev=>{
  const b=ev.target.closest("button,[data-filter]"); if(!b) return;
  if(b.dataset.mshift){S.month=shiftYm(S.month,+b.dataset.mshift);render();return}
  if(b.dataset.mnow!==undefined){S.month=ym(new Date());render();return}
  if(b.dataset.tx){editTx(b.dataset.tx);return}
  if(b.dataset.filter){S.filter=b.dataset.filter;render();return}
  if(b.dataset.editcats!==undefined){editCats();return}
  if(b.id==="useDefaults"){await Store.saveSettings(DEFAULTS());toast(t("suggestedAdded"));return}
  if(b.dataset.billedit!==undefined){editBill(b.dataset.billedit);return}
  if(b.dataset.billpay){b.disabled=true;await payBill(b.dataset.billpay);return}
  if(b.dataset.goaledit!==undefined){editGoal(b.dataset.goaledit);return}
  if(b.dataset.goaladd){addToGoal(b.dataset.goaladd);return}
});
main.addEventListener("input",ev=>{if(ev.target.id==="search"){S.q=ev.target.value;render()}});
$("#fab").onclick=()=>editTx(null);
$("#settingsBtn").onclick=openSettings;
window.addEventListener("hashchange",()=>{S.filter="all";render();window.scrollTo(0,0)});

/* language picker in the header */
const langSel=$("#langSel");
langSel.innerHTML=I18N.languages.map(l=>`<option value="${l.code}" ${l.code===I18N.lang?"selected":""}>${l.label}</option>`).join("");
langSel.addEventListener("change",()=>{ setLang(langSel.value); render(); });

applyStaticText();
render(); Store.init();
})();
