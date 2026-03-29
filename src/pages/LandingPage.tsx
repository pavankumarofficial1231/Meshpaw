import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Network, Shield, Cpu, Zap, ChevronRight, Share2, Globe, Lock, Brain, FileText, Download, Fingerprint, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';
import { cn } from '../lib/utils';

export default function LandingPage() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-zinc-50 relative overflow-hidden font-sans selection:bg-emerald-500/30">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-600/5 rounded-full blur-[140px] pointer-events-none" 
      />
      <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-full h-[300px] bg-zinc-900/50 blur-[100px] pointer-events-none" />

      {/* Glass Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center p-2 shadow-lg shadow-emerald-500/20">
               <Network className="w-full h-full text-black" />
            </div>
            <span className="font-black text-2xl tracking-tighter uppercase italic">MESHPAW</span>
          </motion.div>
          
          <div className="hidden lg:flex items-center gap-10 text-[11px] font-black uppercase tracking-[0.2em] text-zinc-500">
            <a href="#protocol" className="hover:text-emerald-400 transition-colors">Protocol</a>
            <Link to="/privacy" className="hover:text-emerald-400 transition-colors">Manifesto</Link>
            <Link to="/terms" className="hover:text-emerald-400 transition-colors">Security</Link>
          </div>

          <div className="flex items-center gap-4">
            {!isLoading && !isAuthenticated && (
              <button 
                onClick={() => loginWithRedirect()}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
            <button 
              onClick={() => navigate('/mesh')}
              className="px-6 py-3 rounded-xl bg-emerald-500 text-black text-sm font-black hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(16,185,129,0.3)]"
            >
              LAUNCH CONSOLE
            </button>
          </div>
        </div>
      </nav>

      {/* Heavy Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-44 pb-32">
        <div className="flex flex-col items-center text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 mb-10"
          >
             <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
             PROTOCOL NODE v2.0.0 ACTIVE
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-6xl md:text-[10rem] font-black tracking-tighter max-w-6xl leading-[0.8] mb-12 italic uppercase text-white"
          >
            THE END OF <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-zinc-700">
               SURVEILLANCE
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-zinc-400 text-lg md:text-2xl max-w-3xl mb-16 leading-relaxed font-medium"
          >
            MeshPaw is a zero-infrastructure P2P protocol that turns your device into a secure node. Communicate through firewalls, outages, and state-level blocks with military-grade resilience.
          </motion.p>
          
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
             className="flex flex-col sm:flex-row items-center gap-6"
          >
             <button 
               onClick={() => navigate('/mesh')}
               className="group px-12 py-6 rounded-2xl bg-white text-black font-black text-xl hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 flex items-center gap-4 shadow-[0_0_60px_rgba(255,255,255,0.15)]"
             >
               ENTER THE GRID
               <ChevronRight className="w-7 h-7 group-hover:translate-x-2 transition-transform" />
             </button>
             <Link 
               to="/privacy" 
               className="px-12 py-6 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-300 font-bold text-xl hover:bg-zinc-800 transition-all active:scale-95"
             >
               READ MANIFESTO
             </Link>
          </motion.div>
        </div>

        {/* Live Node Count / Interactive Stats */}
        <div className="mt-48 grid grid-cols-2 md:grid-cols-4 gap-8">
           <StatItem label="Gossip Latency" value="<9ms" />
           <StatItem label="Active Meshes" value="12.4k" />
           <StatItem label="Node Security" value="ECC 25519" />
           <StatItem label="Data Integrity" value="SHA-256" />
        </div>
      </main>

      {/* Protocol Deep Dive */}
      <section id="protocol" className="relative z-10 max-w-7xl mx-auto px-6 py-48 border-t border-white/5">
        <div className="grid lg:grid-cols-2 gap-24 items-center">
           <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 bg-emerald-500/10 blur-[120px] rounded-full" />
              <div className="relative aspect-square rounded-[60px] border border-white/5 bg-zinc-900/50 backdrop-blur-3xl overflow-hidden p-12 flex items-center justify-center">
                 <div className="grid grid-cols-3 gap-8 w-full max-w-sm">
                    {[...Array(9)].map((_, i) => (
                      <motion.div 
                        key={i}
                        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.6, 0.2] }}
                        transition={{ duration: 3, delay: i * 0.2, repeat: Infinity }}
                        className="aspect-square bg-emerald-500/20 border border-emerald-500/30 rounded-3xl shrink-0" 
                      />
                    ))}
                 </div>
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-px h-full bg-gradient-to-b from-transparent via-emerald-500 to-transparent opacity-10" />
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-10" />
                 </div>
              </div>
           </div>
           
           <div className="order-1 lg:order-2">
              <h2 className="text-6xl font-black tracking-tighter mb-10 leading-none italic uppercase text-white">HOW IT WORKS.</h2>
              <p className="text-zinc-400 text-2xl leading-relaxed mb-16 font-medium">
                Traditional apps use central servers. MeshPaw uses <strong>Gossip Routing</strong>. Your message hops through other browsers until it reaches the target—with zero metadata logged in between.
              </p>
              
              <div className="space-y-8">
                 {[
                   { icon: <Lock />, text: "Each packet is symmetrically encrypted natively." },
                   { icon: <Brain />, text: "Local AI summarizes room history without cloud leakage." },
                   { icon: <Download />, text: "Physical Data Muling allows air-gap synchronization." },
                   { icon: <Shield />, text: "No accounts. No trackers. Just a Curve25519 key." }
                 ].map((item, i) => (
                   <motion.div 
                     initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                     viewport={{ once: true }}
                     key={i} className="flex items-center gap-6 p-6 bg-zinc-900/40 border border-white/5 rounded-[28px] hover:bg-zinc-800/60 transition-all group"
                   >
                      <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400 group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <span className="text-xl font-bold text-zinc-100">{item.text}</span>
                   </motion.div>
                 ))}
              </div>
           </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-20 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center p-2">
                 <Network className="w-full h-full text-zinc-500" />
              </div>
              <span className="font-black text-xl tracking-tighter text-zinc-400">MESHPAW</span>
           </div>
           <div className="flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-zinc-500">
             <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
             <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
             <a href="https://github.com/pavankumarofficial1231/Meshpaw" className="hover:text-white transition-colors">Github</a>
           </div>
           <p className="text-zinc-600 text-[11px] font-bold uppercase tracking-widest">© {new Date().getFullYear()} DECENTCALIZED GRID</p>
        </div>
      </footer>
    </div>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="text-center p-8 rounded-[40px] bg-zinc-900/30 border border-white/5 backdrop-blur-md">
       <div className="text-4xl font-black text-white mb-2">{value}</div>
       <div className="text-[10px] uppercase font-black tracking-[0.3em] text-zinc-500">{label}</div>
    </div>
  );
}
