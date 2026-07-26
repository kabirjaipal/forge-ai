import { createAuthClient } from 'better-auth/react';

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, '');

if (!serverUrl) {
  throw new Error('Configuration Error: NEXT_PUBLIC_SERVER_URL or NEXT_PUBLIC_API_URL environment variable is missing.');
}

export const authClient = createAuthClient({
  baseURL: serverUrl,
  fetchOptions: {
    credentials: 'include',
  },
});

export const { useSession, signIn, signUp, signOut } = authClient;
