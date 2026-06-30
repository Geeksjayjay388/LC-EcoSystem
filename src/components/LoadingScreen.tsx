import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type LoadingScreenProps = {
  message?: string;
};

function LoadingScreen({ message = "Preparing secure workspace..." }: LoadingScreenProps) {
  const [isDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("home-dark-mode") === "true";
  });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    
    // Simulate loading progress for visual effect
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return Math.min(p + Math.random() * 15, 99);
      });
    }, 300);
    return () => clearInterval(interval);
  }, [isDark]);

  return (
    <div className={`relative min-h-screen overflow-hidden transition-colors duration-700 ease-in-out ${isDark ? "bg-[#0B1120]" : "bg-slate-50"}`}>
      {/* Dynamic Background Elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={`absolute -left-[10%] top-[10%] h-[40vh] w-[40vh] rounded-none mix-blend-multiply filter blur-[100px] opacity-25 animate-pulse ${isDark ? "bg-emerald-900 mix-blend-screen" : "bg-emerald-200"}`} style={{ animationDuration: '4s' }} />
        <div className={`absolute -right-[10%] top-[20%] h-[50vh] w-[50vh] rounded-none mix-blend-multiply filter blur-[120px] opacity-25 animate-pulse ${isDark ? "bg-teal-900 mix-blend-screen" : "bg-teal-200"}`} style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className={`absolute left-[20%] -bottom-[10%] h-[60vh] w-[60vh] rounded-none mix-blend-multiply filter blur-[100px] opacity-25 animate-pulse ${isDark ? "bg-green-900 mix-blend-screen" : "bg-green-200"}`} style={{ animationDuration: '6s', animationDelay: '2s' }} />
        
        {/* Subtle grid pattern */}
        <div className={`absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNjdXJyZW50Q29sb3IiIGZpbGwtb3BhY2l0eT0iMC4xNSIvPjwvc3ZnPg==')] ${isDark ? "text-white opacity-20" : "text-black opacity-[0.03]"}`} />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className={`w-full max-w-md overflow-hidden rounded-none border p-1 text-center shadow-2xl backdrop-blur-xl transition-all duration-700 ${
          isDark 
            ? "border-slate-800/60 bg-slate-900/40 shadow-black/80" 
            : "border-white/60 bg-white/60 shadow-slate-300/50"
        }`}>
          <div className={`rounded-none px-8 py-10 ${
            isDark ? "bg-slate-900/50" : "bg-white/50"
          }`}>
            {/* Logo Section */}
            <div className="relative mx-auto mb-10 h-28 w-28">
              <div className={`absolute inset-0 rounded-none opacity-40 blur-2xl animate-pulse ${isDark ? "bg-emerald-500" : "bg-emerald-400"}`} style={{ animationDuration: '3s' }} />
              <div className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-none border shadow-xl transition-colors duration-700 ${
                isDark ? "border-slate-700/50 bg-slate-800" : "border-white bg-white"
              }`}>
                <img 
                  src="/logo.png" 
                  alt="LC" 
                  className="h-20 w-20 object-contain p-2 hover:scale-105 transition-transform duration-500" 
                />
                
                {/* Shine effect */}
                <div className="absolute inset-0 -translate-x-[150%] animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]" />
              </div>
            </div>

            {/* Typography */}
            <h1 className={`text-2xl font-black tracking-tight transition-colors duration-700 ${isDark ? "text-white" : "text-slate-900"}`}>
              Lanet Computers Ecosystem
            </h1>
            <p className={`mt-3 text-sm font-medium tracking-wide transition-colors duration-700 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {message}
            </p>

            {/* Loading Indicator */}
            <div className="mt-12 flex flex-col items-center gap-5">
              <div className="flex items-center gap-3">
                <Loader2 className={`h-5 w-5 animate-spin ${isDark ? "text-emerald-400" : "text-emerald-600"}`} />
                <span className={`text-xs font-bold uppercase tracking-[0.2em] ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                  Establishing Connection
                </span>
              </div>
              
              {/* Progress Bar Container */}
              <div className={`relative h-1.5 w-full overflow-hidden rounded-none transition-colors duration-700 ${isDark ? "bg-slate-800" : "bg-slate-200"}`}>
                <div 
                  className="absolute inset-y-0 left-0 rounded-none bg-gradient-to-r from-emerald-600 to-green-700 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:1rem_1rem] animate-[move_1s_linear_infinite]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(150%); }
        }
        @keyframes move {
          0% { background-position: 1rem 0; }
          100% { background-position: 0 0; }
        }
      `}</style>
    </div>
  );
}

export default LoadingScreen;
