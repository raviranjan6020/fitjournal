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
      // PKCE + state + nonce handled by NextAuth v5 by default
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email) return false;

      // Upsert user
      const existing = await db
        .select()
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

        // Seed default preferences
        await db.insert(usersPreferences).values({ userId: newUser.id });
      }

      return true;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        const [user] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.authProviderId, token.sub))
          .limit(1);
        if (user) (session.user as { id?: string }).id = user.id;
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
        maxAge: 60 * 60 * 24 * 30, // 30 days
      },
    },
  },
});
