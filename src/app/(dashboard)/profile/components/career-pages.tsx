"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { X } from "lucide-react"
import { addCareerPage, removeCareerPage } from "../actions"

interface CareerPage {
  id: string
  url: string
  label: string
}

interface CareerPagesProps {
  pages: CareerPage[]
}

export function CareerPages({ pages: initialPages }: CareerPagesProps) {
  const [pages, setPages] = useState<CareerPage[]>(initialPages)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async (formData: FormData) => {
    setAdding(true)
    setError(null)
    try {
      const entry = await addCareerPage(formData)
      setPages((prev) => [
        { id: entry.id, url: entry.url, label: entry.label },
        ...prev,
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add career page")
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await removeCareerPage(id)
      setPages((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error("Failed to remove career page:", err)
    }
  }

  return (
    <>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Career Pages</CardTitle>
          <p className="text-sm text-zinc-400">
            Add company career page URLs for direct job crawling
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {pages.length > 0 && (
            <div className="space-y-2">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-zinc-200">
                      {page.label}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500 truncate">
                      {page.url}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(page.id)}
                    className="ml-2 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {pages.length === 0 && (
            <p className="text-sm text-zinc-500 text-center py-2">
              No career pages added yet
            </p>
          )}

          <form action={handleAdd} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="career-label" className="text-xs">
                  Company Name
                </Label>
                <Input
                  id="career-label"
                  name="label"
                  placeholder="e.g. Google"
                  required
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="career-url" className="text-xs">
                  Career Page URL
                </Label>
                <Input
                  id="career-url"
                  name="url"
                  type="url"
                  placeholder="https://careers.google.com/jobs"
                  required
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
            <Button type="submit" size="sm" disabled={adding}>
              {adding ? "Adding..." : "Add Career Page"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  )
}
