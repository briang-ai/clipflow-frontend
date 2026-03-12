import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/join",
        destination: "/sign-up",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;