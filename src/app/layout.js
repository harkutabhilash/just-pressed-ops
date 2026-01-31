import { Inter, Poppins } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata = {
  title: 'Just Pressed Operations',
  description: 'Manufacturing & D2C Operations Management',
  manifest: '/manifest.json',
  themeColor: '#2D7A3E',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Just Pressed',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <head>
        <link rel="icon" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="theme-color" content="#2D7A3E" />
      </head>
      <body className="font-sans antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
