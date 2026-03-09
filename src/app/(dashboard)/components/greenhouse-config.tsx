"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, X, Plus } from "lucide-react"
import type { GreenhouseCompanyEntry } from "../actions"
import {
  addGreenhouseCompany,
  removeGreenhouseCompany,
} from "../actions"

interface GreenhouseConfigProps {
  initialCompanies: GreenhouseCompanyEntry[]
}

export function GreenhouseConfig({ initialCompanies }: GreenhouseConfigProps) {
  const [companies, setCompanies] = useState(initialCompanies)
  const [open, setOpen] = useState(false)
  const [slug, setSlug] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleAdd = () => {
    setError("")
    if (!slug.trim()) {
      setError("Board slug is required")
      return
    }
    if (!/^[a-z0-9-]+$/.test(slug.trim().toLowerCase())) {
      setError("Slug must contain only lowercase letters, numbers, and hyphens")
      return
    }
    if (!name.trim()) {
      setError("Company name is required")
      return
    }

    startTransition(async () => {
      try {
        const updated = await addGreenhouseCompany(slug, name)
        setCompanies(updated)
        setSlug("")
        setName("")
        setError("")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add company")
      }
    })
  }

  const handleRemove = (companySlug: string) => {
    startTransition(async () => {
      try {
        const updated = await removeGreenhouseCompany(companySlug)
        setCompanies(updated)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove company")
      }
    })
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 p-0"
        >
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">Greenhouse Board Settings</span>
          <Badge variant="secondary" className="ml-2 text-xs">
            {companies.length}
          </Badge>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 space-y-4">
        <div className="rounded-md border border-zinc-800 divide-y divide-zinc-800">
          {companies.map((company) => (
            <div
              key={`${company.type}-${company.slug}`}
              className="flex items-center justify-between px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={
                    company.type === "curated"
                      ? "text-sm text-zinc-500"
                      : "text-sm text-zinc-300"
                  }
                >
                  {company.name}
                </span>
                <span className="text-xs text-zinc-600">
                  boards.greenhouse.io/{company.slug}
                </span>
                {company.type === "curated" && (
                  <Badge variant="outline" className="text-[10px] text-zinc-600 border-zinc-700">
                    built-in
                  </Badge>
                )}
              </div>
              {company.type === "custom" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(company.slug)}
                  disabled={isPending}
                  className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-500">Company Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className="h-8 text-sm w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-500">
              Board Slug
              <span className="ml-1 text-zinc-600">(from boards.greenhouse.io/slug)</span>
            </Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. acmecorp"
              className="h-8 text-sm w-48"
            />
          </div>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={isPending}
            className="h-8"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </CollapsibleContent>
    </Collapsible>
  )
}
