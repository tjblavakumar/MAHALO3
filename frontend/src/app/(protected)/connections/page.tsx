"use client";

import { useEffect, useState } from "react";
import { api } from "@/services/api";
import ViewDataModal from "@/components/connections/ViewDataModal";

interface Integration {
  id: number;
  user_id: number;
  type: string;
  name: string;
  url: string;
  project_scope: string | null;
  created_at: string;
}

interface TestResult {
  success: boolean;
  message: string;
  service_info?: Record<string, string>;
}

const INTEGRATION_TYPES = [
  { value: "jira", label: "Jira", icon: "📋", defaultPort: 5001 },
  { value: "confluence", label: "Confluence", icon: "📄", defaultPort: 5002 },
  { value: "github", label: "GitHub", icon: "🐙", defaultPort: 5003 },
  { value: "servicenow", label: "ServiceNow", icon: "🛠️", defaultPort: 5004 },
];

export default function ConnectionsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [testResults, setTestResults] = useState<Record<number, TestResult>>({});
  const [testingId, setTestingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewData, setViewData] = useState<Integration | null>(null);

  // Form state
  const [formType, setFormType] = useState("jira");
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formToken, setFormToken] = useState("");
  const [formScope, setFormScope] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function loadIntegrations() {
    setLoading(true);
    const result = await api.get<Integration[]>("/integrations");
    if (result.data) {
      setIntegrations(result.data);
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const result = await api.post<Integration>("/integrations", {
      type: formType,
      name: formName,
      url: formUrl,
      token: formToken,
      project_scope: formScope || null,
    });

    if (result.error) {
      setFormError(result.error);
    } else {
      setShowForm(false);
      resetForm();
      loadIntegrations();
    }
    setSubmitting(false);
  }

  async function handleTest(id: number) {
    setTestingId(id);
    const result = await api.post<TestResult>(`/integrations/${id}/test`, {});
    if (result.data) {
      setTestResults((prev) => ({ ...prev, [id]: result.data! }));
    }
    setTestingId(null);
  }

  async function handleDelete(id: number) {
    await api.delete(`/integrations/${id}`);
    setIntegrations((prev) => prev.filter((i) => i.id !== id));
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function resetForm() {
    setFormType("jira");
    setFormName("");
    setFormUrl("");
    setFormToken("");
    setFormScope("");
    setFormError(null);
  }

  function prefillDefaults(type: string) {
    setFormType(type);
    const config = INTEGRATION_TYPES.find((t) => t.value === type);
    if (config) {
      setFormName(`My ${config.label}`);
      setFormUrl(`http://localhost:${config.defaultPort}`);
      setFormToken(`mock-${type}-token-12345`);
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Connections</h1>
          <p className="text-gray-600 mt-1">
            Manage your integrations with Jira, Confluence, GitHub, and ServiceNow.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + Add Connection
        </button>
      </div>

      {/* Add Connection Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            New Connection
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {INTEGRATION_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => prefillDefaults(type.value)}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    formType === type.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  <span className="text-2xl block mb-1">{type.icon}</span>
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 text-sm"
                  placeholder="My Jira"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL
                </label>
                <input
                  type="text"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 text-sm"
                  placeholder="http://localhost:5001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Token
                </label>
                <input
                  type="password"
                  value={formToken}
                  onChange={(e) => setFormToken(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 text-sm"
                  placeholder="Your API token"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Scope (optional)
                </label>
                <input
                  type="text"
                  value={formScope}
                  onChange={(e) => setFormScope(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 text-sm"
                  placeholder="e.g., PAY or payment-service"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Connection"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Integrations List */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          <span>Loading connections...</span>
        </div>
      ) : integrations.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-4xl mb-4">🔗</p>
          <p className="text-gray-500 mb-2">No connections configured yet.</p>
          <p className="text-gray-400 text-sm">
            Click &quot;Add Connection&quot; to connect Jira, Confluence, or GitHub.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration) => {
            const typeConfig = INTEGRATION_TYPES.find(
              (t) => t.value === integration.type
            );
            const testResult = testResults[integration.id];

            return (
              <div
                key={integration.id}
                className="bg-white rounded-lg shadow p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">
                    {typeConfig?.icon || "🔗"}
                  </span>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {integration.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {integration.url}
                      {integration.project_scope && (
                        <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {integration.project_scope}
                        </span>
                      )}
                    </p>
                    {testResult && (
                      <p
                        className={`text-xs mt-1 ${
                          testResult.success
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {testResult.success ? "✓" : "✗"}{" "}
                        {testResult.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTest(integration.id)}
                    disabled={testingId === integration.id}
                    className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-xs font-medium disabled:opacity-50"
                  >
                    {testingId === integration.id ? "Testing..." : "Test"}
                  </button>
                  <button
                    onClick={() => setViewData(integration)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-xs font-medium"
                  >
                    View data
                  </button>
                  <button
                    onClick={() => handleDelete(integration.id)}
                    className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewData && (
        <ViewDataModal
          type={viewData.type}
          name={viewData.name}
          onClose={() => setViewData(null)}
        />
      )}
    </div>
  );
}
