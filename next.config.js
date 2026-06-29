/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@sparticuz/chromium', 'puppeteer-core', 'puppeteer'],
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
};
module.exports = nextConfig;
