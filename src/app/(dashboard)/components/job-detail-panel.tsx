"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ExternalLink, MapPin, Calendar, Building2, DollarSign, Loader2, CheckCircle2, Send, Coffee, AlertTriangle, XCircle, MousePointerClick, TextCursorInput, Upload, List, Clock, Eye } from "lucide-react"
import type { JobDetail, ApplicationRunStatus } from "../actions"
import { getJobDetail, markJobApplied, unmarkJobApplied, autoApplyToJob, cancelAutoApply, findCoffeeChatContacts, getApplicationRunStatus } from "../actions"

interface StepAction {
  action: string
  selector?: string
  value?: string
  description?: string
  reason?: string
  ms?: number
}

interface StepLog {
  step: number
  action: StepAction
  result: "success" | "error"
  error?: string
  timestamp: string
}

function stepActionIcon(action: string) {
  switch (action) {
    case "click":
    case "submit":
      return <MousePointerClick className="h-3 w-3" />
    case "fill":
      return <TextCursorInput className="h-3 w-3" />
    case "select":
      return <List className="h-3 w-3" />
    case "upload_file":
      return <Upload className="h-3 w-3" />
    case "wait":
      return <Clock className="h-3 w-3" />
    case "done":
      return <CheckCircle2 className="h-3 w-3" />
    case "needs_review":
      return <AlertTriangle className="h-3 w-3" />
    default:
      return <Eye className="h-3 w-3" />
  }
}

function formatStepDescription(step: StepLog): string {
  const a = step.action
  switch (a.action) {
    case "fill":
      return `Filled "${a.description || a.selector}" with "${a.value}"`
    case "select":
      return `Selected "${a.value}" in "${a.description || a.selector}"`
    case "click":
      return `Clicked: ${a.description || a.selector}`
    case "submit":
      return `Submitted: ${a.description || a.selector}`
    case "upload_file":
      return `Uploaded resume to ${a.description || a.selector}`
    case "wait":
      return `Waited ${a.ms}ms — ${a.description || "page loading"}`
    case "done":
      return `Application complete: ${a.description || "submitted successfully"}`
    case "needs_review":
      return `Needs manual review: ${a.reason || "unknown reason"}`
    default:
      return a.description || a.action
  }
}

