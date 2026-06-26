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

// All required fields and how to ask for them if missing
const REQUIRED_FIELDS = [
  { key: 'name',       label: 'full name',      ask: "What's your **full name**?" },
  { key: 'email',      label: 'email',           ask: "What's your **email address**?" },
  { key: 'phone',      label: 'phone',           ask: "What's your **phone number**?" },
  { key: 'location',   label: 'location',        ask: "Where are you located? (City, Country)" },
  { key: 'role',       label: 'target role',     ask: "What **job role** are you targeting?" },
  { key: 'education',  label: 'education',       ask: "Tell me about your **education** — degree, institution, and year." },
  { key: 'experience', label: 'work experience', ask: "Describe your **work experience** — company, role, duration, and key achievements. If you're a fresher, just say **fresher**." },
  { key: 'skills',     label: 'skills',          ask: "List your **skills** (e.g. React, Python, SQL, Figma...)" },
  { key: 'photo',      label: 'photo preference',ask: "Would you like a **photo** on your resume? (yes / no)" },
];

function timeAgo(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function renderMd(text) {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function Bubble({ role, text, isLoading }) {
  const isUser = role === 'user';
  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-0.5"
          style={{ background: 'linear-gradient(135deg,#34d399,#06b6d4)' }}>
          <Sparkles className="w-4 h-4 text-black" />
        </div>
      )}
      <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
        style={isUser
          ? { background: 'linear-gradient(135deg,#34d399,#06b6d4)', color: '#000', fontWeight: 500 }
          : { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }
        }>
        {isLoading
          ? <span className="flex gap-1 items-center h-4">
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          : <span dangerouslySetInnerHTML={{ __html: renderMd(text) }} />
        }
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ml-3 mt-0.5"
          style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <span className="text-white text-xs font-bold">Y</span>
        </div>
      )}
    </div>
  );
}

