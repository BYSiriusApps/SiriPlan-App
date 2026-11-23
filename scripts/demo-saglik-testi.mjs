// Demo org bildirim sağlık testi (2-3 günde bir). SADECE test numaralarına mesaj gider.
// Akış: demo-refresh → telefon sabitleme → talep (sahip+personel bildirimi) → onay → revize → iptal (temizlik).
// Kullanım: node scripts/demo-saglik-testi.mjs   (hata varsa çıkış kodu 1 + "HATA:" satırları)
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
const env = Object.fromEntries(readFileSync(".env.local","utf8").split(/\r?\n/).filter(l=>l&&!l.startsWith("#")&&l.includes("=")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,"")]}));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const ORG="8e73d29c-e312-49d1-8259-2ce510028320", ELIF="32803349-2fb2-42b0-b5db-2315cfa3196c";
const OWNER="+905553287509", STAFF="+905355032634", BASE="https://siriplan.com";
const errs=[]; const bad=(m)=>{errs.push(m);console.log("HATA:",m)};
try { execFileSync("node",["scripts/demo-refresh.mjs","--apply"],{stdio:"pipe"}); console.log("takvim yenilendi"); } catch(e){ bad("demo-refresh: "+e.message.slice(0,200)); }
for (const [t,id,num] of [["organizations",ORG,OWNER],["staff",ELIF,STAFF]]) {
  const {error}=await sb.from(t).update({whatsapp_number:num}).eq("id",id); if(error) bad(`${t} telefon: ${error.message}`);
}
const jar={}; const ck=()=>Object.entries(jar).map(([k,v])=>k+"="+v).join("; ");
const req=async(label,url,method,b,auth)=>{const r=await fetch(BASE+url,{method,headers:{"content-type":"application/json",...(auth?{cookie:ck()}:{})},body:b?JSON.stringify(b):undefined});
  for(const c of r.headers.getSetCookie()){const [kv]=c.split(";");const i=kv.indexOf("=");jar[kv.slice(0,i)]=kv.slice(i+1);}
  const txt=await r.text(); console.log(label,r.status); if(!r.ok) bad(`${label} → ${r.status} ${txt.slice(0,150)}`); try{return JSON.parse(txt)}catch{return {}}};
await req("login","/api/auth/login","POST",{identifier:"sahip.demo@siriplan.com",password:"Sahip!2026Demo"});
const {data:svc}=await sb.from("services").select("id").eq("org_id",ORG).eq("is_active",true).eq("is_bookable_online",true).limit(1);
const d=new Date(); d.setUTCDate(d.getUTCDate()+14); d.setUTCHours(8,0,0,0);
const c=await req("talep (sahip+personel bildirimi)","/api/appointments","POST",{org_id:ORG,customer_name:"Test Bildirim Kontrol",customer_phone:OWNER,staff_id:ELIF,service_id:svc[0].id,appointment_at:d.toISOString(),source:"web",booking_context:"public",kvkk_consent:true,form_started_at:Date.now()-20000});
const id=c.appointment?.id;
if(id){
  await req("onay","/api/appointments/"+id,"PATCH",{status:"onaylandi"},true);
  await req("revize","/api/appointments/"+id+"/notify","POST",{purpose:"revize"},true);
  await req("iptal (temizlik)","/api/appointments/"+id,"PATCH",{status:"iptal"},true);
}
console.log(errs.length?`\n${errs.length} HATA`:"\nHepsi OK — 4 mesaj (talep/onay/revize/iptal) test numaralarına gitmiş olmalı");
process.exit(errs.length?1:0);
