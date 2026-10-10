'use client';

import { useEffect } from 'react';

/** Registrerer service workeren (kun i produksjon; i dev forstyrrer den hot reload). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Kassen virker fint uten; service workeren gir bare offline-side og raskere oppstart.
    });
  }, []);
  return null;
}
