import type { ReactNode } from 'react'
import { Cairo } from 'next/font/google'
import '../globals.css'
import { ToastProvider } from '@/context/ToastContext'
import { UserProvider } from '@/context/UserContext'
import { SearchProvider } from '@/context/SearchContext'

const cairo = Cairo({
  subsets: ['latin', 'arabic'],
  weight: ['400', '500', '600', '700'],
  style: ['normal'],
  display: 'swap',
})

export const metadata = {
  title: 'SmartRecruit AI - Job Application',
  description: 'AI-powered hiring platform with multi-step job application form',
}

export default function ApplyLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className={cairo.className}>
        <UserProvider>
          <SearchProvider>
            <ToastProvider>
              <main className="min-h-screen">{children}</main>
            </ToastProvider>
          </SearchProvider>
        </UserProvider>
      </body>
    </html>
  )
}
