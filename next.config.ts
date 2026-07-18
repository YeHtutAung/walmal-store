import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'
// headers() is evaluated at `next build` and serialized into the standalone
// server, so the API origin (a NEXT_PUBLIC build-time value) is known here.
// Hardcoding localhost:8080 in connect-src would block every API call the
// moment the app is deployed behind a real domain.
const isProdBuild = process.env.NODE_ENV === 'production'
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1').origin

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://js.stripe.com`,
      "frame-src https://js.stripe.com",
      `connect-src 'self' https://api.stripe.com ${apiOrigin}${isProdBuild ? '' : ' ws://localhost:3000'}`,
      `img-src 'self' data: blob: https:${isProdBuild ? '' : ' http://localhost:9000'}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/minio/**',
      },
      {
        pathname: '/images/**',
      },
    ],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
