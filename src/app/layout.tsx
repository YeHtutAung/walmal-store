import type { Metadata } from 'next'
import { Anton, Archivo, Public_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton' })
const archivo = Archivo({ weight: ['500', '600', '700', '800', '900'], subsets: ['latin'], variable: '--font-archivo' })
const publicSans = Public_Sans({ subsets: ['latin'], variable: '--font-public-sans' })

export const metadata: Metadata = {
  title: { default: 'Walmal Sport', template: '%s | Walmal Sport' },
  description: 'Match kits, elite boots and training gear.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${archivo.variable} ${publicSans.variable}`}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
