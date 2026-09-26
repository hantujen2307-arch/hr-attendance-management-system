import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.BACKEND_API_URL?.replace(/\/api\/?$/, '') ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ||
  'https://hr-attendance-management-system-production.up.railway.app';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${BACKEND_URL}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
