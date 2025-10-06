"use client";

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Upload as UploadIcon, 
  FileText, 
  BarChart3,
  Trash2
} from 'lucide-react';
import axios from 'axios';

// This should be in a config file
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface AnalysisResult {
  atsScore: number;
  resumeText: string;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [isRestoring, setIsRestoring] = useState(true);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  const router = useRouter();

  useEffect(() => {
    const savedJobDescription = sessionStorage.getItem('uploadJobDescription');
    if (savedJobDescription) {
      setJobDescription(savedJobDescription);
    }
    
    const savedAnalysis = sessionStorage.getItem('uploadAnalysis');
    if (savedAnalysis) {
      try {
        setAnalysisResult(JSON.parse(savedAnalysis));
      } catch (error) {
        console.error('Error parsing saved analysis:', error);
      }
    }
    
    const savedFileName = sessionStorage.getItem('uploadFileName');
    const savedFileSize = sessionStorage.getItem('uploadFileSize');
    if (savedFileName && savedFileSize) {
      setFileName(savedFileName);
      setFileSize(parseInt(savedFileSize, 10));
    }
    setIsRestoring(false);
  }, []);

  useEffect(() => {
    if (!isRestoring) {
      sessionStorage.setItem('uploadJobDescription', jobDescription);
      if (analysisResult) {
        sessionStorage.setItem('uploadAnalysis', JSON.stringify(analysisResult));
      }
      if (fileName && fileSize) {
        sessionStorage.setItem('uploadFileName', fileName);
        sessionStorage.setItem('uploadFileSize', fileSize.toString());
      }
    }
  }, [jobDescription, analysisResult, fileName, fileSize, isRestoring]);

  const clearUploadSession = () => {
    sessionStorage.removeItem('uploadJobDescription');
    sessionStorage.removeItem('uploadAnalysis');
    sessionStorage.removeItem('uploadFileName');
    sessionStorage.removeItem('uploadFileSize');
    sessionStorage.removeItem('resumeText');
    sessionStorage.removeItem('atsScore');
    sessionStorage.removeItem('jobDescription');
    setFile(null);
    setFileName(null);
    setFileSize(null);
    setAnalysisResult(null);
    setJobDescription("");
  };

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setFileName(droppedFile.name);
        setFileSize(droppedFile.size);
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
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('job_description', jobDescription);
    
    try {
      const response = await axios.post<AnalysisResult>(`${BACKEND_URL}/api/analyze-resume`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });
      
      setAnalysisResult(response.data);
      if (response.data?.resumeText) {
        sessionStorage.setItem('resumeText', response.data.resumeText);
        sessionStorage.setItem('atsScore', String(response.data.atsScore));
        sessionStorage.setItem('jobDescription', jobDescription);
      }
    } catch (error) {
      let errorMessage = 'Error analyzing resume. ';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 0) {
          errorMessage += 'Cannot connect to server. Please check your network connection.';
        } else if (error.response?.status === 404) {
          errorMessage += 'Server endpoint not found.';
        } else if (error.response?.status === 500) {
          errorMessage += 'Server error occurred.';
        } else if (error.code === 'ECONNABORTED') {
          errorMessage += 'Request timed out. Please try again.';
        } else {
          errorMessage += error.response?.data?.error || error.message;
        }
      } else if (error instanceof Error) {
        errorMessage += error.message;
      }
      alert(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Resume Analysis & ATS Scoring
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Upload your resume and paste a job description to get instant ATS compatibility scoring and detailed analysis.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">1. Upload Your Resume</h2>
            
            {!fileName ? (
              <div
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                  isDragActive 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <UploadIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Drop your PDF resume here
                </h3>
                <p className="text-gray-600 mb-6">or click to browse files</p>
                
                <label className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer transition-colors duration-200">
                  <UploadIcon className="h-5 w-5 mr-2" />
                  Select PDF File
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-red-600" />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{fileName}</h3>
                      {fileSize && <p className="text-sm text-gray-600">{(fileSize / 1024 / 1024).toFixed(2)} MB</p>}
                    </div>
                  </div>
                  <button
                    onClick={clearUploadSession}
                    className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="h-6 w-6" />
                  </button>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Paste Job Description</h2>
              <textarea
                id="jobDescription"
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={8}
                placeholder="Paste the job description here..."
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                required
              />
            </div>

            <button
              onClick={analyzeResume}
              disabled={isUploading || !fileName || !jobDescription}
              className="w-full inline-flex items-center justify-center px-6 py-4 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors duration-200"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Analyze Resume
                </>
              )}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">3. Analysis Results</h2>
            
            {!analysisResult ? (
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Your analysis results will appear here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 shadow-md flex flex-col items-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Overall ATS Score</h3>
                  <div className="text-5xl font-extrabold text-indigo-600 mb-2">{analysisResult.atsScore}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                    <div 
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 h-4 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${analysisResult.atsScore}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                    onClick={() => router.push('/interview')}
                  >
                    Start Interview Practice
                  </button>
                  <button
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                    onClick={() => router.push('/career-coach')}
                  >
                    Go to Career Coach
                  </button>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Extracted Resume Text</h3>
                  <pre className="bg-gray-100 p-4 rounded-lg text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {analysisResult.resumeText}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}