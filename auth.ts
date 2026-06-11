import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

if (process.env.VERCEL_URL && !process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, name, avatar_url, password_hash')
          .eq('email', credentials.email)
          .single();

        if (!profile?.password_hash) return null;
        const valid = await bcrypt.compare(credentials.password as string, profile.password_hash);
        if (!valid) return null;

        return { id: profile.id, email: profile.email, name: profile.name, image: profile.avatar_url };
      },
    }),
  ],
  pages: { signIn: '/login' },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', user.email)
          .maybeSingle();
        if (!existing) {
          await supabase.from('profiles').insert({
            email:      user.email,
            name:       user.name ?? '',
            avatar_url: user.image ?? null,
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // Resolve profileId on first sign-in OR whenever it's missing from the
      // token (covers cases where the database was reset between sessions).
      const email = (user?.email ?? token.email) as string | undefined;
      if (email && !token.profileId) {
        let { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        // If the profile is missing entirely — typically a fresh DB after the
        // session was created — create it on the fly so the user doesn't have
        // to sign out / back in.
        if (!profile) {
          const { data: inserted } = await supabase
            .from('profiles')
            .insert({ email, name: (user?.name ?? token.name ?? '') as string })
            .select('id')
            .single();
          profile = inserted;
        }
        if (profile) token.profileId = profile.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.profileId) session.user.profileId = token.profileId as string;
      return session;
    },
  },
});
