import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = "https://mbunlzldwpjgichedzfa.supabase.co";
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
const headers = (k:string, extra?:HeadersInit) => {
  const h:Record<string,string> = { apikey:k, "Content-Type":"application/json" };
  if (!k.startsWith("sb_secret_")) h.Authorization = `Bearer ${k}`;
  return { ...h, ...(extra ?? {}) };
};
async function db(path:string, init:RequestInit, k:string){return fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...init,headers:headers(k,init.headers),cache:"no-store"});}

export async function GET(){
  const k=key(); if(!k) return NextResponse.json({ok:false,message:"server config missing"},{status:503});
  const [pRes,cRes,rRes]=await Promise.all([
    db("community_posts?select=id,beauty_code,category,title,content,product_url,image_url,like_count,comment_count,status,created_at,updated_at&order=created_at.desc&limit=300",{method:"GET"},k),
    db("community_comments?select=id,post_id,beauty_code,content,status,created_at&order=created_at.desc&limit=500",{method:"GET"},k),
    db("community_reports?select=id,post_id,reason,created_at&order=created_at.desc&limit=300",{method:"GET"},k)
  ]);
  if(!pRes.ok||!cRes.ok||!rRes.ok) return NextResponse.json({ok:false,message:"커뮤니티 관리 데이터 조회 실패"},{status:500});
  return NextResponse.json({ok:true,posts:await pRes.json(),comments:await cRes.json(),reports:await rRes.json()});
}

export async function DELETE(req:NextRequest){
  const k=key(); if(!k) return NextResponse.json({ok:false,message:"server config missing"},{status:503});
  let b:any; try{b=await req.json();}catch{return NextResponse.json({ok:false,message:"invalid body"},{status:400});}
  const type=String(b.type??""); const id=String(b.id??""); if(!id) return NextResponse.json({ok:false,message:"삭제 대상이 없습니다."},{status:400});
  if(type==="post"){
    const res=await db(`community_posts?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"deleted",updated_at:new Date().toISOString()})},k);
    if(!res.ok) return NextResponse.json({ok:false,message:"게시글 삭제 실패"},{status:500});
    return NextResponse.json({ok:true});
  }
  if(type==="comment"){
    const get=await db(`community_comments?id=eq.${encodeURIComponent(id)}&select=post_id,status&limit=1`,{method:"GET"},k); const row=(await get.json())[0];
    const res=await db(`community_comments?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"deleted"})},k);
    if(!res.ok) return NextResponse.json({ok:false,message:"댓글 삭제 실패"},{status:500});
    if(row?.post_id&&row?.status==="visible"){
      const p=await db(`community_posts?id=eq.${encodeURIComponent(row.post_id)}&select=comment_count&limit=1`,{method:"GET"},k); const post=(await p.json())[0];
      if(post) await db(`community_posts?id=eq.${encodeURIComponent(row.post_id)}`,{method:"PATCH",body:JSON.stringify({comment_count:Math.max(0,Number(post.comment_count??0)-1),updated_at:new Date().toISOString()})},k);
    }
    return NextResponse.json({ok:true});
  }
  return NextResponse.json({ok:false,message:"지원하지 않는 삭제 유형입니다."},{status:400});
}
