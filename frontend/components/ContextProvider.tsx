"use client";

import React, { useState, useEffect } from 'react';
import { FileText, Briefcase, X, Loader } from 'lucide-react';

interface ContextProviderProps {
  onClose: () => void;
}

const ContextProvider: React.FC<ContextProviderProps> = ({ onClose }) => {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setResumeText(sessionStorage.getItem('resumeText') || '');
      setJobDescription(sessionStorage.getItem('jobDescription') || '');
    }
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('resumeText', resumeText);
      sessionStorage.setItem('jobDescription', jobDescription);
    }
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-card rounded-xl shadow-lg w-full max-w-2xl border border-border">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Provide Context</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-foreground font-medium">
              <FileText size={18} />
              <span>Resume</span>
            </label>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume here..."
              className="w-full h-40 p-3 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-foreground font-medium">
              <Briefcase size={18} />
              <span>Job Description</span>
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              className="w-full h-40 p-3 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end p-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-muted-foreground flex items-center gap-2"
          >
            {isSaving ? <Loader size={16} className="animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save Context'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContextProvider;