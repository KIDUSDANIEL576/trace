import { Redirect } from 'expo-router';
import React from 'react';
import { Loading } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useCouple } from '@/hooks/useCouple';

/** Gate: signed out → sign-in · no couple → pair · otherwise → the canvas. */
export default function Index() {
  const { session, loading: authLoading } = useAuth();
  const { membership, loading: coupleLoading } = useCouple(session?.user.id);

  if (authLoading) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;
  if (coupleLoading) return <Loading label="Finding your canvas…" />;
  if (!membership) return <Redirect href="/pair" />;
  return <Redirect href="/canvas" />;
}
