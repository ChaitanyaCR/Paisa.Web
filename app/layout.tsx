import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Paisa — A little clarity, every day', description: 'A personal space for income, expenses, and mindful budgeting. Responsive screen prototype.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
