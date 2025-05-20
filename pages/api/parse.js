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
    return `Extract all possible structured information from this resume and return as JSON.\n${text}`;
  }
  let prompt = 'Extract the following sections and fields from the resume and return as JSON.\n';
  Object.entries(selectedFields).forEach(([section, subfields]) => {
    prompt += `Section: ${section}\nFields: ${subfields.join(', ')}\n`;
  });
  prompt += '\nResume:\n' + text;
  return prompt;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err || !files.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    // formidable v3+ returns files as arrays by default
    let file = files.file;
    if (Array.isArray(file)) file = file[0];
    if (!file) return res.status(400).json({ error: 'No file uploaded (array fallback)' });
    const filePath = file.filepath;
    const mime = file.mimetype || '';
    const ext = (file.originalFilename || '').split('.').pop().toLowerCase();

    let text = '';
    try {
      if (mime === 'application/pdf' || ext === 'pdf') {
        // PDF
        const pdfBuffer = fs.readFileSync(filePath);
        text = (await pdfParse(pdfBuffer)).text;
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
        return res.status(400).json({ error: 'Unsupported file type' });
      }

      // Parse selected fields from the request
      let selectedFields = {};
      try {
        if (fields.fields) {
          selectedFields = JSON.parse(fields.fields);
        }
      } catch (e) {}

      // Clean up whitespace in extracted text
      text = text.replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between camelCase
      text = text.replace(/([.,!?:;])(\S)/g, '$1 $2'); // Add space after punctuation if missing
      text = text.replace(/\s+/g, ' ').replace(/\n{2,}/g, '\n'); // Normalize spaces

      const prompt = buildPrompt(selectedFields, text);
      const geminiRes = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: prompt }] }]
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
      let geminiText = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      let jsonResult = null;
      try {
        jsonResult = JSON.parse(geminiText);
      } catch (e) {
        const match = geminiText.match(/\{[\s\S]*\}/);
        if (match) {
          try { jsonResult = JSON.parse(match[0]); } catch (err) {}
        }
      }
      // Only return selected fields
      let filteredResult = {};
      if (jsonResult && typeof jsonResult === 'object' && selectedFields && Object.keys(selectedFields).length > 0) {
        Object.entries(selectedFields).forEach(([section, subfields]) => {
          if (jsonResult[section]) {
            if (Array.isArray(jsonResult[section])) {
              // For arrays (e.g., work_experience)
              filteredResult[section] = jsonResult[section].map(item => {
                let obj = {};
                subfields.forEach(f => { if (item[f]) obj[f] = item[f]; });
                return obj;
              });
            } else if (typeof jsonResult[section] === 'object') {
              filteredResult[section] = {};
              subfields.forEach(f => { if (jsonResult[section][f]) filteredResult[section][f] = jsonResult[section][f]; });
            } else {
              filteredResult[section] = jsonResult[section];
            }
          }
        });
      } else {
        filteredResult = jsonResult;
      }
      res.status(200).json({ raw: geminiText, parsed: filteredResult });
    } catch (error) {
      console.error('Parse API error:', error);
      res.status(500).json({ error: 'Failed to process file or call Gemini', details: error.message, stack: error.stack });
    }
  });
}
