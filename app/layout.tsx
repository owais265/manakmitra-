import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'ManakMitra BIS Assistant',
  description: 'Official AI assistant helping MSMEs and consumers navigate BIS compliance with ease.',
  openGraph: {
    title: 'ManakMitra BIS Assistant',
    description: 'Official AI assistant helping MSMEs and consumers navigate BIS compliance with ease.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ManakMitra BIS Assistant',
    description: 'Official AI assistant helping MSMEs and consumers navigate BIS compliance with ease.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+Devanagari:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body 
        style={{ fontFamily: "'Inter', 'Noto Sans Devanagari', sans-serif" }}
        className="antialiased" 
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
