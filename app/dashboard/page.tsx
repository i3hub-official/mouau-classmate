// app/dashboard/page.tsx
"use client";
import { BookOpen, Calendar, FileText, Users, Bell } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <BookOpen className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">MOUAU ClassMate</h1>
              <p className="text-xs text-muted-foreground">Welcome back, Student!</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-muted rounded-lg transition-colors">
              <Bell size={20} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Your Dashboard</h2>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">5</p>
                <p className="text-sm text-muted-foreground">Courses</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">3</p>
                <p className="text-sm text-muted-foreground">Assignments</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <Calendar className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">2</p>
                <p className="text-sm text-muted-foreground">Deadlines</p>
              </div>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/20 rounded-lg">
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">45</p>
                <p className="text-sm text-muted-foreground">Classmates</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activities</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors">
              <FileText size={16} className="text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">New assignment posted</p>
                <p className="text-xs text-muted-foreground">PHY 301 - Quantum Mechanics</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors">
              <BookOpen size={16} className="text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Lecture notes updated</p>
                <p className="text-xs text-muted-foreground">MAT 201 - Advanced Calculus</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors">
              <Calendar size={16} className="text-accent" />
              <div>
                <p className="text-sm font-medium text-foreground">Class schedule changed</p>
                <p className="text-xs text-muted-foreground">CHE 101 - General Chemistry</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="p-4 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors group">
              <FileText className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground text-center">Upload Assignment</p>
            </button>
            <button className="p-4 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors group">
              <BookOpen className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground text-center">View Courses</p>
            </button>
            <button className="p-4 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors group">
              <Users className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground text-center">Class Forum</p>
            </button>
            <button className="p-4 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors group">
              <Calendar className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground text-center">Schedule</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}