"use client"

import { useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { jobColumns } from "./jobs-columns"
import { JobDetailPanel } from "./job-detail-panel"
import type { JobWithStale } from "../actions"
import { getJobs } from "../actions"

interface JobsTableProps {
  initialJobs: JobWithStale[]
}

export function JobsTable({ initialJobs }: JobsTableProps) {
  const [jobs, setJobs] = useState(initialJobs)
  const [sorting, setSorting] = useState<SortingState>([
    { id: "datePosted", desc: true },
  ])
  const [selectedJob, setSelectedJob] = useState<JobWithStale | null>(null)
  const [showStale, setShowStale] = useState(false)

  const table = useReactTable({
    data: jobs,
    columns: jobColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: {
      pagination: { pageSize: 20 },
    },
  })

  const handleToggleStale = async () => {
    const newShowStale = !showStale
    setShowStale(newShowStale)
    try {
      const updated = await getJobs({ includeStale: newShowStale })
      setJobs(updated)
    } catch {
      // revert on error
      setShowStale(!newShowStale)
    }
  }

  if (jobs.length === 0 && !showStale) {
    return (
      <div className="rounded-md border border-zinc-800 p-12 text-center">
        <p className="text-zinc-500 text-sm">
          No jobs discovered yet. Click Discover Jobs to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showStale}
            onChange={handleToggleStale}
            className="rounded border-zinc-600"
          />
          <Label className="text-xs text-zinc-500 cursor-pointer">
            Show stale jobs (30+ days)
          </Label>
        </label>
      </div>

      <div className="rounded-md border border-zinc-800">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-zinc-800 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-zinc-400">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => setSelectedJob(row.original)}
                  className="cursor-pointer border-zinc-800 hover:bg-zinc-900"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={jobColumns.length}
                  className="h-24 text-center text-zinc-500"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      <JobDetailPanel
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </div>
  )
}
