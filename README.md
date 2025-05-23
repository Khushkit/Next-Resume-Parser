# Advanced Resume Parser with Next.js & Supabase

A multi-page resume parsing application built with Next.js, Supabase, and Google Gemini API. This enterprise-grade app allows customization of parsing fields, supports multiple file formats, and maintains a history of all parsed resumes.

## Features

- **Multi-page Application:**
  - Upload Page: Resume upload with field selection
  - Results Page: Split view with parsed data and original document
  - Customize Page: Add/edit custom parsing fields and sections
  - Records Page: View history of all parsed resumes

- **File Support:**
  - PDF, DOC, DOCX, TXT, and image uploads
  - Text extraction from all formats

- **AI-Powered Parsing:**
  - Uses Google Gemini 2.0 Flash for accurate extraction
  - Structured JSON output with customizable fields

- **Database Integration:**
  - Supabase for storing parse history and custom fields
  - Records searchable and retrievable

- **Developer-Friendly:**
  - Swagger API documentation for integration
  - Modular, maintainable code structure

## Technology Stack

- **Frontend:** Next.js, React, TailwindCSS
- **Backend:** Next.js API routes
- **Database:** Supabase (PostgreSQL)
- **AI/ML:** Google Gemini API
- **Storage:** Supabase Storage for file management
- **Documentation:** Swagger/OpenAPI

## Getting Started

### Prerequisites
- Node.js 14+ and npm
- Supabase account (free tier works for testing)
- Google Gemini API key

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd gemini-resume-parser-next
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env.local`:
   ```
   GEMINI_API_KEY=your-gemini-api-key-here
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url-here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key-here
   ```

4. Set up Supabase database:
   - Create a new Supabase project
   - Go to the SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `schema.sql` from this repo
   - Run the SQL script to create all tables and functions

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Application Pages

### Upload Page (`/upload`)
- Upload resume files
- Select which fields to extract
- Choose from pre-defined fields or custom fields

### Results Page (`/result`)
- Split view with original document and parsed data
- JSON-formatted results for selected fields
- Option to save results to history

### Customize Page (`/customize`)
- Create custom sections for extraction
- Add subfields to each section
- Manage existing custom fields

### Records Page (`/records`)
- View history of all parsed resumes
- Filter and search through past parses
- View detailed results for any previous parse

## API Documentation

The application includes a Swagger UI for API documentation, available at `/api/swagger`.

Main endpoints:
- `POST /api/parse` - Upload and parse a resume
- `GET /api/records` - Get parse history
- `POST /api/records` - Save a parse record

## Deployment

### Vercel Deployment
1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Add the environment variables in the Vercel dashboard
4. Deploy

### Other Platforms
- Ensure Node.js 14+ support
- Set up environment variables
- Follow platform-specific deployment instructions

## Security Considerations

- Never commit `.env.local` to version control
- Supabase handles authentication and authorization
- API keys are properly secured in environment variables

## License

MIT
