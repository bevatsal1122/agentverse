/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    esmExternals: 'loose'
  },
  webpack: (config, { isServer }) => {
    // Handle Node.js built-in modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    
    // Handle node: protocol imports
    config.resolve.alias = {
      ...config.resolve.alias,
      'node:crypto': 'crypto',
    };
    
    return config;
  },
}

module.exports = nextConfig
