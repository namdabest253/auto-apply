"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { SectionEditor } from "./section-editor"
import { TagInput } from "./tag-input"
import {
  saveContactInfo,
  saveEducation,
  deleteEducation,
  saveWorkHistory,
  deleteWorkHistory,
  saveProject,
  deleteProject,
  saveSkills,
  saveCertification,
  deleteCertification,
  saveVolunteerWork,
  deleteVolunteerWork,
  savePublication,
  deletePublication,
} from "../actions"

// -- Types for profile data from Prisma --

interface ContactData {
  name: string
  email: string
  phone: string
  linkedIn: string
  website: string
  location: string
}

interface EducationData {
  id?: string
  school: string
  degree: string
  fieldOfStudy: string
  startDate: string
  endDate: string
  gpa: string
  coursework: string
  sortOrder: number
}

interface WorkData {
  id?: string
  company: string
  title: string
  startDate: string
  endDate: string
  bullets: string[]
  sortOrder: number
}

interface ProjectData {
  id?: string
  name: string
  description: string
  url: string
  technologies: string[]
  sortOrder: number
}

interface CertificationData {
  id?: string
  name: string
  issuer: string
  date: string
  sortOrder: number
}

interface VolunteerData {
  id?: string
  organization: string
  role: string
  startDate: string
  endDate: string
  description: string
  sortOrder: number
}

interface PublicationData {
  id?: string
  title: string
  venue: string
  date: string
  url: string
  sortOrder: number
}

interface ProfileEditorProps {
  contact: ContactData
  education: EducationData[]
  workHistory: WorkData[]
  projects: ProjectData[]
  skills: string[]
  certifications: CertificationData[]
  volunteerWork: VolunteerData[]
  publications: PublicationData[]
  otherText: string
}

function FieldRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <Label className="text-right text-zinc-400">{label}</Label>
      <div className="col-span-3">{children}</div>
    </div>
  )
}

