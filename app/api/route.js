// This file serves as a placeholder to ensure Next.js correctly recognizes the app/api directory
export async function GET() {
  return new Response(JSON.stringify({ message: 'API is running' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
