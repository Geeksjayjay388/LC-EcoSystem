import { Loader2 } from "lucide-react";

type LoadingScreenProps = {
  message?: string;
};

function LoadingScreen({ message = "Preparing secure workspace..." }: LoadingScreenProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/4 top-20 h-56 w-56 rounded-full bg-blue-200/60 blur-3xl" />
        <div className="absolute right-1/4 bottom-16 h-56 w-56 rounded-full bg-indigo-200/60 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-xl shadow-slate-300/50 backdrop-blur">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-100">
            <img src="/logo.png" alt="LC" className="h-full w-full object-contain p-2" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Lanet Computers Eco-System</h1>
          <p className="mt-2 text-sm text-slate-600">{message}</p>
          <div className="mt-6 flex items-center justify-center gap-2 text-blue-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">Loading</span>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
