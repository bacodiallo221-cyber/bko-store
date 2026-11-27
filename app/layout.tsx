import './globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: { default: 'BKO-STORE', template: '%s · BKO-STORE' },
  description: 'Commandez en ligne, payez à la livraison.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Zelvo', statusBarStyle: 'default' },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#F4F2EC' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('zelvo-theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
