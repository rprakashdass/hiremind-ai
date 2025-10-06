"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Loader,
  FileText,
  Briefcase,
  ClipboardEdit,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  Upload
} from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL } from '../../../lib/config';
import { uploadResume } from '../../../lib/api';
import { ChatMessage } from '../../../types/career-coach';
import { cn } from '../../../lib/utils';

const DEFAULT_BOT_MESSAGE: ChatMessage = {
  id: 1,
  role: 'bot',
  content: "Hello! I'm your AI Career Coach. You can upload your resume and a job description to get started.",
  timestamp: new Date()
};

const getInitialMessages = (): ChatMessage[] => {
  if (typeof window === 'undefined') return [DEFAULT_BOT_MESSAGE];
  const saved = sessionStorage.getItem('careerCoachMessages');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return parsed.map((msg: ChatMessage) => ({ ...msg, timestamp: new Date(msg.timestamp) }));
    } catch {
      // fallback to default
    }
  }
  return [DEFAULT_BOT_MESSAGE];
};

const CareerCoach = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [resumeInputText, setResumeInputText] = useState('');
  const [jdInputText, setJdInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);


  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedResume = sessionStorage.getItem('resumeText');
      if (savedResume && savedResume !== 'undefined') {
        setResumeText(savedResume);
      }

      const savedJd = sessionStorage.getItem('jobDescription');
      if (savedJd && savedJd !== 'undefined') {
        setJobDescription(savedJd);
      }
      
      const savedMessages = sessionStorage.getItem('careerCoachMessages');
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          setMessages(parsed.map((msg: ChatMessage) => ({ ...msg, timestamp: new Date(msg.timestamp) })));
        } catch {
          setMessages([DEFAULT_BOT_MESSAGE]);
        }
      } else {
        setMessages([DEFAULT_BOT_MESSAGE]);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('careerCoachMessages', JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/career-coach`, {
        resumeText,
        jobDescription,
        userMessage: inputMessage
      });

      const botMessage: ChatMessage = {
        id: Date.now() + 1,
        role: 'bot',
        content: response.data.response || 'Sorry, I could not generate a response at this time.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        role: 'bot',
        content: 'An error occurred. Please try again later.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSetContext = async () => {
    setIsUploading(true);
    try {
      let tempResumeText = resumeInputText;
      let tempJdText = jdInputText;

      if (resumeFile) {
        const data = await uploadResume(resumeFile);
        tempResumeText = data.text;
      }
      if (jdFile) {
        const data = await uploadResume(jdFile);
        tempJdText = data.text;
      }

      setResumeText(tempResumeText);
      setJobDescription(tempJdText);
      sessionStorage.setItem('resumeText', tempResumeText);
      sessionStorage.setItem('jobDescription', tempJdText);

      const botMessage: ChatMessage = {
        id: Date.now(),
        role: 'bot',
        content: "The context from your resume and job description has been loaded. How can I assist you with your career goals today?",
        timestamp: new Date()
      };
      setMessages([botMessage]);

    } catch (error) {
      console.error("Failed to set context:", error);
      const errorMessage: ChatMessage = {
        id: Date.now(),
        role: 'bot',
        content: 'There was an error processing your documents. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsUploading(false);
      setIsContextModalOpen(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    "Review my resume against the job description",
    "Generate interview questions based on this role",
    "Identify skill gaps for this position",
    "Suggest improvements for my resume's summary",
  ];



  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col font-sans">
      <div className="flex flex-1 overflow-hidden">
        {/* Main Content (Chat) - No sidebar */}
        <main className="flex-1 flex flex-col bg-background relative">
          {/* Toggle Buttons */}
          <div className="absolute top-1/2 -translate-y-1/2 z-10 hidden md:flex left-0">
            <button 
                onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)} 
                className="bg-card p-1 rounded-r-md shadow border-t border-r border-b -ml-px"
              >
                {isLeftSidebarOpen ? <ChevronsLeft className="h-5 w-5 text-muted-foreground" /> : <ChevronsRight className="h-5 w-5 text-muted-foreground" />}
              </button>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto w-full">
              {messages.length === 1 && (!resumeText || resumeText === 'No resume provided.') && (!jobDescription || jobDescription === 'No job description provided.') && (
                <div className="flex flex-col items-center justify-center h-full text-center pt-16">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Bot size={48} className="text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold text-foreground">AI Career Coach</h1>
                  <p className="text-muted-foreground mt-2 max-w-md">
                    Upload your resume and a job description to get personalized career advice, interview preparation, and more.
                  </p>
                  <button onClick={() => setIsContextModalOpen(true)} className="mt-8 inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700">
                    <Upload className="mr-2 h-5 w-5" /> Get Started
                  </button>
                </div>
              )}
              {messages.map((message) => (
                <div key={message.id} className={cn("flex items-start gap-4 my-6", message.role === 'user' ? "justify-end" : "justify-start")}>
                  {message.role === 'bot' && (
                    <div className={cn("flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-muted text-muted-foreground")}>
                      <Bot className="h-5 w-5" />
                    </div>
                  )}
                  <div className={cn("w-full max-w-3xl p-4 rounded-xl shadow-sm", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border')}>
                    <p className="text-base whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    <p className={cn("text-xs mt-2", message.role === 'user' ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className={cn("flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-primary text-primary-foreground")}>
                      <User className="h-5 w-5" />
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex items-start gap-4 my-6">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="w-full max-w-lg p-4 rounded-xl bg-muted">
                    <Loader className="h-5 w-5 text-muted-foreground animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-background/80 backdrop-blur-sm border-t flex-shrink-0">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <textarea
                  value={inputMessage}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    (!resumeText || resumeText === 'No resume provided.') || (!jobDescription || jobDescription === 'No job description provided.')
                      ? "Please upload your resume and a job description to begin."
                      : "Ask a follow-up question..."
                  }
                  className="w-full pl-4 pr-16 py-4 bg-card border border-border rounded-xl focus:ring-2 focus:ring-ring focus:border-ring resize-none text-base shadow-sm"
                  rows={1}
                  disabled={(!resumeText || resumeText === 'No resume provided.') || (!jobDescription || jobDescription === 'No job description provided.')}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping || (!resumeText || resumeText === 'No resume provided.') || (!jobDescription || jobDescription === 'No job description provided.')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 h-auto bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:bg-muted-foreground disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
               {messages.length > 1 && (
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {quickPrompts.map((prompt, i) => (
                    <button key={i} onClick={() => setInputMessage(prompt)} className="px-3 py-1.5 text-sm bg-muted text-muted-foreground rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>


  {/* Mobile Menu removed (no sidebar/context) */}
      </div>
      {isContextModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center" onClick={() => setIsContextModalOpen(false)}>
          <div className="bg-card rounded-lg shadow-xl z-50 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Upload Documents</h2>
                <p className="text-sm text-muted-foreground">
                  Provide your resume and the job description for tailored advice.
                </p>
              </div>
              <button onClick={() => setIsContextModalOpen(false)} className="p-1 rounded-full hover:bg-muted">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="resume-text" className="text-sm font-medium">Paste Resume Text</label>
                <textarea
                  id="resume-text"
                  value={resumeInputText}
                  onChange={(e) => setResumeInputText(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md bg-background"
                  rows={4}
                  placeholder="Paste your resume here..."
                />
              </div>
              <div className="text-center text-sm text-muted-foreground">OR</div>
              <div className="space-y-2">
                <label htmlFor="resume-upload" className="text-sm font-medium">Upload Resume (PDF)</label>
                <div className="flex items-center gap-2">
                  <input id="resume-upload" type="file" accept=".pdf,.txt,.docx" onChange={(e) => setResumeFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                </div>
              </div>
              <hr className="my-4" />
              <div>
                <label htmlFor="jd-text" className="text-sm font-medium">Paste Job Description</label>
                <textarea
                  id="jd-text"
                  value={jdInputText}
                  onChange={(e) => setJdInputText(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md bg-background"
                  rows={4}
                  placeholder="Paste the job description here..."
                />
              </div>
              <div className="text-center text-sm text-muted-foreground">OR</div>
              <div className="space-y-2">
                <label htmlFor="jd-upload" className="text-sm font-medium">Upload Job Description (PDF)</label>
                 <div className="flex items-center gap-2">
                  <input id="jd-upload" type="file" accept=".pdf,.txt,.docx" onChange={(e) => setJdFile(e.target.files ? e.target.files[0] : null)} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
                </div>
              </div>
            </div>
            <div className="p-6 flex justify-end gap-4 border-t bg-muted/50 rounded-b-lg">
              <button onClick={() => setIsContextModalOpen(false)} className="px-4 py-2 text-sm font-medium rounded-md border bg-background hover:bg-accent hover:text-accent-foreground">Cancel</button>
              <button onClick={handleSetContext} disabled={isUploading || (!resumeFile && !jdFile && !resumeInputText && !jdInputText)} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                {isUploading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {isUploading ? 'Processing...' : 'Set Context'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CareerCoach;