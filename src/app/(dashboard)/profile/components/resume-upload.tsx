"use client"

import { useState, useCallback, DragEvent } from "react"

interface ResumeUploadProps {
  onUploadComplete: () => void
  currentFileName?: string
}

const VALID_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]
const MAX_SIZE = 5 * 1024 * 1024

export function ResumeUpload({
  onUploadComplete,
  currentFileName,
}: ResumeUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = useCallback(
    async (file: File) => {
      setError(null)

      // Client-side validation
      if (!VALID_TYPES.includes(file.type)) {
        setError("Only PDF and DOCX files are accepted")
        return
      }
      if (file.size > MAX_SIZE) {
        setError("File must be under 5MB")
        return
      }

      setIsUploading(true)
      try {
        const formData = new FormData()
        formData.append("resume", file)

        const res = await fetch("/api/resume/upload", {
          method: "POST",
          body: formData,
        })
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || "Upload failed")
          return
        }

        onUploadComplete()
      } catch {
        setError("Upload failed. Please try again.")
      } finally {
        setIsUploading(false)
      }
    },
    [onUploadComplete]
  )

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) await uploadFile(file)
    },
    [uploadFile]
  )

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        isDragging ? "border-blue-500 bg-blue-500/10" : "border-zinc-700"
      } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
    >
      {isUploading ? (
        <p className="text-zinc-300">Parsing resume...</p>
      ) : (
        <>
          <p className="text-zinc-300">Drag and drop your resume here</p>
          <p className="text-sm text-zinc-400 mt-1">PDF or DOCX, up to 5MB</p>
          {currentFileName && (
            <p className="text-sm text-zinc-500 mt-1">
              Current file: {currentFileName}
            </p>
          )}
          <label className="mt-4 inline-block cursor-pointer">
            <span className="text-blue-400 hover:underline">Browse files</span>
            <input
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && uploadFile(e.target.files[0])
              }
            />
          </label>
        </>
      )}
      {error && <p className="text-red-400 mt-2">{error}</p>}
    </div>
  )
}
