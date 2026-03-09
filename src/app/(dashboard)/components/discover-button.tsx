"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { triggerScrape } from "../actions"

export function DiscoverButton() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      const result = await triggerScrape()
      if (result.error) {
        setError(result.error)
        return
      }
      // Refresh the page to pick up the new scrape run
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-sm text-red-400">{error}</span>}
      <Button onClick={handleClick} disabled={isPending}>
        <Search className="h-4 w-4 mr-2" />
        {isPending ? "Starting..." : "Discover Jobs"}
      </Button>
    </div>
  )
}
