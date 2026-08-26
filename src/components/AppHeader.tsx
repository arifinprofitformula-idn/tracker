"use client";

import Link from "next/link";
import { BarChart3, CalendarClock, ClipboardList, LayoutDashboard, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type HeaderUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
};

type AppHeaderProps = {
  user?: HeaderUser | null;
  active?: "dashboard" | "admin" | "daily-plan";
  onProfile?: () => void;
  onLogout: () => void;
};

function initials(name?: string | null) {
  const clean = name?.trim();
  if (!clean) return "GU";
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function AppHeader({ user, active = "dashboard", onProfile, onLogout }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = user?.name?.trim() || "Guest User";
  const userInitials = useMemo(() => initials(displayName), [displayName]);
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    function closeFromOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeFromOutside);
    document.addEventListener("keydown", closeFromEscape);
    return () => {
      document.removeEventListener("mousedown", closeFromOutside);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, []);

  return (
    <header className="top app-header">
      <div className="brand">
        <span className="brand-mark">
          <BarChart3 size={20} />
        </span>
        <span>Daily Plan & Tracker</span>
      </div>

      <div className="profile-menu" ref={menuRef}>
        <button
          className="avatar-trigger"
          type="button"
          aria-label="Buka menu profil"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="avatar-initials">{userInitials}</span>
          <span className="avatar-copy">
            <b>{displayName}</b>
            <small>{isAdmin ? "Admin" : "User"}</small>
          </span>
          <UserRound size={17} />
        </button>

        {open && (
          <nav className="profile-dropdown" aria-label="Menu pengguna">
            <Link className={active === "dashboard" ? "active" : ""} href="/dashboard" onClick={() => setOpen(false)}>
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
            <Link className={active === "daily-plan" ? "active" : ""} href="/daily-plan" onClick={() => setOpen(false)}>
              <CalendarClock size={16} />
              Daily Plan
            </Link>
            <Link href="/dashboard#tracker" onClick={() => setOpen(false)}>
              <ClipboardList size={16} />
              Tracker
            </Link>
            {isAdmin && (
              <Link className={active === "admin" ? "active" : ""} href="/admin" onClick={() => setOpen(false)}>
                <ShieldCheck size={16} />
                Admin
              </Link>
            )}
            {onProfile && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onProfile();
                }}
              >
                <Settings size={16} />
                Settings
              </button>
            )}
            <button type="button" onClick={onLogout}>
              <LogOut size={16} />
              Logout
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
