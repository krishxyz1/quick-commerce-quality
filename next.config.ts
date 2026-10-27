import type { NextConfig } from 'next';

// Pages read searchParams (selected app, review filters) on each request; nothing
// here benefits from Cache Components, so the classic dynamic model is kept.
const nextConfig: NextConfig = {};

export default nextConfig;
