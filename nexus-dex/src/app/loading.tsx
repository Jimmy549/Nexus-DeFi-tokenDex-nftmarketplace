// ============================================================
//  app/loading.tsx — Custom branded loading state
// ============================================================
'use client';
import { motion } from 'framer-motion';
import { Hexagon } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#060914] relative overflow-hidden">
      {/* Background Glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(0,229,255,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative flex flex-col items-center gap-8">
        {/* Animated Branded Logo */}
        <motion.div 
          className="relative"
          animate={{ 
            scale: [1, 1.05, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className="relative">
            <Hexagon 
              className="w-20 h-20" 
              style={{ 
                color: 'var(--cyan)', 
                fill: 'rgba(0,229,255,0.1)',
                filter: 'drop-shadow(0 0 15px rgba(0,229,255,0.5))' 
              }} 
            />
            <span 
              className="absolute inset-0 flex items-center justify-center text-xl font-display font-900 tracking-tighter"
              style={{ color: 'var(--cyan)' }}
            >
              N
            </span>
          </div>
          
          {/* Orbital Ring */}
          <motion.div 
            className="absolute -inset-4 border border-cyan-500/20 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>

        {/* Text and Bar */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" />
            <p className="font-display font-700 text-sm tracking-[0.2em] uppercase text-white/80">
              Nexus<span className="text-cyan-400">.DEX</span>
            </p>
            <span className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          
          <div className="w-48 h-[1px] bg-white/5 relative overflow-hidden">
            <motion.div 
              className="absolute inset-0 bg-cyan-400"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          
          <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-500/40">
            Initialzing Protocol...
          </p>
        </div>
      </div>
    </div>
  );
}
