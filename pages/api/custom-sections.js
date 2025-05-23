import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return await getSections(req, res);
      case 'POST':
        return await addSection(req, res);
      case 'PUT':
        return await updateSection(req, res);
      case 'DELETE':
        return await deleteSection(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Get all sections with their subfields
async function getSections(req, res) {
  try {
    // Fetch all sections
    const { data: sections, error: sectionsError } = await supabase
      .from('custom_sections')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (sectionsError) throw sectionsError;
    
    // For each section, fetch its subfields
    const sectionsWithSubfields = await Promise.all(sections.map(async (section) => {
      const { data: subfields, error: subfieldsError } = await supabase
        .from('custom_subfields')
        .select('*')
        .eq('section_id', section.id)
        .order('created_at', { ascending: true });
      
      if (subfieldsError) throw subfieldsError;
      
      return {
        id: section.id,
        section: section.section_name,
        key: section.section_key,
        subfields: subfields.map(sf => ({
          id: sf.id,
          label: sf.field_label,
          key: sf.field_key
        }))
      };
    }));
    
    return res.status(200).json(sectionsWithSubfields);
  } catch (error) {
    console.error('Error fetching sections:', error);
    return res.status(500).json({ error: 'Failed to fetch sections' });
  }
}

// Add a new section
async function addSection(req, res) {
  const { section, key, subfields } = req.body;
  
  if (!section || !key) {
    return res.status(400).json({ error: 'Section name and key are required' });
  }
  
  try {
    // Insert the section
    const { data: newSection, error: sectionError } = await supabase
      .from('custom_sections')
      .insert([{ section_name: section, section_key: key }])
      .select()
      .single();
    
    if (sectionError) throw sectionError;
    
    // Insert subfields if provided
    if (subfields && subfields.length > 0) {
      const subfieldsToInsert = subfields.map(sf => ({
        section_id: newSection.id,
        field_label: sf.label,
        field_key: sf.key
      }));
      
      const { error: subfieldsError } = await supabase
        .from('custom_subfields')
        .insert(subfieldsToInsert);
      
      if (subfieldsError) throw subfieldsError;
    }
    
    return res.status(201).json({
      id: newSection.id,
      section: newSection.section_name,
      key: newSection.section_key,
      subfields: subfields || []
    });
  } catch (error) {
    console.error('Error adding section:', error);
    return res.status(500).json({ error: 'Failed to add section' });
  }
}

// Update a section
async function updateSection(req, res) {
  const { id, section, key, subfields } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Section ID is required' });
  }
  
  try {
    // Update the section
    if (section || key) {
      const updateData = {};
      if (section) updateData.section_name = section;
      if (key) updateData.section_key = key;
      
      const { error: sectionError } = await supabase
        .from('custom_sections')
        .update(updateData)
        .eq('id', id);
      
      if (sectionError) throw sectionError;
    }
    
    return res.status(200).json({ message: 'Section updated successfully' });
  } catch (error) {
    console.error('Error updating section:', error);
    return res.status(500).json({ error: 'Failed to update section' });
  }
}

// Delete a section and its subfields
async function deleteSection(req, res) {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Section ID is required' });
  }
  
  try {
    // First delete all subfields for this section
    const { error: subfieldsError } = await supabase
      .from('custom_subfields')
      .delete()
      .eq('section_id', id);
    
    if (subfieldsError) throw subfieldsError;
    
    // Then delete the section
    const { error: sectionError } = await supabase
      .from('custom_sections')
      .delete()
      .eq('id', id);
    
    if (sectionError) throw sectionError;
    
    return res.status(200).json({ message: 'Section and its subfields deleted successfully' });
  } catch (error) {
    console.error('Error deleting section:', error);
    return res.status(500).json({ error: 'Failed to delete section' });
  }
}
