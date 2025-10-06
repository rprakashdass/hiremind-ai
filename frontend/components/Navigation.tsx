"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Brain, Home, Upload, MessageCircle, BarChart3, User, Menu, X, Trash2 } from 'lucide-react';

const Navigation = () => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/upload', label: 'Resume Upload', icon: Upload },
    { href: '/interview', label: 'Interview', icon: MessageCircle },
    { href: '/report', label: 'Report', icon: BarChart3 },
    { href: '/career-coach', label: 'Career Coach', icon: User },
  ];

  const clearAllSessionData = () => {
    if (window.confirm('Are you sure you want to clear all session data? This will reset your resume analysis, interview progress, and chat history.')) {
      // Clear all session storage items
      sessionStorage.clear();
      // Reload the page to reset all components
      window.location.reload();
    }
  };

  // Check if there's any session data to show the clear button
  const hasSessionData = () => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('resumeText') || 
             sessionStorage.getItem('uploadAnalysis') || 
             sessionStorage.getItem('careerCoachMessages') || 
             sessionStorage.getItem('interviewState');
    }
    return false;
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">HireMind AI</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  pathname === href
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
            {hasSessionData() && (
              <button
                onClick={clearAllSessionData}
                className="flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-200"
                title="Clear all session data"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear All</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-indigo-600 focus:outline-none focus:text-indigo-600 p-2"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                    pathname === href
                      ? 'text-indigo-600 bg-indigo-50'
                      : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </Link>
              ))}
              {hasSessionData() && (
                <button
                  onClick={() => {
                    clearAllSessionData();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors duration-200 w-full text-left"
                >
                  <Trash2 className="h-5 w-5" />
                  <span>Clear All Data</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;