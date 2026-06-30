import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { Send, Sparkles, LogOut, ChevronDown, Loader2, History, X, Clock, Trash2, Eye, Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from 'lib/redux/hooks';
import {
  setResume,
  changeProfile,
  changeWorkExperiences,
  changeEducations,
  changeProjects,
  changeSkills,
  addSectionInForm,
} from 'lib/redux/resumeSlice';
import { store } from 'lib/redux/store';
import { ResumeForm } from 'components/ResumeForm';
import { Resume } from 'components/Resume';

const FONT = 'Inter, system-ui, sans-serif';

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
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
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

// ─── Main ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const resumeState = useAppSelector((state) => state.resume);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
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

  function handleNewChat() {
    if (messages.length > 0) {
      const currentResume = store.getState().resume;
      const key = `genie_history_${session?.user?.email}`;
      const entry = {
        id: Date.now(),
        ts: Date.now(),
        name: currentResume.profile.name || 'New Chat Session',
        role: currentResume.profile.summary ? 'AI Assisted Chat' : 'Resume Chat',
        resume: currentResume,
        messages: messages,
        chatHistory: chatHistory.current,
      };
      const h = [entry, ...history].slice(0, 20);
      setHistory(h);
      localStorage.setItem(key, JSON.stringify(h));
    }
    setMessages([]);
    chatHistory.current = [];
  }

  async function handleSend() {
    const val = input.trim();
    if (!val || loading) return;
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

      // Handle field-by-field updates from AI
      if (data.updateData) {
        const updates = data.updateData;

        // 1. Update Profile
        if (updates.profile) {
          Object.entries(updates.profile).forEach(([field, value]) => {
            dispatch(changeProfile({ field, value }));
          });
        }

        // 2. Update Work Experiences
        if (updates.workExperiences && Array.isArray(updates.workExperiences)) {
          const currentCount = resumeState.workExperiences.length;
          updates.workExperiences.forEach((exp, idx) => {
            if (idx >= currentCount) {
              dispatch(addSectionInForm({ form: 'workExperiences' }));
            }
            Object.entries(exp).forEach(([field, value]) => {
              dispatch(changeWorkExperiences({ idx, field, value }));
            });
          });
        }

        // 3. Update Educations
        if (updates.educations && Array.isArray(updates.educations)) {
          const currentCount = resumeState.educations.length;
          updates.educations.forEach((edu, idx) => {
            if (idx >= currentCount) {
              dispatch(addSectionInForm({ form: 'educations' }));
            }
            Object.entries(edu).forEach(([field, value]) => {
              dispatch(changeEducations({ idx, field, value }));
            });
          });
        }

        // 4. Update Projects
        if (updates.projects && Array.isArray(updates.projects)) {
          const currentCount = resumeState.projects.length;
          updates.projects.forEach((proj, idx) => {
            if (idx >= currentCount) {
              dispatch(addSectionInForm({ form: 'projects' }));
            }
            Object.entries(proj).forEach(([field, value]) => {
              dispatch(changeProjects({ idx, field, value }));
            });
          });
        }

        // 5. Update Skills
        if (updates.skills) {
          if (Array.isArray(updates.skills.descriptions)) {
            dispatch(changeSkills({ field: 'descriptions', value: updates.skills.descriptions }));
          }
          if (Array.isArray(updates.skills.featuredSkills)) {
            updates.skills.featuredSkills.forEach((fs, idx) => {
              if (idx < 6) {
                dispatch(changeSkills({ field: 'featuredSkills', idx, skill: fs.skill, rating: fs.rating || 4 }));
              }
            });
          }
        }

        // Save updated snapshot to history
        setTimeout(() => {
          const updatedResume = store.getState().resume;
          const key = `genie_history_${session?.user?.email}`;
          const entry = {
            id: Date.now(),
            ts: Date.now(),
            name: updatedResume.profile.name || 'Resume Update',
            role: updatedResume.profile.summary ? 'AI Assisted Summary' : 'Resume Details',
            resume: updatedResume,
            messages: [
              ...messages,
              { role: 'user', text: val },
              ...(data.reply ? [{ role: 'ai', text: data.reply }] : [])
            ],
            chatHistory: [...chatHistory.current],
          };
          const h = [entry, ...history].slice(0, 20);
          setHistory(h);
          localStorage.setItem(key, JSON.stringify(h));
        }, 100);
      }
    } catch (err) {
      setLoading(false);
      addMsg('ai', 'Something went wrong: ' + (err?.message || 'Please try again.'));
    }
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="min-h-screen flex items-center justify-center bg-black"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>;
  }

  const userInitial = session?.user?.name?.[0]?.toUpperCase() || 'U';
  const inputDisabled = loading;

  const InputBox = (
    <div className="rounded-2xl p-1" style={{ ...GLASS, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.4)' }}>
      <div className="rounded-[14px] flex items-end gap-2 px-3 py-1.5" style={{ background: 'rgba(0,0,0,0.2)' }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={inputDisabled ? 'Please wait...' : 'Paste experience or type a command...'}
          disabled={inputDisabled}
          rows={1}
          className="flex-1 bg-transparent text-white text-sm placeholder-white/30 resize-none outline-none py-2 leading-relaxed disabled:opacity-40"
          style={{ maxHeight: 120 }}
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
    <div className="relative h-screen flex flex-col overflow-hidden bg-black" style={{ fontFamily: FONT }}>
      {/* Background Cosmic Video */}
      <video autoPlay muted loop playsInline className="fixed inset-0 w-full h-full object-cover" style={{ zIndex: 0 }}>
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260613_180732_a54afbf6-b30d-470e-861f-669871f09f67.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/55" style={{ zIndex: 1 }} />

      {/* Main Layout Layer */}
      <div className="relative flex flex-col h-full" style={{ zIndex: 2 }}>
        
        {/* Navigation Bar */}
        <nav className="flex items-center justify-between px-5 sm:px-8 py-3.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-white text-xl font-bold tracking-wider">GENIE</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open('/preview', '_blank')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all border border-white/8 shadow-md bg-white/5"
            >
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              Preview
            </button>
            <button
              onClick={() => setAiOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white/90 hover:text-white hover:bg-blue-500/10 hover:border-blue-500/30 transition-all border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.2)] bg-blue-500/5"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              AI Assistant
            </button>
            <UserMenu session={session} onHistoryOpen={() => setHistoryOpen(true)} />
          </div>
        </nav>

        {/* Builder Viewport */}
        <main className="flex-1 flex overflow-hidden min-h-0 bg-transparent justify-center">
          <div className="w-full h-full overflow-hidden bg-transparent border-r border-white/5">
            <ResumeForm />
          </div>
        </main>
      </div>

      {/* Floating Sparkles AI Coach Bubble */}
      <button
        onClick={() => setAiOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95 group"
        style={{
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          boxShadow: '0 0 15px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 0 25px rgba(59, 130, 246, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
        }}
      >
        <Sparkles className="w-5 h-5 text-blue-400 group-hover:text-blue-300 group-hover:rotate-12 transition-all duration-300" />
      </button>

      {/* AI Assistant Slide-out Drawer */}
      {aiOpen && (
        <>
          {/* Backdrop blur */}
          <div
            onClick={() => setAiOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
          />
          {/* Drawer Panel container */}
          <div
            className="fixed top-0 right-0 h-full w-full max-w-md z-50 flex flex-col shadow-2xl transition-transform duration-300"
            style={{
              background: 'rgba(10, 10, 10, 0.88)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-bold text-sm tracking-wide">Genie AI Assistant</span>
              </div>
              <button
                onClick={() => setAiOpen(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                       style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.1), rgba(6,182,212,0.1))', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Sparkles className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-white font-semibold text-sm mb-1.5">Talk to Genie</p>
                  <p className="text-white/45 text-xs leading-relaxed max-w-xs mx-auto">
                    Paste your raw resume text, describe yourself, or request structural suggestions. I will generate your base resume and populate it straight into the builder forms!
                  </p>
                </div>
              ) : (
                messages.map((m, i) => (
                  <Bubble key={i} role={m.role} text={m.text} userInitial={userInitial} />
                ))
              )}
              {loading && <Bubble role="ai" text="" isLoading userInitial={userInitial} />}
              <div ref={bottomRef} />
            </div>

            {/* Drawer Input */}
            <div className="p-4 border-t border-white/10 flex flex-col gap-3">
              <button
                onClick={handleNewChat}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-white/85 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all border border-white/8 shadow-md bg-white/5 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-blue-400" />
                Start New Chat
              </button>
              {InputBox}
            </div>
          </div>
        </>
      )}

      {/* History Slide-out Panel */}
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={history}
        onSelect={item => {
          if (item.resume) {
            dispatch(setResume(item.resume));
          }
          if (item.messages && Array.isArray(item.messages)) {
            setMessages(item.messages);
            chatHistory.current = item.chatHistory || [];
            setAiOpen(true);
          } else {
            setMessages([{ role: 'ai', text: `Here's the resume for **${item.role}** — loaded from history.` }]);
            chatHistory.current = [];
          }
        }}
        onClear={() => { const key = `genie_history_${session?.user?.email}`; setHistory([]); localStorage.removeItem(key); }}
      />

    </div>
  );
}
