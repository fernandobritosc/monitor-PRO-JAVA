
import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import type { Session } from '@supabase/auth-js';

export const useSentry = (session: Session | null) => {
  useEffect(() => {
    if (session?.user) {
      Sentry.setUser({
        id: session.user.id,
        email: session.user.email,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [session]);
};
