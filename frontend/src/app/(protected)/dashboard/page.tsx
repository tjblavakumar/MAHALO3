"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useProjects } from "@/contexts/ProjectContext";
import { useRequiredConnections } from "@/hooks/useRequiredConnections";
import SprintBoardWidget from "@/components/dashboard/widgets/SprintBoardWidget";
import VelocityWidget from "@/components/dashboard/widgets/VelocityWidget";
import ProjectStatusWidget from "@/components/dashboard/widgets/ProjectStatusWidget";
import PortfolioWidget from "@/components/dashboard/widgets/PortfolioWidget";
import KeyMetricsWidget from "@/components/dashboard/widgets/KeyMetricsWidget";
import MyStoriesWidget from "@/components/dashboard/widgets/MyStoriesWidget";
import MyPRsWidget from "@/components/dashboard/widgets/MyPRsWidget";
import RecentCommitsWidget from "@/components/dashboard/widgets/RecentCommitsWidget";

import type { Project } from "@/types";

const ROLE_LABELS: Record<string, string> = {
  product_manager: "Product Manager",
  developer: "Developer",
  executive: "Executive",
};

function WidgetCard({ title, children, span = 1 }: { title: string; children: React.ReactNode; span?: number }) {
  return (
    <div className={`bg-white rounded-lg shadow border border-gray-100 p-5 ${span === 2 ? "col-span-2" : ""}`}>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ProductManagerDashboard({ selectedProjects }: { selectedProjects: Project[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <WidgetCard title="Sprint Board" span={2}>
        <SprintBoardWidget selectedProjects={selectedProjects} />
      </WidgetCard>
      <WidgetCard title="Sprint Velocity">
        <VelocityWidget selectedProjects={selectedProjects} />
      </WidgetCard>
      <WidgetCard title="Project Status" span={2}>
        <ProjectStatusWidget selectedProjects={selectedProjects} />
      </WidgetCard>
      <WidgetCard title="Key Metrics">
        <KeyMetricsWidget selectedProjects={selectedProjects} />
      </WidgetCard>
    </div>
  );
}

function ExecutiveDashboard({ selectedProjects }: { selectedProjects: Project[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <WidgetCard title="Portfolio Health">
        <PortfolioWidget selectedProjects={selectedProjects} />
      </WidgetCard>
      <WidgetCard title="Key Metrics">
        <KeyMetricsWidget selectedProjects={selectedProjects} />
      </WidgetCard>
      <WidgetCard title="Sprint Velocity">
        <VelocityWidget selectedProjects={selectedProjects} />
      </WidgetCard>
      <WidgetCard title="Project Completion" span={2}>
        <ProjectStatusWidget selectedProjects={selectedProjects} />
      </WidgetCard>
      <WidgetCard title="Sprint Board Overview" span={2}>
        <SprintBoardWidget selectedProjects={selectedProjects} />
      </WidgetCard>
    </div>
  );
}

function DeveloperDashboard({ selectedProjects }: { selectedProjects: Project[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <WidgetCard title="My Stories">
        <MyStoriesWidget developerId="dev-1" />
      </WidgetCard>
      <WidgetCard title="My Pull Requests">
        <MyPRsWidget developerId="dev-1" />
      </WidgetCard>
      <WidgetCard title="Recent Commits">
        <RecentCommitsWidget developerId="dev-1" />
      </WidgetCard>
      <WidgetCard title="Sprint Board" span={2}>
        <SprintBoardWidget selectedProjects={selectedProjects} />
      </WidgetCard>
      <WidgetCard title="Sprint Velocity">
        <VelocityWidget selectedProjects={selectedProjects} />
      </WidgetCard>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedProjects, loading: projectsLoading } = useProjects();
  const { isConfigured, loading: connectionsLoading } = useRequiredConnections();

  if (!connectionsLoading && !isConfigured) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.name}!{" "}
            <span className="text-blue-600 font-medium">
              {user ? ROLE_LABELS[user.role] || user.role : ""}
            </span>{" "}
            view
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-4xl mb-4">📊</p>
          <p className="text-gray-500 mb-2">No connections configured yet.</p>
          <p className="text-gray-400 text-sm">
            Configure{" "}
            <a href="/connections" className="text-blue-600 hover:underline font-medium">
              Jira, Confluence, and GitHub
            </a>{" "}
            on the Connections page to view your dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.name}!{" "}
            <span className="text-blue-600 font-medium">
              {user ? ROLE_LABELS[user.role] || user.role : ""}
            </span>{" "}
            view
          </p>
        </div>

        {!projectsLoading && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            {selectedProjects.length === 0 ? (
              <span className="text-gray-500">No projects selected (showing all)</span>
            ) : selectedProjects.length === 1 ? (
              <span>Project: <strong className="font-semibold">{selectedProjects[0].name}</strong></span>
            ) : (
              <span>Aggregating <strong className="font-semibold">{selectedProjects.length}</strong> selected projects</span>
            )}
          </div>
        )}
      </div>

      {user?.role === "product_manager" && <ProductManagerDashboard selectedProjects={selectedProjects} />}
      {user?.role === "executive" && <ExecutiveDashboard selectedProjects={selectedProjects} />}
      {user?.role === "developer" && <DeveloperDashboard selectedProjects={selectedProjects} />}

      {!user?.role && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      )}
    </div>
  );
}
