import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tedu/agents", "@tedu/mcp-servers"],
  webpack(config) {
    // ESM packages in the monorepo use `.js` extensions in imports (correct for
    // Node ESM), but Next.js/webpack looks for actual files. This alias tells
    // webpack to also try `.ts` when it can't find a `.js` file.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
