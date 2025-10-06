export interface ChatMessage {
  id: number;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
}
