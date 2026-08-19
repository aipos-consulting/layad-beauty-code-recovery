import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const headers = (k:string, extra?:HeadersInit) => {
  const h:Record<string,string> = { apikey:k, "Content-Type":"application/json" };
  if (!k.startsWith("sb_secret_")) h.Authorization = `Bearer ${k}`;
  return { ...h, ...(extra ?? {}) };
};
async function db(path:string, init:RequestInit, k:string){return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:headers(k,init.headers),cache:"no-store"});}
const codeOk=(v:string)=>/^[OD][GM][PC][VE]$/.test(v);

export async function GET(req:NextRequest){
  const k=key(); if(!k) return NextResponse.json({ok:false,message:"server config missing"},{status:503});
  const code=req.nextUrl.searchParams.get("code")?.toUpperCase() ?? "ALL";
  const id=req.nextUrl.searchParams.get("post");
  if(id){
    const [pRes,cRes]=await Promise.all([
      db(`community_posts?id=eq.${encodeURIComponent(id)}&status=eq.visible&select=id,beauty_code,category,title,content,product_url,image_url,like_count,comment_count,created_at&limit=1`,{method:"GET"},k),
      db(`community_comments?post_id=eq.${encodeURIComponent(id)}&status=eq.visible&select=id,beauty_code,content,created_at&order=created_at.asc&limit=100`,{method:"GET"},k)
    ]);
    if(!pRes.ok||!cRes.ok) return NextResponse.json({ok:false,message:"조회 실패"},{status:500});
    return NextResponse.json({ok:true,post:(await pRes.json())[0]??null,comments:await cRes.json()});
  }
  const filter=code!=="ALL"&&codeOk(code)?`&beauty_code=eq.${code}`:"";
  const res=await db(`community_posts?status=eq.visible${filter}&select=id,beauty_code,category,title,content,product_url,image_url,like_count,comment_count,created_at&order=created_at.desc&limit=100`,{method:"GET"},k);
  if(!res.ok) return NextResponse.json({ok:false,message:"조회 실패"},{status:500});
  return NextResponse.json({ok:true,posts:await res.json()});
}

export async function POST(req:NextRequest){
  const k=key(); if(!k) return NextResponse.json({ok:false,message:"server config missing"},{status:503});
  let b:any; try{b=await req.json();}catch{return NextResponse.json({ok:false,message:"invalid body"},{status:400});}
  const token=String(b.author_token??"").trim(); const code=String(b.beauty_code??"").toUpperCase();
  if(token.length<8||!codeOk(code)) return NextResponse.json({ok:false,message:"Beauty Code 또는 사용자 정보가 올바르지 않습니다."},{status:400});
  if(b.action==="post"){
    const title=String(b.title??"").trim().slice(0,120), content=String(b.content??"").trim().slice(0,5000);
    const category=String(b.category??"자유"); if(!title||!content) return NextResponse.json({ok:false,message:"제목과 내용을 입력해 주세요."},{status:400});
    const res=await db("community_posts",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({author_token:token,beauty_code:code,category,title,content,product_url:String(b.product_url??"").trim()||null,image_url:String(b.image_url??"").trim()||null})},k);
    if(!res.ok) return NextResponse.json({ok:false,message:"게시글 저장 실패"},{status:500});
    return NextResponse.json({ok:true,post:(await res.json())[0]});
  }
  if(b.action==="comment"){
    const postId=String(b.post_id??""), content=String(b.content??"").trim().slice(0,1000); if(!postId||!content) return NextResponse.json({ok:false,message:"댓글을 입력해 주세요."},{status:400});
    const ins=await db("community_comments",{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({post_id:postId,author_token:token,beauty_code:code,content})},k);
    if(!ins.ok) return NextResponse.json({ok:false,message:"댓글 저장 실패"},{status:500});
    await db(`community_posts?id=eq.${postId}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({comment_count:Number(b.comment_count??0)+1,updated_at:new Date().toISOString()})},k);
    return NextResponse.json({ok:true,comment:(await ins.json())[0]});
  }
  if(b.action==="like"){
    const postId=String(b.post_id??""); if(!postId) return NextResponse.json({ok:false},{status:400});
    const chk=await db(`community_likes?post_id=eq.${postId}&author_token=eq.${encodeURIComponent(token)}&select=post_id&limit=1`,{method:"GET"},k); const exists=(await chk.json()).length>0;
    if(exists) await db(`community_likes?post_id=eq.${postId}&author_token=eq.${encodeURIComponent(token)}`,{method:"DELETE"},k); else await db("community_likes",{method:"POST",body:JSON.stringify({post_id:postId,author_token:token})},k);
    const cntRes=await db(`community_likes?post_id=eq.${postId}&select=post_id`,{method:"GET",headers:{Prefer:"count=exact"}},k); const rows=await cntRes.json(); const count=rows.length;
    await db(`community_posts?id=eq.${postId}`,{method:"PATCH",body:JSON.stringify({like_count:count,updated_at:new Date().toISOString()})},k);
    return NextResponse.json({ok:true,liked:!exists,count});
  }
  if(b.action==="report"){
    const postId=String(b.post_id??""); if(!postId) return NextResponse.json({ok:false},{status:400});
    const ins=await db("community_reports",{method:"POST",headers:{Prefer:"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify({post_id:postId,author_token:token,reason:String(b.reason??"신고").slice(0,300)})},k);
    if(!ins.ok) return NextResponse.json({ok:false,message:"신고 처리 실패"},{status:500});
    return NextResponse.json({ok:true});
  }
  return NextResponse.json({ok:false,message:"unknown action"},{status:400});
}