function ApplicationRunLogs({ jobId, onStatusChange }: { jobId: string; onStatusChange?: (status: string) => void }) {
  const [run, setRun] = useState<ApplicationRunStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const status = await getApplicationRunStatus(jobId)
      setRun((prev) => {
        // Notify parent when status changes
        if (status && prev?.status !== status.status) {
          onStatusChange?.(status.status)
        }
        return status
      })
    } finally {
      setLoading(false)
    }
  }, [jobId, onStatusChange])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Poll every 2s while running/queued
  useEffect(() => {
    if (!run || (run.status !== "running" && run.status !== "queued" && run.status !== "pending")) return
    const interval = setInterval(fetchStatus, 2000)
    return () => clearInterval(interval)
  }, [run?.status, fetchStatus])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading logs...
      </div>
    )
  }

  if (!run) return null

  const steps = (run.steps as StepLog[] | null) || []
  const isActive = run.status === "running" || run.status === "queued" || run.status === "pending"

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-300">
          Application Log
        </h3>
        <Badge
          className={
            run.status === "succeeded"
              ? "bg-emerald-900/30 text-emerald-400 border-emerald-800"
              : run.status === "running" || run.status === "queued" || run.status === "pending"
                ? "bg-blue-900/30 text-blue-400 border-blue-800"
                : run.status === "needs_review"
                  ? "bg-amber-900/30 text-amber-400 border-amber-800"
                  : "bg-red-900/30 text-red-400 border-red-800"
          }
        >
          {isActive && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
          {run.status}
        </Badge>
      </div>

      {run.errorMessage && (
        <div className="rounded border border-red-900 bg-red-950/30 p-2 text-xs text-red-400">
          {run.errorMessage}
        </div>
      )}

      {steps.length > 0 ? (
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {steps.map((step) => (
            <div
              key={step.step}
              className={`flex items-start gap-2 rounded px-2 py-1.5 text-xs ${
                step.result === "error"
                  ? "bg-red-950/20 border border-red-900/30"
                  : step.action.action === "done"
                    ? "bg-emerald-950/20 border border-emerald-900/30"
                    : step.action.action === "needs_review"
                      ? "bg-amber-950/20 border border-amber-900/30"
                      : "bg-zinc-900/50"
              }`}
            >
              <span className={`mt-0.5 shrink-0 ${
                step.result === "error" ? "text-red-400"
                  : step.action.action === "done" ? "text-emerald-400"
                    : step.action.action === "needs_review" ? "text-amber-400"
                      : "text-zinc-400"
              }`}>
                {stepActionIcon(step.action.action)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 shrink-0">#{step.step}</span>
                  <span className={
                    step.result === "error" ? "text-red-300"
                      : step.action.action === "done" ? "text-emerald-300"
                        : step.action.action === "needs_review" ? "text-amber-300"
                          : "text-zinc-300"
                  }>
                    {formatStepDescription(step)}
                  </span>
                </div>
                {step.error && (
                  <span className="text-red-400 block mt-0.5">Error: {step.error}</span>
                )}
                <span className="text-zinc-600 block mt-0.5">
                  {new Date(step.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {isActive && (
            <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-blue-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Agent is working...
            </div>
          )}
        </div>
      ) : isActive ? (
        <div className="flex items-center gap-2 text-xs text-blue-400 py-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Waiting for agent to start...
        </div>
      ) : null}
    </div>
  )
}

function AutoApplyButton({
  job,
  onStatusChange,
}: {
  job: JobDetail
  onStatusChange: (status: string) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const status = job.autoApplyStatus

  if (status === "succeeded") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="border-emerald-800 text-emerald-400"
        disabled
      >
        <CheckCircle2 className="h-3 w-3" />
        Auto-Applied
      </Button>
    )
  }

  if (status === "queued" || status === "running") {
    return (
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          className="border-blue-800 text-blue-400"
          disabled
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          Applying...
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-red-800 text-red-400 hover:bg-red-900/30"
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true)
            try {
              await cancelAutoApply(job.id)
              onStatusChange("failed")
            } finally {
              setSubmitting(false)
            }
          }}
        >
          Cancel
        </Button>
      </div>
    )
  }

  if (status === "needs_review") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="border-amber-800 text-amber-400"
        disabled
      >
        <AlertTriangle className="h-3 w-3" />
        Review Needed
      </Button>
    )
  }

  // null or failed — show actionable button
  return (
    <Button
      variant="outline"
      size="sm"
      className="border-blue-800 text-blue-400"
      disabled={submitting}
      onClick={async () => {
        setSubmitting(true)
        try {
          const result = await autoApplyToJob(job.id)
          if (result.error) {
            console.error("Auto-apply error:", result.error)
          } else {
            onStatusChange("queued")
          }
        } finally {
          setSubmitting(false)
        }
      }}
    >
      {submitting ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Send className="h-3 w-3" />
      )}
      {status === "failed" ? "Retry Auto Apply" : "Auto Apply"}
    </Button>
  )
}

interface JobDetailPanelProps {
  jobId: string | null
  onClose: () => void
  onJobUpdated?: () => void
}

