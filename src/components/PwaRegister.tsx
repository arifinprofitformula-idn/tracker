"use client";
import { useEffect, useState } from "react";
export default function PwaRegister(){ const [event,setEvent]=useState<Event|null>(null); useEffect(()=>{if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js"); const fn=(e:Event)=>{e.preventDefault();setEvent(e)}; window.addEventListener("beforeinstallprompt",fn); return()=>window.removeEventListener("beforeinstallprompt",fn)},[]); if(!event)return null; return <button className="install" onClick={async()=>{await (event as Event & {prompt:()=>Promise<void>}).prompt();setEvent(null)}}>Instal aplikasi</button> }
