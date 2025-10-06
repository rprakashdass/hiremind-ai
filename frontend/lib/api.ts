import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('hiremind_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Uploads a resume file to the backend for parsing.
 *
 * @param file The resume file (PDF or Docx) to upload.
 * @returns The parsed resume data.
 */
export const uploadResume = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await apiClient.post('/api/resumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      // Throw the detailed error message from the backend
      throw new Error(error.response.data.detail || 'Failed to upload resume.');
    }
    throw new Error('An unexpected error occurred during file upload.');
  }
};

/**
 * Analyzes a resume against a job description.
 *
 * @param file The resume file.
 * @param jobDescription The job description text.
 * @param jobTitle The job title (optional, will be extracted from description if not provided).
 * @param company The company name (optional).
 * @returns The ATS analysis results.
 */
export const analyzeResume = async (file: File, jobDescription: string, jobTitle?: string, company?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('job_title', jobTitle || 'Position'); // Use a default if not provided
  formData.append('job_description', jobDescription);
  if (company) {
    formData.append('company', company);
  }

  try {
    const response = await apiClient.post('/api/ats/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        // Authorization header will be added by the interceptor
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.detail || 'Failed to analyze resume.');
    }
    throw new Error('An unexpected error occurred during resume analysis.');
  }
};
