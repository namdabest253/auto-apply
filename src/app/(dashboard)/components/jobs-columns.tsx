"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { JobWithStale } from "../actions"

function formatRelativeDate(date: Date | null): string {
  if (!date) return "Unknown"
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "Yesterday"
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export const jobColumns: ColumnDef<JobWithStale>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="p-0 hover:bg-transparent text-zinc-400"
      >
        Title
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span
        className={
          row.original.isStale ? "text-zinc-500" : "text-zinc-200 font-medium"
        }
      >
        {row.getValue("title")}
      </span>
    ),
    size: 300,
  },
  {
    accessorKey: "company",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="p-0 hover:bg-transparent text-zinc-400"
      >
        Company
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className={row.original.isStale ? "text-zinc-500" : "text-zinc-300"}>
        {row.getValue("company")}
      </span>
    ),
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => (
      <span className={row.original.isStale ? "text-zinc-600" : "text-zinc-400"}>
        {row.getValue("location") || "Not specified"}
      </span>
    ),
  },
  {
    accessorKey: "datePosted",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="p-0 hover:bg-transparent text-zinc-400"
      >
        Posted
        <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const isStale = row.original.isStale
      return (
        <div className="flex items-center gap-2">
          <span className={isStale ? "text-zinc-600" : "text-zinc-400"}>
            {formatRelativeDate(row.getValue("datePosted"))}
          </span>
          {isStale && (
            <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-800">
              stale
            </Badge>
          )}
        </div>
      )
    },
    sortingFn: "datetime",
  },
  {
    accessorKey: "platform",
    header: "Platform",
    cell: ({ row }) => {
      const platform = row.getValue("platform") as string
      return (
        <Badge
          variant="secondary"
          className={`text-xs ${
            platform === "greenhouse"
              ? "bg-green-900/30 text-green-400"
              : "bg-blue-900/30 text-blue-400"
          }`}
        >
          {platform === "greenhouse" ? "Greenhouse" : "Indeed"}
        </Badge>
      )
    },
  },
]
