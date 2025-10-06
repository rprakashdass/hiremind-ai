import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// Types for API responses
export interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface Resume {
  id: number;
  user_id: number;
  filename: string;
  original_filename: string;
  file_size?: number;
  mime_type?: string;
  created_at: string;
  updated_at?: string;
}

export interface AnalysisResult {
  id: number;
  user_id: number;
  resume_id: number;
  job_description_id: number;
  ats_score?: number;
  keyword_matches: string[];
  missing_keywords: string[];
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
  created_at: string;
}

export interface InterviewSession {
  id: number;
  user_id: number;
  resume_id?: number;
  session_type: string;
  status: string;
  total_questions: number;
  questions_answered: number;
  overall_score?: number;
  feedback?: Record<string, any>;
  started_at: string;
  completed_at?: string;
  questions: InterviewQuestion[];
}

export interface InterviewQuestion {
  id: number;
  session_id: number;
  question_text: string;
  question_type?: string;
  user_answer?: string;
  ai_feedback?: string;
  score?: number;
  asked_at: string;
  answered_at?: string;
}

export interface ApiError {
  detail: string;
  error_code?: string;
}

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Token management
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('hiremind_token');
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hiremind_token', token);
    }
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hiremind_token');
    }
  }

  // Authentication endpoints
  async login(credentials: LoginRequest): Promise<TokenResponse> {
    const response = await this.client.post<TokenResponse>('/api/auth/login', credentials);
    this.setToken(response.data.access_token);
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<User> {
    const response = await this.client.post<User>('/api/auth/register', userData);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/api/auth/me');
    return response.data;
  }

  async updateCurrentUser(userData: Partial<User>): Promise<User> {
    const response = await this.client.put<User>('/api/auth/me', userData);
    return response.data;
  }

  async changePassword(passwordData: { current_password: string; new_password: string }): Promise<{ message: string }> {
    const response = await this.client.post('/api/auth/change-password', passwordData);
    return response.data;
  }

  logout(): void {
    this.clearToken();
  }

  // ATS Analysis endpoints
  async analyzeResume(formData: FormData): Promise<AnalysisResult> {
    const token = this.getToken();
    const response = await this.client.post<AnalysisResult>('/api/ats/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    return response.data;
  }

  async getAnalyses(limit = 10, offset = 0): Promise<AnalysisResult[]> {
    const response = await this.client.get<AnalysisResult[]>(`/api/ats/analyses?limit=${limit}&offset=${offset}`);
    return response.data;
  }

  async getAnalysisById(id: number): Promise<AnalysisResult> {
    const response = await this.client.get<AnalysisResult>(`/api/ats/analyses/${id}`);
    return response.data;
  }

  async deleteAnalysis(id: number): Promise<{ message: string }> {
    const response = await this.client.delete(`/api/ats/analyses/${id}`);
    return response.data;
  }

  // Resume endpoints
  async getResumes(): Promise<Resume[]> {
    const response = await this.client.get<Resume[]>('/api/ats/resumes');
    return response.data;
  }

  // Interview endpoints
  async createInterviewSession(sessionData: { session_type: string; resume_id?: number }): Promise<InterviewSession> {
    const response = await this.client.post<InterviewSession>('/api/interview/sessions', sessionData);
    return response.data;
  }

  async getInterviewSessions(limit = 10, offset = 0): Promise<InterviewSession[]> {
    const response = await this.client.get<InterviewSession[]>(`/api/interview/sessions?limit=${limit}&offset=${offset}`);
    return response.data;
  }

  async getInterviewSession(id: number): Promise<InterviewSession> {
    const response = await this.client.get<InterviewSession>(`/api/interview/sessions/${id}`);
    return response.data;
  }

  async submitAnswer(sessionId: number, answerData: { question_id: number; user_answer: string }): Promise<InterviewQuestion> {
    const response = await this.client.post<InterviewQuestion>(`/api/interview/sessions/${sessionId}/answer`, answerData);
    return response.data;
  }

  async completeInterviewSession(id: number): Promise<{ message: string }> {
    const response = await this.client.post(`/api/interview/sessions/${id}/complete`);
    return response.data;
  }

  async deleteInterviewSession(id: number): Promise<{ message: string }> {
    const response = await this.client.delete(`/api/interview/sessions/${id}`);
    return response.data;
  }

  // Utility methods
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; database: string; api: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient();
export default apiClient;
