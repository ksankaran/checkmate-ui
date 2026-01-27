"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { API_URL } from "@/lib/api";
import {
  FileText,
  FolderOpen,
  MessageSquare,
  Play,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";

interface Project {
  id: number;
  name: string;
  description: string | null;
  base_url: string;
  created_at: string;
}

interface Stats {
  totalProjects: number;
  totalTestCases: number;
  recentRuns: number;
  passRate: number;
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    totalTestCases: 0,
    recentRuns: 0,
    passRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
    fetchStats();
  }, []);

  async function fetchProjects() {
    try {
      const res = await fetch(`${API_URL}/api/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch(`${API_URL}/api/projects/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats({
          totalProjects: data.total_projects,
          totalTestCases: data.total_test_cases,
          recentRuns: data.recent_runs,
          passRate: data.pass_rate,
        });
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/checkmate-icon.png" alt="Checkmate" className="h-8 w-8" />
            <h1 className="text-2xl font-bold">Checkmate</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatsCard
            icon={<FolderOpen className="h-5 w-5" />}
            label="Projects"
            value={stats.totalProjects}
          />
          <StatsCard
            icon={<FileText className="h-5 w-5" />}
            label="Test Cases"
            value={stats.totalTestCases}
          />
          <StatsCard
            icon={<Play className="h-5 w-5" />}
            label="Recent Runs"
            value={stats.recentRuns}
          />
          <StatsCard
            icon={<CheckCircle className="h-5 w-5" />}
            label="Pass Rate"
            value={`${stats.passRate}%`}
          />
        </div>

        {/* Projects Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Projects</h2>
            <Link
              href="/projects/new"
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Project
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first project to start testing
              </p>
              <Link
                href="/projects/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>

        {/* How It Works */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StepCard
              step={1}
              icon={<Plus className="h-6 w-6" />}
              title="Create a Project"
              description="Add your application with its base URL and configuration"
            />
            <StepCard
              step={2}
              icon={<MessageSquare className="h-6 w-6" />}
              title="Chat with the Agent"
              description='Ask "Is login working?" in natural language'
            />
            <StepCard
              step={3}
              icon={<Play className="h-6 w-6" />}
              title="Watch Tests Run"
              description="Agent executes tests with real browser automation"
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function StatsCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border border-border bg-card"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors cursor-pointer"
      >
        <h3 className="font-semibold mb-2">{project.name}</h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {project.description || "No description"}
        </p>
        <p className="text-xs text-muted-foreground font-mono truncate">
          {project.base_url}
        </p>
      </motion.div>
    </Link>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: step * 0.1 }}
      className="p-6 rounded-lg border border-border bg-card relative"
    >
      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
        {step}
      </div>
      <div className="p-3 rounded-lg bg-primary/10 text-primary w-fit mb-4 mt-2">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
}
