"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plane, LayoutDashboard, Wrench, Users, Coins, Box } from "lucide-react"
import { ReactNode } from "react"
import AdminErrorBoundary from "@/components/admin-error-boundary"

const NAV: Array<{ href: string; label: string; icon: any }> = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/cad", label: "Editor CAD", icon: Wrench },
  { href: "/admin/aircraft", label: "Aeronaves", icon: Box },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/sales", label: "Vendas", icon: Coins },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const collapsed = pathname?.startsWith("/admin/cad")
  const asideWidth = collapsed ? "w-14" : "w-56"
  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-white flex">
      <aside className={`${asideWidth} h-full border-r border-white/10 bg-black/80 backdrop-blur-sm shrink-0`}>
        <div className={`border-b border-white/10 ${collapsed ? "px-2 py-3 flex items-center justify-center" : "px-4 py-4 flex items-center gap-2"}`}>
          <div className={`${collapsed ? "w-6 h-6" : "w-8 h-8"} rounded-lg bg-orange-600 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.35)]`}>
            <Plane className={`${collapsed ? "w-3 h-3" : "w-4 h-4"} text-black`} />
          </div>
          {!collapsed && <div className="text-sm font-bold">Admin</div>}
        </div>
        <nav className={`${collapsed ? "px-1 py-2 space-y-1" : "px-2 py-3 space-y-1"}`}>
          {NAV.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center ${collapsed ? "justify-center" : "gap-2"} px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? "bg-orange-600/20 text-orange-300 border border-orange-600/30" : "hover:bg-white/5 text-slate-300"
                }`}
              >
                <Icon className={`${collapsed ? "w-3 h-3" : "w-4 h-4"}`} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </aside>
      <main className="flex-1 h-full min-w-0 overflow-auto">
        <AdminErrorBoundary>
          {children}
        </AdminErrorBoundary>
      </main>
    </div>
  )
}
