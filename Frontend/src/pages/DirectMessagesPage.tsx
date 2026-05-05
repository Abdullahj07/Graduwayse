import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type UserRole = "GRADUATE" | "EMPLOYER";

const UNSEND_TIME_LIMIT_MINUTES = 10;

type DirectContact = {
  id: number;
  full_name: string;
  email: string;
  role: UserRole;
  university?: string;
  degree?: string;
  location?: string;
};

type DirectConversation = {
  id: number;
  contact: DirectContact;
  unread_messages: number;
  last_message?: string | null;
  last_message_at?: string | null;
  last_message_sender?: string | null;
  updated_at?: string;
  created_at?: string;
};

type ChatMessage = {
  id: number;
  sender: string;
  message: string;
  created_at?: string;
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

type ChatErrorPayload = {
  type: "chat_error";
  message: string;
};

type SocketPayload =
  | ChatHistoryPayload
  | ChatMessagePayload
  | ChatDeletedPayload
  | ChatErrorPayload;

type Props = {
  role: UserRole;
  initialTargetUserId?: number | null;
};

export default function DirectMessagesPage({
  role,
  initialTargetUserId = null,
}: Props) {
  const { user } = useAuth();

  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messagesByConversation, setMessagesByConversation] = useState<
    Record<number, ChatMessage[]>
  >({});
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [contactsSearch, setContactsSearch] = useState("");
  const [contacts, setContacts] = useState<DirectContact[]>([]);
  const [showNewMessagePanel, setShowNewMessagePanel] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [startingConversation, setStartingConversation] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const socketsRef = useRef<Record<number, WebSocket>>({});
  const selectedConversationIdRef = useRef<number | null>(null);
  const lastStartedTargetRef = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  selectedConversationIdRef.current = selectedConversationId;

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

  function getConversationName(conversation: DirectConversation) {
    return conversation.contact.full_name || conversation.contact.email || "User";
  }

  function getConversationSubtitle(conversation: DirectConversation) {
    const bits = [
      conversation.contact.university,
      conversation.contact.degree,
      conversation.contact.location,
    ].filter(Boolean);

    if (bits.length > 0) return bits.join(" • ");

    return conversation.contact.role === "EMPLOYER" ? "Employer" : "Graduate";
  }

  function isMe(sender: string) {
    const normalizedSender = sender.trim().toLowerCase();
    const currentEmail = user?.email?.trim().toLowerCase();
    return !!currentEmail && normalizedSender === currentEmail;
  }

  function canUnsendMessage(createdAt?: string) {
    if (!createdAt) return false;

    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return false;

    const diffMs = Date.now() - created.getTime();
    const limitMs = UNSEND_TIME_LIMIT_MINUTES * 60 * 1000;

    return diffMs <= limitMs;
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

  function formatSidebarTime(value?: string | null) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const sameDay = new Date().toDateString() === date.toDateString();

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

  function syncConversationPreview(conversationId: number, nextMessages: ChatMessage[]) {
    const last = nextMessages[nextMessages.length - 1];

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              last_message: last?.message ?? null,
              last_message_at: last?.created_at ?? null,
              last_message_sender: last?.sender ?? null,
            }
          : conversation
      )
    );
  }

  async function loadConversations() {
    const res = await api.get<DirectConversation[]>("/chat/direct-conversations/");
    return res.data || [];
  }

  async function loadContacts(searchTerm = "") {
    setLoadingContacts(true);

    try {
      const res = await api.get<DirectContact[]>("/chat/direct-contacts/", {
        params: searchTerm.trim() ? { search: searchTerm.trim() } : undefined,
      });
      setContacts(res.data || []);
    } catch {
      setActionError("Failed to load contacts.");
    } finally {
      setLoadingContacts(false);
    }
  }

  async function startConversation(targetUserId: number) {
    setStartingConversation(targetUserId);

    try {
      const res = await api.post<DirectConversation>("/chat/direct-conversations/start/", {
        target_user_id: targetUserId,
      });

      const createdConversation = res.data;

      setConversations((prev) => {
        const withoutCurrent = prev.filter((item) => item.id !== createdConversation.id);
        return [createdConversation, ...withoutCurrent];
      });

      setSelectedConversationId(createdConversation.id);
      setShowNewMessagePanel(false);
      setActionError(null);
    } catch (err: any) {
      const data = err?.response?.data;
      setActionError(typeof data === "object" ? JSON.stringify(data) : "Failed to start conversation.");
    } finally {
      setStartingConversation(null);
    }
  }

  function moveConversationToTop(
    conversationId: number,
    patch?: Partial<DirectConversation> | ((current: DirectConversation) => Partial<DirectConversation>)
  ) {
    setConversations((prev) => {
      const current = prev.find((item) => item.id === conversationId);
      if (!current) return prev;

      const nextPatch = typeof patch === "function" ? patch(current) : patch || {};
      const updated = { ...current, ...nextPatch };

      return [updated, ...prev.filter((item) => item.id !== conversationId)];
    });
  }

  function handleSocketPayload(conversationId: number, raw: unknown) {
    const data = raw as SocketPayload;

    if (data.type === "chat_error") {
      setActionError(data.message);
      return;
    }

    if (data.type === "chat_history") {
      const history = Array.isArray(data.messages) ? data.messages : [];
      let nextMessages: ChatMessage[] = [];

      setMessagesByConversation((prev) => {
        nextMessages = mergeMessages(history, prev[conversationId] || []);
        return {
          ...prev,
          [conversationId]: nextMessages,
        };
      });

      syncConversationPreview(conversationId, nextMessages);
      return;
    }

    if (data.type === "chat_message") {
      const message: ChatMessage = {
        id: data.id,
        sender: data.sender,
        message: data.message,
        created_at: data.created_at,
      };

      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: appendUniqueMessage(prev[conversationId] || [], message),
      }));

      moveConversationToTop(conversationId, (current) => {
        const isActive = selectedConversationIdRef.current === conversationId;
        const mine = isMe(message.sender);

        return {
          last_message: message.message,
          last_message_at: message.created_at || new Date().toISOString(),
          last_message_sender: message.sender,
          unread_messages: isActive
            ? 0
            : mine
            ? current.unread_messages
            : current.unread_messages + 1,
        };
      });

      return;
    }

    if (data.type === "chat_message_deleted") {
      let nextMessages: ChatMessage[] = [];

      setMessagesByConversation((prev) => {
        nextMessages = (prev[conversationId] || []).filter(
          (message) => message.id !== data.message_id
        );

        return {
          ...prev,
          [conversationId]: nextMessages,
        };
      });

      syncConversationPreview(conversationId, nextMessages);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setActionError(null);
        const list = await loadConversations();

        if (cancelled) return;

        setConversations(list);

        if (list.length > 0) {
          setSelectedConversationId((current) => {
            if (current && list.some((item) => item.id === current)) return current;
            return list[0].id;
          });
        } else {
          setSelectedConversationId(null);
        }
      } catch {
        if (!cancelled) {
          setActionError("Failed to load messages.");
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialTargetUserId) return;
    if (lastStartedTargetRef.current === initialTargetUserId) return;

    lastStartedTargetRef.current = initialTargetUserId;
    startConversation(initialTargetUserId);
  }, [initialTargetUserId]);

  useEffect(() => {
    if (!showNewMessagePanel) return;
    loadContacts(contactsSearch);
  }, [showNewMessagePanel]);

  useEffect(() => {
    if (!showNewMessagePanel) return;

    const timeout = window.setTimeout(() => {
      loadContacts(contactsSearch);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [contactsSearch, showNewMessagePanel]);

  useEffect(() => {
    if (!conversations.length) {
      setSelectedConversationId(null);
      return;
    }

    if (
      selectedConversationId &&
      conversations.some((item) => item.id === selectedConversationId)
    ) {
      return;
    }

    setSelectedConversationId(conversations[0].id);
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === selectedConversationId
          ? { ...conversation, unread_messages: 0 }
          : conversation
      )
    );
  }, [selectedConversationId]);

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
      const conversationId = Number(key);
      if (!currentIds.has(conversationId)) {
        socketsRef.current[conversationId]?.close();
        delete socketsRef.current[conversationId];
      }
    }

    for (const conversation of conversations) {
      if (socketsRef.current[conversation.id]) continue;

      const socket = new WebSocket(
        `ws://127.0.0.1:8000/ws/direct-conversations/${conversation.id}/?token=${token}`
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
    () => conversations.find((item) => item.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const selectedMessages = useMemo(() => {
    if (!selectedConversationId) return [];
    return messagesByConversation[selectedConversationId] || [];
  }, [messagesByConversation, selectedConversationId]);

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;

    return conversations.filter((conversation) => {
      const name = getConversationName(conversation).toLowerCase();
      const subtitle = getConversationSubtitle(conversation).toLowerCase();
      const preview = (conversation.last_message || "").toLowerCase();

      return name.includes(term) || subtitle.includes(term) || preview.includes(term);
    });
  }, [conversations, search]);

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
      setActionError("Conversation is not connected right now.");
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
      "Remove this conversation from your messages? It will only be removed for you."
    );
    if (!confirmed) return;

    try {
      await api.post(`/chat/direct-conversations/${selectedConversation.id}/hide/`);

      const hiddenId = selectedConversation.id;

      setConversations((prev) => prev.filter((item) => item.id !== hiddenId));
      setMessagesByConversation((prev) => {
        const next = { ...prev };
        delete next[hiddenId];
        return next;
      });

      const socket = socketsRef.current[hiddenId];
      if (socket) {
        socket.close();
        delete socketsRef.current[hiddenId];
      }

      setSelectedConversationId((prev) => {
        if (prev !== hiddenId) return prev;
        const remaining = conversations.filter((item) => item.id !== hiddenId);
        return remaining[0]?.id ?? null;
      });

      setActionError(null);
    } catch {
      setActionError("Failed to remove conversation.");
    }
  }

  return (
    <>
      {showNewMessagePanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">New message</h2>
                <p className="text-sm text-slate-500">
                  {role === "EMPLOYER"
                    ? "Start a conversation with a graduate."
                    : "Start a conversation with an employer."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewMessagePanel(false)}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="p-6">
              <input
                value={contactsSearch}
                onChange={(e) => setContactsSearch(e.target.value)}
                placeholder={
                  role === "EMPLOYER"
                    ? "Search graduates..."
                    : "Search employers..."
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
              />

              <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
                {loadingContacts ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Loading contacts...
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    No contacts found.
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => startConversation(contact.id)}
                      disabled={startingConversation === contact.id}
                      className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                        {getInitials(contact.full_name || contact.email)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {contact.full_name || contact.email}
                        </div>
                        <div className="truncate text-sm text-slate-500">
                          {contact.email}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-400">
                          {[contact.university, contact.degree, contact.location]
                            .filter(Boolean)
                            .join(" • ") || contact.role}
                        </div>
                      </div>

                      <div className="shrink-0 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white">
                        {startingConversation === contact.id ? "Opening..." : "Message"}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="h-[calc(100vh-160px)] min-h-[640px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex h-full">
          <aside className="flex w-[360px] shrink-0 flex-col border-r border-slate-200 bg-slate-50">
            <div className="border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Messages</h2>
                  <p className="text-sm text-slate-500">
                    {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setContactsSearch("");
                    setShowNewMessagePanel(true);
                  }}
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  New
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {getInitials(getCurrentUserDisplayName())}
                </div>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="ml-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {filteredConversations.length === 0 ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                  No direct conversations yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConversations.map((conversation) => {
                    const active = conversation.id === selectedConversationId;
                    const preview = conversation.last_message
                      ? `${isMe(conversation.last_message_sender || "") ? "You: " : ""}${conversation.last_message}`
                      : getConversationSubtitle(conversation);

                    return (
                      <div
                        key={conversation.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedConversationId(conversation.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedConversationId(conversation.id);
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
                            {getInitials(getConversationName(conversation))}
                          </div>

                          {conversation.unread_messages > 0 && (
                            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                              {conversation.unread_messages > 99
                                ? "99+"
                                : conversation.unread_messages}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="truncate text-sm font-semibold text-slate-900">
                              {getConversationName(conversation)}
                            </div>
                            <div className="shrink-0 text-[11px] text-slate-400">
                              {formatSidebarTime(conversation.last_message_at)}
                            </div>
                          </div>

                          <div className="mt-0.5 truncate text-xs font-medium text-slate-500">
                            {getConversationSubtitle(conversation)}
                          </div>

                          <div
                            className={`mt-1 truncate text-sm ${
                              conversation.unread_messages > 0
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
                Select a conversation or start a new message.
              </div>
            ) : (
              <>
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {getInitials(getConversationName(selectedConversation))}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {getConversationName(selectedConversation)}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {getConversationSubtitle(selectedConversation)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={hideSelectedConversation}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    Delete conversation
                  </button>
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
                        No messages yet. Start the conversation.
                      </div>
                    ) : (
                      selectedMessages.map((message) => {
                        const mine = isMe(message.sender);

                        return (
                          <div
                            key={message.id}
                            className={`group flex items-end gap-2 ${
                              mine ? "justify-end" : "justify-start"
                            }`}
                          >
                            {!mine && (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-300 text-[11px] font-semibold text-slate-700">
                                {getInitials(getConversationName(selectedConversation))}
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
    </>
  );
}