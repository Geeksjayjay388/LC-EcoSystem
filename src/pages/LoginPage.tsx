import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Monitor, ShieldCheck } from "lucide-react";
import { supabase } from "../lib/supabase";

const LoginPage = () => {
  const [deviceId, setDeviceId] = useState('');
  const [password, setPassword] = useState('');
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
      setError("Invalid Device ID or Password");
      setLoading(false);
    } else {
      navigate("/home");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] p-6 text-slate-200 font-sans">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="bg-blue-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <Monitor className="text-blue-400 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">LC-Ecosystem</h1>
          <p className="text-slate-500 text-sm mt-1">Authorized Access Only</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 ml-1">
              Device Terminal ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 2343"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all placeholder:text-slate-700"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 ml-1">
              Access Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all placeholder:text-slate-700"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Connect to Ecosystem"
            )}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-slate-800 text-center">
          <p className="text-slate-600 text-[10px] uppercase tracking-[0.2em]">
            LC-Ecosystem Node Protocol v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
