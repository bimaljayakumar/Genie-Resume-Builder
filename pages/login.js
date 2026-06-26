import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const FONT = '"Helvetica Now Var", Helvetica, Arial, sans-serif';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}

export default function Login() {
  return (
    <div className="relative min-h-screen flex flex-col" style={{ fontFamily: FONT }}>
      <video autoPlay muted loop playsInline className="fixed inset-0 w-full h-full object-cover" style={{ zIndex: 0 }}>
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260613_180732_a54afbf6-b30d-470e-861f-669871f09f67.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/60" style={{ zIndex: 1 }} />

      <div className="relative flex flex-col min-h-screen items-center justify-center px-4" style={{ zIndex: 2 }}>

        {/* Back link */}
        <Link href="/" className="absolute top-6 left-6 flex items-center gap-1.5 text-white/50 hover:text-white text-xs tracking-wide transition-colors duration-200">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        {/* Card */}
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Link href="/" className="flex items-center gap-2.5 mb-8">
              <span className="text-white text-2xl font-bold tracking-wider">GENIE</span>
            </Link>
            <h1 className="text-white text-2xl sm:text-3xl font-black tracking-tight mb-2">Welcome back</h1>
            <p className="text-white/50 text-sm text-center leading-relaxed">
              Sign in to continue building your career-winning resume with Genie
            </p>
          </div>

          {/* Auth box */}
          <div className="liquid-glass rounded-2xl p-6 sm:p-8">
            <button
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold text-sm py-3.5 rounded-xl hover:bg-gray-50 transition-colors duration-200 shadow-sm"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/30 text-[10px] tracking-widest uppercase">Secure Sign-In</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <p className="text-white/30 text-[10px] text-center leading-relaxed">
              By signing in, you agree to our{' '}
              <a href="#" className="text-white/50 hover:text-white underline underline-offset-2 transition-colors duration-200">Terms of Service</a>{' '}
              and{' '}
              <a href="#" className="text-white/50 hover:text-white underline underline-offset-2 transition-colors duration-200">Privacy Policy</a>.
            </p>
          </div>

          <p className="text-center text-white/40 text-xs mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors duration-200">
              Sign up free
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
