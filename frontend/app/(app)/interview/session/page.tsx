'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import VideoInterview from '@/components/VideoInterview';
import apiClient, { RealtimeSessionResponse } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { ArrowLeft, CheckCircle, Clock, Users, Target, TrendingUp } from 'lucide-react';

interface InterviewFeedback {
  overall_score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  total_responses: number;
  conversation_duration: number;
}

export default function InterviewSession() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  
  // Get session parameters
  const sessionType = searchParams.get('type') || 'general';
  const resumeId = searchParams.get('resumeId');
  const jobTitle = searchParams.get('jobTitle') || 'Position';
  
  // States
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [sessionPhase, setSessionPhase] = useState<'setup' | 'interview' | 'completed'>('setup');
  
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    // Auto-create session when component mounts
    createInterviewSession();
  }, [user]);
  
  const createInterviewSession = async () => {
    setIsCreatingSession(true);
    setSessionError(null);
    
    try {
      const payload = {
        session_type: sessionType,
        ...(resumeId ? { resume_id: parseInt(resumeId, 10) } : {}),
        resume_text: null as string | null
      };
      const response: RealtimeSessionResponse = await apiClient.createRealtimeInterviewSession(payload);
      setSessionToken(response.session_token);
      setSessionPhase('interview');
      
    } catch (error: any) {
      console.error('Error creating interview session:', error);
      setSessionError('Failed to create interview session');
    } finally {
      setIsCreatingSession(false);
    }
  };
  
  const handleInterviewEnd = (interviewFeedback: InterviewFeedback) => {
    setFeedback(interviewFeedback);
    setInterviewCompleted(true);
    setSessionPhase('completed');
  };
  
  const handleReturnToDashboard = () => {
    router.push('/dashboard');
  };
  
  const handleStartNewInterview = () => {
    setSessionToken(null);
    setInterviewCompleted(false);
    setFeedback(null);
    setSessionPhase('setup');
    createInterviewSession();
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-500';
    if (score >= 6) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const getScoreBadgeVariant = (score: number) => {
    if (score >= 8) return 'default';
    if (score >= 6) return 'secondary';
    return 'destructive';
  };
  
  // Setup Phase - Creating Session
  if (sessionPhase === 'setup') {
    return (
      <ProtectedRoute>
        <div className="p-8 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Target className="w-6 h-6 text-blue-600" />
                <span>Preparing Interview</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isCreatingSession ? (
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-300">Setting up your interview session...</p>
                  <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <p>✓ Initializing AI interviewer</p>
                    <p>✓ Preparing questions for {sessionType} interview</p>
                    <p>✓ Setting up video connection</p>
                  </div>
                </div>
              ) : sessionError ? (
                <div className="text-center space-y-4">
                  <div className="text-red-500 text-xl">⚠️</div>
                  <p className="text-red-600">{sessionError}</p>
                  <Button onClick={createInterviewSession} className="w-full">
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={handleReturnToDashboard} className="w-full">
                    Return to Dashboard
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    );
  }
  
  // Interview Phase - Active Video Interview
  if (sessionPhase === 'interview' && sessionToken) {
    return (
      <VideoInterview
        sessionToken={sessionToken}
        onEndInterview={handleInterviewEnd}
        interviewType={sessionType}
        candidateName={`${user?.first_name} ${user?.last_name}`.trim() || user?.email || 'Candidate'}
      />
    );
  }
  
  // Completed Phase - Show Feedback
  if (sessionPhase === 'completed' && feedback) {
    return (
      <ProtectedRoute>
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={handleReturnToDashboard}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Interview Completed!</h1>
                <p className="text-gray-600 dark:text-gray-300">Thank you for completing your {sessionType} interview.</p>
              </div>
            </div>
          
          {/* Feedback Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className={`text-3xl font-bold ${getScoreColor(feedback.overall_score)}`}>
                  {feedback.overall_score}/10
                </div>
                <p className="text-gray-600">Overall Score</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-gray-900">
                  {feedback.total_responses}
                </div>
                <p className="text-gray-600">Questions Answered</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <div className="text-3xl font-bold text-gray-900">
                  {Math.round(feedback.conversation_duration)}m
                </div>
                <p className="text-gray-600">Interview Duration</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Detailed Feedback */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Strengths */}
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                {feedback.strengths && feedback.strengths.length > 0 ? (
                  <ul className="space-y-2">
                    {feedback.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-green-500 mr-2">✓</span>
                        <span className="text-gray-700">{strength}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No specific strengths identified</p>
                )}
              </CardContent>
            </Card>
            
            {/* Areas for Improvement */}
            <Card>
              <CardHeader>
                <CardTitle className="text-orange-600 flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {feedback.improvements && feedback.improvements.length > 0 ? (
                  <ul className="space-y-2">
                    {feedback.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-orange-500 mr-2">→</span>
                        <span className="text-gray-700">{improvement}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">Great job! No major areas for improvement identified</p>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Summary */}
          {feedback.summary && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Interview Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">{feedback.summary}</p>
              </CardContent>
            </Card>
          )}
          
          {/* Actions */}
          <div className="text-center space-x-4">
            <Button onClick={handleStartNewInterview} size="lg">
              Start New Interview
            </Button>
            <Button variant="outline" onClick={handleReturnToDashboard} size="lg">
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
    );
  }
  
  // Fallback
  return (
    <ProtectedRoute>
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading interview session...</p>
        </div>
      </div>
    </ProtectedRoute>
  );
}
