"use client";

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { Mic, Upload, FileText, Briefcase, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL } from '../../../lib/config';

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


const InterviewSetupPage: React.FC = () => {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(1);
  
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState<'idle' | 'granted' | 'denied'>('idle');
  const [isStarting, setIsStarting] = useState(false);

  const isStep1Completed = jobTitle.trim() !== '' && jobDescription.trim() !== '';
  const isStep2Completed = file !== null;
  const isStep3Completed = micPermission === 'granted';

  const handleToggleStep = (stepNumber: number) => {
    setActiveStep(activeStep === stepNumber ? 0 : stepNumber);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && (selectedFile.type === 'application/pdf' || selectedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
      handleToggleStep(2); // Close current step
      handleToggleStep(3); // Open next step
    } else {
      alert('Please select a PDF or DOCX file.');
    }
  };

  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      // Close the stream immediately, we just need to check for permission
      stream.getTracks().forEach(track => track.stop());
      handleToggleStep(3); // Close current step
      handleToggleStep(4); // Open next step
    } catch (error) {
      console.error("Microphone access denied:", error);
      setMicPermission('denied');
    }
  };

  const startInterview = async () => {
    if (!isStep1Completed || !isStep2Completed || !isStep3Completed) {
      alert("Please complete all steps before starting the interview.");
      return;
    }
    
    setIsStarting(true);
    
    try {
      // Redirect to the new video interview session with parameters
      const params = new URLSearchParams({
        type: 'general', // You can make this selectable
        jobTitle: jobTitle,
        resumeId: '', // Will be handled in the session page
      });
      
      router.push(`/interview/session?${params.toString()}`); 

    } catch (error) {
      console.error("Failed to start interview:", error);
      alert("There was an error starting the interview. Please check the console for details.");
      setIsStarting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">New Mock Interview</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">Complete the steps below to start your tailored interview session.</p>
          </header>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <Step
              stepNumber={1}
              title="Interview Details"
              isOpen={activeStep === 1}
              isCompleted={isStep1Completed}
              onToggle={() => handleToggleStep(1)}
            >
              <div className="space-y-4">
                <div>
                  <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Job Title / Role</label>
                  <input
                    type="text"
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Senior Frontend Developer"
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="jobDescription" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Job Description</label>
                  <textarea
                    id="jobDescription"
                    rows={6}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the full job description here..."
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </Step>

            <Step
              stepNumber={2}
              title="Upload Your Resume"
              isOpen={activeStep === 2}
              isCompleted={isStep2Completed}
              onToggle={() => handleToggleStep(2)}
            >
              {fileName ? (
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <span className="font-medium">{fileName}</span>
                  </div>
                  <button onClick={() => { setFile(null); setFileName(null); }} className="text-gray-500 hover:text-red-600">
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex justify-center w-full h-32 px-4 transition bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md appearance-none cursor-pointer hover:border-blue-500 focus:outline-none">
                  <span className="flex items-center space-x-2">
                    <Upload className="h-6 w-6 text-gray-500" />
                    <span className="font-medium text-gray-500">
                      Drop files to Attach, or <span className="text-blue-600 underline">browse</span>
                    </span>
                  </span>
                  <input type="file" name="file_upload" className="hidden" accept=".pdf,.docx" onChange={handleFileSelect} />
                </label>
              )}
            </Step>

            <Step
              stepNumber={3}
              title="Audio Input"
              isOpen={activeStep === 3}
              isCompleted={isStep3Completed}
              onToggle={() => handleToggleStep(3)}
            >
              <div className="flex items-center justify-between">
                <p className="text-gray-600 dark:text-gray-300">
                  {micPermission === 'idle' && "We'll need microphone access for the interview."}
                  {micPermission === 'granted' && "Microphone access is enabled."}
                  {micPermission === 'denied' && "Microphone access was denied. Please enable it in your browser settings."}
                </p>
                {micPermission === 'idle' && (
                  <button onClick={requestMicPermission} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700">
                    <Mic size={18} /> Enable Microphone
                  </button>
                )}
                {micPermission === 'granted' && (
                   <div className="flex items-center gap-2 text-green-500">
                      <CheckCircle size={20} />
                      <span>Microphone Ready</span>
                   </div>
                )}
                {micPermission === 'denied' && (
                   <div className="flex items-center gap-2 text-red-500">
                      <AlertCircle size={20} />
                      <span>Permission Denied</span>
                   </div>
                )}
              </div>
            </Step>
          </div>

          <div className="mt-8">
            <button
              onClick={startInterview}
              disabled={!isStep1Completed || !isStep2Completed || !isStep3Completed || isStarting}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-md text-lg font-bold hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 disabled:cursor-not-allowed transition-all"
            >
              {isStarting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Starting Session...
                </>
              ) : (
                <>
                  <Briefcase size={22} />
                  Start Interview
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default InterviewSetupPage;