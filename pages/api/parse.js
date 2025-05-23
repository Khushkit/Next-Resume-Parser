import { IncomingForm } from 'formidable';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import textract from 'textract';
import axios from 'axios';
import fs from 'fs';
import Tesseract from 'tesseract.js';
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  api: {
    bodyParser: false,
  },
};

function buildPrompt(selectedFields, text) {
  // selectedFields: { sectionKey: [subfieldKey, ...], ... }
  if (!selectedFields || Object.keys(selectedFields).length === 0) {
    return `YOU MUST RESPOND WITH ONLY PLAIN JSON - NO MARKDOWN CODE BLOCKS, NO BACKTICKS.

Extract all possible structured information from this resume and return as JSON. I need the raw JSON object ONLY without any explanation or formatting like code blocks.

REPEAT: DO NOT WRAP YOUR RESPONSE IN MARKDOWN CODE BLOCKS OR BACKTICKS. RESPOND WITH ONLY THE JSON OBJECT.

Follow these formatting rules strictly:
1. For URLs and links, DO NOT add any spaces within the URL (e.g., use "linkedin.com" not "linkedin. com")
2. For bullet points or list items, each item should be a complete entry on its own
3. For job summaries or descriptions, split into separate bullet points if multiple responsibilities are listed
4. Preserve proper spacing between words, but remove any unnecessary spaces
5. Keep the output clean and well-structured for display purposes

${text}`;
  }
  
  let prompt = `YOU MUST RESPOND WITH ONLY PLAIN JSON - NO MARKDOWN CODE BLOCKS, NO BACKTICKS.

Extract the following sections and fields from the resume and return as JSON. I need the raw JSON object ONLY without any explanation or formatting like code blocks.

CRITICAL FORMATTING REQUIREMENTS - READ CAREFULLY:

1. PROPER TEXT SPACING: This is absolutely critical. Ensure that all words have proper spacing between them.
   - DO NOT run words together like "Applicationand" - it must be "Application and"
   - DO NOT run words together like "camerawidget" - it must be "camera widget"
   - Split capitalized words appropriately (e.g., "UXimplementation" should be "UX implementation")
   - Split titles like "SOFTWAREENGINEER" to "SOFTWARE ENGINEER"
   - Always add spaces after punctuation

2. TECHNICAL TERMS: Pay special attention to technical phrases:
   - Keep acronyms like "UI", "UX", "API", "PLM" properly spaced from other words
   - Technical compound words like "JavaScript" can stay together, but "MachineLearning" should be "Machine Learning"

3. SPECIAL SPACING CASES:
   - For "B.Tech.", "M.Tech.", keep the periods but ensure proper spacing from other words
   - Company names like "Samsung" should be properly spaced from other words
   - Locations should have proper spacing (e.g., "Noida, Uttar Pradesh" not "Noida,UttarPradesh")

4. SENTENCE STRUCTURE:
   - Each bullet point in job descriptions should be a complete, properly spaced sentence
   - For job descriptions, convert to an array of strings where each string is properly formatted
   - For education, ensure university names and degrees have proper spacing

5. CUSTOM FIELDS AND SECTIONS:
   - IMPORTANT: Include ALL requested sections in the output, even custom sections like "achievements"
   - If a section name appears in the resume, extract all content under it
   - For custom sections, maintain the same format as standard sections (proper spacing, complete sentences)
   - Even if a section seems empty, include it with empty arrays or null values rather than omitting it
   - Ensure company names, job titles, and other fields are properly formatted with spaces

5. SPECIAL CHARACTERS:
   - For percentages, ensure proper spacing like "30% by" not "30%by"
   - For dates, ensure proper formatting like "Nov 2021 - Present" not "Nov2021-Present"
   - For URLs and links, do NOT add spaces within the URL (keep as "linkedin.com" not "linkedin. com")

EXTREMELY IMPORTANT: Your task is to extract information WITH PROPER WORD SPACING in all text fields. This is the most critical requirement.

`;
  
  // More explicitly list sections to extract to ensure they appear in output
  prompt += "\nSections to extract:\n";
  
  Object.entries(selectedFields).forEach(([section, subfields]) => {
    const readableSection = section.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    prompt += `- ${readableSection} section with fields: ${subfields.join(', ')}\n`;
    
    // For custom sections like achievements, add special handling
    if (section === 'achievements') {
      prompt += `IMPORTANT: Extract ALL achievements from the resume and include them as an array of strings in the "achievements" section. Even if the achievements section is not explicitly labeled in the resume, look for any accomplishments, awards, certifications, or notable projects and include them.\n`;
    }
  });
  
  // Emphasize that all requested sections must be included in the output
  prompt += "\nYou MUST include ALL the sections mentioned above in your JSON output, even if they appear empty. Never omit any requested section.\n";
  
  prompt += '\nResume:\n' + text;
  return prompt;
}

