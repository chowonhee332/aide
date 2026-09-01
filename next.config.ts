import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@imgly/background-removal-node', 'sharp', 'onnxruntime-node', '@tugrul/rembg'],
  // Astryx is vendored as its own runnable upstream docsite. It is not part of
  // Aide's server dependency graph and must not be scanned by Next file tracing.
  outputFileTracingExcludes: {
    '/*': ['vendor/astryx/**/*'],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });
    return config;
  },
};

export default nextConfig;
