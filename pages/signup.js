import Link from 'next/link';

const FONT = '"Helvetica Now Var", Helvetica, Arial, sans-serif';

const PERKS = [
  'AI tailored resume for any job role',
  'ATS optimization built in',
  'Download as PDF instantly',
  'Free forever, no credit card needed',
];

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 flex-shrink-0 mt-0.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function Signup() {
  return (
    <div className="relative min-h-screen flex flex-col" style={{ fontFamily: FONT }}>

      {/* Background video */}
      <video autoPlay muted loop playsInline className="fixed inset-0 w-full h-full object-cover" style={{ zIndex: 0 }}>
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260613_180732_a54afbf6-b30d-470e-861f-669871f09f67.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/55" style={{ zIndex: 1 }} />

      <div className="relative flex flex-col min-h-screen" style={{ zIndex: 2 }}>

        {/* Top bar */}
        <div className="flex items-center px-5 sm:px-8 py-5">
          <Link href="/" className="text-white text-xl font-bold tracking-wider">GENIE</Link>
        </div>

        {/* Center content */}
        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-[480px] flex flex-col gap-5">

            {/* Heading */}
            <div className="text-center mb-1">
              <h1 className="text-white text-3xl sm:text-4xl font-black tracking-tight mb-3">
                Start building for free
              </h1>
              <p className="text-white/45 text-base leading-relaxed">
                Your next job starts with a great resume
              </p>
            </div>

            {/* Main glass card */}
            <div style={{
              background: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              border: '1px solid rgba(255,255,255,0.13)',
              boxShadow: '0 8px 48px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
            }} className="rounded-3xl p-8 sm:p-10 flex flex-col gap-8">

              {/* Google button */}
              <button
                onClick={() => { /* Google OAuth handler */ }}
                className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold text-base py-4 rounded-2xl hover:bg-gray-50 active:scale-[0.98] transition-all duration-150 shadow-md"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-[11px] tracking-[0.18em] uppercase">What you get</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Perks */}
              <ul className="flex flex-col gap-4">
                {PERKS.map((perk) => (
                  <li key={perk} className="flex items-start gap-3">
                    <CheckIcon />
                    <span className="text-white/65 text-sm sm:text-base leading-relaxed">{perk}</span>
                  </li>
                ))}
              </ul>

            </div>

            {/* Terms */}
            <p className="text-white/25 text-xs text-center leading-relaxed px-2">
              By continuing, you agree to our{' '}
              <a href="#" className="text-white/45 hover:text-white underline underline-offset-2 transition-colors duration-200">Terms</a>
              {' '}and{' '}
              <a href="#" className="text-white/45 hover:text-white underline underline-offset-2 transition-colors duration-200">Privacy Policy</a>.
            </p>

          </div>
        </div>

      </div>
    </div>
  );
}
