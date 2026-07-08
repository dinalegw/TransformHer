import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Inter, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
  display: 'swap',
})
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const INLINE_THEME_SCRIPT = `
(function(){try{var t=localStorage.getItem('transformher-theme');if(!t){t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'}var r=document.documentElement;r.classList.remove('light','dark','night-shift');r.classList.add(t);var c=t==='light'?'light':'dark';var m=document.querySelector('meta[name="color-scheme"]');if(m)m.setAttribute('content',c);var n={light:'#f6f2e9',dark:'#2a2a35','night-shift':'#221d14'};var p=document.querySelector('meta[name="theme-color"]');if(p)p.setAttribute('content',n[t]||'#f6f2e9')}catch(e){}})()
`

export const metadata: Metadata = {
  title: {
    default: 'TransformHer — Transformational Books for Women',
    template: '%s | TransformHer',
  },
  description:
    'A premium digital bookstore and reading platform with transformational books that help women grow in confidence, wealth, wellness, and purpose.',
  applicationName: 'TransformHer',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-light-32x32.png?v=2', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png?v=2', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/apple-icon.png?v=2',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f2e9' },
    { media: '(prefers-color-scheme: dark)', color: '#2a2a35' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${playfair.variable} ${inter.variable} ${geistMono.variable} bg-background`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: INLINE_THEME_SCRIPT }} />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
