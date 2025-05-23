'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  
  const isActive = (path) => {
    return pathname === path;
  };
  
  return (
    <nav className="bg-white shadow-md mb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-blue-600 font-bold text-xl">Resume Parser</span>
            </div>
            <div className="ml-10 flex items-center space-x-4">
              <Link href="/upload" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/upload') ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                Upload
              </Link>
              <Link href="/customize" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/customize') ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                Customize Fields
              </Link>
              <Link href="/records" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/records') ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                Records
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
