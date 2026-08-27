"use client";

import BrandAuthHeader from "@/components/BrandAuthHeader";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";

type Consent={id:string;consentedAt:string;consentVersion:string;workspace:{name:string};coach:{name:string;email:string}};
export default function CoachConsentManager(){const [items,setItems]=useState<Consent[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");async function load(){const r=await fetch('/api/coach/consents');if(r.status===401){location.href=`/login?next=${encodeURIComponent('/coach/consent')}`;return}const d=await r.json();if(r.ok)setItems(d.consents);else setError(d.error||'Gagal memuat consent');setLoading(false)}useEffect(()=>{load()},[]);async function revoke(id:string){if(!confirm('Cabut izin berbagi progres ke Coach ini?'))return;const r=await fetch('/api/coach/consents/revoke',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({linkId:id})});if(r.ok)load();else setError((await r.json()).error||'Gagal mencabut consent')}
return <main className="auth-shell"><section className="auth-card coach-consent"><BrandAuthHeader/><div className="eyebrow">Privacy Control</div><h1>Coach sharing consent</h1><p className="muted">Kelola siapa yang boleh melihat metrik progres Anda.</p>{error&&<p className="error">{error}</p>}{loading?<p>Memuat...</p>:items.length===0?<div className="empty-state"><ShieldOff size={28}/><p>Tidak ada consent Coach aktif.</p></div>:items.map(x=><article className="card" key={x.id}><ShieldCheck size={22}/><h2>{x.workspace.name}</h2><p>Coach: <b>{x.coach.name}</b></p><small>Aktif sejak {new Date(x.consentedAt).toLocaleString('id-ID')}</small><button className="danger-link" onClick={()=>revoke(x.id)}>Cabut consent</button></article>)}<Link className="secondary full auth-link-button" href="/dashboard">Kembali ke dashboard</Link></section></main>}
