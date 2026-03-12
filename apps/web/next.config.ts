import type { NextConfig } from "next";
import path from "path";

// next.config.ts is always executed as CJS in the apps/web directory,
// so __dirname reliably points to apps/web. Loading the monorepo root
// .env here ensures process.env is populated before webpack evaluates
// any @tedu/agents source files (e.g. env.ts).
try {
  process.loadEnvFile(path.resolve(__dirname, "../../.env"));
} catch {
  // .env not present — assume env vars are injected by the host (CI/prod).
}

const MONOREPO_ROOT = path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  transpilePackages: ["@tedu/agents", "@tedu/mcp-servers"],
  // Expose MONOREPO_ROOT so packages/agents/src/env.ts can read it
  // without using import.meta.url (which webpack intercepts).
  env: {
    TEDU_MONOREPO_ROOT: MONOREPO_ROOT,
  },
  webpack(config) {
    // ESM packages use `.js` extension in imports; webpack needs to also
    // try `.ts` when it can't find the actual .js file.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
};

export default nextConfig;
