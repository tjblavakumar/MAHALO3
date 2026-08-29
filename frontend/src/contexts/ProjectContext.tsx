"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import type { Project } from "@/types";

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  selectedProjects: Project[];
  loading: boolean;
  refreshProjects: () => Promise<void>;
  setActiveProject: (projectId: number) => Promise<boolean>;
  toggleProjectSelection: (projectId: number) => Promise<boolean>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProjects = useCallback(async () => {
    const result = await api.get<Project[]>("/projects");
    if (result.data) {
      const nextProjects = result.data;
      setProjects(nextProjects);
      return;
    }
    setProjects([]);
  }, []);

  useEffect(() => {
    void refreshProjects().finally(() => setLoading(false));
  }, [refreshProjects]);

  const selectedProjects = useMemo(() => {
    return projects.filter((project) => project.is_selected);
  }, [projects]);

  const activeProject = useMemo(() => {
    return projects.find((project) => project.is_active) ?? selectedProjects[0] ?? projects[0] ?? null;
  }, [projects, selectedProjects]);

  const setActiveProject = useCallback(async (projectId: number) => {
    const target = projects.find((project) => project.id === projectId);
    if (!target) {
      return false;
    }

    // Optimistically update
    setProjects((prev) =>
      prev.map((project) => ({
        ...project,
        is_active: project.id === projectId,
        is_selected: project.id === projectId ? true : project.is_selected,
      }))
    );

    const result = await api.put<Project>(`/projects/${projectId}/selection`, {
      is_active: true,
      is_selected: true,
    });

    if (result.error) {
      await refreshProjects();
      return false;
    }

    return true;
  }, [projects, refreshProjects]);

  const toggleProjectSelection = useCallback(async (projectId: number) => {
    const target = projects.find((project) => project.id === projectId);
    if (!target) {
      return false;
    }

    const nextSelected = !target.is_selected;

    // Optimistically update
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId ? { ...project, is_selected: nextSelected } : project
      )
    );

    const result = await api.put<Project>(`/projects/${projectId}/selection`, {
      is_active: target.is_active,
      is_selected: nextSelected,
    });

    if (result.error) {
      await refreshProjects();
      return false;
    }

    return true;
  }, [projects, refreshProjects]);

  const value = useMemo<ProjectContextType>(() => ({
    projects,
    activeProject,
    selectedProjects,
    loading,
    refreshProjects,
    setActiveProject,
    toggleProjectSelection,
  }), [projects, activeProject, selectedProjects, loading, refreshProjects, setActiveProject, toggleProjectSelection]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjects() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjects must be used within a ProjectProvider");
  }
  return context;
}
