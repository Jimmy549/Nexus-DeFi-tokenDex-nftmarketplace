// ============================================================
//  components/NavigationProgress.tsx
//  Thin cyan progress bar at the very top — fires on any link
//  click and completes when the pathname changes.
// ============================================================
'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function NavigationProgress() {
  const pathname                    = usePathname();
  const [width,   setWidth]         = useState(0);
  const [visible, setVisible]       = useState(false);
  const prevPathRef                 = useRef(pathname);
  const rafRef                      = useRef<number | null>(null);
  const startTimeRef                = useRef<number>(0);

  // ── Eased progress (0 → 85 in ~600 ms, then stalls) ───────
  const runFakeProgress = () => {
    startTimeRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTimeRef.current;
      // Ease-out: reaches ~85% in 600 ms then crawls
      const pct = Math.min(85, 85 * (1 - Math.exp(-elapsed / 280)));
      setWidth(pct);
      if (pct < 85) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const startLoading = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setWidth(0);
    setVisible(true);
    // Small delay lets the repaint set width=0 before animating
    requestAnimationFrame(() => runFakeProgress());
  };

  const finishLoading = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setWidth(100);
    const t = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 350);
    return () => clearTimeout(t);
  };

  // ── Detect navigation completion (pathname changed) ────────
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      finishLoading();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Intercept internal link clicks to start the bar ────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Skip: external, hash-only, mailto, tel, current page
      if (
        href.startsWith('http') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        href === pathname
      ) return;

      startLoading();
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!visible) return null;

  return (
    <>
      {/* Progress bar */}
      <div
        style={{
          position:   'fixed',
          top:        0,
          left:       0,
          zIndex:     99999,
          height:     '2px',
          width:      `${width}%`,
          background: 'linear-gradient(90deg, #00b8d4, #00e5ff, #33ecff)',
          boxShadow:  '0 0 10px rgba(0,229,255,0.7), 0 0 4px rgba(0,229,255,0.4)',
          transition: width === 100 ? 'width 0.25s ease-out' : 'width 0.12s linear',
          borderRadius: '0 2px 2px 0',
        }}
      />
      {/* Glow dot at the leading edge */}
      <div
        style={{
          position:     'fixed',
          top:          '-1px',
          left:         `calc(${width}% - 4px)`,
          zIndex:       99999,
          width:        '8px',
          height:       '4px',
          borderRadius: '50%',
          background:   '#00e5ff',
          boxShadow:    '0 0 12px 4px rgba(0,229,255,0.9)',
          opacity:      width > 0 && width < 100 ? 1 : 0,
          transition:   'left 0.12s linear, opacity 0.25s',
        }}
      />
    </>
  );
}
