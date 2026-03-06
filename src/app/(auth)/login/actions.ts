"use server"

import { signIn } from "@/auth"
import { AuthError } from "next-auth"

export async function login(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid credentials" }
    }
    // signIn redirects throw a NEXT_REDIRECT error -- rethrow it
    throw error
  }
}
