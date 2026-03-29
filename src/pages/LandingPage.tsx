import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Network, Shield, Cpu, Zap, ChevronRight, Globe, Lock, Brain, FileText, Download, LogIn, ServerOff, Fingerprint, EyeOff, TerminalSquare } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useAuth0 } from '@auth0/auth0-react';

export default function LandingPage() {
  const { loginWithRedirect, isAuthenticated, isLoading, user } = useAuth0();
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 500], [1, 0]);
  const y = useTransform(scrollY, [0, 500], [0, 150]);

  // Terminal Typing Effect
  const [terminalText, setTerminalText] = useState('');
  const fullText = "Initializing decentralized socket...\\nBypassing central servers...\\nGenerating Curve25519 Keys...\\nProtocol v2.0 READY.";
  
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTerminalText(fullText.substring(0, i));
      i++;
      if (i > fullText.length) clearInterval(interval);
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-50 relative overflow-hidden font-sans selection:bg-emerald-500/30">
      {/* Immersive 3D Grid Background */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{
         perspective: '1000px',
         transformStyle: 'preserve-3d'
      }}>
         <motion.div 
            animate={{ rotateX: [60, 60], y: [0, 100] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vw] h-[200vh] grid grid-cols-[repeat(40,minmax(0,1fr))] grid-rows-[repeat(40,minmax(0,1fr))]"
         >
            {Array.from({ length: 1600 }).map((_, i) => (
              <div key={i} className="border-[0.5px] border-emerald-500/10"></div>
            ))}
         </motion.div>
      </div>

      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-zinc-700/20 blur-[120px] pointer-events-none" />

      {/* Glass Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-black/60 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-black border border-emerald-500/30 flex items-center justify-center p-2 group-hover:bg-emerald-500/10 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)]">
               <Network className="w-full h-full text-emerald-400 group-hover:scale-110 transition-transform" />
            </div>
            <span className="font-black text-2xl tracking-tighter uppercase italic text-white group-hover:text-emerald-400 transition-colors">MESHPAW</span>
          </motion.div>
          
          <div className="hidden lg:flex items-center gap-12 text-[11px] font-black uppercase tracking-[0.25em] text-zinc-500">
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <Link to="/privacy" className="hover:text-emerald-400 transition-colors relative">
               Manifesto
               <span className="absolute -top-3 -right-4 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] px-1.5 py-0.5 rounded-sm animate-pulse">v2</span>
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">Integrity</Link>
          </div>

          <div className="flex items-center gap-4">
            {!isLoading && (
              !isAuthenticated ? (
                <button 
                  onClick={() => loginWithRedirect()}
                  className="hidden sm:flex items-center gap-2 px-6 py-2.5 rounded-xl border border-white/10 text-xs font-black uppercase text-zinc-300 hover:text-white hover:bg-white/5 hover:border-white/20 transition-all active:scale-95 tracking-widest"
                >
                  <LogIn className="w-4 h-4" />
                  Connect Identity
                </button>
              ) : (
                <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                   <img src={user?.picture} alt="Profile" className="w-6 h-6 rounded-full border border-emerald-500/50" />
                   <span className="text-xs font-bold text-emerald-400">{user?.name}</span>
                </div>
              )
            )}
            <button 
              onClick={() => navigate('/mesh')}
              className="px-8 py-3 rounded-xl bg-white text-black text-xs font-black uppercase hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 shadow-[0_4px_30px_rgba(255,255,255,0.2)] tracking-widest flex items-center gap-2 group"
            >
              Initialize Node
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.main 
        style={{ opacity, y }}
        className="relative z-10 max-w-7xl mx-auto px-6 pt-48 pb-32 min-h-screen flex flex-col justify-center"
      >
        <div className="grid lg:grid-cols-2 gap-16 items-center">
           <div className="flex flex-col items-start text-left">
             <motion.div 
               initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
               className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 mb-8 backdrop-blur-md"
             >
                <ServerOff className="w-3 h-3 text-rose-500" />
                Zero-Infrastructure Reality
             </motion.div>
             
             <motion.h1 
               initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
               className="text-6xl md:text-8xl lg:text-[7rem] font-black tracking-tighter leading-[0.85] mb-8 italic uppercase text-white"
             >
               THE OFF-GRID <br />
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">
                  SYNDICATE.
               </span>
             </motion.h1>
             
             <motion.p 
               initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
               className="text-zinc-400 text-lg md:text-2xl max-w-xl mb-12 leading-relaxed font-medium"
             >
               MeshPaw transforms your browser into a self-sovereign server. Establish secure WebRTC tunnels, deploy CRDT workspaces, and route data via 7-hop ephemeral gossip.
             </motion.p>
             
             <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
             >
                <button 
                  onClick={() => navigate('/mesh')}
                  className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-emerald-500 text-zinc-950 font-black text-sm uppercase tracking-widest hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(16,185,129,0.4)]"
                >
                  Enter The Grid
                  <TerminalSquare className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4 text-xs font-bold text-zinc-500 uppercase tracking-widest px-6 h-14 bg-zinc-900/50 rounded-2xl border border-white/5">
                   No installation required.
                </div>
             </motion.div>
           </div>

           {/* Interactive Terminal 3D Element */}
           <motion.div 
              initial={{ opacity: 0, rotateY: 20, scale: 0.9 }} 
              animate={{ opacity: 1, rotateY: 0, scale: 1 }} 
              transition={{ delay: 0.4, duration: 1, type: 'spring' }}
              className="relative aspect-square md:aspect-auto md:h-[500px] w-full max-w-lg lg:ml-auto"
           >
              <div className="absolute inset-0 bg-emerald-500/5 blur-[50px] rounded-[40px]" />
              <div className="relative h-full w-full rounded-[40px] border border-white/10 bg-black/80 backdrop-blur-2xl p-8 flex flex-col shadow-2xl justify-between group overflow-hidden">
                 
                 {/* Decorative background grid inside terminal */}
                 <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at center, #10b981 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                 <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex gap-2">
                       <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                       <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                       <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500">NODE_EXEC_V2</div>
                 </div>

                 <div className="flex-1 font-mono text-xs sm:text-sm text-emerald-400 leading-loose relative z-10 break-words whitespace-pre-wrap">
                    {terminalText}
                    <motion.span 
                      animate={{ opacity: [1, 0] }} 
                      transition={{ duration: 0.8, repeat: Infinity }} 
                      className="inline-block w-2 h-4 bg-emerald-400 ml-1 align-middle"
                    />
                 </div>

                 <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex items-center justify-between group-hover:border-emerald-500/30 transition-colors">
                    <div className="flex items-center gap-3">
                       <Shield className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                       <div className="text-xs font-bold text-zinc-400">P2P ENCRYPTED</div>
                    </div>
                    <div className="text-xs font-mono text-zinc-600">STATE: ACTIVE</div>
                 </div>
              </div>
           </motion.div>
        </div>
      </motion.main>

      {/* Deep-Dive Architecture Section */}
      <section id="architecture" className="relative z-10 py-32 border-t border-white/5 bg-zinc-950 px-6">
        <div className="max-w-7xl mx-auto">
           <div className="text-center mb-20">
              <h2 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter mb-6 text-white">System Architecture</h2>
              <p className="text-zinc-400 text-xl font-medium max-w-2xl mx-auto">Unlike traditional platforms, MeshPaw has no backend. It is an operating system running within your browser, orchestrated entirely by distributed algorithms.</p>
           </div>

           <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { title: "Gossip Swarm", icon: <Network />, desc: "Messages are broadcasted like radio waves. They hop up to 7 times across devices to find their destination without centralized tracking." },
                { title: "Auth0 Fusion", icon: <Fingerprint />, desc: "Link your sovereign Node ID to verified Web2 credentials (Google, GitHub) using secure Auth0 tokens, establishing trust without compromising the core P2P tunnel." },
                { title: "AI Mesh Brain", icon: <Brain />, desc: "Google's Gemini 1.5 Flash runs locally to summarize high-volume rooms. Zero cloud transmission of your keystrokes ensures absolute privacy." },
                { title: "Physical Data Muling", icon: <Download />, desc: "Working in air-gapped environments? Export the entire encrypted state layer via JSON and move it physically between networks." },
                { title: "CRDT Shared States", icon: <FileText />, desc: "Unstructured workspaces powered by Yjs. Type collaboratively in real-time. Changes resolve mathematically without server authoritative logic." },
                { title: "Symmetric Encryption", icon: <Lock />, desc: "Every packet is signed with Curve25519 cryptography. If a node modifies your traffic mid-flight, the signature breaks immediately." }
              ].map((feature, i) => (
                 <motion.div 
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   transition={{ delay: i * 0.1 }}
                   key={i} 
                   className="bg-black border border-zinc-800 hover:border-emerald-500/50 p-10 rounded-[40px] transition-colors group cursor-default shadow-xl"
                 >
                    <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-emerald-500/10 group-hover:text-emerald-400 text-zinc-400 transition-all">
                       {feature.icon}
                    </div>
                    <h3 className="text-xl font-black italic uppercase tracking-wider mb-4 text-white group-hover:text-emerald-400 transition-colors">{feature.title}</h3>
                    <p className="text-zinc-500 text-sm leading-relaxed font-semibold">{feature.desc}</p>
                 </motion.div>
              ))}
           </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="relative z-10 py-32 px-6 overflow-hidden">
         <div className="absolute inset-0 bg-emerald-950/20" />
         <div className="relative max-w-4xl mx-auto text-center">
            <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-8 text-white">Sever The Cord.</h2>
            <p className="text-zinc-400 text-xl font-medium mb-12">The panopticon only works if you agree to live inside it. Step out.</p>
            <button 
               onClick={() => navigate('/mesh')}
               className="px-12 py-6 rounded-2xl bg-white text-black text-lg font-black uppercase hover:scale-105 active:scale-95 transition-transform flex items-center gap-4 mx-auto shadow-[0_0_50px_rgba(255,255,255,0.2)]"
            >
               Deploy Node
               <Zap className="w-6 h-6" />
            </button>
         </div>

         <div className="relative max-w-7xl mx-auto mt-32 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
            <div className="flex items-center gap-2">
               <Fingerprint className="w-4 h-4 text-emerald-500" />
               NO LOGS. NO METRICS. NO BACKDOORS.
            </div>
            <div className="flex items-center gap-8">
               <Link to="/privacy" className="hover:text-white transition-colors">Manifesto</Link>
               <a href="https://github.com/pavankumarofficial1231/Meshpaw" className="hover:text-white transition-colors">Source</a>
            </div>
         </div>
      </footer>
    </div>
  );
}
