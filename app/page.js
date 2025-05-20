"use client";
import { useRef, useState } from "react";

export default function Home() {
  const formRef = useRef();
  const fileInputRef = useRef();
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Section and field definitions
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

  const [sections, setSections] = useState(defaultSections);
  const [selectedFields, setSelectedFields] = useState({});
  const [customSections, setCustomSections] = useState([]); // [{section, subfields:[{label,key}]}]
  const [newCustomSection, setNewCustomSection] = useState("");
  const [newCustomSubfield, setNewCustomSubfield] = useState("");
  const [editingSectionIdx, setEditingSectionIdx] = useState(null);

  // Add a custom section
  const handleAddCustomSection = () => {
    if (!newCustomSection.trim()) return;
    setCustomSections(prev => [...prev, { section: newCustomSection.trim(), key: newCustomSection.trim().replace(/\s+/g, '_').toLowerCase(), subfields: [] }]);
    setNewCustomSection("");
    setEditingSectionIdx(customSections.length); // Immediately prompt for subfield
  };

  // Start editing subfields for a section
  const handleEditCustomSection = idx => {
    setEditingSectionIdx(idx);
    setNewCustomSubfield("");
  };

  // Add a subfield to a custom section
  const handleAddCustomSubfield = () => {
    if (editingSectionIdx === null || !newCustomSubfield.trim()) return;
    setCustomSections(prev => prev.map((sec, idx) => idx === editingSectionIdx ? {
      ...sec,
      subfields: [...sec.subfields, { label: newCustomSubfield.trim(), key: newCustomSubfield.trim().replace(/\s+/g, '_').toLowerCase() }]
    } : sec));
    setNewCustomSubfield("");
    setEditingSectionIdx(null); // Close subfield editor after adding
  };

  // Remove a custom section
  const handleRemoveCustomSection = idx => {
    setCustomSections(prev => prev.filter((_, i) => i !== idx));
    setEditingSectionIdx(null);
  };

  // Remove a subfield from a custom section
  const handleRemoveCustomSubfield = (sectionIdx, subIdx) => {
    setCustomSections(prev => prev.map((sec, idx) => idx === sectionIdx ? {
      ...sec,
      subfields: sec.subfields.filter((_, i) => i !== subIdx)
    } : sec));
  };

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
      const sectionObj = sections.find(s => s.key === sectionKey);
      const newSec = {};
      sectionObj.subfields.forEach(f => { newSec[f.key] = !allChecked; });
      return {
        ...prev,
        [sectionKey]: newSec
      };
    });
  };

  // Add a custom field
  const handleAddCustomField = () => {
    if (!customFieldInput.trim()) return;
    setCustomFields(prev => [...prev, customFieldInput.trim()]);
    setCustomFieldInput("");
  };

  // Remove a custom field
  const handleRemoveCustomField = (field) => {
    setCustomFields(prev => prev.filter(f => f !== field));
  };

  // Enhanced handleSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
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
    formData.append("fields", JSON.stringify(selectedToSend));
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/parse");
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 60);
          setProgress(percent);
        }
      };
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          setProgress(100);
          setLoading(false);
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            if (data.error) {
              setError(data.error + (data.details ? `: ${data.details}` : "") + (data.stack ? `\n${data.stack}` : ""));
              setResult(null);
            } else {
              setResult(data.parsed || data.raw);
            }
          } else {
            setError("Failed to parse resume.");
            setResult("");
          }
        }
      };
      xhr.onerror = () => {
        setError("Failed to parse resume.");
        setResult("");
        setLoading(false);
        setProgress(0);
      };
      xhr.send(formData);
    } catch (err) {
      setError("Failed to parse resume.");
      setResult("");
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div style={{ maxWidth: 700, margin: "48px auto", background: "#f9fafb", borderRadius: 14, boxShadow: "0 4px 24px #0002", padding: 40, fontFamily: "Segoe UI, Arial, sans-serif", border: "1px solid #e0e0e0" }}>
      <h1 style={{ textAlign: "center", fontWeight: 600, fontSize: 28, letterSpacing: 1, marginBottom: 30, color: "#222" }}>
        <span style={{ color: "#4285f4" }}>WORLD OF INTERNS</span> Resume Parser
      </h1>
      <form ref={formRef} onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <label htmlFor="file" style={{ fontWeight: 500, marginBottom: 4 }}>Attach Resume (PDF, DOC, DOCX, TXT, Images):</label>
        <input ref={fileInputRef} type="file" id="file" name="file" accept=".pdf,.doc,.docx,.txt,image/*" required style={{ marginBottom: 4, padding: 7, borderRadius: 4, border: "1px solid #bdbdbd", background: "#fff" }} />

        <div style={{ margin: "18px 0 0 0", padding: 18, background: "#eef6fd", borderRadius: 8, border: "1px solid #dbeafe" }}>
          <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 10, color: "#222" }}>Select fields to extract:</div>
          {/* Built-in sections */}
          {sections.map(section => {
            const allChecked = section.subfields.every(f => selectedFields[section.key]?.[f.key]);
            return (
              <div key={section.key} style={{ marginBottom: 10 }}>
                <label style={{ fontWeight: 500, fontSize: 15, color: "#2563eb" }}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={() => handleSectionToggle(section.key, allChecked)}
                    style={{ marginRight: 6 }}
                  />
                  {section.section}
                </label>
                <div style={{ marginLeft: 24, marginTop: 4, display: "flex", flexWrap: "wrap", gap: 15 }}>
                  {section.subfields.map(field => (
                    <label key={field.key} style={{ fontWeight: 400, fontSize: 14, color: "#374151" }}>
                      <input
                        type="checkbox"
                        checked={!!selectedFields[section.key]?.[field.key]}
                        onChange={() => handleFieldToggle(section.key, field.key)}
                        style={{ marginRight: 4 }}
                      />
                      {field.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Custom sections */}
          <div style={{ marginTop: 20, marginBottom: 10, fontWeight: 500, color: "#222" }}>Custom Sections:</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              value={newCustomSection}
              onChange={e => setNewCustomSection(e.target.value)}
              placeholder="Add custom section (e.g. Certifications)"
              style={{ flex: 1, padding: 6, borderRadius: 4, border: "1px solid #bdbdbd" }}
            />
            <button type="button" onClick={handleAddCustomSection} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, padding: "6px 14px", fontWeight: 600, cursor: "pointer" }}>
              Add Section
            </button>
          </div>
          {customSections.length > 0 && (
            <div style={{ marginLeft: 10 }}>
              {customSections.map((sec, idx) => (
                <div key={sec.key} style={{ marginBottom: 10, border: "1px solid #cbd5e1", borderRadius: 8, background: "#f5faff", padding: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <label style={{ fontWeight: 500, fontSize: 15, color: "#1d4ed8" }}>
                      {sec.section}
                    </label>
                    <button type="button" onClick={() => handleRemoveCustomSection(idx)} style={{ background: "none", border: "none", color: "#c00", fontWeight: 700, cursor: "pointer", fontSize: 18 }}>&times;</button>
                    <button type="button" onClick={() => handleEditCustomSection(idx)} style={{ background: "#e0e7ef", border: "none", color: "#222", fontWeight: 600, cursor: "pointer", fontSize: 13, borderRadius: 4, padding: "2px 8px" }}>+ Subfield</button>
                  </div>
                  {/* Add subfield UI */}
                  {editingSectionIdx === idx && (
                    <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                      <input
                        type="text"
                        value={newCustomSubfield}
                        onChange={e => setNewCustomSubfield(e.target.value)}
                        placeholder="Add subfield (e.g. Certificate Name)"
                        style={{ flex: 1, padding: 6, borderRadius: 4, border: "1px solid #bdbdbd" }}
                      />
                      <button type="button" onClick={handleAddCustomSubfield} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, padding: "6px 14px", fontWeight: 600, cursor: "pointer" }}>
                        Add
                      </button>
                    </div>
                  )}
                  {/* Subfields checkboxes */}
                  <div style={{ marginLeft: 20, marginTop: 4, display: "flex", flexWrap: "wrap", gap: 15 }}>
                    {sec.subfields.length === 0 && (
                      <span style={{ color: '#b91c1c', fontSize: 13 }}>Add at least one subfield to use this section.</span>
                    )}
                    {sec.subfields.map((field, subIdx) => (
                      <label key={field.key} style={{ fontWeight: 400, fontSize: 14, color: "#374151", display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={!!selectedFields[sec.key]?.[field.key]}
                          onChange={() => handleFieldToggle(sec.key, field.key)}
                          style={{ marginRight: 4 }}
                        />
                        {field.label}
                        <button type="button" onClick={() => handleRemoveCustomSubfield(idx, subIdx)} style={{ marginLeft: 4, background: "none", border: "none", color: "#c00", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>&times;</button>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} style={{ background: loading ? "#b3d2fb" : "#4285f4", color: "#fff", border: "none", padding: "12px 0", borderRadius: 6, cursor: loading ? "not-allowed" : "pointer", fontSize: 18, fontWeight: 600, marginTop: 18, boxShadow: loading ? "none" : "0 2px 8px #4285f422" }}>
          {loading ? "Parsing..." : "Parse Resume"}
        </button>
        {loading && (
          <div style={{ marginTop: 10 }}>
            <div style={{ height: 8, background: "#e3eafc", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ width: `${progress}%`, height: 8, background: "linear-gradient(90deg, #4285f4 60%, #34a853 100%)", transition: "width 0.2s" }} />
            </div>
            <div style={{ fontSize: 13, color: "#4285f4", marginTop: 2, textAlign: "right" }}>{progress < 100 ? `Processing... ${progress}%` : "Finishing up..."}</div>
          </div>
        )}
      </form>

      {error && <div style={{ color: "#c00", marginTop: 18, fontWeight: 500, textAlign: "center" }}>{error}</div>}

      {/* Parsed Result Display */}
      {result && (
        <div style={{ background: "#f1f3f4", borderRadius: 8, padding: 28, marginTop: 32, fontSize: 15, color: "#222", boxShadow: "0 1px 4px #0001", border: "1px solid #e0e0e0", overflowX: 'auto', maxHeight: 600 }}>
          <div style={{ fontSize: 19, fontWeight: 600, color: "#2563eb", marginBottom: 18 }}>
            Parsed Result
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Render Basic Info if present */}
            {result.basic_info && (
              <section>
                <div style={{ fontWeight: 600, color: "#4285f4", fontSize: 16, marginBottom: 6 }}>Basic Info</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'none' }}>
                  <tbody>
                    {Object.entries(result.basic_info).map(([k, v]) => (
                      v ? (
                        <tr key={k}>
                          <td style={{ fontWeight: 500, padding: '4px 10px 4px 0', color: '#374151', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</td>
                          <td style={{ padding: '4px 0' }}>{v}</td>
                        </tr>
                      ) : null
                    ))}
                  </tbody>
                </table>
              </section>
            )}
            {/* Render Work Experience if present */}
            {result.work_experience && Array.isArray(result.work_experience) && result.work_experience.length > 0 && (
              <section>
                <div style={{ fontWeight: 600, color: "#4285f4", fontSize: 16, marginBottom: 6 }}>Work Experience</div>
                {result.work_experience.map((exp, idx) => (
                  <div key={idx} style={{ marginBottom: 10, padding: 10, background: '#e8f0fe', borderRadius: 8 }}>
                    {Object.entries(exp).map(([k, v]) => (
                      v ? (
                        <div key={k} style={{ marginBottom: 2 }}>
                          <span style={{ fontWeight: 500, color: '#374151', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</span> {v}
                        </div>
                      ) : null
                    ))}
                  </div>
                ))}
              </section>
            )}
            {/* Render Project Experience if present */}
            {result.project_experience && Array.isArray(result.project_experience) && result.project_experience.length > 0 && (
              <section>
                <div style={{ fontWeight: 600, color: "#4285f4", fontSize: 16, marginBottom: 6 }}>Project Experience</div>
                {result.project_experience.map((proj, idx) => (
                  <div key={idx} style={{ marginBottom: 10, padding: 10, background: '#fbeee6', borderRadius: 8 }}>
                    {Object.entries(proj).map(([k, v]) => (
                      v ? (
                        <div key={k} style={{ marginBottom: 2 }}>
                          <span style={{ fontWeight: 500, color: '#374151', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</span> {v}
                        </div>
                      ) : null
                    ))}
                  </div>
                ))}
              </section>
            )}
            {/* Render Custom Sections if present */}
            {customSections.map(sec => (
              result[sec.key] && (
                <section key={sec.key}>
                  <div style={{ fontWeight: 600, color: "#4285f4", fontSize: 16, marginBottom: 6 }}>{sec.section}</div>
                  {Array.isArray(result[sec.key]) ? (
                    result[sec.key].map((item, idx) => (
                      <div key={idx} style={{ marginBottom: 10, padding: 10, background: '#fbeee6', borderRadius: 8 }}>
                        {sec.subfields.map(f => (
                          item[f.key] ? (
                            <div key={f.key} style={{ marginBottom: 2 }}>
                              <span style={{ fontWeight: 500, color: '#374151', textTransform: 'capitalize' }}>{f.label}:</span> {item[f.key]}
                            </div>
                          ) : null
                        ))}
                      </div>
                    ))
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', background: 'none' }}>
                      <tbody>
                        {sec.subfields.map(f => (
                          result[sec.key][f.key] ? (
                            <tr key={f.key}>
                              <td style={{ fontWeight: 500, padding: '4px 10px 4px 0', color: '#374151', textTransform: 'capitalize' }}>{f.label}</td>
                              <td style={{ padding: '4px 0' }}>{result[sec.key][f.key]}</td>
                            </tr>
                          ) : null
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              )
            ))}
            {/* Render any other fields (fallback) */}
            {Object.entries(result).filter(([k]) => !["basic_info", "work_experience", "project_experience", ...customSections.map(s => s.key)].includes(k)).map(([k, v]) => (
              v ? (
                <section key={k}>
                  <div style={{ fontWeight: 600, color: "#4285f4", fontSize: 16, marginBottom: 6 }}>{k.replace(/_/g, ' ')}</div>
                  {typeof v === 'object' ? (
                    <pre style={{ background: '#fff', borderRadius: 6, padding: 10, fontSize: 14 }}>{JSON.stringify(v, null, 2)}</pre>
                  ) : (
                    <div style={{ padding: 6 }}>{v}</div>
                  )}
                </section>
              ) : null
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

