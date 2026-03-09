"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle2, XCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ScrapeRunData {
  id: string
  status: string
  platforms: string[]
  jobsFound: number
  errors: unknown
  startedAt: string
  completedAt: string | null
  duration: number | null
}

interface ScrapeStatusBarProps {
  initialRun: ScrapeRunData | null
}

export function ScrapeStatusBar({ initialRun }: ScrapeStatusBarProps) {
  const [run, setRun] = useState<ScrapeRunData | null>(initialRun)
  const [dismissed, setDismissed] = useState(false)
  const router = useRouter()

  const isActive =
    run &&
    run.status !== "completed" &&
    run.status !== "completed_with_errors" &&
    run.status !== "failed"

  const poll = useCallback(async () => {
    if (!run) return
    try {
      const res = await fetch(`/api/scrape/status?runId=${run.id}`)
      if (!res.ok) return
      const data: ScrapeRunData = await res.json()
      setRun(data)

      if (
        data.status === "completed" ||
        data.status === "completed_with_errors" ||
        data.status === "failed"
      ) {
        // Refresh server component data
        router.refresh()
      }
    } catch {
      // ignore fetch errors during polling
    }
  }, [run, router])

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [isActive, poll])

  // Auto-dismiss completed status after 5 seconds
  useEffect(() => {
    if (run?.status === "completed" || run?.status === "completed_with_errors") {
      const timer = setTimeout(() => setDismissed(true), 5000)
      return () => clearTimeout(timer)
    }
  }, [run?.status])

  // Reset dismissed state when initialRun changes (new scrape triggered)
  useEffect(() => {
    if (initialRun && initialRun.id !== run?.id) {
      setRun(initialRun)
      setDismissed(false)
    }
  }, [initialRun, run?.id])

  if (!run || dismissed) return null

  // Idle: completed runs that have been around for a while -- don't show
  if (
    (run.status === "completed" || run.status === "completed_with_errors") &&
    run.completedAt &&
    Date.now() - new Date(run.completedAt).getTime() > 60000
  ) {
    return null
  }

  const platformNames = run.platforms
    .map((p) => (p === "greenhouse" ? "Greenhouse" : "Indeed"))
    .join(", ")

  if (run.status === "pending" || run.status === "running") {
    return (
      <div className="flex items-center gap-3 rounded-md bg-indigo-950/50 border border-indigo-800/50 px-4 py-3">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
        <span className="text-sm text-indigo-300">
          Discovering jobs from {platformNames}...
        </span>
      </div>
    )
  }

  if (run.status === "completed" || run.status === "completed_with_errors") {
    return (
      <div className="flex items-center justify-between rounded-md bg-green-950/50 border border-green-800/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <span className="text-sm text-green-300">
            Found {run.jobsFound} new job{run.jobsFound !== 1 ? "s" : ""}
          </span>
          {run.duration && (
            <span className="text-xs text-green-600">
              in {Math.round(run.duration / 1000)}s
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="h-6 w-6 p-0 text-green-600 hover:text-green-400"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  if (run.status === "failed") {
    const errorMsg =
      run.errors && typeof run.errors === "object"
        ? JSON.stringify(run.errors)
        : "Unknown error"

    return (
      <div className="flex items-center justify-between rounded-md bg-red-950/50 border border-red-800/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <XCircle className="h-4 w-4 text-red-400" />
          <span className="text-sm text-red-300">
            Scraping failed: {errorMsg}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="h-6 w-6 p-0 text-red-600 hover:text-red-400"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return null
}
