# Gemini Resume Parser (Next.js)

A modern resume parser app built with Next.js, React, and Google Gemini API. Supports PDF, DOC, DOCX, TXT, and image uploads. Extracts structured data using Gemini 2.0 Flash.

## Features
- Upload PDF, DOC, DOCX, TXT, or image resumes
- Progress bar & modern UI
- Parses and displays structured JSON
- Secure API key handling

## Getting Started
1. Clone the repo and run `npm install`.
2. Add your Gemini API key to `.env.local`:
   ```
   GEMINI_API_KEY=YOUR_KEY_HERE
   ```
3. Start the dev server:
   ```
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000)

## Deployment
- Do NOT commit `.env.local`.
- Deploy easily to Vercel or any Node.js platform.

## License
MIT
