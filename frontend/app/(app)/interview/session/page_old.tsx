"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, StopCircle, Loader, AlertTriangle, Send } from 'lucide-react';

// A placeholder for the actual interview questions
const MOCK_QUESTIONS = [
  "Can you tell me about yourself and your background?",
  "What interests you about this role and our company?",
  "Describe a challenging project you've worked on and how you handled it.",
  "Where do you see yourself in 5 years?",
  "Do you have any questions for us?",
];

const InterviewSessionPage = () => {
  const router = useRouter();
  
  // Interview data from session storage
  const [jobTitle, setJobTitle] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState<string | null>(null);
  const [resumeText, setResumeText] = useState<string | null>(null);
  
  // Interview state
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [userResponses, setUserResponses] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Retrieve data from session storage
    const storedJobTitle = sessionStorage.getItem('jobTitle');
    const storedJobDescription = sessionStorage.getItem('jobDescription');
    const storedResumeText = sessionStorage.getItem('resumeText');

    if (!storedJobTitle || !storedJobDescription || !storedResumeText) {
      // If data is missing, redirect back to setup
      alert("Interview session data is missing. Please start over.");
      router.push('/interview');
    } else {
      setJobTitle(storedJobTitle);
      setJobDescription(storedJobDescription);
      setResumeText(storedResumeText);
      setIsLoading(false);
    }
  }, [router]);

  const handleNextQuestion = () => {
    if (currentQuestionIndex < MOCK_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // End of interview
      finishInterview();
    }
  };

  const finishInterview = async () => {
    setIsProcessing(true);
    // In a real application, you would send the responses to the backend
    // for evaluation and report generation.
    console.log("Interview Finished. Responses:", userResponses);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // For now, let's just store a mock report and redirect
    sessionStorage.setItem('interviewReport', "This is a detailed analysis of your performance...");
    sessionStorage.setItem('interviewResults', JSON.stringify({
        averageScore: 8.5,
        totalQuestions: MOCK_QUESTIONS.length,
        completedAt: new Date().toISOString(),
    }));
    
    router.push('/report');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader className="animate-spin h-12 w-12 text-primary" />
        <p className="ml-4 text-lg">Loading Interview Session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{jobTitle}</h1>
        <p className="text-muted-foreground">Interview Session</p>
      </header>

      <div className="flex-grow flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl p-8 bg-card rounded-lg shadow-xl">
          <div className="mb-6">
            <p className="text-sm font-semibold text-primary mb-2">
              Question {currentQuestionIndex + 1} of {MOCK_QUESTIONS.length}
            </p>
            <p className="text-2xl font-medium">
              {MOCK_QUESTIONS[currentQuestionIndex]}
            </p>
          </div>

          <div className="my-8 h-32 bg-muted rounded-lg p-4 text-muted-foreground">
            {isRecording ? "Recording... speak clearly." : "Press the record button to start your answer."}
          </div>

          <div className="flex items-center justify-center space-x-6">
            <button 
              onClick={() => setIsRecording(!isRecording)}
              className={`p-4 rounded-full transition-colors ${isRecording ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}
            >
              {isRecording ? <StopCircle size={40} /> : <Mic size={40} />}
            </button>
            
            <button 
              onClick={handleNextQuestion}
              disabled={isRecording || isProcessing}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader className="animate-spin h-5 w-5" />
              ) : (
                <>
                  {currentQuestionIndex === MOCK_QUESTIONS.length - 1 ? 'Finish' : 'Next Question'}
                  <Send size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSessionPage;
