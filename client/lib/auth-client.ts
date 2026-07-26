import { createAuthClient } from 'better-auth/react';

if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error('Configuration Error: NEXT_PUBLIC_API_URL environment variable is missing.');
}

const serverUrl = process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '');

export const authClient = createAuthClient({
  baseURL: serverUrl,
  fetchOptions: {
    credentials: 'include',
  },
});

export const { useSession, signIn, signUp, signOut } = authClient;
