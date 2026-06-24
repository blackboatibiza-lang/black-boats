import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contrato de Alquiler – Black Boats Ibiza',
  description: 'Revisa y firma tu contrato de alquiler náutico con Black Boats Ibiza.',
  openGraph: {
    title: 'Contrato de Alquiler – Black Boats Ibiza',
    description: 'Revisa y firma tu contrato de alquiler náutico con Black Boats Ibiza.',
    siteName: 'Black Boats Ibiza',
    images: [
      {
        url: 'https://black-boats-sepia.vercel.app/3.png',
        width: 800,
        height: 800,
        alt: 'Black Boats Ibiza',
      },
    ],
  },
}

export default function ContratoLayout({ children }: { children: React.ReactNode }) {
  return children
}
