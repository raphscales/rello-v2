/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['googleapis', 'google-auth-library', '@anthropic-ai/sdk'],
  },
};

export default nextConfig;
