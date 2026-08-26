"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

interface Metrics {
  totalStories: number;
  storiesCompleted: number;
  openPRs: number;
  totalCommits: number;
}

export default function KeyMetricsWidget() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const projects = ["PAY", "CART", "AUTH", "PROD", "ORD"];
    const repos = ["repo-1", "repo-2", "repo-3", "repo-4", "repo-5"];
    let totalStories = 0;
    let storiesCompleted = 0;
    let openPRs = 0;
    let totalCommits = 0;

    for (const proj of projects) {
      const result = await api.get<{ stories: Array<{ status: string }> }>(`/proxy/jira/projects/${proj}/stories`);
      if (result.data) {
        totalStories += result.data.stories.length;
        storiesCompleted += result.data.stories.filter((s) => s.status === "done").length;
      }
    }

    for (const repo of repos) {
      const prResult = await api.get<{ pull_requests: Array<{ status: string }> }>(`/proxy/github/repos/${repo}/pulls`);
      if (prResult.data) {
        openPRs += prResult.data.pull_requests.filter((p) => p.status === "open").length;
      }
      const statsResult = await api.get<{ total_commits: number }>(`/proxy/github/repos/${repo}/stats`);
      if (statsResult.data) {
        totalCommits += statsResult.data.total_commits;
      }
    }

    setMetrics({ totalStories, storiesCompleted, openPRs, totalCommits });
    setLoading(false);
  }

  if (loading) return <div className="text-sm text-gray-400">Loading...</div>;
  if (!metrics) return null;

  const items = [
    { label: "Stories Completed", value: metrics.storiesCompleted, total: metrics.totalStories, color: "text-green-600" },
    { label: "Open PRs", value: metrics.openPRs, color: "text-blue-600" },
    { label: "Total Commits", value: metrics.totalCommits, color: "text-purple-600" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.label} className="text-center">
          <p className={`text-2xl font-bold ${item.color}`}>
            {item.value}
            {item.total && <span className="text-sm text-gray-400">/{item.total}</span>}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
