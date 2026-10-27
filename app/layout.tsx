import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import { Shell } from '@/components/Shell';
import { summary, num } from '@/lib/data';
import './globals.css';

const plex = IBM_Plex_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: { default: 'Spoilt · quick-commerce quality radar', template: '%s · Spoilt' },
  description:
    'Freshness, damage and missing-item complaints across Blinkit, Zepto, Instamart, BigBasket and Flipkart Minutes, from 10,321 Play Store reviews labelled with an LLM.',
};

export const viewport: Viewport = {
  themeColor: '#f4f3f1',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={plex.variable}>
      <body>
        <Shell scope={`Play Store, India · ${num(summary.totalReviews)} reviews`}>{children}</Shell>
      </body>
    </html>
  );
}
