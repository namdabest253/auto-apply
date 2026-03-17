"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Search, Sparkles } from "lucide-react"
import { triggerScrape } from "../actions"

export function DiscoverButton() {
  const [isPending, startTransition] = useTransition()
  const [isAILoading, setIsAILoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleScrape = () => {
    setError(null)
    startTransition(async () => {
      const result = await triggerScrape()
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  const handleAIDiscover = async () => {
    setError(null)
    setIsAILoading(true)
    try {
      const res = await fetch("/api/discover/trigger", { method: "POST" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to start AI discovery")
        return
      }
      router.refresh()
    } catch {
      setError("Failed to start AI discovery")
    } finally {
      setIsAILoading(false)
    }
  }

  const busy = isPending || isAILoading

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-sm text-red-400">{error}</span>}
      <Button variant="outline" onClick={handleScrape} disabled={busy}>
        <Search className="h-4 w-4 mr-2" />
        {isPending ? "Starting..." : "Scrape Jobs"}
      </Button>
      <Button onClick={handleAIDiscover} disabled={busy}>
        <Sparkles className="h-4 w-4 mr-2" />
        {isAILoading ? "Starting..." : "AI Discover"}
      </Button>
    </div>
  )
}
