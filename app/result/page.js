'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { Document, Page, pdfjs } from 'react-pdf';

// Client-side only code for PDF.js worker
if (typeof window !== 'undefined') {
  // Using a simple inline worker script to avoid network requests
  pdfjs.GlobalWorkerOptions.workerSrc = '';
}

export default function ResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordId = searchParams.get('id');
  
  const [parsedData, setParsedData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  useEffect(() => {
    fetchRecord();
  }, [recordId]);

  async function fetchRecord() {
    try {
      setLoading(true);
      
      // If we have a record ID in the URL, fetch from Supabase
      if (recordId) {
        const { data, error } = await supabase
          .from('resume_records')
          .select('*')
          .eq('id', recordId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setParsedData(data.parsed_result);
          setFileName(data.file_name);
          
          // Try to get the PDF from storage or the original file path
          if (data.original_file_path) {
            try {
              // If we have a stored PDF, fetch it
              const response = await fetch(data.original_file_path);
              if (response.ok) {
                const blob = await response.blob();
                setPdfFile(URL.createObjectURL(blob));
              }
            } catch (pdfError) {
              console.error('Error loading PDF:', pdfError);
              // Continue without the PDF
            }
          }
          return; // Successfully loaded from Supabase
        }
      }
      
      // Fallback to localStorage if no record ID or record not found
      const storedData = localStorage.getItem('lastParsedResume');
      console.log('Retrieved data from localStorage:', storedData ? 'Found data' : 'No data');
      
      if (!storedData) {
        console.warn('No stored resume data found');
        router.push('/upload');
        return;
      }
      
      try {
        // Parse the JSON data carefully
        const parsedResume = JSON.parse(storedData);
        console.log('Loaded stored resume data structure:', Object.keys(parsedResume));
        
        // Validate the parsed data structure
        if (!parsedResume || typeof parsedResume !== 'object') {
          throw new Error('Invalid resume data format: not an object');
        }
        
        // Check if we have a valid result object
        if (!parsedResume.result) {
          console.error('Missing result in stored resume data:', parsedResume);
          throw new Error('Invalid resume data format: missing result');
        }
        
        // Set the parsed data
        console.log('Setting parsed data with result:', typeof parsedResume.result);
        setParsedData(parsedResume.result);
        setFileName(parsedResume.fileName || 'Unnamed Resume');
        
        // Try to get the PDF file from localStorage if available
        const storedPdfFile = localStorage.getItem('lastParsedPDF');
        if (storedPdfFile) {
          console.log('Found PDF in localStorage');
          // The PDF is stored as a data URL (base64)
          setPdfFile(storedPdfFile);
        } else {
          console.warn('No PDF found in localStorage');
        }
        
        // Save to Supabase if it was parsed successfully and no record ID
        if (parsedResume.result && !recordId) {
          saveToSupabase(parsedResume);
        }
      } catch (parseError) {
        console.error('Error parsing stored resume data:', parseError);
        setError(`Failed to load stored resume data: ${parseError.message}`);
        // Clear invalid data from localStorage
        localStorage.removeItem('lastParsedResume');
        // Redirect back to upload after a short delay
        setTimeout(() => router.push('/upload'), 3000);
      }
    } catch (err) {
      console.error('Error loading parsed data:', err);
      setError('Failed to load resume data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }
  
  async function saveToSupabase(parsedResume) {
    try {
      // Check if we already have a record with this filename to avoid duplicates
      const { data: existingRecords, error: checkError } = await supabase
        .from('resume_records')
        .select('id')
        .eq('file_name', parsedResume.fileName)
        .limit(1);
      
      if (checkError) throw checkError;
      
      // If record already exists, don't create a new one
      if (existingRecords && existingRecords.length > 0) {
        const url = new URL(window.location);
        url.searchParams.set('id', existingRecords[0].id);
        window.history.pushState({}, '', url);
        return;
      }
      
      // Create a new record if it doesn't exist
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: parsedResume.fileName,
          fileType: parsedResume.fileName.split('.').pop() || 'unknown',
          status: 'completed',
          selectedFields: parsedResume.selectedFields || {},
          parsedResult: parsedResume.result || null
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('Error saving to Supabase:', data);
      } else {
        // Update URL with record ID without full page reload
        const url = new URL(window.location);
        url.searchParams.set('id', data.id);
        window.history.pushState({}, '', url);
      }
    } catch (err) {
      console.error('Failed to save record:', err);
    }
  }

  // Function to handle PDF document loading
  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
    setPdfLoaded(true);
  }

  // Functions to navigate between PDF pages
  function goToNextPage() {
    setPageNumber(prevPageNumber => Math.min(prevPageNumber + 1, numPages));
  }

  function goToPrevPage() {
    setPageNumber(prevPageNumber => Math.max(prevPageNumber - 1, 1));
  }

  // Simple helper function to format text (only handles basic cases)
  function formatText(text) {
    if (!text || typeof text !== 'string') return text;
    
    // We're now relying on Gemini to properly format text, but
    // we'll still do some very basic cleanup just in case
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Function to format JSON with syntax highlighting
  function formatJsonWithHighlighting(json) {
    if (!json) return '';
    
    // Convert JSON to string with proper indentation
    const jsonString = JSON.stringify(json, null, 2);
    
    // Process the JSON string token by token to apply highlighting
    let result = '';
    let inString = false;
    let currentToken = '';
    let colonNext = false;
    
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      
      if (char === '"' && (i === 0 || jsonString[i-1] !== '\\')) {
        // Handle start/end of string
        if (!inString) {
          // Starting a new string
          inString = true;
          currentToken = '"';
        } else {
          // Ending a string
          currentToken += '"';
          
          // Check if this is a key (followed by colon)
          let j = i + 1;
          while (j < jsonString.length && /\s/.test(jsonString[j])) j++;
          
          if (j < jsonString.length && jsonString[j] === ':') {
            // This is a key (red)
            result += `<span class="text-red-600">${currentToken}</span>`;
            colonNext = true;
          } else {
            // This is a value (blue)
            result += `<span class="text-blue-600">${currentToken}</span>`;
          }
          
          inString = false;
          currentToken = '';
        }
      } else if (inString) {
        // Inside a string, collect characters
        currentToken += char;
      } else if (/\d/.test(char)) {
        // Handle numbers
        if (!/\d/.test(jsonString[i-1]) && !/\./.test(jsonString[i-1])) {
          // Start of a number
          currentToken = char;
          
          // Collect the whole number
          let j = i + 1;
          while (j < jsonString.length && (/\d/.test(jsonString[j]) || jsonString[j] === '.')) {
            currentToken += jsonString[j];
            j++;
          }
          
          // Add the highlighted number
          result += `<span class="text-green-600">${currentToken}</span>`;
          
          // Skip the characters we've processed
          i = j - 1;
          currentToken = '';
        }
      } else if (char === ':' && colonNext) {
        // Handle colon after a key
        result += char;
        colonNext = false;
      } else {
        // Handle all other characters
        result += char;
      }
    }
    
    // Return the HTML to be rendered
    return <div dangerouslySetInnerHTML={{ __html: result }} />;
  }

  // Helper to render a field value with proper formatting
  function renderFieldValue(key, value) {
    // Handle different types of fields
    const isUrl = key.includes('url') || key.includes('link') || 
                  key.includes('website') || key.includes('github');
    const isEmail = key.includes('email');
    
    if (Array.isArray(value)) {
      return (
        <div className="space-y-2">
          {value.map((item, idx) => (
            <div key={idx} className="pl-4 border-l-2 border-blue-200">
              {typeof item === 'string' ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{formatText(item)}</p>
              ) : (
                <div className="pl-2">
                  {Object.entries(item).map(([subKey, subValue]) => (
                    subValue && (
                      <div key={subKey} className="mb-2">
                        <span className="text-xs text-gray-500 capitalize block">
                          {subKey.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm whitespace-pre-wrap leading-relaxed">
                          {formatText(subValue)}
                        </span>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    } else if (typeof value === 'object' && value !== null) {
      return (
        <div className="space-y-2">
          {Object.entries(value).map(([objKey, objValue]) => (
            objValue && (
              <div key={objKey} className="mb-2">
                <span className="text-xs text-gray-500 capitalize block">
                  {objKey.replace(/_/g, ' ')}
                </span>
                <span className="text-sm whitespace-pre-wrap leading-relaxed">
                  {formatText(objValue)}
                </span>
              </div>
            )
          ))}
        </div>
      );
    } else if (typeof value === 'string') {
      if (isUrl) {
        return (
          <a 
            href={value.startsWith('http') ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline truncate inline-block max-w-full"
          >
            {value}
          </a>
        );
      } else if (isEmail) {
        return (
          <a 
            href={`mailto:${value}`} 
            className="text-blue-600 hover:underline"
          >
            {value}
          </a>
        );
      } else {
        return (
          <span className="text-sm whitespace-pre-wrap leading-relaxed">
            {formatText(value)}
          </span>
        );
      }
    } else {
      return (
        <span className="text-sm">
          {value === null || value === undefined ? 'N/A' : String(value)}
        </span>
      );
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!parsedData) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              No parsed data found. Please upload a resume first.
            </p>
            <div className="mt-4">
              <Link href="/upload" className="text-sm font-medium text-yellow-700 underline">
                Go to Upload
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Parse Results for: {fileName}
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          Extracted Information
        </p>
      </div>
      
      <div className="px-4 py-5 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column: PDF viewer */}
          <div className="bg-gray-100 rounded-lg h-[600px] flex flex-col">
            <div className="bg-gray-200 p-2 flex justify-between items-center">
              <span className="font-medium text-gray-700">Resume PDF</span>
              {numPages > 0 && (
                <div className="flex items-center">
                  <button 
                    onClick={goToPrevPage} 
                    disabled={pageNumber <= 1}
                    className={`p-1 rounded ${pageNumber <= 1 ? 'text-gray-300' : 'text-blue-600 hover:bg-blue-50'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <span className="mx-2 text-sm text-gray-600">Page {pageNumber} of {numPages}</span>
                  <button 
                    onClick={goToNextPage} 
                    disabled={pageNumber >= numPages}
                    className={`p-1 rounded ${pageNumber >= numPages ? 'text-gray-300' : 'text-blue-600 hover:bg-blue-50'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex-1 p-3 flex items-center justify-center overflow-auto">
              {pdfFile ? (
                <div className="w-full h-full flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <button 
                      onClick={() => setPageNumber(Math.max(1, pageNumber - 1))} 
                      disabled={pageNumber <= 1}
                      className={`p-1 rounded ${pageNumber <= 1 ? 'text-gray-300' : 'text-blue-600 hover:bg-blue-50'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <span className="mx-2 text-sm text-gray-600">PDF Viewer</span>
                    <button 
                      onClick={() => setPageNumber(Math.min(pageNumber + 1, numPages || 1))} 
                      disabled={!numPages || pageNumber >= numPages}
                      className={`p-1 rounded ${!numPages || pageNumber >= numPages ? 'text-gray-300' : 'text-blue-600 hover:bg-blue-50'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Display PDF directly with object tag for better compatibility */}
                  <object 
                    data={pdfFile}
                    type="application/pdf"
                    className="w-full flex-1 min-h-[500px] border border-gray-200 rounded"
                  >
                    <p className="text-center p-4">Your browser doesn't support embedded PDFs. <a href={pdfFile} target="_blank" rel="noreferrer">Click here to view it</a>.</p>
                  </object>
                </div>
              ) : (
                <div className="text-center p-4 text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 mx-auto mb-2 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p>Failed to load PDF file.</p>
                  {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                </div>
              )}
            </div>
          </div>
          
          {/* Right column: Raw JSON Response */}
          <div className="bg-gray-50 rounded-lg p-4 max-h-[600px] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium text-gray-700">JSON Response</h4>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(parsedData, null, 2));
                  alert('JSON copied to clipboard');
                }}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Copy JSON
              </button>
            </div>
            
            {/* Display formatted JSON with syntax highlighting */}
            <div className="bg-white rounded border border-gray-200 p-4 overflow-auto">
              <pre className="text-xs font-mono text-left whitespace-pre">
                {formatJsonWithHighlighting(parsedData)}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
        <div className="flex justify-between">
          <Link 
            href="/upload" 
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Back to Upload
          </Link>
          <button 
            onClick={async () => {
              try {
                setLoading(true);
                console.log('Saving to Supabase...');
                
                // Ensure we have all necessary data for saving to Supabase
                const timestamp = new Date().toISOString();
                
                // Get selectedFields from localStorage if it's not already available
                let fieldsToSave = {};
                try {
                  const localStorageData = JSON.parse(localStorage.getItem('lastParsedResume') || '{}');
                  fieldsToSave = localStorageData.selectedFields || {};
                } catch (e) {
                  console.warn('Could not retrieve selectedFields from localStorage', e);
                }
                
                // Create record in the resume_records table as per schema.sql
                const { data, error } = await supabase
                  .from('resume_records')
                  .insert([{
                    parsed_result: parsedData,
                    file_name: fileName,
                    file_type: fileName.split('.').pop() || 'pdf', // Ensure file_type is never null
                    selected_fields: fieldsToSave,
                    status: 'completed', // Add status to avoid null constraint
                    created_at: timestamp,
                    updated_at: timestamp
                  }]);
                
                if (error) {
                  console.error('Supabase error:', error);
                  throw error;
                }
                
                console.log('Saved to Supabase successfully:', data);
                alert('Resume data saved successfully to database!');
              } catch (err) {
                console.error('Error saving record to Supabase:', err);
                alert('Failed to save record: ' + (err.message || 'Unknown error'));
              } finally {
                setLoading(false);
              }
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Save Results
          </button>
        </div>
      </div>
    </div>
  );
}
