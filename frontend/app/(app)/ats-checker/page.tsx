"use client";

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import {
  Upload as UploadIcon,
  FileText,
  BarChart3,
  Trash2,
  ChevronDown,
  CheckCircle
} from 'lucide-react';
import { analyzeResume as apiAnalyzeResume } from '@/lib/api';

interface AnalysisResult {
  id: number;
  user_id: number;
  resume_id: number;
  job_description_id: number;
  ats_score: number;
  keyword_matches: string[];
  missing_keywords: string[];
  suggestions: string[];
  strengths: string[];
  weaknesses: string[];
  created_at: string;
}

interface StepProps {
  stepNumber: number;
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  isCompleted: boolean;
  onToggle: () => void;
}

const Step: React.FC<StepProps> = ({ stepNumber, title, children, isOpen, isCompleted, onToggle }) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        className="w-full flex justify-between items-center p-6 text-left"
        onClick={onToggle}
      >
        <div className="flex items-center">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full mr-4 ${isCompleted ? 'bg-green-500' : 'bg-blue-600'} text-white`}>
            {isCompleted ? <CheckCircle size={24} /> : <span className="text-lg font-bold">{stepNumber}</span>}
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
        </div>
        <ChevronDown
          size={24}
          className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-6 pt-0">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function AtsCheckerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [isRestoring, setIsRestoring] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(1);

  const router = useRouter();

  useEffect(() => {
    const savedJobDescription = sessionStorage.getItem('atsJobDescription');
    if (savedJobDescription) {
      setJobDescription(savedJobDescription);
    }
    
    const savedAnalysis = sessionStorage.getItem('atsAnalysis');
    if (savedAnalysis) {
      try {
        setAnalysisResult(JSON.parse(savedAnalysis));
      } catch (error) {
        console.error('Error parsing saved analysis:', error);
      }
    }
    
    const savedFileName = sessionStorage.getItem('atsFileName');
    const savedFileSize = sessionStorage.getItem('atsFileSize');
    if (savedFileName && savedFileSize) {
      setFileName(savedFileName);
      setFileSize(parseInt(savedFileSize, 10));
    }
    setIsRestoring(false);
  }, []);

  useEffect(() => {
    if (!isRestoring) {
      sessionStorage.setItem('atsJobDescription', jobDescription);
      if (analysisResult) {
        sessionStorage.setItem('atsAnalysis', JSON.stringify(analysisResult));
      }
      if (fileName && fileSize) {
        sessionStorage.setItem('atsFileName', fileName);
        sessionStorage.setItem('atsFileSize', fileSize.toString());
      }
    }
  }, [jobDescription, analysisResult, fileName, fileSize, isRestoring]);

  const clearAtsSession = () => {
    sessionStorage.removeItem('atsJobDescription');
    sessionStorage.removeItem('atsAnalysis');
    sessionStorage.removeItem('atsFileName');
    sessionStorage.removeItem('atsFileSize');
    setFile(null);
    setFileName(null);
    setFileSize(null);
    setAnalysisResult(null);
    setJobDescription("");
  };

  const handleToggleStep = (stepNumber: number) => {
    setActiveStep(activeStep === stepNumber ? 0 : stepNumber);
  };

  const handleDrag = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setFileName(droppedFile.name);
        setFileSize(droppedFile.size);
        handleToggleStep(1);
        handleToggleStep(2);
      } else {
        alert('Please upload a PDF file.');
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setFileSize(selectedFile.size);
      handleToggleStep(1);
      handleToggleStep(2);
    } else {
      alert('Please select a PDF file.');
    }
  };

  const analyzeResume = async () => {
    if (!file && !fileName) {
      alert("Please select a resume file.");
      return;
    }
    if (!jobDescription) {
      alert("Please provide a job description.");
      return;
    }
    if (!file) {
        // This case happens when the page is reloaded and we only have the file name
        alert("Please re-select your resume file to proceed with the analysis.");
        return;
    }

    setIsUploading(true);
    
    try {
      const response = await apiAnalyzeResume(file, jobDescription);
      
      setAnalysisResult(response);
      // Persist results to session storage
      sessionStorage.setItem('atsAnalysis', JSON.stringify(response));
      sessionStorage.setItem('jobDescription', jobDescription);

    } catch (error) {
      let errorMessage = 'Error analyzing resume. ';
      if (error instanceof Error) {
        errorMessage += error.message;
      }
      alert(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const isStep1Completed = !!fileName;
  const isStep2Completed = jobDescription.trim() !== '';

  return (
    <ProtectedRoute>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Resume Analysis & ATS Scoring
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Upload your resume and paste a job description to get instant ATS compatibility scoring and detailed analysis.
            </p>
          </header>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <Step
              stepNumber={1}
              title="Upload Your Resume"
              isOpen={activeStep === 1}
              isCompleted={isStep1Completed}
              onToggle={() => handleToggleStep(1)}
            >
              {fileName ? (
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <div>
                      <span className="font-medium">{fileName}</span>
                      {fileSize && <p className="text-sm text-gray-500">{(fileSize / 1024 / 1024).toFixed(2)} MB</p>}
                    </div>
                  </div>
                  <button onClick={clearAtsSession} className="text-gray-500 hover:text-red-600">
                    <Trash2 />
                  </button>
                </div>
              ) : (
                <label 
                  className={`flex justify-center w-full h-32 px-4 transition bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md appearance-none cursor-pointer hover:border-blue-500 focus:outline-none ${isDragActive ? 'border-blue-500' : ''}`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <span className="flex items-center space-x-2">
                    <UploadIcon className="h-6 w-6 text-gray-500" />
                    <span className="font-medium text-gray-500">
                      Drop PDF to Attach, or <span className="text-blue-600 underline">browse</span>
                    </span>
                  </span>
                  <input type="file" name="file_upload" className="hidden" accept=".pdf" onChange={handleFileSelect} />
                </label>
              )}
            </Step>

            <Step
              stepNumber={2}
              title="Paste Job Description"
              isOpen={activeStep === 2}
              isCompleted={isStep2Completed}
              onToggle={() => handleToggleStep(2)}
            >
              <textarea
                id="jobDescription"
                rows={8}
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here..."
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </Step>
          </div>

          <div className="mt-8">
            <button
              onClick={analyzeResume}
              disabled={isUploading || !isStep1Completed || !isStep2Completed}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-md text-lg font-bold hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 disabled:cursor-not-allowed transition-all"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 className="h-5 w-5" />
                  Analyze Resume
                </>
              )}
            </button>
          </div>

          {analysisResult && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mt-8">
              <h2 className="text-2xl font-bold mb-6">Analysis Results for <span className="text-blue-600">{fileName || 'Your Resume'}</span></h2>
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 shadow-md flex flex-col items-center">
                  <h3 className="text-lg font-semibold mb-2">Overall ATS Score</h3>
                  <div className="text-5xl font-extrabold text-blue-600 mb-2">{analysisResult.ats_score}%</div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-2">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-blue-500 h-4 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${analysisResult.ats_score}%` }}
                    ></div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                  <h3 className="text-xl font-semibold mb-4">Suggestions for Improvement</h3>
                  <div className="space-y-2">
                    {analysisResult.suggestions.map((suggestion, index) => (
                      <p key={index} className="text-gray-600 dark:text-gray-300">{suggestion}</p>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <h3 className="text-xl font-semibold mb-4 text-green-500">Matching Keywords</h3>
                    {analysisResult.keyword_matches.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.keyword_matches.map((kw, i) => (
                          <span key={i} className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-sm font-medium">
                            {kw}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No direct keyword matches found.</p>
                    )}
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <h3 className="text-xl font-semibold mb-4 text-amber-500">Missing Keywords</h3>
                    {analysisResult.missing_keywords.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.missing_keywords.map((kw, i) => (
                          <span key={i} className="bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full text-sm font-medium">
                            {kw}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">Great job! No critical keywords seem to be missing.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4 mt-4">
                  <button
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    onClick={() => router.push('/interview')}
                  >
                    Start Interview Practice
                  </button>
                  <button
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                    onClick={() => router.push('/career-coach')}
                  >
                    Go to Career Coach
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}