'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function CustomizePage() {
  const router = useRouter();
  const [customSections, setCustomSections] = useState([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [editingSectionIdx, setEditingSectionIdx] = useState(null);
  const [newSubfieldName, setNewSubfieldName] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Load custom sections from Supabase on component mount
  useEffect(() => {
    fetchCustomSections();
  }, []);

  // Fetch custom sections and their subfields from Supabase
  const fetchCustomSections = async () => {
    try {
      setErrorMessage('');
      
      // Fetch custom sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('custom_sections')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (sectionsError) throw sectionsError;
      
      if (sectionsData && sectionsData.length > 0) {
        // For each section, fetch its subfields
        const sectionsWithSubfields = await Promise.all(sectionsData.map(async (section) => {
          const { data: subfieldsData, error: subfieldsError } = await supabase
            .from('custom_subfields')
            .select('*')
            .eq('section_id', section.id)
            .order('created_at', { ascending: true });
          
          if (subfieldsError) throw subfieldsError;
          
          // Format subfields to match our app's format
          const formattedSubfields = subfieldsData.map(subfield => ({
            label: subfield.field_label,
            key: subfield.field_key,
            id: subfield.id
          }));
          
          // Return the section with its subfields
          return {
            id: section.id,
            section: section.section_name,
            key: section.section_key,
            subfields: formattedSubfields
          };
        }));
        
        setCustomSections(sectionsWithSubfields);
        
        // Also save to localStorage for backup and quick access
        localStorage.setItem('customSections', JSON.stringify(sectionsWithSubfields));
      } else {
        // Check if we have custom sections in localStorage for initial setup
        const storedSections = localStorage.getItem('customSections');
        if (storedSections) {
          const parsedSections = JSON.parse(storedSections);
          setCustomSections(parsedSections);
          
          // Optionally migrate localStorage data to Supabase
          parsedSections.forEach(section => {
            handleAddSectionToSupabase(section);
          });
        }
      }
    } catch (error) {
      console.error('Error loading custom sections:', error);
      setErrorMessage('Failed to load custom sections from database');
    }
  };
  
  // Save a section to Supabase (used for initial migration)
  const handleAddSectionToSupabase = async (section) => {
    try {
      // Skip if already has an ID (assume it's already in Supabase)
      if (section.id) return;
      
      // Add the section to Supabase
      const { data: sectionData, error: sectionError } = await supabase
        .from('custom_sections')
        .insert([{
          section_name: section.section,
          section_key: section.key
        }])
        .select()
        .single();
      
      if (sectionError) throw sectionError;
      
      // Add the subfields to Supabase
      if (section.subfields && section.subfields.length > 0) {
        const subfieldsToInsert = section.subfields.map(subfield => ({
          section_id: sectionData.id,
          field_label: subfield.label,
          field_key: subfield.key
        }));
        
        const { error: subfieldsError } = await supabase
          .from('custom_subfields')
          .insert(subfieldsToInsert);
        
        if (subfieldsError) throw subfieldsError;
      }
    } catch (error) {
      console.error('Error saving section to Supabase:', error);
    }
  };

  // Handle adding a new section
  const handleAddSection = async () => {
    if (!newSectionName.trim()) {
      setErrorMessage('Section name cannot be empty');
      return;
    }

    // Check if section name already exists
    if (customSections.some(section => 
      section.section.toLowerCase() === newSectionName.trim().toLowerCase()
    )) {
      setErrorMessage('A section with this name already exists');
      return;
    }
    
    try {
      // First, add the section to Supabase
      const { data, error } = await supabase
        .from('custom_sections')
        .insert([{
          section_name: newSectionName.trim(),
          section_key: newSectionName.trim().replace(/\s+/g, '_').toLowerCase()
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Create the new section object with the ID from Supabase
      const newSection = {
        id: data.id,
        section: data.section_name,
        key: data.section_key,
        subfields: []
      };

      setCustomSections(prev => [...prev, newSection]);
      setNewSectionName('');
      setEditingSectionIdx(customSections.length); // Start editing the new section
      setSuccessMessage('Section added successfully');
      setErrorMessage('');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error adding section:', error);
      setErrorMessage('Failed to add section to database');
    }
  };

  // Handle removing a section
  const handleRemoveSection = async (index) => {
    const sectionToRemove = customSections[index];
    console.log('Removing section:', sectionToRemove);
    
    try {
      // First, delete all related subfields
      if (sectionToRemove.id) {
        const { error: subfieldsError } = await supabase
          .from('custom_subfields')
          .delete()
          .eq('section_id', sectionToRemove.id);
        
        if (subfieldsError) {
          console.error('Error removing subfields:', subfieldsError);
          throw subfieldsError;
        }
        
        console.log('Subfields deleted successfully');
        
        // Then remove the section itself
        const { error: sectionError } = await supabase
          .from('custom_sections')
          .delete()
          .eq('id', sectionToRemove.id);
        
        if (sectionError) {
          console.error('Error removing section:', sectionError);
          throw sectionError;
        }
        
        console.log('Section deleted successfully');
      } else {
        console.error('Section has no ID:', sectionToRemove);
      }
      
      // Update the UI
      setCustomSections(prev => {
        const updated = prev.filter((_, idx) => idx !== index);
        // Also update localStorage
        localStorage.setItem('customSections', JSON.stringify(updated));
        return updated;
      });
      
      if (editingSectionIdx === index) {
        setEditingSectionIdx(null);
      } else if (editingSectionIdx > index) {
        setEditingSectionIdx(prev => prev - 1);
      }
      
      setSuccessMessage('Section removed successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error removing section:', error);
      setErrorMessage('Failed to remove section from database. Error: ' + error.message);
      
      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  // Handle adding a subfield to a section
  const handleAddSubfield = async () => {
    if (editingSectionIdx === null) return;
    
    if (!newSubfieldName.trim()) {
      setErrorMessage('Subfield name cannot be empty');
      return;
    }

    // Check if subfield name already exists in the section
    const currentSection = customSections[editingSectionIdx];
    if (currentSection.subfields.some(field => 
      field.label.toLowerCase() === newSubfieldName.trim().toLowerCase()
    )) {
      setErrorMessage('A subfield with this name already exists in this section');
      return;
    }
    
    try {
      // First, add the subfield to Supabase
      const { data, error } = await supabase
        .from('custom_subfields')
        .insert([{
          section_id: currentSection.id,
          field_label: newSubfieldName.trim(),
          field_key: newSubfieldName.trim().replace(/\s+/g, '_').toLowerCase()
        }])
        .select()
        .single();
      
      if (error) throw error;

      const newSubfield = {
        id: data.id,
        label: data.field_label,
        key: data.field_key
      };

      setCustomSections(prev => prev.map((section, idx) => 
        idx === editingSectionIdx 
          ? { ...section, subfields: [...section.subfields, newSubfield] }
          : section
      ));
      
      setNewSubfieldName('');
      setSuccessMessage('Subfield added successfully');
      setErrorMessage('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error adding subfield:', error);
      setErrorMessage('Failed to add subfield to database');
    }
  };

  // Handle removing a subfield
  const handleRemoveSubfield = async (sectionIdx, subfieldIdx) => {
    const sectionToUpdate = customSections[sectionIdx];
    const subfieldToRemove = sectionToUpdate.subfields[subfieldIdx];
    
    console.log('Removing subfield:', subfieldToRemove, 'from section:', sectionToUpdate);
    
    try {
      // Check if the subfield has an ID (exists in Supabase)
      if (subfieldToRemove.id) {
        // Remove from Supabase first
        const { error } = await supabase
          .from('custom_subfields')
          .delete()
          .eq('id', subfieldToRemove.id);
        
        if (error) {
          console.error('Supabase error deleting subfield:', error);
          throw error;
        }
        
        console.log('Subfield deleted successfully from Supabase');
      } else {
        console.warn('Subfield has no ID, only removing from local state');
      }
      
      // Then update the UI and localStorage
      setCustomSections(prev => {
        const updated = prev.map((section, idx) => 
          idx === sectionIdx
            ? { ...section, subfields: section.subfields.filter((_, i) => i !== subfieldIdx) }
            : section
        );
        
        // Update localStorage
        localStorage.setItem('customSections', JSON.stringify(updated));
        return updated;
      });
      
      setSuccessMessage('Subfield removed successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error removing subfield:', error);
      setErrorMessage('Failed to remove subfield: ' + error.message);
      
      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden">
      <div className="bg-blue-600 px-6 py-4">
        <h1 className="text-xl font-semibold text-white">Customize Resume Parser Fields</h1>
        <p className="text-blue-100 mt-1">
          Create custom sections and fields to extract from resumes
        </p>
      </div>
      
      <div className="p-6">
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        {errorMessage && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Add new section form */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-3">Add New Section</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Enter section name (e.g. Certifications)"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleAddSection}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Add Section
            </button>
          </div>
        </div>
        
        {/* Custom sections list */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-3">Your Custom Sections</h2>
          
          {customSections.length === 0 ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    You haven't created any custom sections yet. Add a section above to get started.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <ul className="space-y-4">
              {customSections.map((section, sectionIdx) => (
                <li key={section.key} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="text-md font-medium text-gray-900">{section.section}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingSectionIdx(sectionIdx === editingSectionIdx ? null : sectionIdx)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {sectionIdx === editingSectionIdx ? 'Done' : 'Edit Subfields'}
                      </button>
                      <button
                        onClick={() => handleRemoveSection(sectionIdx)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  
                  <div className="px-4 py-3">
                    {/* Edit subfields form */}
                    {sectionIdx === editingSectionIdx && (
                      <div className="bg-blue-50 p-3 rounded-md mb-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newSubfieldName}
                            onChange={(e) => setNewSubfieldName(e.target.value)}
                            placeholder="Enter subfield name (e.g. Certificate Name)"
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            onClick={handleAddSubfield}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Subfields list */}
                    {section.subfields.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">
                        No subfields added. This section cannot be used until it has at least one subfield.
                      </p>
                    ) : (
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {section.subfields.map((field, fieldIdx) => (
                          <li key={field.key} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded border border-gray-200">
                            <span className="text-sm text-gray-700">{field.label}</span>
                            <button
                              onClick={() => handleRemoveSubfield(sectionIdx, fieldIdx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => router.push('/upload')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Go to Upload
          </button>
        </div>
      </div>
    </div>
  );
}
