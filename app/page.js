'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/upload');
  }, [router]);

  return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-medium text-gray-700">Redirecting to Resume Parser...</h2>
        <p className="mt-2 text-gray-500">If you are not redirected automatically, <a href="/upload" className="text-blue-600 hover:underline">click here</a></p>
      </div>
    </div>
  );
}
