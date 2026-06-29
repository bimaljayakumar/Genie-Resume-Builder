import { useEffect } from 'react';
import { useAppDispatch } from 'lib/redux/hooks';
import { setResume } from 'lib/redux/resumeSlice';
import { setSettings } from 'lib/redux/settingsSlice';
import { loadStateFromLocalStorage } from 'lib/redux/local-storage';
import { Resume } from 'components/Resume';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function PreviewPage() {
  const { status } = useSession();
  const router = useRouter();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status]);

  useEffect(() => {
    // Load state from local storage and update Redux
    const loadState = () => {
      const state = loadStateFromLocalStorage();
      if (state) {
        if (state.resume) dispatch(setResume(state.resume));
        if (state.settings) dispatch(setSettings(state.settings));
      }
    };
    loadState();

    // Listen for storage changes in the dashboard tab
    const handleStorageChange = (e) => {
      if (e.key === 'open-resume-state') {
        loadState();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [dispatch]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="w-6 h-6 text-white/35 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col justify-between overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ background: 'rgba(10,10,10,0.85)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm tracking-wide">Genie Resume Preview</span>
          <span className="text-emerald-400 text-[10px] bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">Live Sync Active</span>
        </div>
        <button
          onClick={() => window.close()}
          className="text-white/60 hover:text-white px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-semibold transition-all hover:bg-white/10 active:scale-95"
        >
          Close Preview
        </button>
      </div>

      {/* Main sheet preview */}
      <div className="flex-1 overflow-auto bg-[#121212] flex justify-center items-start py-8">
        <div className="w-full max-w-4xl h-full flex flex-col justify-between overflow-hidden">
          <Resume />
        </div>
      </div>
    </div>
  );
}
