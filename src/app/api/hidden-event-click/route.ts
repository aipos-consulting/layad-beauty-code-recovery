import { NextRequest,NextResponse } from "next/server";
export async function POST(request:NextRequest){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
 if(!key||!url)return NextResponse.json({ok:false},{status:503});
 let body:{action?:string;beautyCode?:string};try{body=await request.json();}catch{return NextResponse.json({ok:false},{status:400});}
 if(!["event_open","discount_click"].includes(body.action??"")||!/^[OD][GM][PC][VE]$/.test(body.beautyCode??""))return NextResponse.json({ok:false},{status:400});
 const headers:Record<string,string>={apikey:key,"Content-Type":"application/json",Prefer:"return=minimal"};if(!key.startsWith("sb_secret_"))headers.Authorization=`Bearer ${key}`;
 const r=await fetch(`${url}/rest/v1/hidden_event_clicks`,{method:"POST",headers,body:JSON.stringify({action:body.action,beauty_code:body.beautyCode}),cache:"no-store"});
 if(!r.ok){console.error("hidden event analytics write",r.status);return NextResponse.json({ok:false},{status:503});}
 return NextResponse.json({ok:true});
}
