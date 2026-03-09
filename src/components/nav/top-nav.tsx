"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={`text-sm ${
        isActive
          ? "text-zinc-100 font-medium"
          : "text-zinc-400 hover:text-zinc-100"
      }`}
    >
      {children}
    </Link>
  )
}

export function TopNav() {
  const { data: session } = useSession()

  return (
    <nav className="flex items-center justify-between px-6 h-14 bg-zinc-950 border-b border-zinc-800">
      <div className="flex items-center gap-6">
        <span className="text-lg font-semibold text-zinc-100">AutoApply</span>
        <NavLink href="/">Jobs</NavLink>
        <NavLink href="/profile">Profile</NavLink>
      </div>
      <div className="flex items-center gap-4">
        {session?.user?.email && (
          <span className="text-sm text-zinc-400">{session.user.email}</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-zinc-300 hover:text-zinc-100"
        >
          Logout
        </Button>
      </div>
    </nav>
  )
}
