import './globals.css';

export const metadata = {
  title: 'Navika Birthday Tracker — Next.js Private Analytics',
  description: 'Private real-time analytics dashboard for Navika\'s birthday website'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
