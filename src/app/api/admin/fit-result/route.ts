import { NextRequest, NextResponse } from "next/server";

const CODES = ["OGPV","OGPE","OGCV","OGCE","OMPV","OMPE","OMCV","OMCE","DGPV","DGPE","DGCV","DGCE","DMPV","DMPE","DMCV","DMCE"] as const;

function config(){return{url:process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.SUPABASE_SERVICE_ROLE_KEY??process.env.SUPABASE_SECRET_KEY};}
async function db(url:string,key:string,path:string,init:RequestInit){return fetch(`${url}/rest/v1/${path}`,{...init,headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",...(init.headers??{})},cache:"no-store"});}

export async function POST(request:NextRequest){
 const {url,key}=config();if(!url||!key)return NextResponse.json({ok:false,code:"SUPABASE_NOT_CONFIGURED"},{status:503});
 let body:{requestId?:string;scores?:Record<string,number>;brand?:string;canonicalName?:string;category?:string;summary?:string};
 try{body=await request.json();}catch{return NextResponse.json({ok:false,message:"잘못된 요청입니다."},{status:400});}
 if(!body.requestId||!/^[0-9a-f-]{36}$/i.test(body.requestId))return NextResponse.json({ok:false,message:"신청 ID를 확인해 주세요."},{status:400});
 const scores=body.scores??{};if(CODES.some(code=>!Number.isFinite(scores[code])||scores[code]<0||scores[code]>100))return NextResponse.json({ok:false,message:"16유형 점수를 모두 0~100으로 입력해 주세요."},{status:400});
 const rr=await db(url,key,`product_analysis_requests?id=eq.${body.requestId}&select=id,input_type,input_value,product_id&limit=1`,{method:"GET"});
 if(!rr.ok)return NextResponse.json({ok:false,code:"DATABASE_READ_FAILED",detail:await rr.text()},{status:500});
 const rows=await rr.json() as Array<{id:string;input_type:"name"|"url";input_value:string;product_id:string|null}>;const row=rows[0];if(!row)return NextResponse.json({ok:false,message:"상품 신청을 찾을 수 없습니다."},{status:404});
 let productId=row.product_id;
 if(!productId){
  const canonicalName=body.canonicalName?.trim()||(row.input_type==="name"?row.input_value:"신청 상품");
  const pr=await db(url,key,"products",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({canonical_name:canonicalName,product_url:row.input_type==="url"?row.input_value:null,brand:body.brand?.trim()||null,category:body.category?.trim()||null,verification_status:"pending",analysis_summary:body.summary?.trim()||null})});
  if(!pr.ok)return NextResponse.json({ok:false,code:"PRODUCT_SAVE_FAILED",detail:await pr.text()},{status:500});
  productId=((await pr.json()) as Array<{id:string}>)[0]?.id;
 }
 if(!productId)return NextResponse.json({ok:false,code:"PRODUCT_SAVE_FAILED"},{status:500});
 const sorted=CODES.map(code=>({code,score:Math.round(scores[code])})).sort((a,b)=>b.score-a.score);
 const rankMap=new Map(sorted.map((item,index)=>[item.code,index+1]));
 const fitRows=CODES.map(code=>({product_id:productId,beauty_code:code,fit_score:Math.round(scores[code]),fit_grade:null,rank:rankMap.get(code),review_count:0,confidence:0.7,analysis_version:"manual-mvp-v1",is_published:true,evidence_summary:null}));
 const fr=await db(url,key,"product_type_fits?on_conflict=product_id,beauty_code",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify(fitRows)});
 if(!fr.ok)return NextResponse.json({ok:false,code:"FIT_SAVE_FAILED",detail:await fr.text()},{status:500});
 const ur=await db(url,key,`product_analysis_requests?id=eq.${body.requestId}`,{method:"PATCH",body:JSON.stringify({product_id:productId,status:"completed",error_message:null,updated_at:new Date().toISOString()})});
 if(!ur.ok)return NextResponse.json({ok:false,code:"REQUEST_UPDATE_FAILED",detail:await ur.text()},{status:500});
 return NextResponse.json({ok:true,productId,requestId:body.requestId});
}
