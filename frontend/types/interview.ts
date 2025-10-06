export interface Question {
  text: string;
  userAnswer?: string;
}

export interface ChatMessage {
  id: number;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  isTyping: boolean;
}

export interface ChatHistoryItem {
  question: string;
  answer: string;
  score?: number;
  feedback?: string;
}

export interface InterviewResults {
  answers: ChatHistoryItem[];
  averageScore: number;
  totalQuestions: number;
  completedAt: string;
  duration: string;
}
