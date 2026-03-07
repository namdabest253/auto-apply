import type { NextAuthConfig } from "next-auth"

/**
 * Auth.js configuration that can be used in middleware (edge runtime).
 * Does NOT include Prisma adapter or Credentials provider authorize logic
 * since those require Node.js APIs not available in Edge.
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAuthPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register")

      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL("/", nextUrl.origin))
      }
      if (!isAuthPage && !isLoggedIn) {
        return Response.redirect(new URL("/login", nextUrl.origin))
      }
      return true
    },
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      return session
    },
  },
  providers: [], // Providers are added in auth.ts (full config)
}
