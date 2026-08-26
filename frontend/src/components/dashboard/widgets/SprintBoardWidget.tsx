"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";

interface Story {
  id: string;
  title: string;
  story_points: number;
  assignee: string | null;
  status: string;
}

interface BoardData {
  sprint: { name: string; start_date: string; end_date: string } | null;
  columns: Record<string, Story[]>;
}

export default function SprintBoardWidget({ projectId = "PAY" }: { projectId?: string }) {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    setLoading(true);
    const result = await api.get<BoardData>(`/proxy/jira/projects/${projectId}/board`);
    if (result.data) {
      setData(result.data);
    }
    setLoading(false);
  }

  if (loading) return <div className="text-sm text-gray-400">Loading...</div>;
  if (!data?.sprint) return <div className="text-sm text-gray-500">No active sprint</div>;

  const statusColors: Record<string, string> = {
    todo: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    in_review: "bg-yellow-100 text-yellow-700",
    done: "bg-green-100 text-green-700",
  };

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">
        {data.sprint.name} ({data.sprint.start_date} to {data.sprint.end_date})
      </p>
      <div className="grid grid-cols-4 gap-2">
        {["todo", "in_progress", "in_review", "done"].map((col) => (
          <div key={col}>
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">
              {col.replace("_", " ")} ({(data.columns[col] || []).length})
            </p>
            <div className="space-y-1.5">
              {(data.columns[col] || []).map((story) => (
                <div
                  key={story.id}
                  className={`rounded px-2 py-1.5 text-xs ${statusColors[col]}`}
                >
                  <p className="font-medium truncate">{story.id}</p>
                  <p className="truncate opacity-75">{story.title}</p>
                  <p className="opacity-60">{story.story_points}pts</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
