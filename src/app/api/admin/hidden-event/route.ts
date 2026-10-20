import { NextResponse } from "next/server";
export const dynamic="force-dynamic";
export async function GET(){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
 if(!key||!url)return NextResponse.json({ok:false},{status:503});
 const headers:Record<string,string>={apikey:key};if(!key.startsWith("sb_secret_"))headers.Authorization=`Bearer ${key}`;
 const all:Array<{action:string;beauty_code:string;created_at:string}>=[];
 for(let offset=0;offset<100000;offset+=1000){
  const r=await fetch(`${url}/rest/v1/hidden_event_clicks?select=action,beauty_code,created_at&order=created_at.desc&limit=1000&offset=${offset}`,{headers,cache:"no-store"});
  if(!r.ok)return NextResponse.json({ok:false},{status:503});
  const rows=await r.json() as typeof all;all.push(...rows);if(rows.length<1000)break;
 }
 const today=new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Seoul"});
 const localDate=(s:string)=>new Date(s).toLocaleDateString("en-CA",{timeZone:"Asia/Seoul"});
 const opened=all.filter(x=>x.action==="event_open");const clicked=all.filter(x=>x.action==="discount_click");
 const codes=Array.from(new Set(all.map(x=>x.beauty_code))).sort();
 return NextResponse.json({ok:true,totalOpens:opened.length,totalDiscountClicks:clicked.length,todayOpens:opened.filter(x=>localDate(x.created_at)===today).length,todayDiscountClicks:clicked.filter(x=>localDate(x.created_at)===today).length,rate:opened.length?Math.round(clicked.length/opened.length*1000)/10:0,byCode:codes.map(code=>({code,opens:opened.filter(x=>x.beauty_code===code).length,discountClicks:clicked.filter(x=>x.beauty_code===code).length})),byDay:Array.from(new Set(all.map(x=>localDate(x.created_at)))).sort().reverse().slice(0,30).map(day=>({day,opens:opened.filter(x=>localDate(x.created_at)===day).length,discountClicks:clicked.filter(x=>localDate(x.created_at)===day).length}))});
}
