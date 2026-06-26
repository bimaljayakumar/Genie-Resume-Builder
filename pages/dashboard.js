import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Send, Sparkles, FileText, Download, Eye, LogOut, ChevronDown, Loader2, History, Trash2, X, Clock } from 'lucide-react';

const FONT = '"Helvetica Now Var", Helvetica, Arial, sans-serif';

const QUICK_PROMPTS = [
  'Software Engineer at a startup',
  'Product Manager at a tech company',
  'UX Designer with 3 years experience',
  'Data Scientist applying to Google',
  'Fresh graduate in Computer Science',
];

const GLASS = {
  background: 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 8px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
};

const DARK_GLASS = {
  background: 'rgba(8,8,8,0.88)',
  backdropFilter: 'blur(40px)',
  WebkitBackdropFilter: 'blur(40px)',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 16px 64px rgba(0,0,0,0.6)',
};

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function UserMenu({ session, onHistoryClick }) {
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
  const initial = name[0]?.toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-full px-2 py-1.5 hover:bg-white/8 transition-colors duration-200"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#34d399,#06b6d4)' }}>
          {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : <span className="text-black text-xs font-bold">{initial}</span>}
        </div>
        <span className="text-white/70 text-sm hidden sm:block">{name.split(' ')[0]}</span>
        <ChevronDown className="w-3.5 h-3.5 text-white/40 hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-64 z-50 rounded-2xl overflow-hidden" style={DARK_GLASS}>
          {/* Profile */}
          <div className="px-4 py-4 border-b border-white/8 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#34d399,#06b6d4)' }}>
              {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : <span className="text-black text-sm font-bold">{initial}</span>}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{name}</p>
              <p className="text-white/35 text-xs truncate">{email}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="p-2 flex flex-col gap-0.5">
            <button
              onClick={() => { setOpen(false); onHistoryClick(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/6 transition-all duration-150 text-sm text-left"
            >
              <History className="w-4 h-4" /> Search History
            </button>
            <div className="h-px bg-white/8 my-1" />
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-400/8 transition-all duration-150 text-sm text-left"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryDrawer({ open, onClose, history, onSelect, onDelete, onClear }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{ background: 'rgba(0,0,0,0.4)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-sm z-50 flex flex-col transition-transform duration-300 ease-out"
        style={{ ...DARK_GLASS, transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/8">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-semibold text-sm">Search History</span>
            {history.length > 0 && (
              <span className="text-white/30 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>{history.length}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button onClick={onClear} className="text-white/30 hover:text-red-400 text-xs transition-colors duration-150 flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> Clear all
              </button>
            )}
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/8 transition-all duration-150">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1.5">
          {history.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
              <Clock className="w-8 h-8 text-white/15" />
              <p className="text-white/25 text-sm text-center">No history yet.<br />Build your first resume!</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="group flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-150 hover:bg-white/6"
                onClick={() => { onSelect(item.prompt); onClose(); }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(52,211,153,0.12)' }}>
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/75 text-xs leading-relaxed line-clamp-2">{item.prompt}</p>
                  <p className="text-white/25 text-[10px] mt-1">{timeAgo(item.timestamp)}</p>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(item.id); }}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150 flex-shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [stage, setStage] = useState('idle');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const textareaRef = useRef(null);

  const storageKey = session?.user?.email ? `genie_history_${session.user.email}` : null;

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/signup');
  }, [status]);

  useEffect(() => {
    if (storageKey) {
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
        setHistory(saved);
      } catch { setHistory([]); }
    }
  }, [storageKey]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px';
    }
  }, [prompt]);

  function saveToHistory(text) {
    if (!storageKey) return;
    const entry = { id: Date.now(), prompt: text, timestamp: Date.now() };
    const updated = [entry, ...history].slice(0, 50);
    setHistory(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  }

  function deleteHistory(id) {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(updated));
  }

  function clearHistory() {
    setHistory([]);
    if (storageKey) localStorage.removeItem(storageKey);
  }

  async function handleBuild() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setStage('generating');
    setPdfUrl(null);
    saveToHistory(prompt.trim());

    try {
      const res = await fetch('/api/build-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, user: session?.user }),
      });
      const data = await res.json();
      if (data.pdfUrl) {
        setPdfUrl(data.pdfUrl);
        setStage('done');
      } else {
        setStage('idle');
      }
    } catch (e) {
      setStage('idle');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
      </div>
    );
  }

  const name = session?.user?.name?.split(' ')[0] || 'there';

  return (
    <div className="relative min-h-screen flex flex-col" style={{ fontFamily: FONT }}>

      <video autoPlay muted loop playsInline className="fixed inset-0 w-full h-full object-cover" style={{ zIndex: 0 }}>
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260613_180732_a54afbf6-b30d-470e-861f-669871f09f67.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/60" style={{ zIndex: 1 }} />

      <div className="relative flex flex-col min-h-screen" style={{ zIndex: 2 }}>

        {/* Nav */}
        <nav className="flex items-center justify-between px-5 sm:px-8 py-4">
          <span className="text-white text-xl font-bold tracking-wider">GENIE</span>
          <UserMenu session={session} onHistoryClick={() => setHistoryOpen(true)} />
        </nav>

        {/* Main */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
          <div className="w-full max-w-2xl flex flex-col gap-6">

            {/* Greeting */}
            <div className="text-center">
              <h1 className="text-white text-2xl sm:text-3xl font-black tracking-tight mb-2">
                Hey {name}, what role are you targeting?
              </h1>
              <p className="text-white/40 text-sm">
                Describe yourself and the job — Genie builds your perfect resume instantly
              </p>
            </div>

            {/* Prompt box */}
            <div className="rounded-3xl p-1" style={GLASS}>
              <div className="rounded-[20px] overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)' }}>
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleBuild(); } }}
                  placeholder="e.g. I'm a software engineer with 4 years of React and Node.js experience, applying for a senior frontend role at a fintech startup..."
                  rows={3}
                  className="w-full bg-transparent text-white text-sm sm:text-base placeholder-white/25 resize-none outline-none px-5 pt-5 pb-3 leading-relaxed"
                  style={{ minHeight: '100px' }}
                />
                <div className="flex items-center justify-between px-4 pb-4 pt-1">
                  <span className="text-white/20 text-xs">{prompt.length > 0 ? `${prompt.length} chars` : 'Shift+Enter for new line'}</span>
                  <button
                    onClick={handleBuild}
                    disabled={!prompt.trim() || loading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#34d399,#06b6d4)', color: '#000' }}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {loading ? 'Building...' : 'Build Resume'}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick prompts */}
            {stage === 'idle' && (
              <div className="flex flex-col gap-3">
                <p className="text-white/25 text-xs text-center tracking-wide uppercase">Quick start</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_PROMPTS.map(q => (
                    <button
                      key={q}
                      onClick={() => setPrompt(q)}
                      className="px-3.5 py-2 rounded-xl text-white/50 hover:text-white text-xs transition-all duration-200 hover:bg-white/8"
                      style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Generating state */}
            {stage === 'generating' && (
              <div className="rounded-2xl px-6 py-5 flex items-center gap-4" style={GLASS}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,rgba(52,211,153,0.2),rgba(6,182,212,0.2))' }}>
                  <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Genie is crafting your resume...</p>
                  <p className="text-white/35 text-xs mt-0.5">Analyzing your profile, optimizing for ATS, formatting sections</p>
                </div>
              </div>
            )}

            {/* Done state */}
            {stage === 'done' && pdfUrl && (
              <div className="rounded-2xl p-6 flex flex-col gap-4" style={GLASS}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.15)' }}>
                    <FileText className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">Your resume is ready</p>
                    <p className="text-white/35 text-xs">ATS optimized · Professional format · PDF</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-medium transition-all duration-200 hover:bg-white/12 active:scale-95"
                    style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }}
                  >
                    <Eye className="w-4 h-4" /> Preview
                  </a>
                  <a
                    href={pdfUrl}
                    download="resume.pdf"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-black text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-95"
                    style={{ background: 'linear-gradient(135deg,#34d399,#06b6d4)' }}
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </a>
                </div>
                <button
                  onClick={() => { setStage('idle'); setPrompt(''); setPdfUrl(null); }}
                  className="text-white/30 hover:text-white/60 text-xs text-center transition-colors duration-200"
                >
                  Build another resume
                </button>
              </div>
            )}

          </div>
        </main>

      </div>

      {/* History drawer */}
      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onSelect={p => setPrompt(p)}
        onDelete={deleteHistory}
        onClear={clearHistory}
      />

    </div>
  );
}
