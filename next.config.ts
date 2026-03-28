import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'tradevault.vercel.app',
          },
        ],
        destination: 'https://journalbud.vercel.app/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
