"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { saveQAEntry, deleteQAEntry } from "../actions"
import { Pencil, Trash2, Plus } from "lucide-react"

interface QAEntry {
  id: string
  question: string
  answer: string
}

interface QABankProps {
  entries: QAEntry[]
}

function QAEntryForm({
  entry,
  onSave,
  onCancel,
}: {
  entry?: QAEntry
  onSave: () => void
  onCancel: () => void
}) {
  const [question, setQuestion] = useState(entry?.question ?? "")
  const [answer, setAnswer] = useState(entry?.answer ?? "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!question.trim() || !answer.trim()) return
    setSaving(true)
    try {
      await saveQAEntry({
        id: entry?.id,
        question: question.trim(),
        answer: answer.trim(),
      })
      onSave()
    } catch (err) {
      console.error("Failed to save Q&A entry:", err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-zinc-700 p-4">
      <Input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="e.g. Are you authorized to work in the US?"
      />
      <Textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="e.g. Yes, I am a U.S. citizen"
        rows={3}
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !question.trim() || !answer.trim()}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

export function QABank({ entries }: QABankProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await deleteQAEntry(id)
      setDeleteDialogId(null)
    } catch (err) {
      console.error("Failed to delete Q&A entry:", err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle>Application Q&A Bank</CardTitle>
          <CardDescription>
            Save answers to common application questions for auto-fill
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {entries.map((entry) =>
            editingId === entry.id ? (
              <QAEntryForm
                key={entry.id}
                entry={entry}
                onSave={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div
                key={entry.id}
                className="rounded-md border border-zinc-700 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium text-zinc-200">
                      {entry.question}
                    </p>
                    <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                      {entry.answer}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => setEditingId(entry.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Dialog
                      open={deleteDialogId === entry.id}
                      onOpenChange={(open) =>
                        setDeleteDialogId(open ? entry.id : null)
                      }
                    >
                      <DialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Q&A Entry</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete this Q&A? This
                            action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setDeleteDialogId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleDelete(entry.id)}
                            disabled={deleting}
                          >
                            {deleting ? "Deleting..." : "Delete"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>
            )
          )}

          {adding ? (
            <QAEntryForm
              onSave={() => setAdding(false)}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setAdding(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Q&A
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  )
}
