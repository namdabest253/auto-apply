"use client"

import { useState, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SectionEditorProps<T extends { id?: string }> {
  title: string
  entries: T[]
  onSave: (entry: T) => Promise<void>
  onDelete: (id: string) => Promise<void>
  renderForm: (
    entry: T,
    onChange: (updated: T) => void
  ) => ReactNode
  renderDisplay: (entry: T) => ReactNode
  emptyEntry: () => T
}

export function SectionEditor<T extends { id?: string }>({
  title,
  entries,
  onSave,
  onDelete,
  renderForm,
  renderDisplay,
  emptyEntry,
}: SectionEditorProps<T>) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<T | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newEntry, setNewEntry] = useState<T>(emptyEntry())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async (entry: T) => {
    setIsSaving(true)
    try {
      await onSave(entry)
      setEditingId(null)
      setEditingEntry(null)
      setIsAdding(false)
      setNewEntry(emptyEntry())
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsSaving(true)
    try {
      await onDelete(deleteId)
      setDeleteId(null)
    } finally {
      setIsSaving(false)
    }
  }

  const startEdit = (entry: T) => {
    setEditingId(entry.id ?? null)
    setEditingEntry({ ...entry })
    setIsAdding(false)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingEntry(null)
  }

  const startAdd = () => {
    setIsAdding(true)
    setNewEntry(emptyEntry())
    setEditingId(null)
    setEditingEntry(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-zinc-100">{title}</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={startAdd}
          disabled={isAdding}
        >
          Add new
        </Button>
      </div>

      {/* Existing entries */}
      {entries.map((entry) => (
        <div
          key={entry.id ?? "temp"}
          className="rounded-lg border border-zinc-800 p-4"
        >
          {editingId === entry.id && editingEntry ? (
            <div className="space-y-3">
              {renderForm(editingEntry, (updated) =>
                setEditingEntry(updated)
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSave(editingEntry)}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelEdit}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div className="flex-1">{renderDisplay(entry)}</div>
              <div className="flex gap-2 ml-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit(entry)}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300"
                  onClick={() => setDeleteId(entry.id ?? null)}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add new entry form */}
      {isAdding && (
        <div className="rounded-lg border border-zinc-800 border-dashed p-4 space-y-3">
          {renderForm(newEntry, (updated) => setNewEntry(updated))}
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => handleSave(newEntry)}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false)
                setNewEntry(emptyEntry())
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {entries.length === 0 && !isAdding && (
        <p className="text-sm text-zinc-500">No entries yet.</p>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this entry? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
            >
              {isSaving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
