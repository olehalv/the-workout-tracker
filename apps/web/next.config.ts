import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
  serverExternalPackages: ["pg", "jsonwebtoken", "jwks-rsa"],
};

export default nextConfig;
