import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@imgly/background-removal-node', 'sharp', 'onnxruntime-node', '@tugrul/rembg'],
  webpack(config) {
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
