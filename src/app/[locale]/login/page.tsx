"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function LoginPage({ params }: { params: { locale: string } }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Redirect based on role
      if (data.role === "citizen") router.push(`/${params.locale}/citizen`);
      else if (data.role === "traffic_operator") router.push(`/${params.locale}/dashboard/traffic`);
      else if (data.role === "emergency_operator") router.push(`/${params.locale}/dashboard/emergency`);
      else if (data.role === "water_operator") router.push(`/${params.locale}/dashboard/water`);
      else if (data.role === "executive") router.push(`/${params.locale}/dashboard/executive`);
      else router.push(`/${params.locale}/dashboard`); // Super admin
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const setDemo = (user: string, pass: string) => {
    setEmail(user);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden text-slate-200">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.15),rgba(255,255,255,0))]" />
      
      <div className="w-full max-w-md z-10 relative">
        <Link href={`/${params.locale}`} className="flex flex-col items-center mb-8 hover:opacity-80 transition-opacity">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-cyan-500" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Smart Chennai</h1>
          </div>
          <p className="text-sm text-cyan-500/80 mt-1 uppercase tracking-widest font-medium">
            Command & Control Centre
          </p>
        </Link>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">User ID / Email</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? "Authenticating..." : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 bg-slate-900/30 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 mb-3 text-center uppercase tracking-wider">Demo Accounts (For Viva)</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button onClick={() => setDemo('traffic.demo', 'Traffic@123')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-left transition-colors">
              <span className="block text-cyan-400 font-medium mb-1">Traffic Operator</span>
              <span className="text-slate-400">traffic.demo</span>
            </button>
            <button onClick={() => setDemo('water.demo', 'Water@123')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-left transition-colors">
              <span className="block text-blue-400 font-medium mb-1">Water Operator</span>
              <span className="text-slate-400">water.demo</span>
            </button>
            <button onClick={() => setDemo('emergency.demo', 'Emergency@123')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-left transition-colors">
              <span className="block text-red-400 font-medium mb-1">Emergency Operator</span>
              <span className="text-slate-400">emergency.demo</span>
            </button>
            <button onClick={() => setDemo('admin.demo', 'Admin@123')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-left transition-colors">
              <span className="block text-amber-400 font-medium mb-1">Super Admin</span>
              <span className="text-slate-400">admin.demo</span>
            </button>
            <button onClick={() => setDemo('executive.demo', 'Executive@123')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-left transition-colors col-span-2">
              <span className="block text-purple-400 font-medium mb-1">Executive (Read Only)</span>
              <span className="text-slate-400">executive.demo</span>
            </button>
            <button onClick={() => setDemo('citizen.demo', 'Citizen@123')} className="bg-slate-800 hover:bg-slate-700 p-2 rounded text-left transition-colors col-span-2 border border-slate-700">
              <span className="block text-green-400 font-medium mb-1">Citizen Portal</span>
              <span className="text-slate-400">citizen.demo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
