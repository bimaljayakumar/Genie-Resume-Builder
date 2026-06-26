import { FileText, Zap, Target, Star, Twitter, Linkedin, Github, Youtube, LogOut, FileText as FileIcon, Clock, User } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how' },
  { label: 'Templates', href: '#templates' },
  { label: 'Pricing', href: '#pricing' },
];

const FEATURES = [
  { icon: Zap, title: 'AI Powered', desc: 'Smart suggestions tailored to your target job role and industry keywords.' },
  { icon: Target, title: 'Role Specific', desc: 'Enter your desired role and we auto-populate the most relevant skills and sections.' },
  { icon: FileText, title: 'ATS Optimized', desc: 'Every resume passes through ATS checks to maximize recruiter visibility.' },
  { icon: Star, title: 'Pro Templates', desc: 'Clean, modern designs crafted by professional resume consultants.' },
];

const STEPS = [
  { num: '01', title: 'Choose Your Role', desc: 'Tell us the job title you\'re targeting. We do the heavy lifting from there.' },
  { num: '02', title: 'Fill Your Details', desc: 'Add your experience, education, and projects. We guide you at every step.' },
  { num: '03', title: 'Download & Apply', desc: 'Export as PDF in seconds. Ready to send to any employer.' },
];

const FOOTER_COLS = [
  { title: 'LEGAL', links: ['Privacy Policy', 'Terms of Use', 'Cookie Policy'] },
];

const SOCIAL = [Twitter, Linkedin, Github, Youtube];

const FONT = '"Helvetica Now Var", Helvetica, Arial, sans-serif';

function Logo() {
  return (
    <Link href="/" className="flex items-center">
      <span className="text-white text-xl font-bold tracking-wider">GENIE</span>
    </Link>
  );
}

