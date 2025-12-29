import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import {Cairo} from 'next/font/google';
import '../globals.css';
import { ToastProvider } from '@/context/ToastContext';
import { UserProvider } from '@/context/UserContext';
import { SearchProvider } from '@/context/SearchContext';

const cairo = Cairo({
  subsets: ['latin', 'arabic'],
  weight: ['400', '500', '600', '700'],
  style: ['normal'],
  display: 'swap',
});

export const metadata = {
  title: 'SmartRecruit AI - Job Application',
  description: 'AI-powered hiring platform with multi-step job application form',
};

export default async function LocaleLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages({locale});

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body className={cairo.className}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <UserProvider>
            <SearchProvider>
              <ToastProvider>
                <main className="min-h-screen">
                  {children}
                </main>
              </ToastProvider>
            </SearchProvider>
          </UserProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
