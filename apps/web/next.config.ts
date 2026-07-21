import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We live in an npm-workspaces monorepo: `next` is installed under this
  // workspace while its `@next/swc-*` binaries hoist to the repo-root
  // node_modules. Pin Turbopack's root to the monorepo root so it stops
  // walking up the tree and guessing (which otherwise triggers a bogus
  // "lockfile missing swc dependencies" patch attempt).
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
  // The user/auth API route handlers use these Node-native packages (dynamic
  // requires that don't bundle cleanly). Keep them external to the server build.
  serverExternalPackages: ["pg", "jsonwebtoken", "jwks-rsa"],
};

export default nextConfig;
