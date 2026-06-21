import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { users, usersPreferences } from "@/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // NextAuth v5 handles PKCE + state + nonce by default
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email) return false;

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, profile.email))
        .limit(1);

      if (existing.length === 0) {
        const [newUser] = await db
          .insert(users)
          .values({
            email: profile.email,
            name: profile.name ?? null,
            avatarUrl: (profile as { picture?: string }).picture ?? null,
            authProvider: "google",
            authProviderId: profile.sub,
          })
          .returning();
        await db.insert(usersPreferences).values({ userId: newUser.id });
      }

      return true;
    },
    async jwt({ token, profile }) {
      // On first sign-in, look up our internal user id and store in token
      if (profile?.email) {
        const [user] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, profile.email))
          .limit(1);
        if (user) token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        (session.user as { id?: string }).id = token.userId as string;
      }
      return session;
    },
  },
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      },
    },
  },
});
