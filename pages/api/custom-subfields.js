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
        return await getSubfields(req, res);
      case 'POST':
        return await addSubfield(req, res);
      case 'DELETE':
        return await deleteSubfield(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Get all subfields for a section
async function getSubfields(req, res) {
  const { sectionId } = req.query;
  
  if (!sectionId) {
    return res.status(400).json({ error: 'Section ID is required' });
  }
  
  try {
    const { data, error } = await supabase
      .from('custom_subfields')
      .select('*')
      .eq('section_id', sectionId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    return res.status(200).json(data.map(sf => ({
      id: sf.id,
      label: sf.field_label,
      key: sf.field_key
    })));
  } catch (error) {
    console.error('Error fetching subfields:', error);
    return res.status(500).json({ error: 'Failed to fetch subfields' });
  }
}

// Add a new subfield
async function addSubfield(req, res) {
  const { sectionId, label, key } = req.body;
  
  if (!sectionId || !label || !key) {
    return res.status(400).json({ error: 'Section ID, label, and key are required' });
  }
  
  try {
    const { data, error } = await supabase
      .from('custom_subfields')
      .insert([{
        section_id: sectionId,
        field_label: label,
        field_key: key
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    return res.status(201).json({
      id: data.id,
      label: data.field_label,
      key: data.field_key
    });
  } catch (error) {
    console.error('Error adding subfield:', error);
    return res.status(500).json({ error: 'Failed to add subfield' });
  }
}

// Delete a subfield
async function deleteSubfield(req, res) {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Subfield ID is required' });
  }
  
  try {
    const { error } = await supabase
      .from('custom_subfields')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return res.status(200).json({ message: 'Subfield deleted successfully' });
  } catch (error) {
    console.error('Error deleting subfield:', error);
    return res.status(500).json({ error: 'Failed to delete section' });
  }
}
