"use client"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ExternalLink, MapPin, Calendar, Building2, DollarSign } from "lucide-react"
import type { JobWithStale } from "../actions"

interface JobDetailPanelProps {
  job: JobWithStale | null
  onClose: () => void
}

function formatDate(date: Date | null): string {
  if (!date) return "Unknown"
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function JobDetailPanel({ job, onClose }: JobDetailPanelProps) {
  return (
    <Sheet open={!!job} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[500px] lg:w-[600px] overflow-y-auto bg-zinc-950 border-zinc-800"
      >
        {job && (
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

              <div>
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
              </div>

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
