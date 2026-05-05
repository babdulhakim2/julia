'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useAction, useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useStore } from '@/lib/store';
import { fmtDate } from '@/lib/utils';
import { Ic } from '@/components/icons';
import { NavBar } from '@/components/ui/nav-bar';
import { NavBtn } from '@/components/ui/nav-btn';
import { askSecretaryStreaming } from '@/lib/assistant-client';
import { MarkdownMessage } from '@/components/shared/markdown-message';
import { DocumentPreviewModal } from '@/components/shared/document-preview-modal';
import { useSpeechToText } from '@/lib/use-speech-to-text';
import { useActiveWorkspace } from '@/lib/admin-view';

interface AskViewProps {
  onOpenItem: (id: string) => void;
  initialThreadId?: Id<"chatThreads">;
}

interface Message {
  from: 'user' | 'bot';
  text: string;
  kind?: string;
  items?: string[];
  streaming?: boolean;
}

export function AskView({ onOpenItem, initialThreadId }: AskViewProps) {
  const { user } = useUser();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const firstName = user?.firstName ?? 'there';
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<Id<"chatThreads"> | null>(initialThreadId ?? null);
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { workspace, isViewingClient } = useActiveWorkspace();
  const threads = useQuery(
    api.chat.listThreads,
    workspace ? { workspaceId: workspace._id } : "skip",
  );
  const runSearch = useAction(api.search.semanticSearch);
  const createThread = useMutation(api.chat.createThread);
  const addMessageMut = useMutation(api.chat.addMessage);
  const updateThreadTitle = useMutation(api.chat.updateThreadTitle);
  const threadMessages = useQuery(
    api.chat.getMessages,
    currentThreadId ? { threadId: currentThreadId } : "skip",
  );

  const { listening, supported, start: startListening } = useSpeechToText({
    onResult: useCallback((transcript: string) => {
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
    }, []),
  });

  const suggestions = [
    "What's due this week?",
    'Anything overdue?',
    'Summarise my open items',
    'What did I file recently?',
  ];

  // Derive persisted messages from Convex query
  const persistedMessages = useMemo<Message[]>(() => {
    if (!threadMessages || !currentThreadId) return [];
    return threadMessages.map(m => ({
      from: m.role === 'user' ? 'user' as const : 'bot' as const,
      text: m.content,
    }));
  }, [threadMessages, currentThreadId]);

  // Greeting message when no thread is active and no pending messages
  const greetingMessage: Message = useMemo(() => ({
    from: 'bot', kind: 'greet', text: `Hey ${firstName}. What can I look up?`,
  }), [firstName]);

  // Build display messages
  const hasPersistedOrPending = persistedMessages.length > 0 || pendingMessages.length > 0;
  const messages: Message[] = hasPersistedOrPending
    ? [...persistedMessages, ...pendingMessages]
    : [greetingMessage];

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [persistedMessages, pendingMessages]);

  function handleNewConversation() {
    setCurrentThreadId(null);
    setPendingMessages([]);
    setInput('');
    router.push('/ask');
  }

  function handleSelectThread(threadId: Id<"chatThreads">) {
    if (sending) return;
    setCurrentThreadId(threadId);
    setPendingMessages([]);
    setInput('');
    setHistoryOpen(false);
    router.push(`/ask/${threadId}`);
  }

  async function send(text: string) {
    if (!text.trim() || sending || !workspace) return;
    const userMsg: Message = { from: 'user', text };
    setPendingMessages([userMsg, { from: 'bot', text: '', streaming: true }]);
    setInput('');
    setSending(true);

    // Ensure thread exists
    let threadId = currentThreadId;
    const isNewThread = !threadId;
    if (!threadId && !isViewingClient) {
      const title = text.length > 50 ? text.slice(0, 50) + '...' : text;
      threadId = await createThread({ workspaceId: workspace._id, title });
      setCurrentThreadId(threadId);
      router.push(`/ask/${threadId}`);
    }

    // Save user message
    if (threadId && !isViewingClient) {
      await addMessageMut({
        threadId,
        role: 'user',
        content: text,
        citedDocumentIds: [],
        citedEntityIds: [],
      });
    }

    // Build conversation history from persisted messages
    const history = persistedMessages
      .filter(m => m.text && m.kind !== 'greet')
      .map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text }));

    // Semantic search for document context
    let documentContext = '';
    let citedDocumentIds: Id<'documents'>[] = [];
    try {
      const results = await runSearch({ workspaceId: workspace._id, query: text, limit: 5 });
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
      text,
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
    if (threadId && !isViewingClient) {
      await addMessageMut({
        threadId,
        role: 'assistant',
        content: reply.text,
        citedDocumentIds,
        citedEntityIds: [],
        model: reply.source === 'openrouter' ? 'gemini-2.5-flash' : undefined,
      });
    }

    // Auto-title
    if (threadId && isNewThread && !isViewingClient) {
      const autoTitle = reply.text.length > 60
        ? reply.text.replace(/[#*_\[\]]/g, '').slice(0, 60).trim() + '...'
        : reply.text.replace(/[#*_\[\]]/g, '').slice(0, 60).trim();
      if (autoTitle) {
        await updateThreadTitle({ threadId, title: autoTitle });
      }
    }

    if (isViewingClient) {
      setPendingMessages([userMsg, { from: 'bot', text: reply.text }]);
      setSending(false);
      return;
    }

    // Clear pending — Convex subscription provides persisted versions
    setPendingMessages([]);
    setSending(false);
  }

  const ent = Object.fromEntries(state.entities.map(e => [e.id, e]));
  const itm = Object.fromEntries(state.items.map(i => [i.id, i]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <NavBar large title="Ask" sub="Search anything across your stuff"
        trailing={
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <NavBtn onClick={() => setHistoryOpen(true)}>
              {Ic.clock(18, 'var(--accent)')}
            </NavBtn>
            <NavBtn onClick={handleNewConversation}>
              {Ic.plus(18, 'var(--accent)', 2.2)}
            </NavBtn>
          </div>
        }
      />

      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 140px',
        display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%', display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{
              padding: '10px 14px', borderRadius: 18,
              background: m.from === 'user' ? 'var(--accent)' : '#fff',
              color: m.from === 'user' ? '#fff' : 'var(--ink)',
              fontSize: 15, lineHeight: 1.4,
              borderBottomRightRadius: m.from === 'user' ? 4 : 18,
              borderBottomLeftRadius: m.from === 'user' ? 18 : 4,
            }}>
              {m.from === 'bot' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
                  fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {Ic.sparkle(11, 'var(--muted)')} Julia
                </div>
              )}
              {m.from === 'bot' && m.text ? (
                <>
                  <MarkdownMessage content={m.text} onDocumentPreview={setPreviewDocumentId} />
                  {m.streaming && (
                    <span style={{ display: 'inline-block', width: 2, height: 14, background: 'var(--accent)', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'blink 0.8s infinite' }} />
                  )}
                </>
              ) : m.from === 'bot' && !m.text && m.streaming ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--muted)' }}>
                  Looking
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 3, background: 'var(--accent)', animation: 'pulse 1s infinite' }} />
                </span>
              ) : (
                m.text
              )}
            </div>
            {m.items && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {m.items.map(id => {
                  const it = itm[id]; if (!it) return null;
                  const e = ent[it.entity || ''];
                  return (
                    <div key={id} onClick={() => onOpenItem(id)} style={{
                      background: '#fff', borderRadius: 12, padding: 12,
                      display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      border: '0.5px solid var(--hair)',
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: e?.color }}/>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>{it.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                          {e?.name} · {fmtDate(it.dueDate)}
                        </div>
                      </div>
                      {it.amount && <div style={{ fontSize: 14, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>£{it.amount}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {messages.length === 1 && messages[0].kind === 'greet' && (
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 4px 4px' }}>Try asking</div>
            {suggestions.map(s => (
              <button key={s} onClick={() => send(s)} style={{
                textAlign: 'left', padding: '10px 14px', borderRadius: 12,
                background: '#fff', border: '0.5px solid var(--hair)',
                fontSize: 14, color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--font)',
              }}>{s}</button>
            ))}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* composer */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 84,
        padding: '8px 12px',
        background: 'linear-gradient(0deg, rgba(242,242,247,1) 50%, rgba(242,242,247,0))',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 6px 6px 14px',
          background: '#fff', borderRadius: 22,
          border: '0.5px solid var(--hair)',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="Ask anything..."
            style={{
              flex: 1, border: 0, outline: 0, background: 'transparent',
              fontSize: 15, fontFamily: 'var(--font)', color: 'var(--ink)', padding: '8px 0',
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
              {Ic.mic(20, listening ? '#fff' : 'var(--muted)')}
              {listening && (
                <span style={{
                  position: 'absolute', top: 3, right: 3,
                  width: 6, height: 6, borderRadius: 3,
                  background: '#ff3b30', animation: 'pulse 1s infinite',
                }} />
              )}
            </button>
          )}
          <button onClick={() => send(input)} style={{
            width: 32, height: 32, borderRadius: 16, border: 0, cursor: 'pointer',
            background: input && !sending ? 'var(--ink)' : 'var(--muted2)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{Ic.arrowUp(16, '#fff')}</button>
        </div>
      </div>

      {/* History drawer */}
      {historyOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }}>
          {/* Backdrop */}
          <div
            onClick={() => setHistoryOpen(false)}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.3)',
            }}
          />
          {/* Sheet */}
          <div style={{
            position: 'relative', background: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
            maxHeight: '70vh', display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.2s ease',
          }}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--sep)' }} />
            </div>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 16px 12px',
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
                Conversations
              </div>
              <button onClick={() => setHistoryOpen(false)} style={{
                background: 'transparent', border: 0, cursor: 'pointer', padding: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {Ic.x(18, 'var(--muted)')}
              </button>
            </div>
            {/* Thread list */}
            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 12px 20px' }}>
              {(threads ?? []).length === 0 && (
                <div style={{ padding: '24px 16px', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                  No conversations yet
                </div>
              )}
              {(threads ?? []).map(thread => {
                const active = thread._id === currentThreadId;
                const date = new Date(thread._creationTime);
                const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                return (
                  <button key={thread._id} onClick={() => handleSelectThread(thread._id)} style={{
                    width: '100%', textAlign: 'left', padding: '12px 14px', marginBottom: 2,
                    borderRadius: 10, border: 0, cursor: 'pointer', fontFamily: 'var(--font)',
                    background: active ? 'rgba(0,0,0,0.04)' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14, fontWeight: active ? 600 : 500,
                        color: 'var(--ink)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{thread.title}</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>{dateStr}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {previewDocumentId && (
        <DocumentPreviewModal
          documentId={previewDocumentId}
          onClose={() => setPreviewDocumentId(null)}
        />
      )}

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
