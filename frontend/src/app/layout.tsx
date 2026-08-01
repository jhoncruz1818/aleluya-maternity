import type { Metadata } from 'next';
import { Cormorant_Garamond, Outfit } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppFab } from '@/components/layout/WhatsAppFab';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import './globals.css';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-display',
});

const body = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: {
    default: 'Aleluya Maternity — Ropa para mamá',
    template: '%s · Aleluya Maternity',
  },
  description:
    'Vestidos y enterizos de fiesta para mamá. Colección Aleluya Maternity 2026.',
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('aleluya-theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${display.variable} ${body.variable} flex min-h-screen flex-col antialiased`}
      >
        <ThemeProvider>
          <QueryProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            <WhatsAppFab />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
