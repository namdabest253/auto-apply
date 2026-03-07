"use client"

import { useState, KeyboardEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

interface TagInputProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ tags, onTagsChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState("")

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault()
      if (!tags.includes(inputValue.trim())) {
        onTagsChange([...tags, inputValue.trim()])
      }
      setInputValue("")
    }
    if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      onTagsChange(tags.slice(0, -1))
    }
  }

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((t) => t !== tagToRemove))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 hover:text-red-400"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? "Type and press Enter to add"}
      />
    </div>
  )
}
