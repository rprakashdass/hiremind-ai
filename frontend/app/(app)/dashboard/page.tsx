'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { ProtectedRoute } from '@/components/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  FileText, 
  MessageSquare, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  ArrowRight
} from 'lucide-react';

interface RecentActivity {
  type: 'analysis' | 'interview';
  title: string;
  date: string;
}

interface DashboardStats {
  totalAnalyses: number;
  totalInterviews: number;
  averageScore: number;
  recentActivity: RecentActivity[];
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalAnalyses: 0,
    totalInterviews: 0,
    averageScore: 0,
    recentActivity: []
  });

  // Mock data - replace with actual API calls
  useEffect(() => {
    // Simulate loading stats
    setStats({
      totalAnalyses: 12,
      totalInterviews: 8,
      averageScore: 7.5,
      recentActivity: [
        { type: 'analysis', title: 'Software Engineer - Google', date: '2 hours ago' },
        { type: 'interview', title: 'Technical Interview Session', date: '1 day ago' },
        { type: 'analysis', title: 'Frontend Developer - Meta', date: '3 days ago' },
      ]
    });
  }, []);

  return (
    <ProtectedRoute>
      <div className="p-6">
        {/* Welcome section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.first_name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Ready to advance your career? Let's continue your preparation journey.
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Resume Analyses
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAnalyses}</div>
              <p className="text-xs text-muted-foreground">
                +2 from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Mock Interviews
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInterviews}</div>
              <p className="text-xs text-muted-foreground">
                +1 from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Score
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageScore}/10</div>
              <p className="text-xs text-muted-foreground">
                +0.5 from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                This Week
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">
                Activities completed
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Start improving your career prospects today
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/ats-checker" className="block">
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-4 w-4" />
                    Check Resume ATS Score
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              <Link href="/interview" className="block">
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Start Mock Interview
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>

              <Link href="/report" className="block">
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Progress Report
                  </div>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest resume analyses and interview sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {activity.type === 'analysis' ? (
                          <FileText className="h-5 w-5 text-blue-500" />
                        ) : (
                          <MessageSquare className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {activity.date}
                        </p>
                      </div>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    No activity yet
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Get started by analyzing your resume or taking a mock interview.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tips section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Career Tips</CardTitle>
            <CardDescription>
              Expert advice to boost your job search success
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Optimize Your Resume
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Use our ATS checker to ensure your resume gets past applicant tracking systems.
                </p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                  Practice Interviews
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Regular mock interviews will boost your confidence and improve your responses.
                </p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">
                  Track Progress
                </h4>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Monitor your improvement over time with detailed analytics and feedback.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
