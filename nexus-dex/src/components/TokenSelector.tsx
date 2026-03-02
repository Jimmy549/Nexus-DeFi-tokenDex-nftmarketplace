// ============================================================
//  components/TokenSelector.tsx — Token picker dropdown
// ============================================================
'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { SUPPORTED_TOKENS, type SupportedToken } from '@/config/contracts';
import { formatTokenAmount } from '@/lib/utils';
import { useTokenBalances } from '@/hooks/useDEX';

interface TokenSelectorProps {
  value:    SupportedToken | null;
  onChange: (token: SupportedToken) => void;
  exclude?: `0x${string}`[];
  showBalance?: boolean;
  label?:  string;
}

export function TokenSelector({ value, onChange, exclude = [], showBalance = false, label }: TokenSelectorProps) {
  const [open, setOpen] = useState(false);
  const balances = useTokenBalances();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const available = SUPPORTED_TOKENS.filter(t => {
    const list = (exclude || []).map(addr => addr.toLowerCase());
    return !list.includes(t.address.toLowerCase());
  });

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <p className="stat-label mb-2">{label}</p>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200"
        style={{
          background:  'rgba(0,0,0,0.3)',
          border:      `1px solid ${open ? 'rgba(0,229,255,0.5)' : 'rgba(0,229,255,0.18)'}`,
          boxShadow:   open ? '0 0 0 2px rgba(0,229,255,0.1)' : 'none',
        }}
      >
        {value ? (
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-display font-700 text-sm"
              style={{ background: `${value.color}22`, border: `1px solid ${value.color}44`, color: value.color }}
            >
              {value.icon}
            </div>
            <div className="text-left">
              <div className="font-display font-700 text-sm text-white">{value.symbol}</div>
              <div className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{value.name}</div>
            </div>
            {showBalance && (
              <div className="ml-auto mr-2 text-right">
                <div className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Balance</div>
                <div className="font-mono text-sm font-500 text-white">
                  {formatTokenAmount(balances[value.symbol as keyof typeof balances] ?? 0n, 18, 3)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <span className="font-mono text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Select token</span>
        )}
        <ChevronDown
          className="w-4 h-4 flex-shrink-0 transition-transform duration-200"
          style={{
            color:     'rgba(0,229,255,0.6)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl overflow-y-auto no-scrollbar"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            style={{
              background: 'rgba(10,13,26,0.97)',
              border:     '1px solid rgba(0,229,255,0.25)',
              boxShadow:  '0 20px 40px rgba(0,0,0,0.6)',
              maxHeight:  '300px',
            }}
          >
            {available.map(token => {
              const bal = balances[token.symbol as keyof typeof balances] ?? 0n;
              const selected = value?.symbol === token.symbol;
              return (
                <button
                  key={token.symbol}
                  onClick={() => { onChange(token); setOpen(false); }}
                  className="w-full flex items-center justify-between px-4 py-3 transition-all duration-150"
                  style={{
                    background: selected ? `${token.color}11` : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${token.color}0d`)}
                  onMouseLeave={e => (e.currentTarget.style.background = selected ? `${token.color}11` : 'transparent')}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-display font-700 text-sm"
                      style={{ background: `${token.color}22`, border: `1px solid ${token.color}44`, color: token.color }}
                    >
                      {token.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-display font-600 text-sm text-white">{token.symbol}</div>
                      <div className="font-mono text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{token.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {showBalance && (
                      <div className="text-right">
                        <div className="font-mono text-xs text-white">{formatTokenAmount(bal, 18, 3)}</div>
                      </div>
                    )}
                    {selected && <Check className="w-4 h-4" style={{ color: token.color }} />}
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
