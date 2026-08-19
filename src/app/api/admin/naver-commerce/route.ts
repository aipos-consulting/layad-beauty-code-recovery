import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const BASE = "https://api.commerce.naver.com/external";

function env(){
  return {
    clientId: process.env.NAVER_COMMERCE_CLIENT_ID ?? "",
    clientSecret: process.env.NAVER_COMMERCE_CLIENT_SECRET ?? "",
    accountId: process.env.NAVER_COMMERCE_ACCOUNT_ID ?? "",
    authType: (process.env.NAVER_COMMERCE_AUTH_TYPE ?? "SELF").toUpperCase(),
  };
}

async function token(){
  const {clientId,clientSecret,accountId,authType}=env();
  if(!clientId || !clientSecret) throw new Error("NAVER_COMMERCE_CLIENT_ID / NAVER_COMMERCE_CLIENT_SECRET가 등록되지 않았습니다.");
  const timestamp=Date.now();
  const hash=bcrypt.hashSync(`${clientId}_${timestamp}`,clientSecret);
  const signature=Buffer.from(hash,"utf8").toString("base64");
  const body=new URLSearchParams({
    client_id:clientId,
    timestamp:String(timestamp),
    grant_type:"client_credentials",
    client_secret_sign:signature,
    type:authType === "SELLER" ? "SELLER" : "SELF",
  });
  if(authType === "SELLER" && accountId) body.set("account_id",accountId);
  const r=await fetch(`${BASE}/v1/oauth2/token`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},body,cache:"no-store"});
  const text=await r.text();
  if(!r.ok) throw new Error(`네이버 인증 실패 (${r.status}): ${text.slice(0,500)}`);
  const payload=JSON.parse(text) as {access_token?:string};
  if(!payload.access_token) throw new Error("네이버 인증 토큰이 반환되지 않았습니다.");
  return payload.access_token;
}

async function naver(path:string,accessToken:string,init?:RequestInit){
  const r=await fetch(`${BASE}${path}`,{...init,headers:{Accept:"application/json;charset=UTF-8",Authorization:`Bearer ${accessToken}`,...(init?.headers??{})},cache:"no-store"});
  const text=await r.text();
  if(!r.ok) throw new Error(`네이버 API 오류 (${r.status}): ${text.slice(0,500)}`);
  return text ? JSON.parse(text) : {};
}

export async function GET(){
  const c=env();
  if(!c.clientId || !c.clientSecret){
    return NextResponse.json({ok:true,configured:false,connected:false,message:"네이버 커머스API 연결 정보가 아직 등록되지 않았습니다."});
  }
  try{
    const accessToken=await token();
    const [account,channels,products]=await Promise.all([
      naver("/v1/seller/account",accessToken),
      naver("/v1/seller/channels",accessToken),
      naver("/v1/products/search",accessToken,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({page:1,size:50,orderType:"TOTAL_REVIEW_COUNT"})}),
    ]);
    return NextResponse.json({ok:true,configured:true,connected:true,account,channels,products,reviewBodyApiAvailable:false,reviewNote:"네이버 공개 커머스API에는 구매 리뷰 본문 목록 조회 API가 제공되지 않아 리뷰 본문은 파일 가져오기 방식으로 연결합니다."});
  }catch(e){
    return NextResponse.json({ok:false,configured:true,connected:false,message:e instanceof Error?e.message:"네이버 스마트스토어 연결 확인 중 오류가 발생했습니다."},{status:502});
  }
}
