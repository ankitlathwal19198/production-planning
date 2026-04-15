import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/planning-form",
        permanent: false, // true karoge to 308 permanent redirect hoga
      },
    ];
  },
};

export default nextConfig;
