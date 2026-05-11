import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Service Worker FCM doit être servi à la racine de scope pour
        // recevoir les push messages — on le rewrite vers une route API
        // qui génère le JS avec la config Firebase publique inlinée.
        source: "/firebase-messaging-sw.js",
        destination: "/api/firebase-messaging-sw",
      },
    ];
  },
};

export default nextConfig;
