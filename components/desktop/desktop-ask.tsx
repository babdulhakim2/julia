'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAction, useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { askSecretaryStreaming } from '@/lib/assistant-client';
import { useStore } from '@/lib/store';
import { Ic } from '@/components/icons';
import { MarkdownMessage } from '@/components/shared/markdown-message';
import { DocumentPreviewModal } from '@/components/shared/document-preview-modal';
import { useSpeechToText } from '@/lib/use-speech-to-text';

interface ChatMessage {
  from: 'user' | 'bot';
  text: string;
  streaming?: boolean;
}

interface DesktopAskProps {
  initialThreadId?: Id<"chatThreads">;
}

const SIDEBAR_KEY = 'ask-sidebar-open';

function loadSidebarOpen(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const v = localStorage.getItem(SIDEBAR_KEY);
    return v === null ? true : v === 'true';
  } catch {
    return true;
  }
}

export function DesktopAsk({ initialThreadId }: DesktopAskProps) {
  const router = useRouter();
  const { state, dispatch } = useStore();
  const [q, setQ] = useState('');
  const [sending, setSending] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);
  const [pendingMessages, setPendingMessages] = useState<ChatMessage[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<Id<"chatThreads"> | null>(initialThreadId ?? null);
  const [sidebarOpen, setSidebarOpen] = useState(loadSidebarOpen);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Persist sidebar preference
  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen)); } catch {}
  }, [sidebarOpen]);

  const workspace = useQuery(api.workspaces.getMyWorkspace);
  const threads = useQuery(
    api.chat.listThreads,
    workspace ? { workspaceId: workspace._id } : "skip",
  );
  const threadMessages = useQuery(
    api.chat.getMessages,
    currentThreadId ? { threadId: currentThreadId } : "skip",
  );

  const runSearch = useAction(api.search.semanticSearch);
  const createThread = useMutation(api.chat.createThread);
  const addMessage = useMutation(api.chat.addMessage);
  const updateThreadTitle = useMutation(api.chat.updateThreadTitle);

  const { listening, supported, start: startListening } = useSpeechToText({
    onResult: useCallback((transcript: string) => {
      setQ(prev => prev ? `${prev} ${transcript}` : transcript);
    }, []),
  });

  const suggestions = [
    "What's due this week?",
    'Anything overdue?',
    'Summarise my open items',
    'What did I file recently?',
  ];

  // Derive persisted messages from Convex query (no setState in effect)
  const persistedMessages = useMemo<ChatMessage[]>(() => {
    if (!threadMessages) return [];
    return threadMessages.map(m => ({
      from: m.role === 'user' ? 'user' as const : 'bot' as const,
      text: m.content,
    }));
  }, [threadMessages]);

  // Display: persisted messages + any pending (streaming) messages
  const messages = [...persistedMessages, ...pendingMessages];

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [persistedMessages, pendingMessages]);

  function handleNewConversation() {
    setCurrentThreadId(null);
    setPendingMessages([]);
    setQ('');
    router.push('/ask');
  }

  function handleSelectThread(threadId: Id<"chatThreads">) {
    if (sending) return;
    setCurrentThreadId(threadId);
    setPendingMessages([]);
    setQ('');
    router.push(`/ask/${threadId}`);
  }

  async function send(text?: string) {
    const t = text || q;
    if (!t.trim() || sending || !workspace) return;
    setSending(true);

    const userMsg: ChatMessage = { from: 'user', text: t };
    setPendingMessages([userMsg, { from: 'bot', text: '', streaming: true }]);
    setQ('');

    // Ensure thread exists
    let threadId = currentThreadId;
    const isNewThread = !threadId;
    if (!threadId) {
      const title = t.length > 50 ? t.slice(0, 50) + '...' : t;
      threadId = await createThread({ workspaceId: workspace._id, title });
      setCurrentThreadId(threadId);
      router.push(`/ask/${threadId}`);
    }

    // Save user message
    await addMessage({
      threadId,
      role: 'user',
      content: t,
      citedDocumentIds: [],
      citedEntityIds: [],
    });

    // Build conversation history from persisted messages
    const history = persistedMessages
      .filter(m => m.text)
      .map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text }));

    // Semantic search for document context
    let documentContext = '';
    let citedDocumentIds: Id<'documents'>[] = [];
    try {
      const results = await runSearch({ workspaceId: workspace._id, query: t, limit: 5 });
      if (results.results.length > 0) {
        citedDocumentIds = Array.from(new Set(results.results.map(r => r.documentId)));
        documentContext = results.results
          .map(r => [
            `Document: [${r.documentTitle}](doc:${r.documentId})`,
            `Type: ${r.documentType}`,
            `Excerpt: ${r.text}`,
          ].join('\n'))
          .join('\n\n');
      }
    } catch {
      // Semantic search unavailable
    }

    const reply = await askSecretaryStreaming(
      t,
      state,
      (accumulated) => {
        setPendingMessages([userMsg, { from: 'bot', text: accumulated, streaming: true }]);
      },
      documentContext || undefined,
      history,
    );

    if (reply.usageEvent) {
      dispatch({ type: 'ADD_USAGE_EVENT', event: reply.usageEvent });
    }

    // Save assistant message
    await addMessage({
      threadId,
      role: 'assistant',
      content: reply.text,
      citedDocumentIds,
      citedEntityIds: [],
      model: reply.source === 'openrouter' ? 'gemini-2.5-flash' : undefined,
    });

    // Auto-title after first AI response on a new thread
    if (isNewThread) {
      const autoTitle = reply.text.length > 60
        ? reply.text.replace(/[#*_\[\]]/g, '').slice(0, 60).trim() + '...'
        : reply.text.replace(/[#*_\[\]]/g, '').slice(0, 60).trim();
      if (autoTitle) {
        await updateThreadTitle({ threadId, title: autoTitle });
      }
    }

    // Clear pending messages — Convex subscription will provide persisted versions
    setPendingMessages([]);
    setSending(false);
  }

  const showSuggestions = messages.length === 0;

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Thread sidebar */}
      <div style={{
        width: sidebarOpen ? 240 : 48, flexShrink: 0, borderRight: '0.5px solid var(--sep)',
        display: 'flex', flexDirection: 'column', background: 'var(--sidebar-bg)',
        transition: 'width 0.2s ease', overflow: 'hidden',
      }}>
        {/* Toggle button */}
        <div style={{
          padding: sidebarOpen ? '14px 12px 10px' : '14px 8px 10px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {sidebarOpen ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={handleNewConversation} style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8,
                  background: 'var(--ink)', color: '#fff', border: 0, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {Ic.plus(14, '#fff', 2.2)} New conversation
                </button>
                <button onClick={() => setSidebarOpen(false)} style={{
                  width: 32, height: 32, borderRadius: 6, border: 0, cursor: 'pointer',
                  background: 'transparent', color: 'var(--muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {Ic.chevron(14, 'var(--muted)', 'left')}
                </button>
              </div>
            </>
          ) : (
            <button onClick={() => setSidebarOpen(true)} style={{
              width: 32, height: 32, borderRadius: 6, border: 0, cursor: 'pointer',
              background: 'transparent', color: 'var(--muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {Ic.chevron(14, 'var(--muted)', 'right')}
            </button>
          )}
        </div>
        {sidebarOpen && (
          <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 6px' }}>
            {(threads ?? []).map(thread => {
              const active = thread._id === currentThreadId;
              return (
                <button key={thread._id} onClick={() => handleSelectThread(thread._id)} style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px', marginBottom: 1,
                  borderRadius: 7, border: 0, cursor: 'pointer', fontFamily: 'var(--font)',
                  background: active ? 'rgba(0,0,0,0.06)' : 'transparent',
                  color: active ? 'var(--ink)' : 'var(--ink2)',
                  fontSize: 12.5, fontWeight: active ? 600 : 400,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                } as React.CSSProperties}>{thread.title}</button>
              );
            })}
            {threads && threads.length === 0 && (
              <div style={{ padding: '16px 10px', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                No conversations yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Messages */}
        <div className="no-scrollbar" style={{
          flex: 1, overflowY: 'auto', padding: '16px 24px 24px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '75%',
            }}>
              <div style={{
                padding: '10px 14px', borderRadius: 18,
                background: m.from === 'user' ? 'var(--accent)' : '#FAF9F5',
                color: m.from === 'user' ? '#fff' : 'var(--ink)',
                fontSize: 14, lineHeight: 1.5,
                border: m.from === 'bot' ? '0.5px solid var(--sep)' : 'none',
                borderBottomRightRadius: m.from === 'user' ? 4 : 18,
                borderBottomLeftRadius: m.from === 'user' ? 18 : 4,
              }}>
                {m.from === 'bot' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4,
                    fontSize: 11, color: 'var(--muted)', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    {Ic.sparkle(11, 'var(--muted)')} Julia
                  </div>
                )}
                {m.from === 'bot' && m.text ? (
                  <>
                    <MarkdownMessage content={m.text} onDocumentPreview={setPreviewDocumentId} />
                    {m.streaming && (
                      <span style={{
                        display: 'inline-block', width: 2, height: 14,
                        background: 'var(--accent)', marginLeft: 2,
                        verticalAlign: 'text-bottom', animation: 'blink 0.8s infinite',
                      }} />
                    )}
                  </>
                ) : m.from === 'bot' && !m.text && m.streaming ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}>
                    Looking
                    <span style={{
                      display: 'inline-block', width: 7, height: 7, borderRadius: 4,
                      background: 'var(--accent)', animation: 'pulse 1s infinite',
                    }} />
                  </span>
                ) : (
                  m.text
                )}
              </div>
            </div>
          ))}

          {/* Suggestions */}
          {showSuggestions && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'flex-start', maxWidth: '75%' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 4px' }}>
                Try asking
              </div>
              {suggestions.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  textAlign: 'left', padding: '10px 14px', borderRadius: 12,
                  background: '#FAF9F5', border: '0.5px solid var(--sep)',
                  fontSize: 13, color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font)',
                }}>{s}</button>
              ))}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Composer */}
        <div style={{
          padding: '10px 16px 16px', borderTop: '0.5px solid var(--sep)',
          background: '#fff',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 6px 6px 14px',
            background: '#FAF9F5', borderRadius: 22,
            border: '0.5px solid var(--sep)',
          }}>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about anything you've filed..."
              style={{
                flex: 1, border: 0, outline: 0, background: 'transparent',
                fontSize: 14, fontFamily: 'var(--font)', color: 'var(--ink)', padding: '8px 0',
              }}
            />
            {supported && (
              <button onClick={startListening} style={{
                width: 32, height: 32, borderRadius: 16, border: 0, cursor: 'pointer',
                background: listening ? 'oklch(0.55 0.20 25)' : 'transparent',
                color: listening ? '#fff' : 'var(--muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                {Ic.mic(18, listening ? '#fff' : 'var(--muted)')}
                {listening && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 6, height: 6, borderRadius: 3,
                    background: '#ff3b30', animation: 'pulse 1s infinite',
                  }} />
                )}
              </button>
            )}
            <button onClick={() => send()} disabled={sending || !q.trim()} style={{
              width: 32, height: 32, borderRadius: 16, border: 0, cursor: sending || !q.trim() ? 'default' : 'pointer',
              background: q.trim() && !sending ? 'var(--ink)' : 'var(--muted2)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{Ic.arrowUp(16, '#fff')}</button>
          </div>
        </div>
      </div>

      {previewDocumentId && (
        <DocumentPreviewModal
          documentId={previewDocumentId}
          onClose={() => setPreviewDocumentId(null)}
        />
      )}

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
