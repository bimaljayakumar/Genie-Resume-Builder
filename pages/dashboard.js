import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Send, Sparkles, FileText, Download, Eye, LogOut, ChevronDown, Loader2, History, X, Clock, Trash2 } from 'lucide-react';

const FONT = '"Helvetica Now Var", Helvetica, Arial, sans-serif';

const GLASS = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 8px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
};

function timeAgo(ts) {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function renderMd(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

function Bubble({ role, text, isLoading, userInitial }) {
  const isUser = role === 'user';
  return (
    <div className={`flex w-full mb-4 sm:mb-5 ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2 sm:gap-3`}>

      {/* AI avatar */}
      {!isUser && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}>
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/70" />
        </div>
      )}

      {/* Bubble */}
      <div
        className={`max-w-[82%] sm:max-w-[75%] px-4 py-3 text-sm leading-relaxed ${
          isUser ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm'
        }`}
        style={{
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: isUser
            ? '1px solid rgba(255,255,255,0.18)'
            : '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          color: isUser ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)',
        }}>
        {isLoading
          ? <span className="flex gap-1.5 items-center h-4">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          : <span dangerouslySetInnerHTML={{ __html: renderMd(text) }} />
        }
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}>
          <span className="text-white/70 text-xs font-semibold">{userInitial || 'U'}</span>
        </div>
      )}
    </div>
  );
}

