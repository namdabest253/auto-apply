"use client"

import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function TopNav() {
  const { data: session } = useSession()

  return (
    <nav className="flex items-center justify-between px-6 h-14 bg-zinc-950 border-b border-zinc-800">
      <span className="text-lg font-semibold text-zinc-100">AutoApply</span>
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
