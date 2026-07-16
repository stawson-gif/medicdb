"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Doctor {
  id: number;
  fullName: string;
  email: string;
  specialty: string | null;
  department: string | null;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) router.push("/");
        else setDoctor(data);
      })
      .catch(() => router.push("/"));
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const nav = [
    {
      href: "/dashboard",
      label: "Пациенты",
      icon: "👥",
      active: pathname === "/dashboard",
    },
  ];

  return (
    <aside className="w-72 bg-slate-900 text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏥</span>
          <div>
            <h1 className="text-lg font-bold leading-tight">МедСистема</h1>
            <p className="text-xs text-slate-400">Врачебная информационная система</p>
          </div>
        </div>
      </div>

      {/* Doctor info */}
      {doctor && (
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
              {doctor.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doctor.fullName}</p>
              <p className="text-xs text-slate-400 truncate">
                {doctor.specialty || "Врач"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  item.active
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
        >
          <span className="text-lg">🚪</span>
          Выйти
        </button>
      </div>
    </aside>
  );
}