export function ProfileEditor({
  contact: initialContact,
  education,
  workHistory,
  projects,
  skills: initialSkills,
  certifications,
  volunteerWork,
  publications,
  otherText,
}: ProfileEditorProps) {
  // -- Contact Info State --
  const [contact, setContact] = useState<ContactData>(initialContact)
  const [contactSaving, setContactSaving] = useState(false)

  const handleSaveContact = async () => {
    setContactSaving(true)
    try {
      await saveContactInfo({
        name: contact.name || undefined,
        email: contact.email || undefined,
        phone: contact.phone || undefined,
        linkedIn: contact.linkedIn || undefined,
        website: contact.website || undefined,
        location: contact.location || undefined,
      })
    } finally {
      setContactSaving(false)
    }
  }

  // -- Skills State --
  const [currentSkills, setCurrentSkills] = useState<string[]>(initialSkills)
  const [skillsSaving, setSkillsSaving] = useState(false)

  const handleSaveSkills = async () => {
    setSkillsSaving(true)
    try {
      await saveSkills(currentSkills)
    } finally {
      setSkillsSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Contact Info */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldRow label="Name">
            <Input
              value={contact.name}
              onChange={(e) =>
                setContact({ ...contact, name: e.target.value })
              }
              placeholder="Full name"
            />
          </FieldRow>
          <FieldRow label="Email">
            <Input
              value={contact.email}
              onChange={(e) =>
                setContact({ ...contact, email: e.target.value })
              }
              placeholder="email@example.com"
            />
          </FieldRow>
          <FieldRow label="Phone">
            <Input
              value={contact.phone}
              onChange={(e) =>
                setContact({ ...contact, phone: e.target.value })
              }
              placeholder="(555) 123-4567"
            />
          </FieldRow>
          <FieldRow label="LinkedIn">
            <Input
              value={contact.linkedIn}
              onChange={(e) =>
                setContact({ ...contact, linkedIn: e.target.value })
              }
              placeholder="https://linkedin.com/in/..."
            />
          </FieldRow>
          <FieldRow label="Website">
            <Input
              value={contact.website}
              onChange={(e) =>
                setContact({ ...contact, website: e.target.value })
              }
              placeholder="https://..."
            />
          </FieldRow>
          <FieldRow label="Location">
            <Input
              value={contact.location}
              onChange={(e) =>
                setContact({ ...contact, location: e.target.value })
              }
              placeholder="City, State"
            />
          </FieldRow>
          <div className="flex justify-end">
            <Button onClick={handleSaveContact} disabled={contactSaving}>
              {contactSaving ? "Saving..." : "Save Contact Info"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-zinc-800" />

      {/* Education */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <SectionEditor<EducationData>
            title="Education"
            entries={education}
            onSave={async (entry) => {
              await saveEducation({
                id: entry.id,
                school: entry.school,
                degree: entry.degree || undefined,
                fieldOfStudy: entry.fieldOfStudy || undefined,
                startDate: entry.startDate || undefined,
                endDate: entry.endDate || undefined,
                gpa: entry.gpa || undefined,
                coursework: entry.coursework || undefined,
                sortOrder: entry.sortOrder,
              })
            }}
            onDelete={async (id) => {
              await deleteEducation(id)
            }}
            emptyEntry={() => ({
              school: "",
              degree: "",
              fieldOfStudy: "",
              startDate: "",
              endDate: "",
              gpa: "",
              coursework: "",
              sortOrder: education.length,
            })}
            renderForm={(entry, onChange) => (
              <div className="space-y-3">
                <FieldRow label="School">
                  <Input
                    value={entry.school}
                    onChange={(e) =>
                      onChange({ ...entry, school: e.target.value })
                    }
                    placeholder="University name"
                  />
                </FieldRow>
                <FieldRow label="Degree">
                  <Input
                    value={entry.degree}
                    onChange={(e) =>
                      onChange({ ...entry, degree: e.target.value })
                    }
                    placeholder="Bachelor of Science"
                  />
                </FieldRow>
                <FieldRow label="Field">
                  <Input
                    value={entry.fieldOfStudy}
                    onChange={(e) =>
                      onChange({ ...entry, fieldOfStudy: e.target.value })
                    }
                    placeholder="Computer Science"
                  />
                </FieldRow>
                <FieldRow label="Start Date">
                  <Input
                    value={entry.startDate}
                    onChange={(e) =>
                      onChange({ ...entry, startDate: e.target.value })
                    }
                    placeholder="Sep 2020"
                  />
                </FieldRow>
                <FieldRow label="End Date">
                  <Input
                    value={entry.endDate}
                    onChange={(e) =>
                      onChange({ ...entry, endDate: e.target.value })
                    }
                    placeholder="May 2024"
                  />
                </FieldRow>
                <FieldRow label="GPA">
                  <Input
                    value={entry.gpa}
                    onChange={(e) =>
                      onChange({ ...entry, gpa: e.target.value })
                    }
                    placeholder="3.8"
                  />
                </FieldRow>
                <FieldRow label="Coursework">
                  <Input
                    value={entry.coursework}
                    onChange={(e) =>
                      onChange({ ...entry, coursework: e.target.value })
                    }
                    placeholder="Relevant coursework"
                  />
                </FieldRow>
              </div>
            )}
            renderDisplay={(entry) => (
              <div>
                <p className="font-medium text-zinc-100">{entry.school}</p>
                {entry.degree && (
                  <p className="text-sm text-zinc-400">
                    {entry.degree}
                    {entry.fieldOfStudy ? ` in ${entry.fieldOfStudy}` : ""}
                  </p>
                )}
                {(entry.startDate || entry.endDate) && (
                  <p className="text-sm text-zinc-500">
                    {entry.startDate} - {entry.endDate || "Present"}
                  </p>
                )}
                {entry.gpa && (
                  <p className="text-sm text-zinc-500">GPA: {entry.gpa}</p>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Separator className="bg-zinc-800" />

      {/* Work History */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <SectionEditor<WorkData>
            title="Work History"
            entries={workHistory}
            onSave={async (entry) => {
              await saveWorkHistory({
                id: entry.id,
                company: entry.company,
                title: entry.title || undefined,
                startDate: entry.startDate || undefined,
                endDate: entry.endDate || undefined,
                bullets: entry.bullets,
                sortOrder: entry.sortOrder,
              })
            }}
            onDelete={async (id) => {
              await deleteWorkHistory(id)
            }}
            emptyEntry={() => ({
              company: "",
              title: "",
              startDate: "",
              endDate: "",
              bullets: [],
              sortOrder: workHistory.length,
            })}
            renderForm={(entry, onChange) => (
              <div className="space-y-3">
                <FieldRow label="Company">
                  <Input
                    value={entry.company}
                    onChange={(e) =>
                      onChange({ ...entry, company: e.target.value })
                    }
                    placeholder="Company name"
                  />
                </FieldRow>
                <FieldRow label="Title">
                  <Input
                    value={entry.title}
                    onChange={(e) =>
                      onChange({ ...entry, title: e.target.value })
                    }
                    placeholder="Software Engineer"
                  />
                </FieldRow>
                <FieldRow label="Start Date">
                  <Input
                    value={entry.startDate}
                    onChange={(e) =>
                      onChange({ ...entry, startDate: e.target.value })
                    }
                    placeholder="Jun 2022"
                  />
                </FieldRow>
                <FieldRow label="End Date">
                  <Input
                    value={entry.endDate}
                    onChange={(e) =>
                      onChange({ ...entry, endDate: e.target.value })
                    }
                    placeholder="Present"
                  />
                </FieldRow>
                <FieldRow label="Bullets">
                  <Textarea
                    value={entry.bullets.join("\n")}
                    onChange={(e) =>
                      onChange({
                        ...entry,
                        bullets: e.target.value
                          .split("\n")
                          .filter((b) => b.trim()),
                      })
                    }
                    placeholder="One bullet point per line"
                    rows={4}
                  />
                </FieldRow>
              </div>
            )}
            renderDisplay={(entry) => (
              <div>
                <p className="font-medium text-zinc-100">
                  {entry.title || "Untitled Role"}
                </p>
                <p className="text-sm text-zinc-400">{entry.company}</p>
                {(entry.startDate || entry.endDate) && (
                  <p className="text-sm text-zinc-500">
                    {entry.startDate} - {entry.endDate || "Present"}
                  </p>
                )}
                {entry.bullets.length > 0 && (
                  <ul className="mt-1 text-sm text-zinc-400 list-disc list-inside">
                    {entry.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Separator className="bg-zinc-800" />

      {/* Projects */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <SectionEditor<ProjectData>
            title="Projects"
            entries={projects}
            onSave={async (entry) => {
              await saveProject({
                id: entry.id,
                name: entry.name,
                description: entry.description || undefined,
                url: entry.url || undefined,
                technologies: entry.technologies,
                sortOrder: entry.sortOrder,
              })
            }}
            onDelete={async (id) => {
              await deleteProject(id)
            }}
            emptyEntry={() => ({
              name: "",
              description: "",
              url: "",
              technologies: [],
              sortOrder: projects.length,
            })}
            renderForm={(entry, onChange) => (
              <div className="space-y-3">
                <FieldRow label="Name">
                  <Input
                    value={entry.name}
                    onChange={(e) =>
                      onChange({ ...entry, name: e.target.value })
                    }
                    placeholder="Project name"
                  />
                </FieldRow>
                <FieldRow label="Description">
                  <Textarea
                    value={entry.description}
                    onChange={(e) =>
                      onChange({ ...entry, description: e.target.value })
                    }
                    placeholder="What does this project do?"
                    rows={3}
                  />
                </FieldRow>
                <FieldRow label="URL">
                  <Input
                    value={entry.url}
                    onChange={(e) =>
                      onChange({ ...entry, url: e.target.value })
                    }
                    placeholder="https://github.com/..."
                  />
                </FieldRow>
                <FieldRow label="Technologies">
                  <TagInput
                    tags={entry.technologies}
                    onTagsChange={(tags) =>
                      onChange({ ...entry, technologies: tags })
                    }
                    placeholder="Add technology"
                  />
                </FieldRow>
              </div>
            )}
            renderDisplay={(entry) => (
              <div>
                <p className="font-medium text-zinc-100">{entry.name}</p>
                {entry.description && (
                  <p className="text-sm text-zinc-400">{entry.description}</p>
                )}
                {entry.url && (
                  <p className="text-sm text-blue-400">{entry.url}</p>
                )}
                {entry.technologies.length > 0 && (
                  <p className="text-sm text-zinc-500 mt-1">
                    {entry.technologies.join(", ")}
                  </p>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Separator className="bg-zinc-800" />

      {/* Skills */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Skills</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <TagInput
            tags={currentSkills}
            onTagsChange={setCurrentSkills}
            placeholder="Add a skill"
          />
          <div className="flex justify-end">
            <Button onClick={handleSaveSkills} disabled={skillsSaving}>
              {skillsSaving ? "Saving..." : "Save Skills"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator className="bg-zinc-800" />

      {/* Certifications */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <SectionEditor<CertificationData>
            title="Certifications"
            entries={certifications}
            onSave={async (entry) => {
              await saveCertification({
                id: entry.id,
                name: entry.name,
                issuer: entry.issuer || undefined,
                date: entry.date || undefined,
                sortOrder: entry.sortOrder,
              })
            }}
            onDelete={async (id) => {
              await deleteCertification(id)
            }}
            emptyEntry={() => ({
              name: "",
              issuer: "",
              date: "",
              sortOrder: certifications.length,
            })}
            renderForm={(entry, onChange) => (
              <div className="space-y-3">
                <FieldRow label="Name">
                  <Input
                    value={entry.name}
                    onChange={(e) =>
                      onChange({ ...entry, name: e.target.value })
                    }
                    placeholder="Certification name"
                  />
                </FieldRow>
                <FieldRow label="Issuer">
                  <Input
                    value={entry.issuer}
                    onChange={(e) =>
                      onChange({ ...entry, issuer: e.target.value })
                    }
                    placeholder="Issuing organization"
                  />
                </FieldRow>
                <FieldRow label="Date">
                  <Input
                    value={entry.date}
                    onChange={(e) =>
                      onChange({ ...entry, date: e.target.value })
                    }
                    placeholder="Dec 2023"
                  />
                </FieldRow>
              </div>
            )}
            renderDisplay={(entry) => (
              <div>
                <p className="font-medium text-zinc-100">{entry.name}</p>
                {entry.issuer && (
                  <p className="text-sm text-zinc-400">{entry.issuer}</p>
                )}
                {entry.date && (
                  <p className="text-sm text-zinc-500">{entry.date}</p>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Separator className="bg-zinc-800" />

      {/* Volunteer Work */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <SectionEditor<VolunteerData>
            title="Volunteer Work"
            entries={volunteerWork}
            onSave={async (entry) => {
              await saveVolunteerWork({
                id: entry.id,
                organization: entry.organization,
                role: entry.role || undefined,
                startDate: entry.startDate || undefined,
                endDate: entry.endDate || undefined,
                description: entry.description || undefined,
                sortOrder: entry.sortOrder,
              })
            }}
            onDelete={async (id) => {
              await deleteVolunteerWork(id)
            }}
            emptyEntry={() => ({
              organization: "",
              role: "",
              startDate: "",
              endDate: "",
              description: "",
              sortOrder: volunteerWork.length,
            })}
            renderForm={(entry, onChange) => (
              <div className="space-y-3">
                <FieldRow label="Organization">
                  <Input
                    value={entry.organization}
                    onChange={(e) =>
                      onChange({ ...entry, organization: e.target.value })
                    }
                    placeholder="Organization name"
                  />
                </FieldRow>
                <FieldRow label="Role">
                  <Input
                    value={entry.role}
                    onChange={(e) =>
                      onChange({ ...entry, role: e.target.value })
                    }
                    placeholder="Volunteer role"
                  />
                </FieldRow>
                <FieldRow label="Start Date">
                  <Input
                    value={entry.startDate}
                    onChange={(e) =>
                      onChange({ ...entry, startDate: e.target.value })
                    }
                    placeholder="Jan 2023"
                  />
                </FieldRow>
                <FieldRow label="End Date">
                  <Input
                    value={entry.endDate}
                    onChange={(e) =>
                      onChange({ ...entry, endDate: e.target.value })
                    }
                    placeholder="Present"
                  />
                </FieldRow>
                <FieldRow label="Description">
                  <Textarea
                    value={entry.description}
                    onChange={(e) =>
                      onChange({ ...entry, description: e.target.value })
                    }
                    placeholder="Describe your contributions"
                    rows={3}
                  />
                </FieldRow>
              </div>
            )}
            renderDisplay={(entry) => (
              <div>
                <p className="font-medium text-zinc-100">
                  {entry.organization}
                </p>
                {entry.role && (
                  <p className="text-sm text-zinc-400">{entry.role}</p>
                )}
                {(entry.startDate || entry.endDate) && (
                  <p className="text-sm text-zinc-500">
                    {entry.startDate} - {entry.endDate || "Present"}
                  </p>
                )}
                {entry.description && (
                  <p className="text-sm text-zinc-400 mt-1">
                    {entry.description}
                  </p>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Separator className="bg-zinc-800" />

      {/* Publications */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="pt-6">
          <SectionEditor<PublicationData>
            title="Publications"
            entries={publications}
            onSave={async (entry) => {
              await savePublication({
                id: entry.id,
                title: entry.title,
                venue: entry.venue || undefined,
                date: entry.date || undefined,
                url: entry.url || undefined,
                sortOrder: entry.sortOrder,
              })
            }}
            onDelete={async (id) => {
              await deletePublication(id)
            }}
            emptyEntry={() => ({
              title: "",
              venue: "",
              date: "",
              url: "",
              sortOrder: publications.length,
            })}
            renderForm={(entry, onChange) => (
              <div className="space-y-3">
                <FieldRow label="Title">
                  <Input
                    value={entry.title}
                    onChange={(e) =>
                      onChange({ ...entry, title: e.target.value })
                    }
                    placeholder="Publication title"
                  />
                </FieldRow>
                <FieldRow label="Venue">
                  <Input
                    value={entry.venue}
                    onChange={(e) =>
                      onChange({ ...entry, venue: e.target.value })
                    }
                    placeholder="Journal or conference"
                  />
                </FieldRow>
                <FieldRow label="Date">
                  <Input
                    value={entry.date}
                    onChange={(e) =>
                      onChange({ ...entry, date: e.target.value })
                    }
                    placeholder="2023"
                  />
                </FieldRow>
                <FieldRow label="URL">
                  <Input
                    value={entry.url}
                    onChange={(e) =>
                      onChange({ ...entry, url: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </FieldRow>
              </div>
            )}
            renderDisplay={(entry) => (
              <div>
                <p className="font-medium text-zinc-100">{entry.title}</p>
                {entry.venue && (
                  <p className="text-sm text-zinc-400">{entry.venue}</p>
                )}
                {entry.date && (
                  <p className="text-sm text-zinc-500">{entry.date}</p>
                )}
                {entry.url && (
                  <p className="text-sm text-blue-400">{entry.url}</p>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Other/Unparsed Text */}
      {otherText && (
        <>
          <Separator className="bg-zinc-800" />
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">
                Other / Unparsed Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={otherText}
                readOnly
                rows={6}
                className="bg-zinc-950 text-zinc-400"
              />
              <p className="text-xs text-zinc-500 mt-2">
                This content was not recognized during resume parsing. You can
                manually add it to the appropriate sections above.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
