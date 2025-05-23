import { createSwaggerSpec } from 'next-swagger-doc';

export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Resume Parser API Documentation',
      version: '1.0.0',
      description: 'API documentation for the Resume Parser application',
      contact: {
        name: 'World Of Interns',
        url: 'https://worldofinterns.com'
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://resume-parser.yourdomain.com'
          : 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    tags: [
      {
        name: 'Resume',
        description: 'Resume parsing endpoints',
      },
    ],
    components: {
      schemas: {
        Field: {
          type: 'object',
          properties: {
            selected: {
              type: 'object',
              description: 'Selected fields to extract from resume',
              additionalProperties: {
                type: 'array',
                items: {
                  type: 'string'
                }
              },
              example: {
                "basic_info": ["first_name", "last_name", "email"],
                "work_experience": ["job_title", "company", "duration"]
              }
            }
          }
        },
        ParseResult: {
          type: 'object',
          properties: {
            raw: {
              type: 'string',
              description: 'Raw text response from Gemini API'
            },
            parsed: {
              type: 'object',
              description: 'Structured JSON data extracted from the resume',
              properties: {
                basic_info: {
                  type: 'object',
                  properties: {
                    first_name: { type: 'string' },
                    last_name: { type: 'string' },
                    full_name: { type: 'string' },
                    email: { type: 'string' },
                    phone_number: { type: 'string' },
                    location: { type: 'string' }
                  }
                },
                work_experience: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      job_title: { type: 'string' },
                      company: { type: 'string' },
                      location: { type: 'string' },
                      duration: { type: 'string' },
                      job_summary: { type: 'string' }
                    }
                  }
                },
                project_experience: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      project_name: { type: 'string' },
                      project_description: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message'
            },
            details: {
              type: 'string',
              description: 'Error details'
            },
            stack: {
              type: 'string',
              description: 'Error stack trace (only in development)'
            }
          }
        }
      }
    },
    paths: {
      '/api/parse': {
        post: {
          tags: ['Resume'],
          summary: 'Parse a resume file',
          description: 'Upload a resume file (PDF, DOC, DOCX, TXT, or image) and extract structured information',
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['file'],
                  properties: {
                    file: {
                      type: 'string',
                      format: 'binary',
                      description: 'Resume file to parse'
                    },
                    fields: {
                      type: 'string',
                      format: 'json',
                      description: 'JSON string representing fields to extract from the resume',
                      example: JSON.stringify({
                        "basic_info": ["first_name", "last_name", "email"],
                        "work_experience": ["job_title", "company", "duration"]
                      })
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Resume parsed successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ParseResult'
                  }
                }
              }
            },
            '400': {
              description: 'Bad request - invalid file or parameters',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/records': {
        get: {
          tags: ['Resume'],
          summary: 'Get parsing history records',
          description: 'Retrieve a list of previously parsed resumes',
          responses: {
            '200': {
              description: 'Records retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        fileName: { type: 'string' },
                        status: { type: 'string', enum: ['completed', 'failed'] },
                        created_at: { type: 'string', format: 'date-time' },
                        fields_extracted: {
                          type: 'array',
                          items: { type: 'string' }
                        },
                        error_message: { type: 'string' }
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Server error',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./pages/api/*.js'],
};

export default function handler(req, res) {
  const spec = createSwaggerSpec(swaggerOptions);
  res.status(200).json(spec);
}
