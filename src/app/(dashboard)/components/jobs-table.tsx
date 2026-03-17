"use client"

import { useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { jobColumns, type JobTableMeta } from "./jobs-columns"
import { JobDetailPanel } from "./job-detail-panel"
import type { JobListItem } from "../actions"
import { getJobs, autoApplyToJob } from "../actions"

interface JobsTableProps {
  initialJobs: JobListItem[]
}

export function JobsTable({ initialJobs }: JobsTableProps) {
  const [jobs, setJobs] = useState(initialJobs)
  const [sorting, setSorting] = useState<SortingState>([
    { id: "datePosted", desc: true },
  ])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [showStale, setShowStale] = useState(false)
  const [globalFilter, setGlobalFilter] = useState("")

  const table = useReactTable({
    data: jobs,
    columns: jobColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      const search = filterValue.toLowerCase()
      const title = (row.getValue("title") as string)?.toLowerCase() ?? ""
      const company = (row.getValue("company") as string)?.toLowerCase() ?? ""
      const location = (row.getValue("location") as string)?.toLowerCase() ?? ""
      return title.includes(search) || company.includes(search) || location.includes(search)
    },
    meta: {
      onAutoApply: async (jobId: string) => {
        await autoApplyToJob(jobId)
        // TODO: implement auto-apply flow
      },
    } satisfies JobTableMeta,
    state: { sorting, globalFilter },
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
        <Input
          placeholder="Filter jobs (e.g. intern, remote, Google)..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm h-8 text-sm bg-zinc-900 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
        />
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
        <span className="text-xs text-zinc-500 ml-auto">
          {jobs.length.toLocaleString()} jobs
        </span>
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
                  onClick={() => setSelectedJobId(row.original.id)}
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
          {globalFilter && `${table.getFilteredRowModel().rows.length} of ${jobs.length} jobs · `}
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
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
        onJobUpdated={async () => {
          const updated = await getJobs({ includeStale: showStale })
          setJobs(updated)
        }}
      />
    </div>
  )
}