function HistoryPanel({ open, onClose, history, onSelect, onClear }) {
  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ background: 'rgba(0,0,0,0.5)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }} />
      <div className="fixed top-0 right-0 h-full w-full max-w-sm z-50 flex flex-col transition-transform duration-300 ease-out"
        style={{ background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', borderLeft: '1px solid rgba(255,255,255,0.08)', boxShadow: '-16px 0 48px rgba(0,0,0,0.4)', transform: open ? 'translateX(0)' : 'translateX(100%)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-semibold text-sm">Resume History</span>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button onClick={onClear} className="text-white/30 hover:text-red-400 transition-colors p-1.5 rounded-lg">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-1.5 rounded-lg">
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
              {history.map((item) => (
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
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
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

// ─── Main ───────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  // phase: 'paste' | 'parsing' | 'followup' | 'generating' | 'done'
  const [phase, setPhase] = useState('paste');
  const [userData, setUserData] = useState({});
  const [missingQueue, setMissingQueue] = useState([]); // fields still needed
  const [resumeHtml, setResumeHtml] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  useEffect(() => { if (status === 'unauthenticated') router.replace('/signup'); }, [status]);

  useEffect(() => {
    const key = session?.user?.email ? `genie_history_${session.user.email}` : null;
    if (key) { try { setHistory(JSON.parse(localStorage.getItem(key) || '[]')); } catch { setHistory([]); } }
  }, [session]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, aiTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  function addMsg(role, text) {
    setMessages(prev => [...prev, { role, text }]);
  }

  // ── Step 1: User pastes resume text — parse it with AI ──────────────────
  async function handlePaste(text) {
    addMsg('user', text);
    setPhase('parsing');
    setAiTyping(true);

    try {
      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const { parsed } = await res.json();
      setAiTyping(false);

      const data = parsed || {};
      setUserData(data);

      // Find which required fields are still missing
      const missing = REQUIRED_FIELDS.filter(f => !data[f.key] || String(data[f.key]).trim() === '');

      if (missing.length === 0) {
        // Everything extracted — go straight to generation
        setPhase('generating');
        addMsg('ai', `Got everything! 🎉 Here's what I found:\n\n**Name:** ${data.name}\n**Role:** ${data.role}\n**Email:** ${data.email}\n\nGenerating your resume now...`);
        await generateResume(data);
      } else {
        // Tell user what was found, then ask for first missing field
        const found = REQUIRED_FIELDS.filter(f => data[f.key] && String(data[f.key]).trim() !== '').map(f => f.label);
        const foundStr = found.length > 0 ? `I picked up your **${found.join(', ')}**. ` : '';
        setMissingQueue(missing);
        setPhase('followup');
        addMsg('ai', `${foundStr}Just need a few more things.\n\n${missing[0].ask}`);
      }
    } catch {
      setAiTyping(false);
      setPhase('paste');
      addMsg('ai', "Hmm, something went wrong reading that. Could you try again?");
    }
  }

  // ── Step 2: Follow-up answers for missing fields ─────────────────────────
  function validateField(key, val) {
    if (!val.trim()) return "Please provide an answer.";
    if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) return "That doesn't look like a valid email — try again.";
    if (key === 'phone' && !/[\d\s\+\-\(\)]{7,}/.test(val.trim())) return "Enter a valid phone number.";
    if (key === 'photo' && !['yes','no','y','n'].includes(val.trim().toLowerCase())) return "Just say **yes** or **no** 😊";
    return null;
  }

  async function handleFollowup(val) {
    addMsg('user', val);
    const current = missingQueue[0];

    const err = validateField(current.key, val);
    if (err) {
      setTimeout(() => addMsg('ai', err), 400);
      return;
    }

    const updated = { ...userData, [current.key]: val.trim() };
    setUserData(updated);
    const remaining = missingQueue.slice(1);
    setMissingQueue(remaining);

    if (remaining.length > 0) {
      setAiTyping(true);
      setTimeout(() => {
        setAiTyping(false);
        addMsg('ai', remaining[0].ask);
      }, 500);
    } else {
      // All done — generate
      setPhase('generating');
      setAiTyping(true);
      setTimeout(() => {
        setAiTyping(false);
        addMsg('ai', "🎉 Got everything I need! Building your resume now...");
      }, 500);
      await generateResume(updated);
    }
  }

  // ── Step 3: Generate resume ───────────────────────────────────────────────
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
        setTimeout(() => addMsg('ai', `✅ Your resume is ready, **${data.name}**! Tailored for **${data.role}**, ATS-optimized. Preview or download below.`), 600);
      } else {
        setPhase('paste');
        addMsg('ai', "Something went wrong generating the resume. Please try again.");
      }
    } catch {
      setPhase('paste');
      addMsg('ai', "Network error. Please check your connection and try again.");
    }
  }

  async function handleSend() {
    const val = input.trim();
    if (!val || phase === 'parsing' || phase === 'generating') return;
    setInput('');

    if (phase === 'paste') {
      await handlePaste(val);
    } else if (phase === 'followup') {
      await handleFollowup(val);
    }
  }

  function handleRestart() {
    setMessages([]);
    setPhase('paste');
    setUserData({});
    setMissingQueue([]);
    setResumeHtml(null);
    setInput('');
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>;
  }

  const inputDisabled = phase === 'parsing' || phase === 'generating';
  const placeholder = phase === 'followup' ? 'Type your answer...' : inputDisabled ? 'Please wait...' : 'Paste your resume or describe yourself...';
  const hasChat = messages.length > 0;
  const firstName = session?.user?.name?.split(' ')[0] || 'there';

  const InputBox = (
    <div className="rounded-2xl p-1" style={GLASS}>
      <div className="rounded-[14px] flex items-end gap-2 px-4 py-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={placeholder}
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
    <div className="relative min-h-screen flex flex-col" style={{ fontFamily: FONT }}>
      <video autoPlay muted loop playsInline className="fixed inset-0 w-full h-full object-cover" style={{ zIndex: 0 }}>
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260613_180732_a54afbf6-b30d-470e-861f-669871f09f67.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/65" style={{ zIndex: 1 }} />

      <div className="relative flex flex-col min-h-screen" style={{ zIndex: 2 }}>

        <nav className="flex items-center justify-between px-5 sm:px-8 py-4 flex-shrink-0">
          <span className="text-white text-xl font-bold tracking-wider">GENIE</span>
          <UserMenu session={session} onHistoryOpen={() => setHistoryOpen(true)} />
        </nav>

        {/* ── INITIAL STATE: ChatGPT-style centered layout ── */}
        {!hasChat && (
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-10">
            <div className="w-full max-w-2xl flex flex-col items-center gap-8">

              {/* Greeting */}
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'linear-gradient(135deg,#34d399,#06b6d4)' }}>
                  <Sparkles className="w-7 h-7 text-black" />
                </div>
                <h1 className="text-white text-3xl sm:text-4xl font-black tracking-tight mb-3">
                  Hey {firstName} 👋
                </h1>
                <p className="text-white/50 text-base leading-relaxed max-w-md mx-auto">
                  Paste your existing resume and I'll build a professional ATS-ready version instantly. Or just describe yourself.
                </p>
              </div>

              {/* Input centered */}
              <div className="w-full">{InputBox}</div>

              {/* Suggestion chips */}
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'I\'m a fresher in Computer Science',
                  'Paste my old resume',
                  'Software Engineer 3 years exp',
                  'Marketing Manager applying to a startup',
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

        {/* ── CHAT STATE: messages + pinned input ── */}
        {hasChat && (
          <main className="flex-1 flex flex-col items-center overflow-hidden">
            <div className="w-full max-w-2xl flex flex-col h-full">

              <div className="flex-1 overflow-y-auto px-4 py-4" style={{ minHeight: 0 }}>
                {messages.map((m, i) => <Bubble key={i} role={m.role} text={m.text} />)}
                {aiTyping && <Bubble role="ai" text="" isLoading />}

                {/* Resume card */}
                {phase === 'done' && resumeHtml && (
                  <div className="flex justify-start mb-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-3 mt-0.5"
                      style={{ background: 'linear-gradient(135deg,#34d399,#06b6d4)' }}>
                      <Sparkles className="w-4 h-4 text-black" />
                    </div>
                    <div className="rounded-2xl rounded-tl-sm p-4 flex flex-col gap-3"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 260 }}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span className="text-white text-sm font-semibold">Resume Ready</span>
                        <span className="text-white/30 text-xs">· ATS Optimized</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => window.open(URL.createObjectURL(new Blob([resumeHtml], { type: 'text/html' })), '_blank')}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-medium hover:bg-white/12"
                          style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }}>
                          <Eye className="w-3.5 h-3.5" /> Preview
                        </button>
                        <button onClick={() => {
                          const a = document.createElement('a');
                          a.href = URL.createObjectURL(new Blob([resumeHtml], { type: 'text/html' }));
                          a.download = `${userData.name?.replace(/\s+/g, '_') || 'resume'}.html`;
                          a.click();
                        }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-black text-xs font-semibold hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg,#34d399,#06b6d4)' }}>
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      </div>
                      <button onClick={handleRestart} className="text-white/30 hover:text-white/60 text-xs text-center transition-colors">
                        Build a new resume
                      </button>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Pinned input */}
              <div className="px-4 pb-6 flex-shrink-0">
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

      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onSelect={item => { setResumeHtml(item.html); setPhase('done'); setUserData({ name: item.name, role: item.role }); setMessages([{ role: 'ai', text: `Here's the resume for **${item.role}** — loaded from history.` }]); }}
        onClear={() => { const key = `genie_history_${session?.user?.email}`; setHistory([]); localStorage.removeItem(key); }}
      />
    </div>
  );
}