function HistoryPanel({ open, onClose, history, onSelect, onClear }) {
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.5)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.3s' }} />
      <div className="fixed top-0 right-0 h-full w-full max-w-sm z-50 flex flex-col"
        style={{ background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderLeft: '1px solid rgba(255,255,255,0.08)', boxShadow: '-16px 0 48px rgba(0,0,0,0.4)', transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s ease-out' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-semibold text-sm">Resume History</span>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button onClick={onClear} className="text-white/30 hover:text-red-400 p-1.5 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={onClose} className="text-white/30 hover:text-white p-1.5 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
              <Clock className="w-8 h-8 text-white/10" />
              <p className="text-white/25 text-sm text-center">No history yet.<br />Build your first resume!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {history.map(item => (
                <button key={item.id} onClick={() => { onSelect(item); onClose(); }}
                  className="w-full text-left px-4 py-3.5 rounded-2xl hover:bg-white/6 group"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-white/75 text-sm line-clamp-2 group-hover:text-white">{item.role} — {item.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="w-3 h-3 text-white/20" />
                    <span className="text-white/25 text-xs">{timeAgo(item.ts)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function UserMenu({ session, onHistoryOpen }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const name = session?.user?.name || 'User';
  const email = session?.user?.email || '';
  const avatar = session?.user?.image;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-white/8 transition-colors">
        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#34d399,#06b6d4)' }}>
          {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : <span className="text-black text-xs font-bold">{name[0]?.toUpperCase()}</span>}
        </div>
        <span className="text-white/70 text-sm hidden sm:block">{name.split(' ')[0]}</span>
        <ChevronDown className="w-3.5 h-3.5 text-white/40 hidden sm:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-60 z-50 rounded-2xl overflow-hidden" style={{ ...GLASS, background: 'rgba(8,8,8,0.9)' }}>
          <div className="px-4 py-3.5 border-b border-white/8">
            <p className="text-white text-sm font-semibold truncate">{name}</p>
            <p className="text-white/35 text-xs truncate">{email}</p>
          </div>
          <div className="p-2 flex flex-col gap-1">
            <button onClick={() => { setOpen(false); onHistoryOpen(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/6 text-sm text-left">
              <History className="w-4 h-4" /> History
            </button>
            <div className="h-px bg-white/8" />
            <button onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-400/8 text-sm text-left">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DownloadButton({ resumeHtml, userName }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: resumeHtml, name: userName }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Server error');
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${(userName || 'resume').replace(/\s+/g, '_')}_Resume.pdf`;
      a.click();
    } catch (err) {
      console.error('Download error:', err);
      alert('PDF failed: ' + err.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white/90 text-xs font-semibold transition-all hover:bg-white/15 disabled:opacity-50"
      style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)' }}>
      {downloading
        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
        : <><Download className="w-3.5 h-3.5" /> Download PDF</>}
    </button>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [messages, setMessages] = useState([]);       // { role: 'user'|'ai', text }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);       // AI is thinking
  const [phase, setPhase] = useState('chat');          // 'chat' | 'generating' | 'done'
  const [previewOpen, setPreviewOpen] = useState(false);
  const [resumeHtml, setResumeHtml] = useState(null);
  const [userData, setUserData] = useState(null);      // final confirmed data
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  // chatHistory holds the full conversation for the AI context
  const chatHistory = useRef([]);

  useEffect(() => { if (status === 'unauthenticated') router.replace('/signup'); }, [status]);
  useEffect(() => {
    const key = session?.user?.email ? `genie_history_${session.user.email}` : null;
    if (key) { try { setHistory(JSON.parse(localStorage.getItem(key) || '[]')); } catch { setHistory([]); } }
  }, [session]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  function addMsg(role, text) {
    setMessages(prev => [...prev, { role, text }]);
  }

  async function handleSend() {
    const val = input.trim();
    if (!val || loading || phase === 'generating') return;
    setInput('');
    addMsg('user', val);
    chatHistory.current.push({ role: 'user', text: val });
    setLoading(true);

    try {
      const res = await fetch('/api/chat-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: chatHistory.current }),
      });
      const data = await res.json();
      setLoading(false);

      if (data.reply) {
        addMsg('ai', data.reply);
        chatHistory.current.push({ role: 'ai', text: data.reply });
      }

      // AI signalled it has confirmed data ready to generate
      if (data.readyToGenerate && data.userData) {
        setUserData(data.userData);
        setPhase('generating');
        await generateResume(data.userData);
      }
    } catch {
      setLoading(false);
      addMsg('ai', 'Something went wrong. Please try again.');
    }
  }

  async function generateResume(data) {
    try {
      const res = await fetch('/api/build-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userData: data }),
      });
      const result = await res.json();
      if (result.html) {
        setResumeHtml(result.html);
        setPhase('done');
        const key = `genie_history_${session?.user?.email}`;
        const entry = { id: Date.now(), ts: Date.now(), name: data.name, role: data.role, html: result.html };
        const h = [entry, ...history].slice(0, 20);
        setHistory(h);
        localStorage.setItem(key, JSON.stringify(h));
        setTimeout(() => {
          const msg = `✅ Done! Your resume is ready, **${data.name}**. It's ATS-optimized and tailored for **${data.role}**. Preview or download it below.`;
          addMsg('ai', msg);
          chatHistory.current.push({ role: 'ai', text: msg });
        }, 500);
      } else {
        setPhase('chat');
        addMsg('ai', result.error || 'Something went wrong generating the resume. Want to try again?');
      }
    } catch (err) {
      setPhase('chat');
      addMsg('ai', 'Network error while building your resume. Please check your connection and try again.');
    }
  }

  function handleRestart() {
    setMessages([]);
    setPhase('chat');
    setResumeHtml(null);
    setUserData(null);
    setInput('');
    chatHistory.current = [];
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>;
  }

  const firstName = session?.user?.name?.split(' ')[0] || 'there';
  const userInitial = session?.user?.name?.[0]?.toUpperCase() || 'U';
  const hasChat = messages.length > 0;
  const inputDisabled = loading || phase === 'generating';

  const InputBox = (
    <div className="rounded-2xl p-1" style={GLASS}>
      <div className="rounded-[14px] flex items-end gap-2 px-4 py-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={inputDisabled ? 'Please wait...' : hasChat ? 'Type your message...' : 'Paste your resume or describe yourself...'}
          disabled={inputDisabled}
          rows={1}
          className="flex-1 bg-transparent text-white text-sm placeholder-white/30 resize-none outline-none py-2 leading-relaxed disabled:opacity-40"
          style={{ maxHeight: 200 }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || inputDisabled}
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mb-1 transition-all disabled:opacity-30 active:scale-90"
          style={{ background: 'linear-gradient(135deg,#34d399,#06b6d4)' }}>
          {inputDisabled ? <Loader2 className="w-3.5 h-3.5 text-black animate-spin" /> : <Send className="w-3.5 h-3.5 text-black" />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative h-screen flex flex-col overflow-hidden" style={{ fontFamily: FONT }}>
      <video autoPlay muted loop playsInline className="fixed inset-0 w-full h-full object-cover" style={{ zIndex: 0 }}>
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260613_180732_a54afbf6-b30d-470e-861f-669871f09f67.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/65" style={{ zIndex: 1 }} />

      <div className="relative flex flex-col h-full" style={{ zIndex: 2 }}>

        <nav className="flex items-center justify-between px-5 sm:px-8 py-4 flex-shrink-0">
          <span className="text-white text-xl font-bold tracking-wider">GENIE</span>
          <UserMenu session={session} onHistoryOpen={() => setHistoryOpen(true)} />
        </nav>

        {/* ── INITIAL centered view ── */}
        {!hasChat && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 overflow-y-auto pb-10">
            <div className="w-full max-w-2xl flex flex-col items-center gap-8">
              <div className="text-center">
                <h1 className="text-white text-3xl sm:text-4xl font-black tracking-tight mb-3">
                  Hey {firstName}
                </h1>
                <p className="text-white/50 text-base leading-relaxed max-w-md mx-auto">
                  Paste your existing resume and I'll build a professional ATS-ready version instantly. Or just describe yourself.
                </p>
              </div>
              <div className="w-full">{InputBox}</div>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "I'm a fresher in Computer Science",
                  'Software Engineer with 3 years exp',
                  'Marketing Manager at a startup',
                  'Data Analyst applying to Google',
                ].map(s => (
                  <button key={s} onClick={() => setInput(s)}
                    className="px-3.5 py-2 rounded-xl text-white/45 hover:text-white text-xs transition-all hover:bg-white/8"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CHAT view ── */}
        {hasChat && (
          <main className="flex-1 flex flex-col items-center overflow-hidden min-h-0">
            <div className="w-full max-w-2xl flex flex-col h-full min-h-0">

              <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 sm:py-6" style={{ minHeight: 0 }}>
                {messages.map((m, i) => <Bubble key={i} role={m.role} text={m.text} userInitial={userInitial} />)}
                {loading && <Bubble role="ai" text="" isLoading userInitial={userInitial} />}

                {/* Resume ready card */}
                {phase === 'done' && resumeHtml && (
                  <div className="flex justify-start mb-4 items-end gap-2 sm:gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/70" />
                    </div>
                    <div className="rounded-2xl rounded-bl-sm p-4 flex flex-col gap-3"
                      style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', minWidth: 220 }}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-white/60" />
                        <span className="text-white/90 text-sm font-semibold">Resume Ready</span>
                        <span className="text-white/30 text-xs">· ATS Optimized</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setPreviewOpen(true)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white/80 text-xs font-medium transition-all hover:bg-white/10"
                          style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)' }}>
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </button>
                        <DownloadButton resumeHtml={resumeHtml} userName={userData?.name} />
                      </div>
                      <button onClick={handleRestart} className="text-white/25 hover:text-white/50 text-xs text-center transition-colors">
                        Build a new resume
                      </button>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <div className="px-3 sm:px-5 pb-4 sm:pb-6 flex-shrink-0">
                {phase === 'done' ? (
                  <div className="text-center">
                    <button onClick={handleRestart} className="text-white/40 hover:text-white text-sm transition-colors">
                      + Start a new resume
                    </button>
                  </div>
                ) : InputBox}
              </div>

            </div>
          </main>
        )}

      </div>

      {/* ── RESUME PREVIEW MODAL ── */}
      {previewOpen && resumeHtml && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ background: 'rgba(0,0,0,0.6)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-white font-semibold text-sm">Resume Preview</span>
            <div className="flex items-center gap-3">
              <DownloadButton resumeHtml={resumeHtml} userName={userData?.name} />
              <button onClick={() => setPreviewOpen(false)} className="text-white/50 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto flex items-start justify-center p-4">
            <iframe
              srcDoc={resumeHtml}
              style={{ width: '210mm', minHeight: '297mm', border: 'none', boxShadow: '0 8px 48px rgba(0,0,0,0.6)', background: '#fff', borderRadius: '2px' }}
              title="Resume Preview"
            />
          </div>
        </div>
      )}

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onSelect={item => {
          setResumeHtml(item.html);
          setPhase('done');
          setUserData({ name: item.name, role: item.role });
          setMessages([{ role: 'ai', text: `Here's the resume for **${item.role}** — loaded from history.` }]);
          chatHistory.current = [];
        }}
        onClear={() => { const key = `genie_history_${session?.user?.email}`; setHistory([]); localStorage.removeItem(key); }}
      />
    </div>
  );
}
