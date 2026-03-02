// ============================================================
//  components/Skeleton.tsx — Lightweight shimmer skeletons
// ============================================================
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className = '', variant = 'rect', width, height }: SkeletonProps) {
  const baseClass = "relative overflow-hidden bg-white/5";
  
  const radius = 
    variant === 'circle' ? '9999px' : 
    variant === 'text' ? '4px' : '12px';

  return (
    <div
      className={`${baseClass} ${className}`}
      style={{
        width:  width  ?? '100%',
        height: height ?? '20px',
        borderRadius: radius,
      }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
        }}
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

// ─── Specialized Skeletons ─────────────────────────────────────

export function CardSkeleton() {
  return (
    <div className="glass-cyan rounded-xl overflow-hidden p-0 border border-white/5">
      <Skeleton height="150px" className="rounded-none" />
      <div className="p-2.5 space-y-2">
        <Skeleton variant="text" width="70%" height="12px" />
        <Skeleton variant="text" width="40%" height="10px" />
        <div className="pt-1">
          <Skeleton height="40px" />
        </div>
        <Skeleton height="32px" className="mt-1" />
      </div>
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" width="40px" height="40px" />
        <div className="space-y-2">
          <Skeleton variant="text" width="80px" height="14px" />
          <Skeleton variant="text" width="120px" height="10px" />
        </div>
      </div>
      <div className="space-y-2 text-right">
        <Skeleton variant="text" width="60px" height="14px" />
        <Skeleton variant="text" width="40px" height="10px" />
      </div>
    </div>
  );
}
