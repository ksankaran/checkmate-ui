"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Settings,
  Users,
  FileText,
  MessageSquareText,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  X,
  Loader2,
  Save,
  Globe,
} from "lucide-react";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { API_URL } from "@/lib/api";

interface Project {
  id: number;
  name: string;
  description: string | null;
  base_url: string;
}

interface Persona {
  id: number;
  name: string;
  username: string;
  description: string | null;
  project_id: number;
  created_at: string;
  updated_at: string;
}

interface Page {
  id: number;
  name: string;
  path: string;
  description: string | null;
  project_id: number;
  created_at: string;
  updated_at: string;
}

type Tab = "general" | "context" | "personas" | "pages";

interface PersonaFormData {
  name: string;
  username: string;
  password: string;
  description: string;
}

interface PageFormData {
  name: string;
  path: string;
  description: string;
}

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  // General settings state
  const [generalForm, setGeneralForm] = useState({
    name: "",
    description: "",
    base_url: "",
    page_load_state: "load",
  });
  const [generalDirty, setGeneralDirty] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);

  // Context state
  const [basePrompt, setBasePrompt] = useState("");
  const [contextDirty, setContextDirty] = useState(false);
  const [savingContext, setSavingContext] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form data
  const [personaForm, setPersonaForm] = useState<PersonaFormData>({
    name: "",
    username: "",
    password: "",
    description: "",
  });
  const [pageForm, setPageForm] = useState<PageFormData>({
    name: "",
    path: "",
    description: "",
  });

  useEffect(() => {
    fetchProject();
    fetchContext();
    fetchPersonas();
    fetchPages();
  }, [projectId]);

  async function fetchProject() {
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        setGeneralForm({
          name: data.name || "",
          description: data.description || "",
          base_url: data.base_url || "",
          page_load_state: data.page_load_state || "load",
        });
        setGeneralDirty(false);
      }
    } catch (error) {
      console.error("Failed to fetch project:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchContext() {
    try {
      const res = await fetch(
        `${API_URL}/api/projects/${projectId}/settings/context`
      );
      if (res.ok) {
        const data = await res.json();
        setBasePrompt(data.base_prompt || "");
        setContextDirty(false);
      }
    } catch (error) {
      console.error("Failed to fetch context:", error);
    }
  }

  async function handleSaveGeneral() {
    if (!generalForm.name.trim() || !generalForm.base_url.trim()) {
      alert("Name and Base URL are required");
      return;
    }
    setSavingGeneral(true);
    try {
      const res = await fetch(
        `${API_URL}/api/projects/${projectId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: generalForm.name,
            description: generalForm.description || null,
            base_url: generalForm.base_url,
            page_load_state: generalForm.page_load_state,
          }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setProject(updated);
        setGeneralDirty(false);
      } else {
        const err = await res.json();
        console.error("Failed to save project:", err);
      }
    } catch (error) {
      console.error("Failed to save project:", error);
    } finally {
      setSavingGeneral(false);
    }
  }

  async function handleSaveContext() {
    setSavingContext(true);
    try {
      const res = await fetch(
        `${API_URL}/api/projects/${projectId}/settings/context`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base_prompt: basePrompt,
          }),
        }
      );
      if (res.ok) {
        setContextDirty(false);
      } else {
        const err = await res.json();
        console.error("Failed to save context:", err);
      }
    } catch (error) {
      console.error("Failed to save context:", error);
    } finally {
      setSavingContext(false);
    }
  }

  async function fetchPersonas() {
    try {
      const res = await fetch(
        `${API_URL}/api/projects/${projectId}/settings/personas`
      );
      if (res.ok) {
        const data = await res.json();
        setPersonas(data);
      }
    } catch (error) {
      console.error("Failed to fetch personas:", error);
    }
  }

  async function fetchPages() {
    try {
      const res = await fetch(
        `${API_URL}/api/projects/${projectId}/settings/pages`
      );
      if (res.ok) {
        const data = await res.json();
        setPages(data);
      }
    } catch (error) {
      console.error("Failed to fetch pages:", error);
    }
  }

  // Persona handlers
  function openCreatePersonaModal() {
    setPersonaForm({ name: "", username: "", password: "", description: "" });
    setEditingPersona(null);
    setModalMode("create");
    setShowPassword(false);
    setChangePassword(false);
    setShowModal(true);
  }

  function openEditPersonaModal(persona: Persona) {
    setPersonaForm({
      name: persona.name,
      username: persona.username,
      password: "",
      description: persona.description || "",
    });
    setEditingPersona(persona);
    setModalMode("edit");
    setShowPassword(false);
    setChangePassword(false);
    setShowModal(true);
  }

  async function handleSavePersona() {
    setSaving(true);
    try {
      if (modalMode === "create") {
        const res = await fetch(
          `${API_URL}/api/projects/${projectId}/settings/personas`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: personaForm.name,
              username: personaForm.username,
              password: personaForm.password,
              description: personaForm.description || null,
              project_id: parseInt(projectId),
            }),
          }
        );
        if (res.ok) {
          await fetchPersonas();
          setShowModal(false);
        } else {
          const err = await res.json();
          console.error("Failed to create persona:", err);
        }
      } else if (editingPersona) {
        const updateData: Record<string, string | null> = {
          name: personaForm.name,
          username: personaForm.username,
          description: personaForm.description || null,
        };
        if (changePassword && personaForm.password) {
          updateData.password = personaForm.password;
        }
        const res = await fetch(
          `${API_URL}/api/projects/${projectId}/settings/personas/${editingPersona.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData),
          }
        );
        if (res.ok) {
          await fetchPersonas();
          setShowModal(false);
        } else {
          const err = await res.json();
          console.error("Failed to update persona:", err);
        }
      }
    } catch (error) {
      console.error("Failed to save persona:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePersona(personaId: number) {
    if (!confirm("Are you sure you want to delete this persona?")) return;
    try {
      const res = await fetch(
        `${API_URL}/api/projects/${projectId}/settings/personas/${personaId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        await fetchPersonas();
      }
    } catch (error) {
      console.error("Failed to delete persona:", error);
    }
  }

  // Page handlers
  function openCreatePageModal() {
    setPageForm({ name: "", path: "", description: "" });
    setEditingPage(null);
    setModalMode("create");
    setShowModal(true);
  }

  function openEditPageModal(page: Page) {
    setPageForm({
      name: page.name,
      path: page.path,
      description: page.description || "",
    });
    setEditingPage(page);
    setModalMode("edit");
    setShowModal(true);
  }

  async function handleSavePage() {
    setSaving(true);
    try {
      if (modalMode === "create") {
        const res = await fetch(
          `${API_URL}/api/projects/${projectId}/settings/pages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: pageForm.name,
              path: pageForm.path,
              description: pageForm.description || null,
              project_id: parseInt(projectId),
            }),
          }
        );
        if (res.ok) {
          await fetchPages();
          setShowModal(false);
        } else {
          const err = await res.json();
          console.error("Failed to create page:", err);
        }
      } else if (editingPage) {
        const res = await fetch(
          `${API_URL}/api/projects/${projectId}/settings/pages/${editingPage.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: pageForm.name,
              path: pageForm.path,
              description: pageForm.description || null,
            }),
          }
        );
        if (res.ok) {
          await fetchPages();
          setShowModal(false);
        } else {
          const err = await res.json();
          console.error("Failed to update page:", err);
        }
      }
    } catch (error) {
      console.error("Failed to save page:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePage(pageId: number) {
    if (!confirm("Are you sure you want to delete this page?")) return;
    try {
      const res = await fetch(
        `${API_URL}/api/projects/${projectId}/settings/pages/${pageId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        await fetchPages();
      }
    } catch (error) {
      console.error("Failed to delete page:", error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Project not found</h2>
          <Link href="/" className="text-primary hover:underline">
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}`}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Settings className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-semibold">Project Settings</h1>
                <p className="text-sm text-muted-foreground">{project.name}</p>
              </div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === "general"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <Globe className="h-4 w-4" />
            General
          </button>
          <button
            onClick={() => setActiveTab("context")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === "context"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <MessageSquareText className="h-4 w-4" />
            Context
          </button>
          <button
            onClick={() => setActiveTab("personas")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === "personas"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <Users className="h-4 w-4" />
            Personas
          </button>
          <button
            onClick={() => setActiveTab("pages")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === "pages"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <FileText className="h-4 w-4" />
            Pages
          </button>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "general" && (
            <motion.div
              key="general"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">General Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    Basic project configuration including name and base URL.
                  </p>
                </div>
                <button
                  onClick={handleSaveGeneral}
                  disabled={!generalDirty || savingGeneral}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingGeneral ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingGeneral ? "Saving..." : "Save"}
                </button>
              </div>

              <div className="space-y-4 border border-border rounded-lg p-6">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={generalForm.name}
                    onChange={(e) => {
                      setGeneralForm({ ...generalForm, name: e.target.value });
                      setGeneralDirty(true);
                    }}
                    placeholder="My Project"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Base URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={generalForm.base_url}
                    onChange={(e) => {
                      setGeneralForm({ ...generalForm, base_url: e.target.value });
                      setGeneralDirty(true);
                    }}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The base URL for your application. Relative URLs in test steps will be resolved against this.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Description
                  </label>
                  <textarea
                    value={generalForm.description}
                    onChange={(e) => {
                      setGeneralForm({ ...generalForm, description: e.target.value });
                      setGeneralDirty(true);
                    }}
                    placeholder="Optional project description"
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Default Page Load Event
                  </label>
                  <select
                    value={generalForm.page_load_state}
                    onChange={(e) => {
                      setGeneralForm({ ...generalForm, page_load_state: e.target.value });
                      setGeneralDirty(true);
                    }}
                    className="w-full max-w-xs px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="load">load (default)</option>
                    <option value="domcontentloaded">domcontentloaded (faster)</option>
                    <option value="networkidle">networkidle (slower, waits for network)</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used by <code className="bg-muted px-1 rounded">wait_for_page</code> action when no specific state is provided.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "context" && (
            <motion.div
              key="context"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">App Context</h2>
                  <p className="text-sm text-muted-foreground">
                    Describe your app to help the AI generate better tests.
                  </p>
                </div>
                <button
                  onClick={handleSaveContext}
                  disabled={!contextDirty || savingContext}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingContext ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingContext ? "Saving..." : "Save"}
                </button>
              </div>

              {/* Base Prompt */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-muted/30 border-b border-border">
                  <span className="text-sm font-medium">App Context</span>
                </div>
                <textarea
                  value={basePrompt}
                  onChange={(e) => {
                    setBasePrompt(e.target.value);
                    setContextDirty(true);
                  }}
                  placeholder={`Describe your application's setup, authentication flow, and any important details the AI should know when generating and running tests.

Examples:
- "This is a React app with JWT-based authentication. After login, the token is stored in localStorage."
- "The app has role-based access: admin users can see all pages, regular users can only see their dashboard."
- "Form validation errors appear below each field. Success messages appear as toast notifications in the top-right."
- "The login page redirects to /dashboard on success, or shows an error message inline on failure."`}
                  className="w-full h-64 p-4 bg-background resize-none focus:outline-none font-mono text-sm"
                />
              </div>

              <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
                <h3 className="text-sm font-medium mb-2">
                  What to include in your context:
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Authentication method (JWT, session, OAuth, etc.)</li>
                  <li>• Where credentials are stored (localStorage, cookies)</li>
                  <li>• Role-based access patterns</li>
                  <li>• How errors and success messages are displayed</li>
                  <li>• Any quirks or special behaviors of your app</li>
                  <li>• Expected redirects after login/logout</li>
                </ul>
              </div>
            </motion.div>
          )}

          {activeTab === "personas" && (
            <motion.div
              key="personas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Personas</h2>
                  <p className="text-sm text-muted-foreground">
                    Login credentials that can be referenced in test cases using{" "}
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">
                      {"{{persona.username}}"}
                    </code>{" "}
                    and{" "}
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">
                      {"{{persona.password}}"}
                    </code>
                  </p>
                </div>
                <button
                  onClick={openCreatePersonaModal}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Persona
                </button>
              </div>

              {personas.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No personas yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add personas to store login credentials for your tests
                  </p>
                  <button
                    onClick={openCreatePersonaModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Persona
                  </button>
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium">Name</th>
                        <th className="text-left px-4 py-3 text-sm font-medium">Username</th>
                        <th className="text-left px-4 py-3 text-sm font-medium">Description</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {personas.map((persona) => (
                        <tr key={persona.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                              {persona.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{persona.username}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {persona.description || "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditPersonaModal(persona)}
                                className="p-2 rounded hover:bg-muted transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePersona(persona.id)}
                                className="p-2 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "pages" && (
            <motion.div
              key="pages"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Pages</h2>
                  <p className="text-sm text-muted-foreground">
                    URL mappings that can be referenced in test cases using{" "}
                    <code className="bg-muted px-1 py-0.5 rounded text-xs">
                      {"{{pagename}}"}
                    </code>
                  </p>
                </div>
                <button
                  onClick={openCreatePageModal}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add Page
                </button>
              </div>

              {pages.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No pages yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add pages to create reusable URL references for your tests
                  </p>
                  <button
                    onClick={openCreatePageModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Page
                  </button>
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium">Name</th>
                        <th className="text-left px-4 py-3 text-sm font-medium">Path</th>
                        <th className="text-left px-4 py-3 text-sm font-medium">Description</th>
                        <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pages.map((page) => (
                        <tr key={page.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                              {page.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">{page.path}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {page.description || "-"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditPageModal(page)}
                                className="p-2 rounded hover:bg-muted transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePage(page.id)}
                                className="p-2 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {modalMode === "create" ? "Add" : "Edit"}{" "}
                  {activeTab === "personas" ? "Persona" : "Page"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {activeTab === "personas" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={personaForm.name}
                      onChange={(e) =>
                        setPersonaForm({ ...personaForm, name: e.target.value })
                      }
                      placeholder="e.g., admin, test_user"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use this name in test steps:{" "}
                      <code className="bg-muted px-1 rounded">
                        {`{{${personaForm.name || "name"}.username}}`}
                      </code>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={personaForm.username}
                      onChange={(e) =>
                        setPersonaForm({ ...personaForm, username: e.target.value })
                      }
                      placeholder="e.g., admin@example.com"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {modalMode === "edit" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="changePassword"
                        checked={changePassword}
                        onChange={(e) => setChangePassword(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="changePassword" className="text-sm">
                        Change password
                      </label>
                    </div>
                  )}
                  {(modalMode === "create" || changePassword) && (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={personaForm.password}
                          onChange={(e) =>
                            setPersonaForm({ ...personaForm, password: e.target.value })
                          }
                          placeholder="Enter password"
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                      type="text"
                      value={personaForm.description}
                      onChange={(e) =>
                        setPersonaForm({ ...personaForm, description: e.target.value })
                      }
                      placeholder="Optional description"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pageForm.name}
                      onChange={(e) =>
                        setPageForm({ ...pageForm, name: e.target.value })
                      }
                      placeholder="e.g., login, dashboard"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use this name in test steps:{" "}
                      <code className="bg-muted px-1 rounded">
                        {`{{${pageForm.name || "name"}}}`}
                      </code>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Path <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pageForm.path}
                      onChange={(e) =>
                        setPageForm({ ...pageForm, path: e.target.value })
                      }
                      placeholder="e.g., /login, /dashboard"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                      type="text"
                      value={pageForm.description}
                      onChange={(e) =>
                        setPageForm({ ...pageForm, description: e.target.value })
                      }
                      placeholder="Optional description"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={activeTab === "personas" ? handleSavePersona : handleSavePage}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? "Saving..." : modalMode === "create" ? "Create" : "Save"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
