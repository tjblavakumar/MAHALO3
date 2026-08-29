"use client";

import { useEffect, useRef, useState } from "react";
import { useProjects } from "@/contexts/ProjectContext";
import { api } from "@/services/api";
import ChatInput from "@/components/chat/ChatInput";
import ChatMessage from "@/components/chat/ChatMessage";
import ProposalCard from "@/components/chat/ProposalCard";
import ContextPanel from "@/components/chat/ContextPanel";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  systemsQueried?: string[];
  proposal?: Proposal | null;
}

interface Proposal {
  action: string;
  system: string;
  params: Record<string, unknown>;
  description: string;
}

interface ActionResult {
  success: boolean;
  message: string;
}

interface ChatApiResponse {
  response: string;
  proposal: Proposal | null;
  systems_queried: string[];
  session_id: string;
}

export default function ChatPage() {
  const { activeProject } = useProjects();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, ActionResult>>({});
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [contextPanel, setContextPanel] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
    type: "story" | "document" | "pr";
  }>({ isOpen: false, title: "", content: "", type: "story" });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(message: string) {
    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: message,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const result = await api.post<ChatApiResponse>("/chat", {
      message,
      session_id: sessionId,
      project_id: activeProject?.id ?? null,
    });

    if (result.data) {
      if (!sessionId) {
        setSessionId(result.data.session_id);
      }

      const assistantMsg: Message = {
        id: `msg-${Date.now()}-resp`,
        role: "assistant",
        content: result.data.response,
        systemsQueried: result.data.systems_queried,
        proposal: result.data.proposal,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } else {
      const errorMsg: Message = {
        id: `msg-${Date.now()}-err`,
        role: "assistant",
        content: `Sorry, I encountered an error: ${result.error}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    }
    setIsLoading(false);
  }

  async function handleApprove(msgId: string) {
    if (!sessionId) return;
    setApprovingId(msgId);

    const result = await api.post<ActionResult>("/chat/approve", {
      session_id: sessionId,
      approved: true,
    });

    if (result.data) {
      setActionResults((prev) => ({ ...prev, [msgId]: result.data! }));
    }
    setApprovingId(null);
  }

  async function handleReject(msgId: string) {
    if (!sessionId) return;
    setApprovingId(msgId);

    const result = await api.post<ActionResult>("/chat/approve", {
      session_id: sessionId,
      approved: false,
    });

    if (result.data) {
      setActionResults((prev) => ({ ...prev, [msgId]: result.data! }));
    }
    setApprovingId(null);
  }

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <h1 className="text-lg font-semibold text-gray-900">AI Assistant</h1>
          <p className="text-sm text-gray-500">
            Ask about your projects, sprints, documentation, and code
          </p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">💬</p>
              <h2 className="text-lg font-medium text-gray-700 mb-2">
                How can I help you today?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto mt-6">
                {[
                  "What is the status of the payment gateway?",
                  "Show me the current sprint board for CART",
                  "What are our PCI compliance requirements?",
                  "Show open pull requests for the auth service",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSend(suggestion)}
                    className="text-left px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id}>
              <ChatMessage
                role={msg.role}
                content={msg.content}
                systemsQueried={msg.systemsQueried}
              />
              {msg.proposal && (
                <ProposalCard
                  proposal={msg.proposal}
                  onApprove={() => handleApprove(msg.id)}
                  onReject={() => handleReject(msg.id)}
                  isLoading={approvingId === msg.id}
                  result={actionResults[msg.id]}
                />
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </div>
      </div>

      {/* Context Panel */}
      <ContextPanel
        isOpen={contextPanel.isOpen}
        onClose={() => setContextPanel((prev) => ({ ...prev, isOpen: false }))}
        title={contextPanel.title}
        content={contextPanel.content}
        type={contextPanel.type}
      />
    </div>
  );
}
