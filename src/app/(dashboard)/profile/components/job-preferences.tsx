"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { TagInput } from "./tag-input"
import { saveJobPreferences } from "../actions"
import { ROLE_TYPES, INDUSTRIES } from "@/lib/constants"
import { X } from "lucide-react"

interface JobPreferencesProps {
  preferences?: {
    locations: string[]
    roleTypes: string[]
    industries: string[]
    keywords: string[]
  }
}

function MultiSelect({
  label,
  options,
  selected,
  onSelectedChange,
}: {
  label: string
  options: readonly string[]
  selected: string[]
  onSelectedChange: (selected: string[]) => void
}) {
  const [open, setOpen] = useState(false)

  const toggle = (item: string) => {
    if (selected.includes(item)) {
      onSelectedChange(selected.filter((s) => s !== item))
    } else {
      onSelectedChange([...selected, item])
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((item) => (
            <Badge key={item} variant="secondary" className="gap-1">
              {item}
              <button
                type="button"
                onClick={() => toggle(item)}
                className="ml-1 hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="w-full justify-start text-muted-foreground"
      >
        {open ? "Close" : `Select ${label.toLowerCase()}...`}
      </Button>
      {open && (
        <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto rounded-md border p-2">
          {options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-zinc-800 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggle(option)}
                className="rounded border-zinc-600"
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export function JobPreferences({ preferences }: JobPreferencesProps) {
  const [locations, setLocations] = useState<string[]>(
    preferences?.locations ?? []
  )
  const [roleTypes, setRoleTypes] = useState<string[]>(
    preferences?.roleTypes ?? []
  )
  const [industries, setIndustries] = useState<string[]>(
    preferences?.industries ?? []
  )
  const [keywords, setKeywords] = useState<string[]>(
    preferences?.keywords ?? []
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [saved])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveJobPreferences({ locations, roleTypes, industries, keywords })
      setSaved(true)
    } catch (err) {
      console.error("Failed to save job preferences:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Job Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Locations</Label>
            <TagInput
              tags={locations}
              onTagsChange={setLocations}
              placeholder="Add location (e.g. New York, Remote)"
            />
          </div>

          <MultiSelect
            label="Role Types"
            options={ROLE_TYPES}
            selected={roleTypes}
            onSelectedChange={setRoleTypes}
          />

          <MultiSelect
            label="Industries"
            options={INDUSTRIES}
            selected={industries}
            onSelectedChange={setIndustries}
          />

          <div className="space-y-2">
            <Label>Keywords</Label>
            <TagInput
              tags={keywords}
              onTagsChange={setKeywords}
              placeholder="Add keyword (e.g. React, machine learning)"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
            {saved && (
              <span className="text-sm text-green-400">Saved!</span>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
