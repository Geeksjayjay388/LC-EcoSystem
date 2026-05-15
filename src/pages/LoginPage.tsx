import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Monitor, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";

const LoginPage = () => {
  const [deviceId, setDeviceId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Convert the ID to a format Supabase Auth expects
    // e.g., "2343" becomes "2343@lc.local"
    const formattedEmail = `${deviceId.trim()}@lc.local`;

    const { error } = await supabase.auth.signInWithPassword({
      email: formattedEmail,
      password: password,
    });

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setError("This account is not confirmed yet. Confirm the user in Supabase Auth.");
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      navigate("/home");
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 p-6 font-sans text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-64 w-64 rounded-full bg-blue-200 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-indigo-100 blur-3xl" />
      </div>
      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 lg:grid-cols-2">
        <section className="hidden bg-gradient-to-br from-blue-700 to-blue-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
              <Monitor className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold leading-tight">Lanet Computers Eco-System</h1>
            <p className="mt-3 text-sm text-slate-300">
              Secure vault access for uploading, previewing, and downloading files across devices.
            </p>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Authorized Access • Node Protocol
          </p>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-8 text-center lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Lanet Computers
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Sign in to Eco-System</h2>
              <p className="mt-1 text-sm text-slate-500">Use your assigned terminal ID and password.</p>
            </div>

            {error && (
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Device Terminal ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2343"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Access Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Connect to Eco-System"}
              </button>
            </form>

            <p className="mt-8 text-center text-[11px] uppercase tracking-[0.16em] text-slate-400 lg:text-left">
              Lanet Computers Eco-System
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