function formatDate(date: Date | null): string {
  if (!date) return "Unknown"
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function JobDetailPanel({ jobId, onClose, onJobUpdated }: JobDetailPanelProps) {
  const [job, setJob] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [applyingStatus, setApplyingStatus] = useState(false)
  const [showLogs, setShowLogs] = useState(false)

  useEffect(() => {
    if (!jobId) {
      setJob(null)
      setShowLogs(false)
      return
    }
    setLoading(true)
    getJobDetail(jobId)
      .then((j) => {
        setJob(j)
        // Auto-show logs if there's an active or completed auto-apply
        if (j?.autoApplyStatus) setShowLogs(true)
      })
      .finally(() => setLoading(false))
  }, [jobId])

  return (
    <Sheet open={!!jobId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[500px] lg:w-[600px] overflow-y-auto bg-zinc-950 border-zinc-800"
      >
        {loading && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
          </div>
        )}
        {job && !loading && (
          <>
            <SheetHeader className="space-y-3">
              <SheetTitle className="text-xl text-zinc-100 text-left">
                {job.title}
              </SheetTitle>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge
                  variant="secondary"
                  className={
                    job.platform === "greenhouse"
                      ? "bg-green-900/30 text-green-400"
                      : "bg-blue-900/30 text-blue-400"
                  }
                >
                  {job.platform === "greenhouse" ? "Greenhouse" : "Indeed"}
                </Badge>
                {job.isStale && (
                  <Badge
                    variant="outline"
                    className="text-amber-500 border-amber-800"
                  >
                    stale
                  </Badge>
                )}
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-sm text-zinc-300">
                  <Building2 className="h-4 w-4 text-zinc-500" />
                  {job.company}
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <MapPin className="h-4 w-4 text-zinc-500" />
                  {job.location || "Not specified"}
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Calendar className="h-4 w-4 text-zinc-500" />
                  Posted: {formatDate(job.datePosted)}
                </div>
                {job.salary && (
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <DollarSign className="h-4 w-4 text-zinc-500" />
                    {job.salary}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a
                    href={job.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Original
                  </a>
                </Button>

                {job.appliedAt ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-emerald-800 text-emerald-400 hover:text-red-400 hover:border-red-800"
                    disabled={applyingStatus}
                    onClick={async () => {
                      setApplyingStatus(true)
                      try {
                        await unmarkJobApplied(job.id)
                        setJob({ ...job, appliedAt: null })
                        onJobUpdated?.()
                      } finally {
                        setApplyingStatus(false)
                      }
                    }}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Applied
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={applyingStatus}
                    onClick={async () => {
                      setApplyingStatus(true)
                      try {
                        const { appliedAt } = await markJobApplied(job.id)
                        setJob({ ...job, appliedAt })
                        onJobUpdated?.()
                      } finally {
                        setApplyingStatus(false)
                      }
                    }}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Mark Applied
                  </Button>
                )}

                <AutoApplyButton
                  job={job}
                  onStatusChange={(status) => {
                    setJob({ ...job, autoApplyStatus: status })
                    setShowLogs(true)
                    onJobUpdated?.()
                  }}
                />

                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-800 text-amber-400"
                  onClick={async () => {
                    await findCoffeeChatContacts(job.company)
                    // TODO: show contacts in UI
                  }}
                >
                  <Coffee className="h-3 w-3" />
                  Find Coffee Chats
                </Button>
              </div>

              {/* Application Run Logs */}
              {showLogs && job.autoApplyStatus && (
                <>
                  <Separator className="bg-zinc-800" />
                  <ApplicationRunLogs
                    jobId={job.id}
                    onStatusChange={(status) => {
                      setJob({ ...job, autoApplyStatus: status })
                      onJobUpdated?.()
                    }}
                  />
                </>
              )}

              <Separator className="bg-zinc-800" />

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-zinc-300">
                  Description
                </h3>
                {job.descriptionHtml ? (
                  <div
                    className="prose prose-invert prose-sm max-w-none text-zinc-400 [&_a]:text-blue-400 [&_h1]:text-zinc-200 [&_h2]:text-zinc-200 [&_h3]:text-zinc-200 [&_li]:text-zinc-400 [&_strong]:text-zinc-300"
                    dangerouslySetInnerHTML={{ __html: job.descriptionHtml }}
                  />
                ) : job.descriptionText ? (
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                    {job.descriptionText}
                  </p>
                ) : (
                  <p className="text-sm text-zinc-600">
                    No description available.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
