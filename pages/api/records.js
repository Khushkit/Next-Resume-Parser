import { supabase } from '../../lib/supabase';

/**
 * @swagger
 * /api/records:
 *   get:
 *     tags: [Resume]
 *     summary: Get parsing history records
 *     description: Retrieve a list of previously parsed resumes
 *     responses:
 *       200:
 *         description: Records retrieved successfully
 *       500:
 *         description: Server error
 */
export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Fetch records from Supabase
      const { data, error } = await supabase
        .from('resume_records_view') // Using the view we created
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to match the expected format for the frontend
      const formattedRecords = data.map(record => ({
        id: record.id,
        fileName: record.file_name,
        status: record.status,
        created_at: record.created_at,
        fields_extracted: Object.keys(record.selected_fields || {}),
        error_message: record.error_message,
        // Include a URL to access the record detail if needed
        detailUrl: `/result/${record.id}`
      }));
      
      res.status(200).json(formattedRecords);
    } catch (error) {
      console.error('Error fetching records:', error);
      res.status(500).json({ error: 'Failed to fetch records', details: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { fileName, fileType, status, selectedFields, parsedResult, errorMessage } = req.body;
      
      if (!fileName || !status) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Save record to Supabase
      const { data, error } = await supabase
        .from('resume_records')
        .insert([{
          file_name: fileName,
          file_type: fileType || 'unknown',
          status,
          selected_fields: selectedFields || {},
          parsed_result: parsedResult || null,
          error_message: errorMessage || null
        }])
        .select();
      
      if (error) throw error;
      
      res.status(200).json({ 
        message: 'Record saved successfully', 
        id: data[0].id,
        record: data[0]
      });
    } catch (error) {
      console.error('Error saving record:', error);
      res.status(500).json({ error: 'Failed to save record', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
