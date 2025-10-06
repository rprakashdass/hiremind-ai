"use client";

import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

interface AppContextType {
  resumeFile: File | null;
  setResumeFile: Dispatch<SetStateAction<File | null>>;
  resumeText: string;
  setResumeText: Dispatch<SetStateAction<string>>;
  jobDescription: string;
  setJobDescription: Dispatch<SetStateAction<string>>;
  resumeFileName: string;
  setResumeFileName: Dispatch<SetStateAction<string>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFileName, setResumeFileName] = useState('');

  const value = {
    resumeFile,
    setResumeFile,
    resumeText,
    setResumeText,
    jobDescription,
    setJobDescription,
    resumeFileName,
    setResumeFileName,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
