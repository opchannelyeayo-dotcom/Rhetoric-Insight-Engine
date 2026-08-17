// @ts-nocheck -- Express 5 parameter unions and dynamic, allow-listed CRUD columns are runtime validated.
import express, { type NextFunction, type Request, type Response } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import cors from "cors";
import bcrypt from "bcryptjs";
import pg from "pg";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

declare module "express-session" { interface SessionData { user?: { id:number; username:string; role:Role } } }
type Role = "super_admin" | "content_reviewer" | "readonly";
const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL 未設定：請先在 Replit Database 建立 PostgreSQL。");
const pool = new Pool({ connectionString, ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized:false } });
const here = dirname(fileURLToPath(import.meta.url));

async function bootstrap() {
  const candidates = [resolve(here,"../migrations/0001_init.sql"), resolve(here,"../../migrations/0001_init.sql"), resolve(process.cwd(),"artifacts/admin-console/migrations/0001_init.sql")];
  let sql=""; for (const f of candidates) { try { sql=await readFile(f,"utf8"); break; } catch {} }
  if (!sql) throw new Error("migration 檔案不存在");
  await pool.query(sql);
  const username=process.env.INITIAL_ADMIN_USERNAME || process.env.ADMIN_USERNAME || "123123";
  const password=process.env.INITIAL_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "123123";
  if (!/^\d{6}$/.test(username) || !/^\d{6}$/.test(password)) throw new Error("INITIAL_ADMIN_USERNAME/PASSWORD 必須為六位數");
  const hash=await bcrypt.hash(password,12);
  await pool.query(`INSERT INTO admin_users(username,password_hash,role,is_active) VALUES($1,$2,'super_admin',true) ON CONFLICT(username) DO UPDATE SET password_hash=EXCLUDED.password_hash,role='super_admin',is_active=true`,[username,hash]);
}

const app=express(); const PgStore=pgSession(session); const prod=process.env.NODE_ENV==="production";
app.set("trust proxy",1);
const origins=(process.env.CORS_ORIGINS||"").split(",").map(x=>x.trim()).filter(Boolean);
app.use(cors({credentials:true,origin(origin,cb){ if(!origin||origins.includes(origin)) return cb(null,true); cb(new Error("不允許的 CORS 來源")); }}));
app.use(express.json({limit:"2mb"})); app.use(express.urlencoded({extended:true}));
app.use(session({store:new PgStore({pool,tableName:"admin_sessions",createTableIfMissing:false}),name:"rx_admin",secret:process.env.SESSION_SECRET||"dev-only-rhetoric-admin-session-secret-change-me",resave:false,saveUninitialized:false,cookie:{httpOnly:true,secure:prod,sameSite:"lax",maxAge:8*60*60*1000}}));
app.use((_q,r,n)=>{r.set({"X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"same-origin","Content-Security-Policy":"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'"});n()});
const asyncRoute=(fn:any)=>(q:Request,r:Response,n:NextFunction)=>Promise.resolve(fn(q,r,n)).catch(n);
const auth=(roles?:Role[])=>(q:Request,r:Response,n:NextFunction)=>{const u=q.session.user;if(!u)return r.status(401).json({error:"請先登入"});if(roles&&!roles.includes(u.role))return r.status(403).json({error:"權限不足"});n()};
const canWrite:Role[]=["super_admin","content_reviewer"];
const csv=(v:unknown)=>`"${String(v??"").replaceAll('"','""')}"`;

app.get("/health",asyncRoute(async(_q:Request,r:Response)=>{await pool.query("SELECT 1");r.json({status:"ok",service:"rhetoric-admin"})}));
app.post("/api/auth/login",asyncRoute(async(q:Request,r:Response)=>{const {username,password}=q.body;const x=await pool.query("SELECT * FROM admin_users WHERE username=$1",[username]);const u=x.rows[0];if(!u||!u.is_active||!await bcrypt.compare(String(password||""),u.password_hash))return r.status(401).json({error:"帳號或密碼錯誤，或帳號已停用"});q.session.user={id:u.id,username:u.username,role:u.role};await pool.query("UPDATE admin_users SET last_login=now() WHERE id=$1",[u.id]);r.json(q.session.user)}));
app.post("/api/auth/logout",auth(),(q,r)=>q.session.destroy(()=>{r.clearCookie("rx_admin");r.json({ok:true})}));
app.get("/api/auth/me",auth(),(q,r)=>r.json(q.session.user));

app.get("/api/stats",auth(),asyncRoute(async(_q:Request,r:Response)=>{const [a,t,d,u,types,trend,risks,regions,statuses]=await Promise.all([
 pool.query("SELECT count(*)::int total,coalesce(round(avg(trust_score)),0)::int avg FROM analysis_records"),pool.query("SELECT count(*)::int total,count(*) FILTER(WHERE status='pending')::int pending,count(*) FILTER(WHERE verification_status IS NULL OR verification_status<>'verified')::int unverified FROM rhetoric_tags"),pool.query("SELECT count(*)::int total FROM drugs"),pool.query("SELECT count(*)::int total FROM url_queries"),pool.query("SELECT unnest(tactic_types) label,count(*)::int value FROM analysis_records GROUP BY 1 ORDER BY 2 DESC LIMIT 6"),pool.query("SELECT to_char(created_at::date,'MM/DD') label,round(avg(trust_score))::int value FROM analysis_records WHERE created_at>now()-interval '14 days' GROUP BY created_at::date ORDER BY created_at::date"),pool.query("SELECT risk_level label,count(*)::int value FROM analysis_records GROUP BY 1"),pool.query("SELECT coalesce(region,'未驗證') label,count(*)::int value FROM rhetoric_tags GROUP BY 1"),pool.query("SELECT status label,count(*)::int value FROM rhetoric_tags GROUP BY 1")]);
 r.json({analyses:a.rows[0],tags:t.rows[0],drugs:d.rows[0],urls:u.rows[0],types:types.rows,trend:trend.rows,risks:risks.rows,regions:regions.rows,statuses:statuses.rows})}));

const configs:any={
 records:{table:"analysis_records",select:"id,input_type,input_text,input_summary,trust_score,risk_level,tactic_types,created_at",search:["input_summary","input_text"],sort:["created_at","trust_score"],write:false},
 drugs:{table:"drugs",select:"*",search:["name","approval_number","manufacturer"],sort:["created_at","name"]},
 tags:{table:"rhetoric_tags",select:"*",search:["label","tactic_type","legal_basis"],sort:["created_at","updated_at","label"]},
 urls:{table:"url_queries",select:"*",search:["url","reason"],sort:["created_at"],write:false},
 users:{table:"admin_users",select:"id,username,role,is_active,created_at,last_login",search:["username"],sort:["created_at","username"],admin:true}
};
for(const [kind,c] of Object.entries(configs) as any){
 app.get(`/api/${kind}`,auth(),asyncRoute(async(q:Request,r:Response)=>{let where:string[]=[];let vals:any[]=[];if(q.query.q){vals.push(`%${q.query.q}%`);where.push(`(${c.search.map((x:string)=>`${x} ILIKE $${vals.length}`).join(" OR ")})`)};for(const f of ["input_type","risk_level","category","status","tactic_type","region","role"]){if(q.query[f]){vals.push(q.query[f]);where.push(`${f}=$${vals.length}`)}}const sort=c.sort.includes(q.query.sort)?q.query.sort:c.sort[0];const dir=q.query.dir==="asc"?"ASC":"DESC";const z=await pool.query(`SELECT ${c.select} FROM ${c.table}${where.length?" WHERE "+where.join(" AND "):""} ORDER BY ${sort} ${dir} LIMIT 500`,vals);r.json(z.rows)}));
 if(!c.write) continue;
 app.post(`/api/${kind}`,auth(c.admin?["super_admin"]:canWrite),asyncRoute(async(q:Request,r:Response)=>{const b={...q.body};if(c.admin){b.password_hash=await bcrypt.hash(b.password,12);delete b.password;b.is_active=true}const keys=Object.keys(b).filter(k=>/^[a-z_]+$/.test(k));const vals=keys.map(k=>b[k]);const z=await pool.query(`INSERT INTO ${c.table}(${keys.join(",")}) VALUES(${keys.map((_:any,i:number)=>`$${i+1}`).join(",")}) RETURNING ${c.admin?c.select:"*"}`,vals);r.status(201).json(z.rows[0])}));
 app.patch(`/api/${kind}/:id`,auth(c.admin?["super_admin"]:canWrite),asyncRoute(async(q:Request,r:Response)=>{const b={...q.body};if(c.admin&&b.password){b.password_hash=await bcrypt.hash(b.password,12);delete b.password}const keys=Object.keys(b).filter(k=>/^[a-z_]+$/.test(k));const vals=keys.map(k=>b[k]);vals.push(q.params.id);const z=await pool.query(`UPDATE ${c.table} SET ${keys.map((k:string,i:number)=>`${k}=$${i+1}`).join(",")}${kind==="tags"?",updated_at=now()":""} WHERE id=$${vals.length} RETURNING ${c.admin?c.select:"*"}`,vals);r.json(z.rows[0])}));
 app.delete(`/api/${kind}/:id`,auth(c.admin?["super_admin"]:canWrite),asyncRoute(async(q:Request,r:Response)=>{if(c.admin&&Number(q.params.id)===q.session.user?.id)return r.status(400).json({error:"不能刪除自己"});await pool.query(`DELETE FROM ${c.table} WHERE id=$1`,[q.params.id]);r.json({ok:true})}));
}
app.delete("/api/records/:id",auth(canWrite),asyncRoute(async(q:Request,r:Response)=>{await pool.query("DELETE FROM analysis_records WHERE id=$1",[q.params.id]);r.json({ok:true})}));
app.delete("/api/urls/test/all",auth(canWrite),asyncRoute(async(_q:Request,r:Response)=>{const z=await pool.query("DELETE FROM url_queries WHERE is_test=true");r.json({ok:true,count:z.rowCount})}));
app.get("/api/:kind/export",auth(),asyncRoute(async(q:Request,r:Response)=>{const c=configs[q.params.kind];if(!c||c.admin)return r.sendStatus(404);const z=await pool.query(`SELECT ${c.select} FROM ${c.table} ORDER BY id`);const heads=z.rows[0]?Object.keys(z.rows[0]):["id"];r.type("text/csv").attachment(`${q.params.kind}.csv`).send('\ufeff'+[heads.map(csv).join(","),...z.rows.map(x=>heads.map(h=>csv(x[h])).join(","))].join("\n"))}));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:2_000_000}});
app.post("/api/drugs/import",auth(canWrite),upload.single("file"),asyncRoute(async(q:Request,r:Response)=>{if(!q.file)return r.status(400).json({error:"請選擇 CSV"});const rows=parse(q.file.buffer,{columns:true,skip_empty_lines:true,bom:true});let count=0;for(const x of rows){await pool.query("INSERT INTO drugs(name,approval_number,manufacturer,category,approved_date,ingredients,claims,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[x.name||x['名稱'],x.approval_number||x['核准字號']||'',x.manufacturer||x['廠商']||'',x.category||x['分類']||'藥品',x.approved_date||null,x.ingredients||null,x.claims||null,x.status||'active']);count++}r.json({ok:true,count})}));
app.post("/api/analyze",auth(canWrite),asyncRoute(async(q:Request,r:Response)=>{const text=String(q.body.text||"");if(text.length<2)return r.status(400).json({error:"請輸入待分析文案"});const rules=[['絕對','過度承諾'],['保證','過度承諾'],['限時','稀缺壓力'],['馬上','稀缺壓力'],['醫師','權威背書'],['大家都','從眾暗示']];const tags=rules.filter(x=>text.includes(x[0])).map(x=>({label:x[1],evidence:`出現「${x[0]}」`,risk:'high'}));if(!tags.length)tags.push({label:'資訊透明度',evidence:'建議補充可驗證來源',risk:'medium'});r.json({scene:q.body.scene,tags,rewrite:text.replaceAll('絕對','在符合條件時可能').replaceAll('保證','預期'),legal:'請依發布地區之廣告、消費者保護與藥事相關法規進行人工復核。',cases:'可至「話術風險標籤」資料庫查閱已驗證案例。'})}));
const tokenAuth=(q:Request,r:Response,n:NextFunction)=>{const expected=process.env.PUBLIC_API_TOKEN;if(!expected)return r.status(503).json({error:"PUBLIC_API_TOKEN 未設定"});if(q.headers.authorization!==`Bearer ${expected}`)return r.status(401).json({error:"API token 無效"});n()};
app.post("/api/integrations/analysis",tokenAuth,asyncRoute(async(q:Request,r:Response)=>{const b=q.body;const z=await pool.query("INSERT INTO analysis_records(input_type,input_text,input_summary,trust_score,risk_level,analysis_result,tactic_types) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",[b.inputType||'text',b.inputText||null,b.inputSummary,Number(b.trustScore),b.riskLevel,JSON.stringify(b.analysisResult||{}),b.tacticTypes||[]]);r.status(201).json(z.rows[0])}));
app.post("/api/integrations/url-query",tokenAuth,asyncRoute(async(q:Request,r:Response)=>{const b=q.body;const z=await pool.query("INSERT INTO url_queries(url,status,reason,is_test) VALUES($1,$2,$3,$4) RETURNING id",[b.url,b.status||'unknown',b.reason,b.isTest||false]);r.status(201).json(z.rows[0])}));

app.get("/*splat",asyncRoute(async(_q:Request,r:Response)=>{const candidates=[resolve(here,"public/index.html"),resolve(here,"../src/public/index.html"),resolve(process.cwd(),"artifacts/admin-console/src/public/index.html")];for(const f of candidates){try{const html=(await readFile(f,"utf8")).replace("__PUBLIC_SITE_URL__",JSON.stringify(process.env.PUBLIC_SITE_URL||"/"));return r.type("html").send(html)}catch{}}r.status(500).send("UI missing")}));
app.use((e:any,_q:Request,r:Response,_n:NextFunction)=>{console.error(e);r.status(500).json({error:prod?"伺服器處理失敗":e.message})});
const port=Number(process.env.PORT||5000);bootstrap().then(()=>app.listen(port,"0.0.0.0",()=>console.log(`Admin listening on ${port}`))).catch(e=>{console.error(e);process.exit(1)});
