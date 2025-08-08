
import type {NextConfig} from 'next';
const withPWA = require('next-pwa')({
  dest: 'public'
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  devIndicators: {
      allowedDevOrigins: [
          'https://6000-firebase-studio-1747636018151.cluster-3gc7bglotjgwuxlqpiut7yyqt4.cloudworkstations.dev'
      ]
  }
};

export default withPWA(nextConfig);
