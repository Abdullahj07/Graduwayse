import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { WS_BASE_URL } from "../api/config";

type UserRole = "GRADUATE" | "EMPLOYER";

const UNSEND_TIME_LIMIT_MINUTES = 10;

type InternalJob = {
  id: number;
  title?: string;
};

type Application = {
  id: number;
  applicant?: {
    full_name: string;
    email: string;
  };
  full_name?: string;
  unread_messages: number;
  job?: {
    id?: number;
    title?: string;
  };
  job_title?: string;
  status?: string;
};

type ChatMessage = {
  id: number;
  sender: string;
  message: string;
  created_at?: string;
};

type Conversation = Application & {
  unread_count_local: number;
  last_message?: string;
  last_message_at?: string;
  last_message_sender?: string;
};

type ChatHistoryPayload = {
  type: "chat_history";
  messages?: ChatMessage[];
};

type ChatMessagePayload = {
  type: "chat_message";
  id: number;
  sender: string;
  message: string;
  created_at?: string;
};

type ChatDeletedPayload = {
  type: "chat_message_deleted";
  message_id: number;
};

type SocketPayload =
  | ChatHistoryPayload
  | ChatMessagePayload
  | ChatDeletedPayload
  | ChatErrorPayload;

type Props = {
  role: UserRole;
  initialApplicationId?: number | null;
};

type ChatErrorPayload = {
  type: "chat_error";
  message: string;
};

