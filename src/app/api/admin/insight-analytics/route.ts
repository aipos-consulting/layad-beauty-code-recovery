import { NextResponse } from "next/server";

function config(){return{url:process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY??process.env.SUPABASE_SECRET_KEY};}
async function read<T>(url:string,key:string,path:string):Promise<T>{const r=await fetch(`${url}/rest/v1/${path}`,{headers:{apikey:key,Authorization:`Bearer ${key}`},cache:"no-store"});if(!r.ok)throw new Error(`${r.status} ${await r.text()}`);return await r.json() as T;}
async function readAll<T>(url:string,key:string,path:string):Promise<T[]>{
 const pageSize=1000; const all:T[]=[]; let offset=0;
 while(true){
  const sep=path.includes("?")?"&":"?";
  const page=await read<T[]>(url,key,`${path}${sep}limit=${pageSize}&offset=${offset}`);
  all.push(...page);
  if(page.length<pageSize)break;
  offset+=pageSize;
 }
 return all;
}
function dayKst(v:string){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(v));}
function pct(n:number,d:number){return d?Math.round(n/d*1000)/10:0;}
function change(cur:number,prev:number){if(!prev)return cur?100:null;return Math.round((cur-prev)/prev*1000)/10;}

export async function GET(){
 const {url,key}=config(); if(!url||!key)return NextResponse.json({ok:false,code:"SUPABASE_NOT_CONFIGURED"},{status:503});
 try{
  const [visits,sessions,requests,saves] = await Promise.all([
   readAll<{visit_id:string;created_at:string;utm_source:string|null;utm_campaign:string|null;referrer:string|null;test_started:boolean;test_completed:boolean;beauty_code:string|null}>(url,key,"marketing_visits?select=visit_id,created_at,utm_source,utm_campaign,referrer,test_started,test_completed,beauty_code&order=created_at.asc"),
   readAll<{id:string;created_at:string;completed:boolean;beauty_code:string|null;age_band:string|null;country_code:string|null;device_type:string|null;excluded_from_statistics:boolean|null}>(url,key,"test_sessions?select=id,created_at,completed,beauty_code,age_band,country_code,device_type,excluded_from_statistics&order=created_at.asc"),
   readAll<{id:string;session_id:string;input_value:string;status:string;product_id:string|null;created_at:string;deleted_at:string|null}>(url,key,"product_analysis_requests?select=id,session_id,input_value,status,product_id,created_at,deleted_at&order=created_at.asc"),
   readAll<{id:string;product_name:string;beauty_code:string;fit_score:number;created_at:string}>(url,key,"user_saved_products?select=id,product_name,beauty_code,fit_score,created_at&order=created_at.asc")
  ]);
  const goodSessions=sessions.filter(s=>!s.excluded_from_statistics);
  const completed=goodSessions.filter(s=>s.completed&&s.beauty_code);
  const activeRequests=requests.filter(r=>!r.deleted_at);
  const visitCount=visits.length, started=visits.filter(v=>v.test_started).length, visitCompleted=visits.filter(v=>v.test_completed).length;
  const funnel={visits:visitCount,started,completed:visitCompleted||completed.length,productAnalyses:activeRequests.length,saved:saves.length,startRate:pct(started,visitCount),completeRate:pct(visitCompleted||completed.length,started),analysisRate:pct(activeRequests.length,visitCompleted||completed.length),saveRate:pct(saves.length,activeRequests.length)};

  const sourceMap=new Map<string,{visits:number,starts:number,completes:number}>();
  for(const v of visits){let source=v.utm_source?.trim()||"";if(!source&&v.referrer){try{source=new URL(v.referrer).hostname.replace(/^www\./,"");}catch{source="referral";}}if(!source)source="direct/unknown";const x=sourceMap.get(source)??{visits:0,starts:0,completes:0};x.visits++;if(v.test_started)x.starts++;if(v.test_completed)x.completes++;sourceMap.set(source,x);}
  const acquisition=[...sourceMap.entries()].map(([source,x])=>({source,...x,startRate:pct(x.starts,x.visits),completeRate:pct(x.completes,x.starts)})).sort((a,b)=>b.visits-a.visits).slice(0,10);

  const codeMap=new Map<string,number>();for(const s of completed)if(s.beauty_code)codeMap.set(s.beauty_code,(codeMap.get(s.beauty_code)??0)+1);
  const beautyCodes=[...codeMap.entries()].map(([code,count])=>({code,count,share:pct(count,completed.length)})).sort((a,b)=>b.count-a.count);

  const productMap=new Map<string,{requests:number,saves:number,scoreTotal:number,scoreN:number}>();
  for(const r of activeRequests){const name=r.input_value.trim().slice(0,80)||"(이름 없음)";const x=productMap.get(name)??{requests:0,saves:0,scoreTotal:0,scoreN:0};x.requests++;productMap.set(name,x);}
  for(const s of saves){const name=s.product_name.trim().slice(0,80)||"(이름 없음)";const x=productMap.get(name)??{requests:0,saves:0,scoreTotal:0,scoreN:0};x.saves++;x.scoreTotal+=Number(s.fit_score||0);x.scoreN++;productMap.set(name,x);}
  const products=[...productMap.entries()].map(([name,x])=>({name,requests:x.requests,saves:x.saves,saveRate:pct(x.saves,x.requests),avgFit:x.scoreN?Math.round(x.scoreTotal/x.scoreN):null})).sort((a,b)=>b.requests-a.requests).slice(0,10);

  const today=new Date(); const days:Array<{date:string;visits:number;starts:number;completes:number;analyses:number;saves:number}>=[]; const map=new Map<string,any>();
  const ensure=(d:string)=>{if(!map.has(d))map.set(d,{date:d,visits:0,starts:0,completes:0,analyses:0,saves:0});return map.get(d)};
  visits.forEach(v=>{const x=ensure(dayKst(v.created_at));x.visits++;if(v.test_started)x.starts++;if(v.test_completed)x.completes++;});
  activeRequests.forEach(r=>ensure(dayKst(r.created_at)).analyses++);saves.forEach(s=>ensure(dayKst(s.created_at)).saves++);
  for(let i=29;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const key=dayKst(d.toISOString());days.push(map.get(key)??{date:key,visits:0,starts:0,completes:0,analyses:0,saves:0});}
  const sum=(arr:typeof days,k:keyof (typeof days)[number])=>arr.reduce((a,b)=>a+Number(b[k]||0),0);
  const last7=days.slice(-7), prev7=days.slice(-14,-7);
  const comparisons={visits:{current:sum(last7,"visits"),previous:sum(prev7,"visits")},completes:{current:sum(last7,"completes"),previous:sum(prev7,"completes")},analyses:{current:sum(last7,"analyses"),previous:sum(prev7,"analyses")},saves:{current:sum(last7,"saves"),previous:sum(prev7,"saves")}};
  const comparison=Object.fromEntries(Object.entries(comparisons).map(([k,v])=>[k,{...v,changePct:change(v.current,v.previous)}]));

  const crossMap=new Map<string,{count:number}>();for(const s of completed){const key2=`${s.age_band??"unknown"}|${s.beauty_code}`;crossMap.set(key2,{count:(crossMap.get(key2)?.count??0)+1});}
  const ageCode=[...crossMap.entries()].map(([k,v])=>{const [age,code]=k.split("|");return{age,code,count:v.count};}).sort((a,b)=>b.count-a.count).slice(0,20);

  return NextResponse.json({ok:true,phase1:{funnel,acquisition,beautyCodes,products},phase2:{daily:days,comparison,ageCode},meta:{rowCounts:{visits:visits.length,sessions:sessions.length,requests:requests.length,saves:saves.length},pagination:"1000-row pages until exhausted"},generatedAt:new Date().toISOString()});
 }catch(e){return NextResponse.json({ok:false,code:"INSIGHT_READ_FAILED",message:e instanceof Error?e.message:"Unknown"},{status:500});}
}
