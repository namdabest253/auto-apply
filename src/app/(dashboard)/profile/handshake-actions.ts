"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { encrypt, decrypt, getEncryptionKey } from "@/lib/crypto"
import { revalidatePath } from "next/cache"

export async function saveHandshakeCredentials(data: {
  university: string
  email: string
  password: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const key = getEncryptionKey()
  const encrypted = encrypt(
    JSON.stringify({
      university: data.university,
      email: data.email,
      password: data.password,
    }),
    key
  )

  await prisma.userSetting.upsert({
    where: {
      userId_key: {
        userId: session.user.id,
        key: "handshake_credentials",
      },
    },
    update: { value: encrypted },
    create: {
      userId: session.user.id,
      key: "handshake_credentials",
      value: encrypted,
    },
  })

  revalidatePath("/profile")
}

export async function removeHandshakeCredentials() {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.userSetting.deleteMany({
    where: {
      userId: session.user.id,
      key: "handshake_credentials",
    },
  })

  revalidatePath("/profile")
}

export async function getHandshakeStatus(userId: string): Promise<{
  hasCredentials: boolean
  universityName?: string
}> {
  const setting = await prisma.userSetting.findUnique({
    where: {
      userId_key: {
        userId,
        key: "handshake_credentials",
      },
    },
  })

  if (!setting) {
    return { hasCredentials: false }
  }

  try {
    const key = getEncryptionKey()
    const decrypted = JSON.parse(decrypt(setting.value, key))
    return {
      hasCredentials: true,
      universityName: decrypted.university,
    }
  } catch {
    return { hasCredentials: true, universityName: "Unknown" }
  }
}