export default function ChatsPage({
  role,
  initialApplicationId = null,
}: Props) {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [messagesByApp, setMessagesByApp] = useState<Record<number, ChatMessage[]>>(
    {}
  );
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const socketsRef = useRef<Record<number, WebSocket>>({});
  const selectedAppIdRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  selectedAppIdRef.current = selectedAppId;

  function getName(app: Application) {
    return app.full_name || app.applicant?.full_name || "User";
  }

  function getJob(app: Application) {
    return app.job?.title || app.job_title || `Application #${app.id}`;
  }

  function getCurrentUserDisplayName() {
    if (user?.email) return user.email.split("@")[0];
    return role === "EMPLOYER" ? "Employer" : "Graduate";
  }

  function getInitials(value: string) {
    const cleaned = value.trim();
    if (!cleaned) return "?";

    const parts = cleaned
      .replace(/[_\-.]+/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase() || "?";
    }

    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function isMe(sender: string) {
  const normalizedSender = sender.trim().toLowerCase();
  const currentEmail = user?.email?.trim().toLowerCase();

  if (currentEmail && normalizedSender === currentEmail) {
    return true;
  }

  return role === "EMPLOYER"
    ? normalizedSender === "employer"
    : normalizedSender === "graduate";
}

  function formatBubbleTime(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatSidebarTime(value?: string) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const now = new Date();
    const sameDay = now.toDateString() === date.toDateString();

    if (sameDay) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
    });
  }

  function getMessageKey(message: ChatMessage) {
    return String(message.id);
  }

  function mergeMessages(history: ChatMessage[], existing: ChatMessage[]) {
    const merged = [...history, ...existing];
    const byId = new Map<number, ChatMessage>();

    for (const item of merged) {
      byId.set(item.id, item);
    }

    return Array.from(byId.values()).sort((a, b) => {
      if (!a.created_at || !b.created_at) return a.id - b.id;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  function appendUniqueMessage(list: ChatMessage[], message: ChatMessage) {
    const exists = list.some((item) => item.id === message.id);
    if (exists) return list;
    return [...list, message];
  }

  function syncConversationPreview(applicationId: number, nextMessages: ChatMessage[]) {
    const last = nextMessages[nextMessages.length - 1];

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === applicationId
          ? {
              ...conversation,
              last_message: last?.message,
              last_message_at: last?.created_at,
              last_message_sender: last?.sender,
            }
          : conversation
      )
    );
  }

  async function loadGraduate() {
    const res = await api.get<Application[]>("/applications/mine/?for_chat=1");
    return res.data || [];
  }

  async function loadEmployer() {
    const jobs = (await api.get<InternalJob[]>("/internal-jobs/mine/")).data || [];

    const results = await Promise.all(
      jobs.map((job) => api.get<Application[]>(`/applications/job/${job.id}/?for_chat=1`))
    );

    return results.flatMap((result, i) =>
      (result.data || []).map((app) => ({
        ...app,
        job_title: app.job_title || jobs[i].title || "Untitled Job",
      }))
    );
  }

  function canUnsendMessage(createdAt?: string) {
  if (!createdAt) return false;

  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return false;

  const diffMs = Date.now() - created.getTime();
  const limitMs = UNSEND_TIME_LIMIT_MINUTES * 60 * 1000;

  return diffMs <= limitMs;
}

  function moveConversationToTop(
    applicationId: number,
    patch?: Partial<Conversation> | ((current: Conversation) => Partial<Conversation>)
  ) {
    setConversations((prev) => {
      const current = prev.find((item) => item.id === applicationId);
      if (!current) return prev;

      const nextPatch = typeof patch === "function" ? patch(current) : patch || {};
      const updated = { ...current, ...nextPatch };

      return [updated, ...prev.filter((item) => item.id !== applicationId)];
    });
  }

  function handleSocketPayload(applicationId: number, raw: unknown) {
    const data = raw as SocketPayload;

    if (data.type === "chat_error") {
  setActionError(data.message);
  return;
}

    if (data.type === "chat_history") {
      const history = Array.isArray(data.messages) ? data.messages : [];
      let nextMessages: ChatMessage[] = [];

      setMessagesByApp((prev) => {
        nextMessages = mergeMessages(history, prev[applicationId] || []);
        return {
          ...prev,
          [applicationId]: nextMessages,
        };
      });

      syncConversationPreview(applicationId, nextMessages);
      return;
    }

    if (data.type === "chat_message") {
      const message: ChatMessage = {
        id: data.id,
        sender: data.sender,
        message: data.message,
        created_at: data.created_at,
      };

      let nextMessages: ChatMessage[] = [];

      setMessagesByApp((prev) => {
        nextMessages = appendUniqueMessage(prev[applicationId] || [], message);
        return {
          ...prev,
          [applicationId]: nextMessages,
        };
      });

      moveConversationToTop(applicationId, (current) => {
        const isActive = selectedAppIdRef.current === applicationId;
        const mine = isMe(message.sender);

        return {
          last_message: message.message,
          last_message_at: message.created_at || new Date().toISOString(),
          last_message_sender: message.sender,
          unread_count_local: isActive
            ? 0
            : mine
            ? current.unread_count_local
            : current.unread_count_local + 1,
        };
      });

      return;
    }

    if (data.type === "chat_message_deleted") {
      let nextMessages: ChatMessage[] = [];

      setMessagesByApp((prev) => {
        nextMessages = (prev[applicationId] || []).filter(
          (message) => message.id !== data.message_id
        );

        return {
          ...prev,
          [applicationId]: nextMessages,
        };
      });

      syncConversationPreview(applicationId, nextMessages);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setActionError(null);

        const list =
          role === "EMPLOYER" ? await loadEmployer() : await loadGraduate();

        if (cancelled) return;

        const nextConversations: Conversation[] = list.map((item) => ({
          ...item,
          unread_count_local: item.unread_messages || 0,
          last_message: undefined,
          last_message_at: undefined,
          last_message_sender: undefined,
        }));

        setConversations(nextConversations);

        if (nextConversations.length === 0) {
          setSelectedAppId(null);
          setMessagesByApp({});
          return;
        }

        const matched = nextConversations.find(
          (item) => item.id === initialApplicationId
        );

        setSelectedAppId(matched?.id || nextConversations[0].id);
      } catch {
        if (!cancelled) {
          setActionError("Failed to load chats.");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [role, initialApplicationId]);

  useEffect(() => {
    if (!conversations.length) {
      setSelectedAppId(null);
      return;
    }

    if (selectedAppId && conversations.some((item) => item.id === selectedAppId)) {
      return;
    }

    const matched = conversations.find((item) => item.id === initialApplicationId);
    setSelectedAppId(matched?.id || conversations[0].id);
  }, [conversations, initialApplicationId, selectedAppId]);

  useEffect(() => {
    if (!selectedAppId) return;

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === selectedAppId
          ? { ...conversation, unread_count_local: 0 }
          : conversation
      )
    );
  }, [selectedAppId]);

  const conversationIdsKey = useMemo(
    () =>
      conversations
        .map((item) => item.id)
        .sort((a, b) => a - b)
        .join(","),
    [conversations]
  );

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) return;

    const currentIds = new Set(conversations.map((item) => item.id));

    for (const key of Object.keys(socketsRef.current)) {
      const appId = Number(key);
      if (!currentIds.has(appId)) {
        socketsRef.current[appId]?.close();
        delete socketsRef.current[appId];
      }
    }

    for (const conversation of conversations) {
      if (socketsRef.current[conversation.id]) continue;

      const socket = new WebSocket(
        `${WS_BASE_URL}/ws/applications/${conversation.id}/?token=${token}`
      );

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleSocketPayload(conversation.id, data);
      };

      socket.onclose = () => {
        delete socketsRef.current[conversation.id];
      };

      socketsRef.current[conversation.id] = socket;
    }
  }, [conversationIdsKey]);

  useEffect(() => {
    return () => {
      Object.values(socketsRef.current).forEach((socket) => socket.close());
      socketsRef.current = {};
    };
  }, []);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedAppId) || null,
    [conversations, selectedAppId]
  );

  const selectedMessages = useMemo(() => {
    if (!selectedAppId) return [];
    return messagesByApp[selectedAppId] || [];
  }, [messagesByApp, selectedAppId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: selectedMessages.length > 1 ? "smooth" : "auto",
    });
  }, [selectedMessages]);

  function send() {
    if (!selectedConversation) return;

    const socket = socketsRef.current[selectedConversation.id];
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    if (!input.trim()) return;

    socket.send(JSON.stringify({ message: input.trim() }));
    setInput("");
    setActionError(null);
  }

  function unsendMessage(messageId: number) {
    if (!selectedConversation) return;

    const socket = socketsRef.current[selectedConversation.id];
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setActionError("Chat is not connected right now.");
      return;
    }

    socket.send(
      JSON.stringify({
        action: "unsend",
        message_id: messageId,
      })
    );
    setActionError(null);
  }

  async function hideSelectedConversation() {
    if (!selectedConversation) return;

    const confirmed = window.confirm(
      "Remove this chat from your list? It will only be removed for you."
    );

    if (!confirmed) return;

    try {
      await api.post(`/chat/conversations/${selectedConversation.id}/hide/`);

      const hiddenId = selectedConversation.id;

      setConversations((prev) => {
        const remaining = prev.filter((item) => item.id !== hiddenId);
        const nextSelected =
          remaining.find((item) => item.id !== hiddenId)?.id ?? null;
        setSelectedAppId(nextSelected);
        return remaining;
      });

      setMessagesByApp((prev) => {
        const next = { ...prev };
        delete next[hiddenId];
        return next;
      });

      const socket = socketsRef.current[hiddenId];
      if (socket) {
        socket.close();
        delete socketsRef.current[hiddenId];
      }

      setActionError(null);
    } catch {
      setActionError("Failed to remove chat.");
    }
  }

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;

    return conversations.filter((conversation) => {
      const name = getName(conversation).toLowerCase();
      const job = getJob(conversation).toLowerCase();
      const preview = (conversation.last_message || "").toLowerCase();
      return name.includes(term) || job.includes(term) || preview.includes(term);
    });
  }, [conversations, search]);

  return (
    <div className="h-[calc(100vh-160px)] min-h-[640px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex h-full">
        <aside className="flex w-[360px] shrink-0 flex-col border-r border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Chats</h2>
                <p className="text-sm text-slate-500">
                  {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                {getInitials(getCurrentUserDisplayName())}
              </div>
            </div>

            <div className="mt-4">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search people, jobs, messages..."
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {filteredConversations.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                No conversations found.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredConversations.map((conversation) => {
                  const active = conversation.id === selectedAppId;
                  const preview = conversation.last_message
                    ? `${isMe(conversation.last_message_sender || "") ? "You: " : ""}${conversation.last_message}`
                    : getJob(conversation);

                  return (
                    <div
                      key={conversation.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedAppId(conversation.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedAppId(conversation.id);
                        }
                      }}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                        active
                          ? "border-slate-300 bg-slate-100 shadow-sm"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${
                            active
                              ? "bg-slate-900 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {getInitials(getName(conversation))}
                        </div>

                        {conversation.unread_count_local > 0 && (
                          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                            {conversation.unread_count_local > 99
                              ? "99+"
                              : conversation.unread_count_local}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {getName(conversation)}
                          </div>
                          <div className="shrink-0 text-[11px] text-slate-400">
                            {formatSidebarTime(conversation.last_message_at)}
                          </div>
                        </div>

                        <div className="mt-0.5 truncate text-xs font-medium text-slate-500">
                          {getJob(conversation)}
                        </div>

                        <div
                          className={`mt-1 truncate text-sm ${
                            conversation.unread_count_local > 0
                              ? "font-medium text-slate-800"
                              : "text-slate-500"
                          }`}
                        >
                          {preview}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col bg-[linear-gradient(to_bottom,#f8fafc,#f1f5f9)]">
          {!selectedConversation ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-slate-500">
              Select a conversation to start chatting.
            </div>
          ) : (
            <>
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {getInitials(getName(selectedConversation))}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {getName(selectedConversation)}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                      {getJob(selectedConversation)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden text-xs text-slate-400 sm:block">
                    {selectedConversation.status
                      ? `Application status: ${selectedConversation.status}`
                      : `Application #${selectedConversation.id}`}
                  </div>

                  <button
                    type="button"
                    onClick={hideSelectedConversation}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    Delete chat
                  </button>
                </div>
              </div>

              {actionError && (
                <div className="border-b border-rose-100 bg-rose-50 px-6 py-3 text-sm text-rose-600">
                  {actionError}
                </div>
              )}

              <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                <div className="space-y-4">
                  {selectedMessages.length === 0 ? (
                    <div className="flex h-[calc(100vh-360px)] items-center justify-center text-sm text-slate-500">
                      No messages yet. Say hello.
                    </div>
                  ) : (
                    selectedMessages.map((message) => {
                      const mine = isMe(message.sender);

                      return (
                        <div
                          key={getMessageKey(message)}
                          className={`group flex items-end gap-2 ${
                            mine ? "justify-end" : "justify-start"
                          }`}
                        >
                          {!mine && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[11px] font-semibold text-slate-700">
                              {getInitials(getName(selectedConversation))}
                            </div>
                          )}

                            {mine && canUnsendMessage(message.created_at) && (
                            <button
                                type="button"
                                onClick={() => unsendMessage(message.id)}
                                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-500 opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-slate-900"
                              >
                                Unsend
                            </button>
                          )}

                          <div
                            className={`max-w-[75%] rounded-3xl px-4 py-3 shadow-sm sm:max-w-[68%] ${
                              mine
                                ? "rounded-br-md bg-indigo-600 text-white"
                                : "rounded-bl-md border border-slate-200 bg-white text-slate-900"
                            }`}
                          >
                            <div className="whitespace-pre-wrap break-words text-sm leading-6">
                              {message.message}
                            </div>

                            <div
                              className={`mt-1 text-right text-[11px] ${
                                mine ? "text-indigo-100/90" : "text-slate-400"
                              }`}
                            >
                              {formatBubbleTime(message.created_at)}
                            </div>
                          </div>

                          {mine && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700">
                              {getInitials(getCurrentUserDisplayName())}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  <div ref={bottomRef} />
                </div>
              </div>

              <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
                <div className="flex items-end gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                    {getInitials(getCurrentUserDisplayName())}
                  </div>

                  <div className="flex flex-1 items-end gap-3 rounded-[28px] border border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-indigo-500 focus-within:bg-white">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type a message"
                      className="min-h-[40px] flex-1 bg-transparent px-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                    />

                    <button
                      type="button"
                      onClick={send}
                      disabled={
                        !input.trim() ||
                        !selectedConversation ||
                        socketsRef.current[selectedConversation.id]?.readyState !==
                          WebSocket.OPEN
                      }
                      className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
