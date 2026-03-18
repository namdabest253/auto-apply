import { z } from "zod"

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const contactInfoSchema = z.object({
  name: z.string().max(200).optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  linkedIn: z.string().url("Invalid URL").optional().or(z.literal("")),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  location: z.string().max(200).optional(),
  addressLine1: z.string().max(300).optional(),
  addressLine2: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zipCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  workdayPassword: z.string().max(200).optional(),
})

export const educationSchema = z.object({
  id: z.string().optional(),
  school: z.string().min(1, "School name is required"),
  degree: z.string().max(200).optional(),
  fieldOfStudy: z.string().max(200).optional(),
  startDate: z.string().max(50).optional(),
  endDate: z.string().max(50).optional(),
  gpa: z.string().max(20).optional(),
  coursework: z.string().max(2000).optional(),
  sortOrder: z.number().int().default(0),
})

export const workHistorySchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, "Company name is required"),
  title: z.string().max(200).optional(),
  startDate: z.string().max(50).optional(),
  endDate: z.string().max(50).optional(),
  bullets: z.array(z.string()).default([]),
  sortOrder: z.number().int().default(0),
})

export const projectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Project name is required"),
  description: z.string().max(2000).optional(),
  url: z.string().url("Invalid URL").optional().or(z.literal("")),
  technologies: z.array(z.string()).default([]),
  sortOrder: z.number().int().default(0),
})

export const jobPreferenceSchema = z.object({
  locations: z.array(z.string()).default([]),
  roleTypes: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
})

export const qaEntrySchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  sortOrder: z.number().int().default(0),
})
