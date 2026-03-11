"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  saveHandshakeCredentials,
  removeHandshakeCredentials,
} from "../handshake-actions"

interface HandshakeCredentialsProps {
  hasCredentials: boolean
  universityName?: string
}

export function HandshakeCredentials({
  hasCredentials: initialHasCredentials,
  universityName: initialUniversityName,
}: HandshakeCredentialsProps) {
  const [hasCredentials, setHasCredentials] = useState(initialHasCredentials)
  const [universityName, setUniversityName] = useState(
    initialUniversityName ?? ""
  )
  const [university, setUniversity] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (saved) {
      const timer = setTimeout(() => setSaved(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [saved])

  const handleSave = async () => {
    if (!university.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required")
      return
    }
    setError(null)
    setSaving(true)
    try {
      await saveHandshakeCredentials({ university, email, password })
      setHasCredentials(true)
      setUniversityName(university)
      setUniversity("")
      setEmail("")
      setPassword("")
      setSaved(true)
    } catch (err) {
      console.error("Failed to save Handshake credentials:", err)
      setError("Failed to save credentials. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await removeHandshakeCredentials()
      setHasCredentials(false)
      setUniversityName("")
    } catch (err) {
      console.error("Failed to remove Handshake credentials:", err)
      setError("Failed to remove credentials. Please try again.")
    } finally {
      setRemoving(false)
    }
  }

  return (
    <>
      <Separator />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Handshake Integration</CardTitle>
            {hasCredentials && (
              <Badge variant="secondary" className="bg-green-900/30 text-green-400 border-green-800">
                Connected
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-400">
            Connect your Handshake account to discover university-exclusive
            internships
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasCredentials ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <span>University:</span>
                <span className="font-medium text-zinc-100">
                  {universityName}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={handleRemove}
                disabled={removing}
                className="text-red-400 hover:text-red-300 hover:border-red-800"
              >
                {removing ? "Removing..." : "Remove Credentials"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="handshake-university">University Name</Label>
                <Input
                  id="handshake-university"
                  type="text"
                  placeholder="e.g. Stanford University"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="handshake-email">Email</Label>
                <Input
                  id="handshake-email"
                  type="email"
                  placeholder="your.email@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="handshake-password">Password</Label>
                <Input
                  id="handshake-password"
                  type="password"
                  placeholder="Your Handshake/SSO password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <div className="flex items-center gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Credentials"}
                </Button>
                {saved && (
                  <span className="text-sm text-green-400">
                    Credentials saved securely!
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-500">
                Your credentials are encrypted with AES-256-GCM before storage.
                They are only used for automated Handshake login during job
                discovery.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
