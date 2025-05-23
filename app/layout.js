import './globals.css';
import Navigation from '../components/Navigation';

export const metadata = {
  title: 'Resume Parser Pro',
  description: 'Advanced resume parsing with customizable fields',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
