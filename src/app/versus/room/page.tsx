'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import RoomClient from './RoomClient';

// /versus/room/?code=ABCDE — a static page that works on any static host.
function Room() {
  const params = useSearchParams();
  const code = (params.get('code') || '').replace(/[^a-z0-9]/gi, '').slice(0, 8);
  if (!code) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="font-display text-3xl font-bold">No room code</div>
        <Link href="/versus" className="btn-lime mt-6">Back to Versus</Link>
      </div>
    );
  }
  return <RoomClient key={code} code={code} />;
}

export default function RoomPage() {
  return (
    <Suspense fallback={<div className="card mx-auto h-64 max-w-3xl animate-pulse" />}>
      <Room />
    </Suspense>
  );
}
