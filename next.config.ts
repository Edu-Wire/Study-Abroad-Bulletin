import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow future external image domains
    remotePatterns: [],
  },
  // Strict mode for better development warnings
  reactStrictMode: true,
};

export default nextConfig;
