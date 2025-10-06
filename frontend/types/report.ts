import { ChatHistoryItem } from './interview';

export interface InterviewResults {
  answers: ChatHistoryItem[];
  averageScore: number;
  totalQuestions: number;
  completedAt: string;
  duration: string;
}

export interface ReportData {
  atsScore: number;
  interviewScore: number;
  overallGrade: string;
  strengths: string[];
  improvements: string[];
  totalQuestions: number;
  completedAt: string;
  userName: string;
  resumeText: string;
  generatedAt: string;
}
