import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { Bangers, Nunito } from 'next/font/google';

const headingFont = Bangers({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-heading',
});

const bodyFont = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-body',
});

export const metadata = {
  title: 'Feed G? | Cheap NZ Kai Chat',
  description: 'Ask Feed G style budget meal questions and get local NZ-inspired cheap kai plans instantly.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
