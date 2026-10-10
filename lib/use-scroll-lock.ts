'use client';

import { useEffect } from 'react';

let locks = 0;

/**
 * Låser scroll på siden bak et ark/dialog mens `active` er true, så scrolling
 * inne i arket ikke flytter siden i bakgrunnen. Teller låser, så flere ark kan
 * være åpne samtidig. Bevarer scrollposisjonen (iOS Safari).
 */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const { body, documentElement: html } = document;
    const y = window.scrollY;

    if (locks++ === 0) {
      body.style.position = 'fixed';
      body.style.top = `-${y}px`;
      body.style.left = '0';
      body.style.right = '0';
      html.style.overscrollBehavior = 'none';
    }

    return () => {
      if (--locks === 0) {
        body.style.position = '';
        body.style.top = '';
        body.style.left = '';
        body.style.right = '';
        html.style.overscrollBehavior = '';
        window.scrollTo(0, y);
      }
    };
  }, [active]);
}
