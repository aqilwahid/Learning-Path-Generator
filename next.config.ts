import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // resvg-js adalah modul native: biarkan Node yang memuatnya (tidak di-bundle).
  serverExternalPackages: ["@resvg/resvg-js"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