function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!session) return <Link href="/signup" className="text-white/60 hover:text-white text-sm font-medium transition-colors duration-200">Sign up</Link>;

  const initial = session.user?.name?.[0]?.toUpperCase() || '?';
  const name = session.user?.name || 'User';
  const email = session.user?.email || '';
  const avatar = session.user?.image;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/20 hover:border-white/50 transition-colors duration-200 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #34d399, #06b6d4)' }}>
        {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : <span className="text-black text-sm font-bold">{initial}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-72 z-50" style={{
          background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
          borderRadius: '20px',
        }}>
          {/* Profile */}
          <div className="px-5 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #34d399, #06b6d4)' }}>
                {avatar ? <img src={avatar} alt={name} className="w-full h-full object-cover" /> : <span className="text-black text-sm font-bold">{initial}</span>}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{name}</p>
                <p className="text-white/40 text-xs truncate">{email}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="px-5 py-4 border-b border-white/8">
            <p className="text-white/30 text-[10px] tracking-[0.15em] uppercase mb-3">Your Activity</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Resumes', value: '0' },
                { label: 'Downloads', value: '0' },
                { label: 'Days active', value: '1' },
              ].map(({ label, value }) => (
                <div key={label} className="text-center rounded-xl py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <p className="text-white font-bold text-base">{value}</p>
                  <p className="text-white/35 text-[10px]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Menu items */}
          <div className="px-3 py-3 flex flex-col gap-1">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/6 transition-all duration-150 text-sm text-left">
              <FileIcon className="w-4 h-4" /> My Resumes
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/6 transition-all duration-150 text-sm text-left">
              <Clock className="w-4 h-4" /> Recent Activity
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/6 transition-all duration-150 text-sm text-left">
              <User className="w-4 h-4" /> Account
            </button>
            <div className="h-px bg-white/8 my-1" />
            <button onClick={() => signOut({ callbackUrl: '/' })} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-400/8 transition-all duration-150 text-sm text-left">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

function GradBtn({ children, href, onClick, className = '' }) {
  const base = `bg-gradient-to-r from-emerald-400 to-cyan-500 text-black font-semibold rounded-full flex items-center gap-2 transition-opacity hover:opacity-90 ${className}`;
  if (href) return <Link href={href} className={base}>{children}</Link>;
  return <button onClick={onClick} className={base}>{children}</button>;
}

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col" style={{ fontFamily: FONT }}>
      {/* BG Video — fixed so it never stretches on scroll */}
      <video autoPlay muted loop playsInline className="fixed inset-0 w-full h-full object-cover" style={{ zIndex: 0 }}>
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260613_180732_a54afbf6-b30d-470e-861f-669871f09f67.mp4" type="video/mp4" />
      </video>
      {/* Dark overlay — also fixed */}
      <div className="fixed inset-0 bg-black/50" style={{ zIndex: 1 }} />

      <div className="relative flex flex-col min-h-screen" style={{ zIndex: 2 }}>

        {/* NAV */}
        <nav className="flex items-center justify-between px-2 md:px-6 lg:px-8 py-5">
          <Logo />
          <UserMenu />
        </nav>

        {/* HERO */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-16 md:py-0">

          <h1 className="text-white text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-[88px] font-black leading-[1.05] tracking-tighter mb-4 sm:mb-6 max-w-5xl">
            Build Resumes That<br />
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Actually Get Hired
            </span>
          </h1>
          <p className="text-white/60 text-sm sm:text-base md:text-lg font-light leading-relaxed max-w-xl mb-8 sm:mb-10">
            Tell us the role you want. We craft a tailored, ATS Optimized resume with the right skills, keywords, and format in minutes.
          </p>
          <div className="flex flex-col xs:flex-row items-center gap-3 sm:gap-4">
            <GradBtn href="/signup" className="text-sm sm:text-base px-8 py-3.5">
              Build My Resume
            </GradBtn>
          </div>

        </section>

        {/* FEATURES */}
        <section id="features" className="px-4 sm:px-6 md:px-12 lg:px-16 py-16 sm:py-24">
          <p className="text-emerald-400 text-xs font-bold tracking-[0.2em] uppercase text-center mb-3">Why Genie</p>
          <h2 className="text-white text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-center mb-10 sm:mb-14">
            Everything you need to stand out
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-6xl mx-auto">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)',
              }} className="rounded-2xl p-6 sm:p-8 flex flex-col gap-4 hover:bg-white/5 transition-colors duration-300 group">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(6,182,212,0.2))' }}>
                  <Icon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base mb-2 tracking-tight">{title}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="px-4 sm:px-6 md:px-12 lg:px-16 py-16 sm:py-24">
          <p className="text-emerald-400 text-xs font-bold tracking-[0.2em] uppercase text-center mb-3">The Process</p>
          <h2 className="text-white text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-center mb-12 sm:mb-16">
            From zero to hired in 3 steps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 max-w-5xl mx-auto">
            {STEPS.map(({ num, title, desc }) => (
              <div key={num} style={{
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)',
              }} className="rounded-2xl p-8 sm:p-10 flex flex-col gap-3">
                <span className="text-5xl font-black text-transparent bg-gradient-to-br from-emerald-400/30 to-cyan-400/10 bg-clip-text select-none">{num}</span>
                <h3 className="text-white font-bold text-lg tracking-tight">{title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>



        {/* FOOTER */}
        <footer className="px-6 md:px-12 lg:px-20 pb-10 pt-10">
          <div className="flex flex-col items-center gap-8">

            {/* Links */}
            <div className="flex flex-wrap justify-center gap-6">
              {FOOTER_COLS[0].links.map((link) => (
                <a key={link} href="#" className="text-white/50 hover:text-white text-sm transition-colors duration-200">{link}</a>
              ))}
            </div>

            {/* Socials */}
            <div className="flex items-center gap-5">
              {SOCIAL.map((Icon, i) => (
                <a key={i} href="#" className="text-white/40 hover:text-white transition-colors duration-200"><Icon className="w-5 h-5" /></a>
              ))}
            </div>

            <p className="text-white/25 text-xs tracking-wide">&copy; 2025 Genie. All rights reserved.</p>

          </div>
        </footer>

      </div>
    </div>
  );
}
