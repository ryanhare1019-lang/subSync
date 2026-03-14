import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SubSync — Your Subscription Hub',
  description: 'Track your streaming subscriptions and get AI-powered recommendations for what to watch next.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
