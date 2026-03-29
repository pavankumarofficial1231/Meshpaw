import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, EyeOff, Cpu, Network, Zap, ChevronLeft, ArrowRight, ShieldAlert, Fingerprint } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.8, ease: "easeOut" }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      {/* Dynamic Background Grid */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_70%)]"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-50 h-24 flex items-center justify-between px-8 md:px-12 max-w-7xl mx-auto">
        <Link to="/" className="group flex items-center gap-3 text-zinc-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-[0.3em]">Back to Hub</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-black">
             <Shield className="w-5 h-5" />
          </div>
          <span className="font-black text-xl italic tracking-tighter uppercase italic">MeshPaw Protocol</span>
        </div>
      </header>

      <main className="relative z-10 pt-20 pb-40 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <motion.div {...fadeInUp} className="text-center mb-32">
             <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter mb-8 bg-gradient-to-b from-white to-zinc-600 bg-clip-text text-transparent">
               Privacy is<br />Non-Negotiable.
             </h1>
             <p className="text-xl text-zinc-400 font-medium max-w-2xl mx-auto leading-relaxed">
               MeshPaw is not a messenger. It is a decentralized protocol for sovereign human communication. No servers. No central authority. No trace.
             </p>
          </motion.div>

          {/* 3D Protocol Visualization (Simplified Logic) */}
          <div className="relative h-[500px] mb-40 flex items-center justify-center">
             <motion.div 
               initial={{ rotateY: -20, rotateX: 10, opacity: 0 }}
               whileInView={{ rotateY: 10, rotateX: -5, opacity: 1 }}
               transition={{ duration: 1.5, ease: "easeOut" }}
               className="relative w-full max-w-lg aspect-square"
               style={{ transformStyle: 'preserve-3d' }}
             >
                {/* 3D Perspective Lines */}
                <div className="absolute inset-0 border-[0.5px] border-emerald-500/20 rounded-[40px] rotate-12 scale-110"></div>
                <div className="absolute inset-0 border-[0.5px] border-emerald-500/20 rounded-[40px] -rotate-6 scale-95"></div>
                
                {/* Center Node */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                   <div className="w-24 h-24 bg-black border border-emerald-500/50 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.2)]">
                      <Lock className="w-10 h-10 text-emerald-500" />
                   </div>
                </div>

                {/* Satellite Nodes */}
                {[...Array(6)].map((_, i) => (
                   <motion.div 
                     key={i}
                     animate={{ 
                       y: [0, -20, 0],
                       opacity: [0.3, 0.6, 0.3]
                     }}
                     transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
                     className="absolute w-12 h-12 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-center"
                     style={{
                       top: `${50 + 40 * Math.sin(i * (Math.PI / 3))}%`,
                       left: `${50 + 40 * Math.cos(i * (Math.PI / 3))}%`
                     }}
                   >
                     <Cpu className="w-5 h-5 text-zinc-500" />
                   </motion.div>
                ))}
             </motion.div>
             
             {/* Floating Info Cards */}
             <motion.div 
               initial={{ x: 50, opacity: 0 }}
               whileInView={{ x: 0, opacity: 1 }}
               className="absolute top-0 right-0 md:-right-20 bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl max-w-xs shadow-2xl"
             >
                <Fingerprint className="w-6 h-6 text-emerald-400 mb-4" />
                <h3 className="font-black italic uppercase text-xs tracking-widest mb-2">Sovereign Identity</h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-bold">Your ID is a Curve25519 PubKey. It exists only in your browser storage. It cannot be revoked or seized.</p>
             </motion.div>

             <motion.div 
               initial={{ x: -50, opacity: 0 }}
               whileInView={{ x: 0, opacity: 1 }}
               className="absolute bottom-0 left-0 md:-left-20 bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 rounded-3xl max-w-xs shadow-2xl"
             >
                <Network className="w-6 h-6 text-emerald-400 mb-4" />
                <h3 className="font-black italic uppercase text-xs tracking-widest mb-2">Relay Zero</h3>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-bold">Data travels via 7-hop TTL Gossip. No central database ever touches your plaintext or metadata.</p>
             </motion.div>
          </div>

          {/* Pillars of MeshPaw */}
          <div className="grid md:grid-cols-2 gap-8 mb-40">
             {[
               {
                 title: "Zero Knowledge",
                 desc: "We don't collect data because there is no 'we'. The platform is a client-side execution environment that treats you as the sole owner of your keys.",
                 icon: <EyeOff className="w-6 h-6" />
               },
               {
                 title: "Peer-to-Peer Focus",
                 desc: "Connections are established directly via WebRTC. Signaling is ephemeral. Once connected, your traffic never leaves the private mesh.",
                 icon: <Zap className="w-6 h-6" />
               },
               {
                 title: "Immutable History",
                 desc: "Messages are stored in your browser's IndexedDB. We have no 'cloud backup' because that is a backdoor by another name.",
                 icon: <ShieldAlert className="w-6 h-6" />
               },
               {
                 title: "Ephemeral by Design",
                 desc: "Set self-destruct timers on sensitive mesh traffic. Once the TTL expires, the packet is purged from all nodes in the gossip chain.",
                 icon: <Cpu className="w-6 h-6" />
               }
             ].map((pill, i) => (
                <motion.div 
                  key={i}
                  {...fadeInUp}
                  transition={{ delay: i * 0.1 }}
                  className="p-10 bg-zinc-900/30 rounded-[40px] border border-white/5 hover:border-emerald-500/30 transition-all group"
                >
                   <div className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      {pill.icon}
                   </div>
                   <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-4 italic">{pill.title}</h3>
                   <p className="text-zinc-500 font-medium leading-relaxed">{pill.desc}</p>
                </motion.div>
             ))}
          </div>

          {/* Call to Action */}
          <motion.div {...fadeInUp} className="text-center p-20 bg-emerald-500 rounded-[60px] text-black">
             <h2 className="text-4xl md:text-5xl font-black italic uppercase tracking-tighter mb-8">Ready to exit the panopticon?</h2>
             <Link to="/mesh" className="inline-flex items-center gap-4 px-12 py-6 bg-black text-white rounded-3xl font-black uppercase tracking-widest hover:scale-105 transition-all shadow-2xl">
                Initialize Mesh UI <ArrowRight className="w-5 h-5" />
             </Link>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-20 px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-emerald-500/20 text-emerald-400 rounded flex items-center justify-center">
                 <Shield className="w-4 h-4" />
              </div>
              <span className="font-black text-xs uppercase tracking-widest text-zinc-500 underline decoration-emerald-500/50">Privacy Manifesto v2.1</span>
           </div>
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-700">MeshPaw: NO TRACKING. NO ADS. NO SERVERS.</p>
        </div>
      </footer>
    </div>
  );
}
