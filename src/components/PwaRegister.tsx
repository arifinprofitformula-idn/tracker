"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

export default function PwaRegister() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!event) return null;

  return (
    <div className="install-widget">
      <button className="install-trigger" type="button" aria-label="Install aplikasi" onClick={() => setOpen((value) => !value)}>
        <Download size={18} />
        <span>Install app</span>
      </button>
      {open && (
        <div className="install-popover" role="dialog" aria-label="Install aplikasi">
          <button className="install-close" type="button" aria-label="Tutup install aplikasi" onClick={() => setOpen(false)}>
            <X size={14} />
          </button>
          <b>Install aplikasi</b>
          <p>Tambahkan tracker ke perangkat agar lebih cepat dibuka.</p>
          <button
            className="primary full icon-button"
            type="button"
            onClick={async () => {
              await event.prompt();
              setEvent(null);
              setOpen(false);
            }}
          >
            <Download size={16} />
            Install
          </button>
        </div>
      )}
    </div>
  );
}
