"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

interface Sprint {
  id: string;
  name: string;
  status: string;
  velocity: number | null;
  completed_points?: number;
  total_points?: number;
}

export default function VelocityWidget({ projectId = "PAY" }: { projectId?: string }) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    setLoading(true);
    const result = await api.get<{ sprints: Sprint[] }>(`/proxy/jira/sprints/${projectId}`);
    if (result.data) {
      setSprints(result.data.sprints);
    }
    setLoading(false);
  }

  if (loading) return <div className="text-sm text-gray-400">Loading...</div>;

  const completedSprints = sprints.filter((s) => s.status === "completed" && s.velocity);
  const avgVelocity = completedSprints.length > 0
    ? Math.round(completedSprints.reduce((sum, s) => sum + (s.velocity || 0), 0) / completedSprints.length)
    : 0;

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold text-gray-900">{avgVelocity}</span>
        <span className="text-sm text-gray-500">avg pts/sprint</span>
      </div>
      <div className="space-y-2">
        {sprints.map((sprint) => (
          <div key={sprint.id} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20 truncate">{sprint.name}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-4">
              {sprint.velocity && (
                <div
                  className="bg-blue-500 rounded-full h-4 flex items-center justify-end pr-1.5"
                  style={{ width: `${Math.min(100, (sprint.velocity / 40) * 100)}%` }}
                >
                  <span className="text-[10px] text-white font-medium">
                    {sprint.velocity}
                  </span>
                </div>
              )}
              {sprint.status === "active" && sprint.completed_points !== undefined && (
                <div
                  className="bg-green-500 rounded-full h-4 flex items-center justify-end pr-1.5"
                  style={{ width: `${Math.min(100, ((sprint.completed_points || 0) / (sprint.total_points || 1)) * 100)}%` }}
                >
                  <span className="text-[10px] text-white font-medium">
                    {sprint.completed_points}/{sprint.total_points}
                  </span>
                </div>
              )}
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              sprint.status === "completed" ? "bg-green-100 text-green-700" :
              sprint.status === "active" ? "bg-blue-100 text-blue-700" :
              "bg-gray-100 text-gray-600"
            }`}>
              {sprint.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
