import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typescript: {
    // Enforce types at build time so example-page drift from the fsdk-ts API fails
    // loudly. This was `true`, which silently shipped drifted/broken showcase pages
    // (only an explicit `tsc --noEmit` caught them). Keep false.
    ignoreBuildErrors: false,
  },
}

export default nextConfig