// Promise-based wrapper for formidable to handle file uploads properly
const parseForm = async (req) => {
  const form = new IncomingForm({
    keepExtensions: true,
    multiples: true,
  });
  
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
};

export default async function handler(req, res) {
  // Track if we've sent a response
  let responseSent = false;
  
  // Helper function to safely send a response only once
  const sendResponse = (statusCode, data) => {
    if (responseSent) return;
    responseSent = true;
    clearTimeout(responseTimeout);
    res.status(statusCode).json(data);
  };
  
  // Set a response timeout to ensure we always respond
  const responseTimeout = setTimeout(() => {
    console.error('API timeout - force sending response');
    sendResponse(504, { error: 'Request timeout' });
  }, 30000); // 30 second timeout

  if (req.method !== 'POST') {
    return sendResponse(405, { error: 'Method not allowed' });
  }

  try {
    // Parse the form using our promise-based wrapper
    const { fields, files } = await parseForm(req);
    
    if (!files || !files.file) {
      return sendResponse(400, { error: 'No file uploaded' });
    }
    
    // formidable v3+ returns files as arrays by default
    let file = files.file;
    if (Array.isArray(file)) file = file[0];
    if (!file) {
      return sendResponse(400, { error: 'No file uploaded (array fallback)' });
    }
    
    const filePath = file.filepath;
    const mime = file.mimetype || '';
    const ext = (file.originalFilename || '').split('.').pop().toLowerCase();

    let text = '';
    try {
      if (mime === 'application/pdf' || ext === 'pdf') {
        // PDF
        const pdfBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        text = pdfData.text;
      } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') {
        // DOCX
        const docxBuffer = fs.readFileSync(filePath);
        const result = await mammoth.extractRawText({ buffer: docxBuffer });
        text = result.value;
      } else if (mime === 'application/msword' || ext === 'doc') {
        // DOC
        text = await new Promise((resolve, reject) => {
          textract.fromFileWithPath(filePath, (err, content) => {
            if (err) reject(err);
            else resolve(content);
          });
        });
      } else if (mime.startsWith('text/') || ext === 'txt') {
        // TXT
        text = fs.readFileSync(filePath, 'utf8');
      } else if (mime.startsWith('image/') || ['jpg','jpeg','png','bmp','gif','webp'].includes(ext)) {
        // Image
        const { data: { text: ocrText } } = await Tesseract.recognize(filePath, 'eng');
        text = ocrText;
      } else {
        return sendResponse(400, { error: 'Unsupported file type' });
      }

      // Parse selected fields from the request
      let selectedFields = {};
      try {
        if (fields.fields) {
          selectedFields = JSON.parse(fields.fields);
        }
      } catch (e) {
        console.warn('Error parsing fields JSON:', e.message);
      }

      // Clean up whitespace in extracted text
      text = text.replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between camelCase
      text = text.replace(/([.,!?:;])(\S)/g, '$1 $2'); // Add space after punctuation if missing
      text = text.replace(/\s+/g, ' ').replace(/\n{2,}/g, '\n'); // Normalize spaces
      
      // Make sure there are spaces between words where needed
      text = text.replace(/([a-zA-Z])([a-zA-Z])/g, function(match, p1, p2) {
        // If both characters are letters but different case or different types, add space
        if (
          (p1.toLowerCase() !== p1 && p2.toLowerCase() === p2) || // camelCase
          (p1.toLowerCase() === p1 && p2.toLowerCase() !== p2)    // camelCase
        ) {
          return p1 + ' ' + p2;
        }
        return match; // No change
      });

      const prompt = buildPrompt(selectedFields, text);
      console.log('Calling Gemini API...');
      const geminiRes = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [{ 
            role: "user",
            parts: [{ text: prompt }] 
          }],
          systemInstruction: {
            role: "system",
            parts: [{
              text: "You are a resume parsing assistant. Always return ONLY raw JSON without any explanation or markdown formatting. Never use code blocks or backticks in your response."
            }]
          },
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.2,
            topP: 0.8,
            topK: 40,
            responseMimeType: "application/json"
          }
        },
        { 
          headers: { 'Content-Type': 'application/json' },
          timeout: 25000 // 25 second timeout for the API call
        }
      );
      console.log('Gemini API response received');
      
      let geminiText = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      let jsonResult = null;
      
      console.log('Raw Gemini response received, extracting JSON...');
      
      // Direct JSON extraction - most reliable approach
      function extractJsonFromText(text) {
        // Find the first open brace and last close brace
        const firstBraceIndex = text.indexOf('{');
        const lastBraceIndex = text.lastIndexOf('}');
        
        if (firstBraceIndex !== -1 && lastBraceIndex !== -1 && lastBraceIndex > firstBraceIndex) {
          // Extract the substring between these indices (inclusive)
          return text.substring(firstBraceIndex, lastBraceIndex + 1);
        }
        return null;
      }
      
      try {
        // Try direct parsing first
        jsonResult = JSON.parse(geminiText);
        console.log('Successfully parsed raw response as JSON');
      } catch (e) {
        console.log('Direct parse failed, trying JSON extraction...');
        
        // Extract JSON directly
        const jsonText = extractJsonFromText(geminiText);
        
        if (jsonText) {
          try {
            jsonResult = JSON.parse(jsonText);
            console.log('Successfully extracted and parsed JSON');
          } catch (extractErr) {
            console.warn('Error parsing extracted JSON:', extractErr.message);
            
            // Try cleaning the JSON text more aggressively
            let cleanedText = jsonText
              .replace(/\n/g, ' ')
              .replace(/\r/g, '')
              .replace(/\t/g, ' ');
              
            try {
              jsonResult = JSON.parse(cleanedText);
              console.log('Successfully parsed cleaned JSON');
            } catch (cleanErr) {
              console.warn('Failed to parse cleaned JSON:', cleanErr.message);
              // Fall back to regex-based extraction if all else fails
              const match = geminiText.match(/{[\s\S]*?}/); 
              if (match) {
                try {
                  jsonResult = JSON.parse(match[0]);
                  console.log('Successfully parsed regex-extracted JSON');
                } catch (regexErr) {
                  console.warn('All parsing attempts failed');
                }
              }
            }
          }
        } else {
          console.warn('No JSON object found in the response');
        }
      }
      
      // Log the raw response for debugging
      console.log('JSON result from Gemini:', JSON.stringify(jsonResult).substring(0, 200) + '...');
      
      // Return all fields regardless of selection (don't filter)
      // This ensures we don't lose any data
      let filteredResult = jsonResult;
      
      // If the result is empty or null, create a basic structure
      if (!filteredResult || Object.keys(filteredResult).length === 0) {
        console.warn('Empty result from Gemini API, creating basic structure');
        filteredResult = {};
        
        // Add empty objects for each selected section
        if (selectedFields && Object.keys(selectedFields).length > 0) {
          Object.keys(selectedFields).forEach(section => {
            // For achievements, make it an empty array
            if (section === 'achievements') {
              filteredResult[section] = [];
            } else {
              filteredResult[section] = {};
            }
          });
        }
      }
      
      // Ensure achievements section exists as an array if it was requested
      if (selectedFields && selectedFields.achievements && !filteredResult.achievements) {
        filteredResult.achievements = [];
      }
      
      return sendResponse(200, { raw: geminiText, parsed: filteredResult });
    } catch (error) {
      console.error('Parse API processing error:', error);
      return sendResponse(500, { 
        error: 'Failed to process file or call Gemini', 
        details: error.message, 
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  } catch (outerError) {
    console.error('Outer error:', outerError);
    return sendResponse(500, { error: 'Server error', details: outerError.message });
  }
}
