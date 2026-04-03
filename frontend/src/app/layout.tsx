import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FSDK Starter',
  description: 'Foundation SDK template application',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__FOUNDATION_URL__ = "${process.env.NEXT_PUBLIC_FOUNDATION_URL || 'http://localhost:5001'}";
              window.__ENABLE_BILLING__ = "${process.env.NEXT_PUBLIC_ENABLE_BILLING || 'false'}";
              window.__GOOGLE_CLIENT_ID__ = "${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}";
            `,
          }}
        />
        {children}
      </body>
    </html>
  )
}
