import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, Lock, Monitor, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase";

const LoginPage = () => {
    const [deviceId, setDeviceId] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const formattedEmail = `${deviceId.trim()}@lc.local`;

        const { error } = await supabase.auth.signInWithPassword({
            email: formattedEmail,
            password: password,
        });

        if (error) {
            setError(error.message.toLowerCase().includes("email not confirmed") 
                ? "Access pending: Terminal ID not yet authorized." 
                : error.message);
            setLoading(false);
        } else {
            navigate("/home");
        }
    };

    return (
        <div 
            onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
            className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-4 lg:p-8 font-sans selection:bg-emerald-100 relative overflow-hidden"
        >
            {/* Interactive Dot Grid Background */}
            <div 
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, #cbd5e1 1.5px, transparent 0)`,
                    backgroundSize: '24px 24px'
                }}
            />
            <div 
                className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
                style={{
                    background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(4, 120, 87, 0.08), transparent 40%)`
                }}
            />

            {/* Main Container */}
            <div className="relative z-10 w-full max-w-[1100px] min-h-[650px] grid lg:grid-cols-12 overflow-hidden rounded-none bg-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.12)] border border-slate-100">
                
                {/* Left Side: Brand & Visuals */}
                <section className="relative hidden lg:flex lg:col-span-5 flex-col justify-between p-12 overflow-hidden bg-[#0f172a]">
                    {/* Background Image with Overlay */}
                    <img
                        src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80" 
                        alt="Security Infrastructure"
                        className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-luminosity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-800/20 via-slate-900/90 to-slate-900" />
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-12">
                            <div className="h-10 w-10 rounded-none bg-white p-2 shadow-xl shadow-emerald-950/20">
                                <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
                            </div>
                            <span className="text-white font-bold tracking-tight text-xl uppercase">Lanet Computers</span>
                        </div>
                        
                        <h1 className="text-4xl font-extrabold text-white leading-tight tracking-tight">
                            Lanet Computers<br/> 
                            <span className="text-emerald-400">Ecosystem.</span>
                        </h1>
                        <p className="mt-6 text-slate-400 leading-relaxed max-w-xs text-sm">
                            Access the encrypted file vault. Monitor node protocols and manage enterprise assets with end-to-end authorization.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-4 text-xs font-medium text-slate-500 uppercase tracking-widest">
                        <span className="h-[1px] w-8 bg-slate-700" />
                        Authorized Personnel Only
                    </div>
                </section>

                {/* Right Side: Form */}
                <section className="lg:col-span-7 flex flex-col justify-center px-8 py-12 sm:px-16 lg:px-24 bg-white">
                    <div className="max-w-sm w-full mx-auto">
                        <header className="mb-10">
                            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Sign In</h2>
                            <p className="text-slate-500 mt-2">Enter your credentials to link this device.</p>
                        </header>

                        {error && (
                            <div className="mb-8 flex items-center gap-3 rounded-none border border-red-100 bg-red-50/50 p-4 text-sm text-red-600 animate-in fade-in slide-in-from-top-2">
                                <ShieldCheck className="h-5 w-5 shrink-0 opacity-80" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="group">
                                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-emerald-700 transition-colors">
                                    Terminal ID
                                </label>
                                <div className="relative">
                                    <Monitor className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Enter ID (e.g. 2343)"
                                        className="w-full rounded-none border border-slate-200 bg-slate-50/50 py-4 pl-12 pr-4 text-slate-900 outline-none transition-all focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-600/5 placeholder:text-slate-400"
                                        value={deviceId}
                                        onChange={(e) => setDeviceId(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-400 group-focus-within:text-emerald-700 transition-colors">
                                    Access Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                    <input
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        className="w-full rounded-none border border-slate-200 bg-slate-50/50 py-4 pl-12 pr-4 text-slate-900 outline-none transition-all focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-600/5 placeholder:text-slate-400"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-none bg-[#0f172a] py-4 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-70 shadow-xl shadow-emerald-950/10"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        Establish Connection
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                    </>
                                )}
                            </button>
                        </form>

                        <footer className="mt-12 pt-8 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                                © {new Date().getFullYear()} LANET SYSTEMS
                            </span>
                            <div className="flex gap-4">
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] text-slate-400 uppercase font-medium">Server Online</span>
                            </div>
                        </footer>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default LoginPage;