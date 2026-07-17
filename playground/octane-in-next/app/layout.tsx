import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
	title: 'Octane in Next.js',
	description:
		'Compiled Octane .tsrx components mounted as client islands inside a Next.js App Router app.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
