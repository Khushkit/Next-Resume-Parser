/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable App Router with proper configuration
  experimental: {
    appDir: true
  },
  // Handle PDF files and other binary content
  webpack(config) {
    return config;
  }
};

module.exports = nextConfig;
