"use client";

import BrandAuthHeader from "@/components/BrandAuthHeader";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

export default function CoachInviteConsent({token}:{token:string}){
 const [preview,setPreview]=useState<{workspace:{name:string};coachName:string;clientEmail:string;expiresAt:string}|null>(null),[consent,setConsent]=useState(false),[error,setError]=useState(""),[done,setDone]=useState(false),[loading,setLoading]=useState(true);
 useEffect(()=>{fetch(`/api/coach/invite-preview?token=${encodeURIComponent(token)}`).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||'Invite tidak valid');setPreview(d)}).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[token]);
 async function accept(){setError("");const r=await fetch('/api/coach/invites/accept',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,consent,consentVersion:'coach-progress-v1'})});const d=await r.json();if(r.status===401){location.href=`/login?next=${encodeURIComponent(`/coach/invite/${token}`)}`;return}if(!r.ok){setError(d.error||'Gagal menerima invite');return}setDone(true)}
 return <main className="auth-shell"><section className="auth-card coach-consent"><BrandAuthHeader/><div className="eyebrow">Coach Invitation</div>{loading?<p>Memuat invite...</p>:done?<><ShieldCheck size={36}/><h1>Consent aktif</h1><p>Coach sekarang dapat melihat metrik progres yang disetujui.</p><Link className="primary full" href="/coach/consent">Kelola consent</Link></>:error?<><h1>Invite tidak tersedia</h1><p className="error">{error}</p><Link href="/login">Masuk</Link></>:preview&&<><h1>{preview.workspace.name}</h1><p><b>{preview.coachName}</b> mengundang <b>{preview.clientEmail}</b> ke Coach Mode.</p><div className="consent-scope"><b>Data yang dibagikan</b><ul><li>Nama dan email</li><li>Progress tracker 7/30 hari</li><li>Streak dan aktivitas check terbaru</li><li>Program aktif</li></ul><b>Tetap private</b><ul><li>Isi reflection/note</li><li>Label Daily Plan</li><li>Password, billing, dan session</li></ul></div><label className="consent-check"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Saya setuju membagikan metrik progres di atas. Consent dapat dicabut.</span></label><button className="primary full" disabled={!consent} onClick={accept}>Terima dan aktifkan</button></>}</section></main>
}
