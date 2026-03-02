// ============================================================
//  components/PageLayout.tsx — Shared page wrapper
// ============================================================
'use client';
import dynamic from 'next/dynamic';
import { Navbar } from './Navbar';

// Dynamic import keeps framer-motion out of the SSR bundle.
// The { ssr: false } means it only loads on the client,
// which is fine since this is a 'use client' component anyway.
const MotionDiv = dynamic(
  () => import('framer-motion').then((mod) => mod.motion.div),
  { ssr: false }
);

interface PageLayoutProps {
  children:     React.ReactNode;
  title:        string;
  subtitle?:    string;
  accentColor?: string;
}

export function PageLayout({
  children,
  title,
  subtitle,
  accentColor = 'var(--cyan)',
}: PageLayoutProps) {
  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 lg:px-8 pt-24 pb-24 md:pb-8">
        {/* Page header */}
        <MotionDiv
          className="mb-8"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1
            className="font-display font-800 text-3xl lg:text-4xl tracking-tight mb-2"
            style={{ color: 'white' }}
          >
            {title.split(' ').map((word, i) => (
              <span key={i}>
                {i > 0 && ' '}
                {i === 0 ? (
                  <span style={{ color: accentColor }}>{word}</span>
                ) : word}
              </span>
            ))}
          </h1>
          {subtitle && (
            <p className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {subtitle}
            </p>
          )}
          <div className="mt-4 divider-cyan" />
        </MotionDiv>

        {/* Page content */}
        <MotionDiv
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {children}
        </MotionDiv>
      </main>
    </div>
  );
}