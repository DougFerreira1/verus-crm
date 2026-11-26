import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Verus CRM',
    short_name: 'Verus',
    description: 'Verus — CRM inteligente com IA integrada ao WhatsApp',
    start_url: '/',
    display: 'standalone',
    background_color: '#f0f4f8',
    theme_color: '#25D366',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
