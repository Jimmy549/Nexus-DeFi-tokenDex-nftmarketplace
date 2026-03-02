/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Webpack config (used by `next build` and `next dev` without Turbopack) ──
  webpack: (config, { isServer }) => {
    // Fix: suppress missing @base-org/account module warning.
    // @wagmi/connectors references @base-org/account as an optional peer dep;
    // aliasing it to false tells webpack to treat it as an empty module.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@base-org/account': false,
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      'pino-pretty': false,
      '@react-native-async-storage/async-storage': false,
    };

    config.externals.push('pino-pretty', 'encoding');

    return config;
  },

  // ── Turbopack config (used by `next dev --turbopack`) ──
  turbopack: {
    resolveAlias: {
      // Same fix for the missing @base-org/account module under Turbopack
      '@base-org/account': { browser: './src/lib/empty-module.js', default: './src/lib/empty-module.js' },
    },
  },

  reactStrictMode: false,

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

module.exports = nextConfig;
