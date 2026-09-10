import type { Metadata } from 'next';
import './globals.css';
import { RoleProvider } from '@/context/RoleContext';
import { AppShell } from '@/components/layout/AppShell';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'MedTrace | Pharmaceutical Reverse Chain Compliance & Re-entry Defense',
  description:
    'Closed-loop digital ledger for expired pharmaceuticals ensuring zero re-entry of destroyed batch identities.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F7F9FC] text-[#0B1B3A] antialiased">
        <RoleProvider>
          <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm font-medium text-slate-500">Loading MedTrace Platform...</div>}>
            <AppShell>{children}</AppShell>
          </Suspense>
        </RoleProvider>
      </body>
    </html>
  );
}
