"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";

interface Column {
  key: string;
  label: string;
}

interface TabConfig {
  key: string;
  label: string;
  // Proxy path under /proxy/{type}/... e.g. "stories"
  path: string;
  // Key in the JSON response that holds the array of rows
  dataKey: string;
  columns: Column[];
}

// Per-system tab definitions. Paths map to the mock services' flat list
// endpoints, fetched through the backend proxy: /proxy/{type}/{path}.
const TABS_BY_TYPE: Record<string, TabConfig[]> = {
  jira: [
    {
      key: "stories",
      label: "Stories",
      path: "stories",
      dataKey: "stories",
      columns: [
        { key: "id", label: "ID" },
        { key: "title", label: "Title" },
        { key: "status", label: "Status" },
        { key: "priority", label: "Priority" },
        { key: "story_points", label: "Points" },
        { key: "assignee", label: "Assignee" },
      ],
    },
    {
      key: "projects",
      label: "Projects",
      path: "projects",
      dataKey: "projects",
      columns: [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "lead", label: "Lead" },
        { key: "status", label: "Status" },
      ],
    },
    {
      key: "developers",
      label: "Developers",
      path: "developers",
      dataKey: "developers",
      columns: [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
      ],
    },
  ],
  github: [
    {
      key: "pulls",
      label: "Pull Requests",
      path: "pulls",
      dataKey: "pull_requests",
      columns: [
        { key: "number", label: "#" },
        { key: "title", label: "Title" },
        { key: "author", label: "Author" },
        { key: "status", label: "Status" },
        { key: "repo_id", label: "Repo" },
        { key: "linked_story", label: "Story" },
      ],
    },
    {
      key: "repos",
      label: "Repositories",
      path: "repos",
      dataKey: "repos",
      columns: [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "language", label: "Language" },
        { key: "open_issues", label: "Open Issues" },
      ],
    },
  ],
  confluence: [
    {
      key: "pages",
      label: "Pages",
      path: "pages",
      dataKey: "pages",
      columns: [
        { key: "id", label: "ID" },
        { key: "title", label: "Title" },
        { key: "space_id", label: "Space" },
        { key: "author", label: "Author" },
        { key: "last_updated", label: "Updated" },
      ],
    },
    {
      key: "spaces",
      label: "Spaces",
      path: "spaces",
      dataKey: "spaces",
      columns: [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "description", label: "Description" },
      ],
    },
  ],
  servicenow: [
    {
      key: "deployments",
      label: "Deployments",
      path: "deployments",
      dataKey: "deployments",
      columns: [
        { key: "id", label: "ID" },
        { key: "service", label: "Service" },
        { key: "environment", label: "Env" },
        { key: "version", label: "Version" },
        { key: "status", label: "Status" },
        { key: "linked_story", label: "Story" },
      ],
    },
    {
      key: "incidents",
      label: "Incidents",
      path: "incidents",
      dataKey: "incidents",
      columns: [
        { key: "id", label: "ID" },
        { key: "title", label: "Title" },
        { key: "severity", label: "Severity" },
        { key: "status", label: "Status" },
        { key: "affected_service", label: "Service" },
        { key: "linked_deployment", label: "Deployment" },
      ],
    },
  ],
};

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

interface ViewDataModalProps {
  type: string;
  name: string;
  onClose: () => void;
}

export default function ViewDataModal({ type, name, onClose }: ViewDataModalProps) {
  const tabs = useMemo(() => TABS_BY_TYPE[type] ?? [], [type]);
  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? "");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [rawJson, setRawJson] = useState<string>("");

  const currentTab = tabs.find((t) => t.key === activeTab) ?? tabs[0];

  useEffect(() => {
    if (!currentTab) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const result = await api.get<Record<string, unknown>>(
        `/proxy/${type}/${currentTab.path}`
      );
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
        setRows([]);
        setRawJson("");
      } else {
        const payload = result.data ?? {};
        setRawJson(JSON.stringify(payload, null, 2));
        const data = (payload[currentTab.dataKey] as Record<string, unknown>[]) ?? [];
        setRows(Array.isArray(data) ? data : []);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [type, currentTab]);

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Data for ${name}`}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{name} — Data</h2>
            <p className="text-xs text-gray-500 capitalize">{type} connection</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Tabs + raw toggle */}
        <div className="flex items-center justify-between px-6 pt-3 border-b border-gray-200">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setShowRaw(false);
                }}
                className={`px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
                  currentTab?.key === tab.key
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowRaw((v) => !v)}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            {showRaw ? "Table view" : "Raw JSON"}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span>Loading data...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          ) : showRaw ? (
            <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-4 overflow-auto">
              {rawJson}
            </pre>
          ) : rows.length === 0 ? (
            <p className="text-gray-500 text-sm">No records found.</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    {currentTab?.columns.map((col) => (
                      <th key={col.key} className="py-2 pr-4 font-medium">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={(row.id as string) ?? i}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      {currentTab?.columns.map((col) => (
                        <td key={col.key} className="py-2 pr-4 text-gray-800 align-top">
                          {formatCell(row[col.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-gray-400 mt-3">{rows.length} record(s)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
