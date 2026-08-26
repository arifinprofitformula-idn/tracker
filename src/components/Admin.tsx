"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import MobileBottomNav from "@/components/MobileBottomNav";
import ProfileSettings from "@/components/ProfileSettings";

type U = { id: string; name: string; email: string; role: string; status: string; createdAt: string; _count: { modules: number } };
type Setting = { key: string; value: string };
type SessionUser = { name: string; email: string; role: string };

export default function Admin() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [users, setUsers] = useState<U[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [profileModal, setProfileModal] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const session = await fetch("/api/auth/session");
    if (!session.ok) {
      router.replace("/login");
      return;
    }
    const sessionJson = await session.json();
    if (sessionJson.user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    setUser(sessionJson.user);
    const [userResponse, settingResponse] = await Promise.all([fetch("/api/admin/users"), fetch("/api/admin/settings")]);
    setUsers(await userResponse.json());
    setSettings(await settingResponse.json());
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function post(path: string, body: object) {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error);
      return;
    }
    setError("");
    await load();
  }

  async function logout() {
    router.push("/logout");
  }

  async function saveSetting(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await post("/api/admin/settings", { key: form.get("key"), value: form.get("value") });
    e.currentTarget.reset();
  }

  function focusSettings() {
    document.getElementById("admin-settings")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => document.querySelector<HTMLInputElement>("#admin-settings input[name='key']")?.focus(), 250);
  }

  return (
    <div className="shell dashboard-shell">
      <AppHeader user={user} active="admin" onProfile={() => setProfileModal(true)} onLogout={logout} />
      <main className="content dashboard-content">
        <section className="hero">
          <div>
            <div className="eyebrow">Akses admin</div>
            <h1>Pengguna</h1>
            <p className="muted">Atur status dan peran. Admin aktif terakhir selalu dilindungi.</p>
          </div>
        </section>
        {error && <p className="error">{error}</p>}
        <section className="card table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Pengguna</th>
                <th>Tracker</th>
                <th>Peran</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id}>
                  <td>
                    <b>{item.name}</b>
                    <br />
                    <span className="muted">{item.email}</span>
                  </td>
                  <td>{item._count.modules}</td>
                  <td>
                    <select value={item.role} onChange={(e) => post("/api/admin/users", { userId: item.id, role: e.target.value })}>
                      <option>USER</option>
                      <option>ADMIN</option>
                    </select>
                  </td>
                  <td>
                    <select value={item.status} onChange={(e) => post("/api/admin/users", { userId: item.id, status: e.target.value })}>
                      <option>ACTIVE</option>
                      <option>SUSPENDED</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card" id="admin-settings">
          <b>Pengaturan fitur</b>
          <p className="muted">Konfigurasi key/value tersimpan di database dan hanya dapat diubah admin.</p>
          {settings.map((setting) => (
            <div className="row between" key={setting.key}>
              <code>{setting.key}</code>
              <b>{setting.value}</b>
            </div>
          ))}
          <form onSubmit={saveSetting}>
            <div className="field">
              <label>Key</label>
              <input name="key" required pattern="[a-z0-9._-]+" placeholder="registration.enabled" />
            </div>
            <div className="field">
              <label>Value</label>
              <input name="value" required placeholder="true" />
            </div>
            <button className="primary">Simpan pengaturan</button>
          </form>
        </section>
      </main>

      <MobileBottomNav
        active="admin"
        onPrimary={focusSettings}
        onSettings={() => setProfileModal(true)}
        primaryLabel="Tambah pengaturan"
      />

      {profileModal && (
        <div className="modal profile-modal" onClick={() => setProfileModal(false)}>
          <div className="profile-modal-panel" onClick={(e) => e.stopPropagation()}>
            <ProfileSettings onClose={() => setProfileModal(false)} onSaved={(updated) => setUser(updated)} />
          </div>
        </div>
      )}
    </div>
  );
}
