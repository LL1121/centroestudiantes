/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // pdf.js usa DOMMatrix/canvas; nunca debe evaluarse en el servidor.
  serverExternalPackages: ['pdfjs-dist', 'react-pdf'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
