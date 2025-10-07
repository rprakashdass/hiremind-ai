"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/protected-route';
import { 
  Download, 
  BarChart3, 
  Award, 
  TrendingUp, 
  AlertCircle,
  Briefcase,
  ArrowRight,
  Loader
} from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL } from '../../../lib/config';
import { InterviewResults } from '../../../types/interview';
import { ReportData } from '../../../types/report';

const ReportPage = () => {
  const [reportText, setReportText] = useState<string | null>(null);
  const [interviewResults, setInterviewResults] = useState<InterviewResults | null>(null);
  const [atsScore, setAtsScore] = useState<string>('');
  const [resumeText, setResumeText] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  useEffect(() => {
    const storedAtsScore = sessionStorage.getItem('atsScore') || '';
    const storedResumeText = sessionStorage.getItem('resumeText') || '';
    const storedResults = sessionStorage.getItem('interviewResults');
    const storedReport = sessionStorage.getItem('interviewReport');

    setAtsScore(storedAtsScore);
    setResumeText(storedResumeText);

    if (storedResults) {
      try {
        setInterviewResults(JSON.parse(storedResults) as InterviewResults);
      } catch (e) {
        console.error("Failed to parse interview results:", e);
      }
    }
    
    setReportText(storedReport);
    setLoading(false);
  }, []);

  const calculateOverallGrade = useCallback((ats: string, interview: InterviewResults | null): string => {
    if (!ats || !interview) return 'N/A';
    const atsNum = parseFloat(ats);
    const interviewScore = interview.averageScore;
    if (isNaN(atsNum)) return 'N/A';

    const average = (atsNum + (interviewScore * 10)) / 2;
    if (average >= 90) return 'A+';
    if (average >= 85) return 'A';
    if (average >= 80) return 'A-';
    if (average >= 75) return 'B+';
    if (average >= 70) return 'B';
    return 'B-';
  }, []);

  const downloadPDF = async () => {
    if (!interviewResults || !reportText) {
      alert('Essential report data is missing. Please complete an interview.');
      return;
    }
    setIsDownloading(true);
    try {
      const reportPayload: ReportData = {
        atsScore: parseFloat(atsScore) || 0,
        interviewScore: interviewResults.averageScore,
        overallGrade: calculateOverallGrade(atsScore, interviewResults),
        strengths: ["Generated via detailed analysis"], // Placeholder
        improvements: ["Generated via detailed analysis"], // Placeholder
        totalQuestions: interviewResults.totalQuestions,
        completedAt: interviewResults.completedAt,
        userName: "User", // Placeholder, consider adding user name to session
        resumeText: resumeText,
        generatedAt: new Date().toISOString(),
      };

      const response = await axios.post(`${BACKEND_URL}/api/generate-report`, 
        { reportData: { ...reportPayload, reportText } }, 
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'HireMind-AI-Report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("Failed to download PDF:", error);
      alert('Failed to download PDF report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-8 flex items-center justify-center">
          <div className="text-center">
            <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-lg text-gray-600 dark:text-gray-300">Loading your report...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!reportText || !interviewResults) {
    return (
      <ProtectedRoute>
        <div className="p-8 flex items-center justify-center">
          <div className="text-center bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-lg">
            <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">No Report Available</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md">
              It looks like you haven't completed an interview yet. Finish an interview to unlock your detailed performance report.
            </p>
            <Link href="/interview" className="inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-transform transform hover:scale-105">
              <Briefcase className="h-5 w-5 mr-2" />
              Start Your Interview
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const overallGrade = calculateOverallGrade(atsScore, interviewResults);

  return (
    <ProtectedRoute>
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 md:p-12 border-t-4 border-blue-600">
            
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
              <div>
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">Your Professional Report</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">
                  Generated on: {new Date(interviewResults.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button
                onClick={downloadPDF}
                disabled={isDownloading}
                className="mt-4 md:mt-0 inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 shadow-md disabled:bg-gray-400 disabled:cursor-wait"
              >
                {isDownloading ? (
                  <Loader className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Download className="h-5 w-5 mr-2" />
                )}
                {isDownloading ? 'Downloading...' : 'Download PDF'}
              </button>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl text-center border border-blue-200 dark:border-blue-800">
                <Award className="h-10 w-10 text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Overall Grade</p>
                <p className="text-4xl font-bold text-blue-600">{overallGrade}</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl text-center border border-green-200 dark:border-green-800">
                <BarChart3 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">ATS Score</p>
                <p className="text-4xl font-bold text-green-500">{atsScore}%</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-xl text-center border border-purple-200 dark:border-purple-800">
                <TrendingUp className="h-10 w-10 text-purple-500 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Interview Score</p>
                <p className="text-4xl font-bold text-purple-500">{interviewResults.averageScore}<span className="text-2xl">/10</span></p>
              </div>
            </section>

            <section>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 border-b-2 pb-3 border-gray-200 dark:border-gray-700">
                Detailed Analysis & Feedback
              </h2>
              <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed shadow-inner">
                {reportText}
              </div>
            </section>

            <footer className="mt-12 text-center">
              <Link href="/career-coach" className="inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-transform transform hover:scale-105 shadow-lg">
                <ArrowRight className="h-5 w-5 mr-2" />
                Get Career Coaching
              </Link>
            </footer>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default ReportPage;
