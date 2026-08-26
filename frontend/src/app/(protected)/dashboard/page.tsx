"use client";

import { useAuth } from "@/contexts/AuthContext";
import SprintBoardWidget from "@/components/dashboard/widgets/SprintBoardWidget";
import VelocityWidget from "@/components/dashboard/widgets/VelocityWidget";
import ProjectStatusWidget from "@/components/dashboard/widgets/ProjectStatusWidget";
import PortfolioWidget from "@/components/dashboard/widgets/PortfolioWidget";
import KeyMetricsWidget from "@/components/dashboard/widgets/KeyMetricsWidget";
import MyStoriesWidget from "@/components/dashboard/widgets/MyStoriesWidget";
import MyPRsWidget from "@/components/dashboard/widgets/MyPRsWidget";
import RecentCommitsWidget from "@/components/dashboard/widgets/RecentCommitsWidget";

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

function ProductManagerDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <WidgetCard title="Sprint Board - Payment Gateway" span={2}>
        <SprintBoardWidget projectId="PAY" />
      </WidgetCard>
      <WidgetCard title="Sprint Velocity">
        <VelocityWidget projectId="PAY" />
      </WidgetCard>
      <WidgetCard title="Project Status" span={2}>
        <ProjectStatusWidget />
      </WidgetCard>
      <WidgetCard title="Key Metrics">
        <KeyMetricsWidget />
      </WidgetCard>
    </div>
  );
}

function ExecutiveDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      <WidgetCard title="Portfolio Health">
        <PortfolioWidget />
      </WidgetCard>
      <WidgetCard title="Key Metrics">
        <KeyMetricsWidget />
      </WidgetCard>
      <WidgetCard title="Sprint Velocity - Payment">
        <VelocityWidget projectId="PAY" />
      </WidgetCard>
      <WidgetCard title="Project Completion" span={2}>
        <ProjectStatusWidget />
      </WidgetCard>
      <WidgetCard title="Sprint Board Overview">
        <SprintBoardWidget projectId="PAY" />
      </WidgetCard>
    </div>
  );
}

function DeveloperDashboard() {
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
        <SprintBoardWidget projectId="PAY" />
      </WidgetCard>
      <WidgetCard title="Sprint Velocity">
        <VelocityWidget projectId="PAY" />
      </WidgetCard>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

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

      {user?.role === "product_manager" && <ProductManagerDashboard />}
      {user?.role === "executive" && <ExecutiveDashboard />}
      {user?.role === "developer" && <DeveloperDashboard />}

      {!user?.role && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      )}
    </div>
  );
}
