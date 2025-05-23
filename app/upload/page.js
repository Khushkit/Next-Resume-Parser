'use client';

import { useRef, useState, useEffect } from "react";
import { useRouter } from 'next/navigation';

export default function UploadPage() {
  const router = useRouter();
  const formRef = useRef();
  const fileInputRef = useRef();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sections, setSections] = useState([]);
  const [customSections, setCustomSections] = useState([]);
  const [selectedFields, setSelectedFields] = useState({});

  // Fetch sections and custom sections on component mount
  useEffect(() => {
    // Default sections
    const defaultSections = [
      {
        section: "Basic Info",
        key: "basic_info",
        subfields: [
          { label: "First Name", key: "first_name" },
          { label: "Last Name", key: "last_name" },
          { label: "Full Name", key: "full_name" },
          { label: "Email", key: "email" },
          { label: "Phone Number", key: "phone_number" },
          { label: "Location", key: "location" },
          { label: "Portfolio Website", key: "portfolio_website_url" },
          { label: "LinkedIn", key: "linkedin_url" },
          { label: "GitHub", key: "github_main_page_url" },
          { label: "University", key: "university" },
          { label: "Education Level", key: "education_level" },
          { label: "Graduation Year", key: "graduation_year" },
          { label: "Graduation Month", key: "graduation_month" },
          { label: "Majors", key: "majors" },
          { label: "GPA", key: "GPA" }
        ]
      },
      {
        section: "Work Experience",
        key: "work_experience",
        subfields: [
          { label: "Job Title", key: "job_title" },
          { label: "Company", key: "company" },
          { label: "Location", key: "location" },
          { label: "Duration", key: "duration" },
          { label: "Job Summary", key: "job_summary" }
        ]
      },
      {
        section: "Project Experience",
        key: "project_experience",
        subfields: [
          { label: "Project Name", key: "project_name" },
          { label: "Project Description", key: "project_description" }
        ]
      }
    ];
    
    setSections(defaultSections);
    
    // Fetch custom sections from localStorage
    try {
      const storedCustomSections = localStorage.getItem('customSections');
      if (storedCustomSections) {
        setCustomSections(JSON.parse(storedCustomSections));
      }
    } catch (e) {
      console.error("Error loading custom sections:", e);
    }
  }, []);

  // Handle checkbox changes
  const handleFieldToggle = (sectionKey, fieldKey) => {
    setSelectedFields(prev => {
      const sec = prev[sectionKey] || {};
      return {
        ...prev,
        [sectionKey]: {
          ...sec,
          [fieldKey]: !sec[fieldKey]
        }
      };
    });
  };

  // Handle section toggle (all fields in a section)
  const handleSectionToggle = (sectionKey, allChecked) => {
    setSelectedFields(prev => {
      const sec = prev[sectionKey] || {};
      const sectionObj = [...sections, ...customSections].find(s => s.key === sectionKey);
      const newSec = {};
      if (sectionObj && sectionObj.subfields) {
        sectionObj.subfields.forEach(f => { newSec[f.key] = !allChecked; });
      }
      return {
        ...prev,
        [sectionKey]: newSec
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setProgress(10);
    const formData = new FormData(formRef.current);
    
    // Gather all selected fields (built-in and custom)
    const allSections = [...sections, ...customSections];
    const selectedToSend = {};
    
    allSections.forEach(sec => {
      if (selectedFields[sec.key]) {
        const subfields = Object.entries(selectedFields[sec.key])
          .filter(([_, v]) => v)
          .map(([k]) => k);
        if (subfields.length > 0) {
          selectedToSend[sec.key] = subfields;
        }
      }
    });
    
    formData.append('fields', JSON.stringify(selectedToSend));
    
    try {
      // Store the PDF file for viewing in the result page
      if (fileInputRef.current.files[0]) {
        const file = fileInputRef.current.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          // Store the file data URL in localStorage for the PDF viewer
          localStorage.setItem('lastParsedPDF', e.target.result);
        };
        reader.readAsDataURL(file);
      }
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/parse');
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 40);
          setProgress(10 + percentComplete); // Progress from 10% to 50%
        }
      };
      
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          console.log('XHR completed with status:', xhr.status);
          console.log('Response text length:', xhr.responseText ? xhr.responseText.length : 0);
          
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('Received parsed response:', response);
              
              // Check if response has the expected structure
              if (!response.parsed) {
                console.warn('Response missing parsed data:', response);
                // Try to handle the case where the API response structure is different
                const resultData = response.data || response.result || response.parsed || response;
                
                // Convert the file to base64 for storage
                const reader = new FileReader();
                reader.onload = function(e) {
                  try {
                    // Store the PDF as base64 in localStorage
                    localStorage.setItem('lastParsedPDF', e.target.result);
                    
                    // Make sure we have valid result data
                    console.log('Result data before storage:', resultData);
                    
                    // Store results and file info in localStorage for the results page
                    const dataToStore = {
                      // Make sure we use the parsed field from the response which contains the actual data
                      result: resultData.parsed || resultData,
                      fileName: fileInputRef.current.files[0].name,
                      selectedFields: selectedToSend
                    };
                    
                    // Log the data we're storing for debugging
                    console.log('Data to store in localStorage:', JSON.stringify(dataToStore).substring(0, 200) + '...');
                    
                    // Validate that we have a result object before storing
                    if (!dataToStore.result) {
                      console.error('No result data to store');
                      setProgress(0);
                      setError('Failed to parse resume: No data returned from API');
                      return;
                    }
                    
                    localStorage.setItem('lastParsedResume', JSON.stringify(dataToStore));
                    
                    setProgress(100);
                    console.log('Redirecting to result page');
                    
                    // Redirect to result page
                    router.push('/result');
                  } catch (err) {
                    console.error('Error storing parse result:', err);
                    setProgress(0);
                    setError('Failed to process parsed resume: ' + err.message);
                  }
                };
                reader.readAsDataURL(fileInputRef.current.files[0]);
              } else {
                // Normal case - expected response structure
                // Convert the file to base64 for storage
                const reader = new FileReader();
                reader.onload = function(e) {
                  try {
                    // Store the PDF as base64 in localStorage
                    localStorage.setItem('lastParsedPDF', e.target.result);
                    
                    // Log complete API response for debugging
                    console.log('Complete API response:', JSON.stringify(response).substring(0, 300) + '...');
                    
                    // Make sure we get the parsed field, which contains the structured data
                    const parsedResult = response.parsed || response.parsedResume || response.result;
                    
                    if (!parsedResult) {
                      console.error('No valid result data found in API response:', response);
                      setError('API returned invalid data format. Please try again.');
                      setProgress(0);
                      return;
                    }
                    
                    console.log('Saving parsed result to localStorage:', typeof parsedResult);
                    console.log('Parsed result content:', JSON.stringify(parsedResult).substring(0, 300) + '...');
                    
                    // Store results and file info in localStorage for the results page
                    const dataToStore = {
                      result: parsedResult,
                      fileName: fileInputRef.current.files[0].name,
                      selectedFields: selectedToSend,
                      timestamp: new Date().toISOString()
                    };
                    
                    localStorage.setItem('lastParsedResume', JSON.stringify(dataToStore));
                    setProgress(100);
                    router.push('/result');
                  } catch (err) {
                    console.error('Error storing parse results:', err);
                    setError('Failed to process parsed resume: ' + err.message);
                    setProgress(0);
                  }
                };
                reader.readAsDataURL(fileInputRef.current.files[0]);
              }
              // Note: We no longer redirect here since the FileReader.onload callback will handle redirection
              // This prevents double redirects
            } catch (err) {
              console.error('Error parsing response:', err);
              console.error('Raw response:', xhr.responseText.substring(0, 200) + '...');
              setError('Invalid response from server: ' + err.message);
              setLoading(false);
            }
          } else {
            try {
              const errorText = xhr.responseText || 'No response received';
              console.error('Error response:', errorText);
              
              let errorMessage = 'Failed to parse resume';
              try {
                const errorResponse = JSON.parse(errorText);
                errorMessage = errorResponse.error || errorResponse.message || errorMessage;
              } catch (parseError) {
                // If we can't parse JSON, use the status text
                errorMessage = `Error ${xhr.status}: ${xhr.statusText || errorMessage}`;
              }
              
              setError(errorMessage);
            } catch (e) {
              console.error('Error handling error response:', e);
              setError('Failed to parse resume: Unknown error');
            }
            setLoading(false);
          }  
        }
      };
      
      xhr.onerror = function() {
        setError('Network error occurred');
        setLoading(false);
      };
      
      xhr.send(formData);
      setProgress(20); // Progress to 20% after sending
    } catch (err) {
      console.error('Error:', err);
      setError('An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-8">
      <h1 className="text-2xl font-bold text-center mb-6 text-blue-600">
        Resume Parser
      </h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
            Attach Resume (PDF, DOC, DOCX, TXT, Images):
          </label>
          <input 
            ref={fileInputRef} 
            type="file" 
            id="file" 
            name="file" 
            accept=".pdf,.doc,.docx,.txt,image/*" 
            required 
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
          <h2 className="font-semibold text-lg text-gray-800 mb-3">Select fields to extract:</h2>
          
          {/* Built-in sections */}
          <div className="space-y-4">
            {sections.map(section => {
              const allChecked = section.subfields.every(f => selectedFields[section.key]?.[f.key]);
              return (
                <div key={section.key} className="border-b border-gray-200 pb-3">
                  <label className="flex items-center text-blue-700 font-medium">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={() => handleSectionToggle(section.key, allChecked)}
                      className="mr-2"
                    />
                    {section.section}
                  </label>
                  <div className="ml-6 mt-2 flex flex-wrap gap-3">
                    {section.subfields.map(field => (
                      <label key={field.key} className="flex items-center text-gray-600">
                        <input
                          type="checkbox"
                          checked={!!selectedFields[section.key]?.[field.key]}
                          onChange={() => handleFieldToggle(section.key, field.key)}
                          className="mr-1"
                        />
                        {field.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Custom sections */}
          {customSections.length > 0 && (
            <div className="mt-5">
              <h3 className="font-medium text-gray-700 mb-2">Custom Sections:</h3>
              <div className="space-y-3">
                {customSections.map((sec, idx) => (
                  <div key={sec.key} className="bg-white rounded-md border border-gray-200 p-3">
                    <label className="flex items-center text-blue-700 font-medium">
                      <input
                        type="checkbox"
                        checked={sec.subfields.every(f => selectedFields[sec.key]?.[f.key])}
                        onChange={() => handleSectionToggle(sec.key, sec.subfields.every(f => selectedFields[sec.key]?.[f.key]))}
                        className="mr-2"
                      />
                      {sec.section}
                    </label>
                    {sec.subfields.length === 0 ? (
                      <p className="ml-6 mt-1 text-sm text-red-600">No subfields defined. Visit Customize page to add subfields.</p>
                    ) : (
                      <div className="ml-6 mt-2 flex flex-wrap gap-3">
                        {sec.subfields.map(field => (
                          <label key={field.key} className="flex items-center text-gray-600">
                            <input
                              type="checkbox"
                              checked={!!selectedFields[sec.key]?.[field.key]}
                              onChange={() => handleFieldToggle(sec.key, field.key)}
                              className="mr-1"
                            />
                            {field.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {loading && (
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
            <p className="text-sm text-gray-500 mt-1 text-center">{progress}% - Processing resume...</p>
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={loading} 
          className={`w-full py-3 rounded-md font-semibold text-white ${loading ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {loading ? 'Parsing...' : 'Parse Resume'}
        </button>
      </form>
    </div>
  );
}
