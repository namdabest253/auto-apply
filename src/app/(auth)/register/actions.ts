"use server"

import { prisma } from "@/lib/prisma"
import { hashPassword } from "@/lib/password"
import { signInSchema } from "@/lib/validators"
import { signIn } from "@/auth"
import { AuthError } from "next-auth"

export async function register(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  // Validate input
  const result = signInSchema.safeParse({ email, password })
  if (!result.success) {
    return { error: result.error.issues[0].message }
  }

  try {
    // Single-user check: prevent registration if a user already exists
    const userCount = await prisma.user.count()
    if (userCount > 0) {
      return { error: "Registration is closed" }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: result.data.email },
    })
    if (existingUser) {
      return { error: "Account already exists" }
    }

    // Create user
    const hashedPassword = await hashPassword(result.data.password)
    await prisma.user.create({
      data: {
        email: result.data.email,
        hashedPassword,
      },
    })

    // Auto sign-in after registration
    await signIn("credentials", {
      email: result.data.email,
      password: result.data.password,
      redirectTo: "/",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Failed to sign in after registration" }
    }
    // signIn redirects throw a NEXT_REDIRECT error -- rethrow it
    throw error
  }
}
