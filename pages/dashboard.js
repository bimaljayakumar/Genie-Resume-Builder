import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Send, Sparkles, FileText, Download, Eye, LogOut, ChevronDown, Loader2 } from 'lucide-react';

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

function UserMenu({ session }) {
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
        <div className="absolute right-0 top-12 w-60 z-50 rounded-2xl overflow-hidden" style={{ ...GLASS, background: 'rgba(8,8,8,0.9)' }}>
          <div className="px-4 py-3.5 border-b border-white/8">
            <p className="text-white text-sm font-semibold truncate">{name}</p>
            <p className="text-white/35 text-xs truncate">{email}</p>
          </div>
          <div className="p-2">
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

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [stage, setStage] = useState('idle'); // idle | generating | done
  const textareaRef = useRef(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/signup');
  }, [status]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 180) + 'px';
    }
  }, [prompt]);

  async function handleBuild() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setStage('generating');
    setPdfUrl(null);

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

      {/* BG video */}
      <video autoPlay muted loop playsInline className="fixed inset-0 w-full h-full object-cover" style={{ zIndex: 0 }}>
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260613_180732_a54afbf6-b30d-470e-861f-669871f09f67.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/60" style={{ zIndex: 1 }} />

      <div className="relative flex flex-col min-h-screen" style={{ zIndex: 2 }}>

        {/* Nav */}
        <nav className="flex items-center justify-between px-5 sm:px-8 py-4">
          <span className="text-white text-xl font-bold tracking-wider">GENIE</span>
          <UserMenu session={session} />
        </nav>

        {/* Main */}
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12">
          <div className="w-full max-w-2xl flex flex-col gap-6">

            {/* Greeting */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4" style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-medium tracking-wide">AI Resume Builder</span>
              </div>
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
    </div>
  );
}
