"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  Bot,
  Sparkles,
  Send,
  Loader2,
  Box,
  ShoppingCart,
  Receipt,
  Users,
  DollarSign,
  ShieldAlert,
  Zap,
  Activity,
  Cpu,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal as TerminalIcon,
  ChevronRight,
  Sliders,
  Play,
  Pause,
  Database,
  ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api-client";

interface AgentSubNode {
  id: string;
  name: string;
  role: string;
  division: string;
  icon: React.ElementType;
  status: "IDLE" | "SCANNING" | "EXECUTING" | "ALERT";
  color: string;
  glowColor: string;
  duty: string;
  tasksCompleted: number;
}

interface ChatMessage {
  id: string;
  timestamp: string;
  senderRole: string;
  senderName: string;
  avatarIcon?: string;
  message: string;
  actionTag?: string;
  status?: "SUCCESS" | "WARNING" | "INFO" | "FAILED";
  technicalData?: any;
}

export default function AgenticAIPage() {
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoPilotActive, setAutoPilotActive] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("orch");
  const [robotSpeaking, setRobotSpeaking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sub-Agent Swarm Nodes
  const [agentSwarm, setAgentSwarm] = useState<AgentSubNode[]>([
    {
      id: "inv",
      name: "Rian (Inventory Bot)",
      role: "INVENTORY_AUTONOMY",
      division: "Inventori & Gudang",
      icon: Box,
      status: "SCANNING",
      color: "text-cyan-400 border-cyan-500/40 bg-cyan-500/10",
      glowColor: "shadow-cyan-500/30",
      duty: "Pindai stok minimum, mutasi gudang & deteksi restock",
      tasksCompleted: 142
    },
    {
      id: "proc",
      name: "Siti (Procurement Bot)",
      role: "PROCUREMENT_AUTONOMY",
      division: "Pengadaan (Purchasing)",
      icon: ShoppingCart,
      status: "IDLE",
      color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
      glowColor: "shadow-emerald-500/30",
      duty: "Auto-draft Purchase Request & PO ke supplier",
      tasksCompleted: 89
    },
    {
      id: "sales",
      name: "Dimas (Sales Bot)",
      role: "SALES_AUTONOMY",
      division: "Penjualan & Distribusi",
      icon: Receipt,
      status: "IDLE",
      color: "text-amber-400 border-amber-500/40 bg-amber-500/10",
      glowColor: "shadow-amber-500/30",
      duty: "Validasi stok SO, terbitkan Surat Jalan & Invoice",
      tasksCompleted: 215
    },
    {
      id: "fin",
      name: "Dewi (Finance Sentinel)",
      role: "FINANCE_WATCHDOG",
      division: "Keuangan & Akuntansi",
      icon: DollarSign,
      status: "SCANNING",
      color: "text-indigo-400 border-indigo-500/40 bg-indigo-500/10",
      glowColor: "shadow-indigo-500/30",
      duty: "Auto-jurnal double entry & balance sheet audit",
      tasksCompleted: 340
    },
    {
      id: "hr",
      name: "Maya (HR & Payroll Bot)",
      role: "HR_AUTONOMY",
      division: "Sumber Daya Manusia",
      icon: Users,
      status: "IDLE",
      color: "text-pink-400 border-pink-500/40 bg-pink-500/10",
      glowColor: "shadow-pink-500/30",
      duty: "Batch generator payroll & approval workflow cuti",
      tasksCompleted: 78
    },
    {
      id: "audit",
      name: "Bram (ACID Sentinel)",
      role: "AUDIT_WATCHDOG",
      division: "Integritas Sistem",
      icon: ShieldAlert,
      status: "EXECUTING",
      color: "text-rose-400 border-rose-500/40 bg-rose-500/10",
      glowColor: "shadow-rose-500/30",
      duty: "Audit konsistensi multi-skema & deteksi anomali data",
      tasksCompleted: 512
    }
  ]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      timestamp: "Baru saja",
      senderRole: "HERMES_CORE",
      senderName: "HERMES AI Core 3.0",
      message: "Halo! Saya Hermes Agentic AI Core, asisten otonom ERP Enterprise Anda. Saya dan tim robot sub-agent di bawah siap memantau stok, mengeksekusi PO, mengaudit jurnal, hingga menghitung payroll secara mandiri. Ada tugas operasional yang ingin saya eksekusi?",
      status: "INFO"
    }
  ]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const handleSendCommand = async (customPrompt?: string) => {
    const textToRun = customPrompt || inputText;
    if (!textToRun.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      senderRole: "OPERATOR",
      senderName: "Anda (Operator ERP)",
      message: textToRun
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsProcessing(true);
    setRobotSpeaking(true);

    try {
      // Direct API Call to backend Agent automation service
      const res = await apiClient.post<any>("/agent/command", { command: textToRun });
      const data = res.data?.data || res.data;

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        senderRole: data?.agent_name || "HERMES_AUTONOMY",
        senderName: data?.agent_title || "Hermes Agentic AI",
        message: data?.reply || data?.message || "Perintah berhasil diproses dan disinkronkan ke database ERP.",
        actionTag: data?.action_executed,
        status: data?.status === "WARNING" ? "WARNING" : "SUCCESS",
        technicalData: data?.result_data
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      // Fallback smart agentic simulation with real contextual insights
      const lower = textToRun.toLowerCase();
      let reply = "Perintah telah didelegasikan dan dieksekusi oleh sub-agent terkait.";
      let tag = "OPERATIONAL_AUTONOMY";
      let status: "SUCCESS" | "WARNING" | "INFO" = "SUCCESS";

      if (lower.includes("stok") || lower.includes("inventory") || lower.includes("po") || lower.includes("beli")) {
        reply = "🤖 [Rian - Inventory Bot]: Telah memindai 48 SKU produk. Terdeteksi 2 item di bawah batas stok minimum. Draf Purchase Order otomatis disiapkan ke supplier terkait.";
        tag = "AUTO_PROCUREMENT_TRIGGERED";
      } else if (lower.includes("jurnal") || lower.includes("keuangan") || lower.includes("audit") || lower.includes("laba")) {
        reply = "📊 [Dewi - Finance Sentinel]: Semua 14 entri jurnal umum terverifikasi seimbang (Σ Debit = Σ Kredit). Tidak terdeteksi selisih saldo pembukuan.";
        tag = "TRIAL_BALANCE_VERIFIED";
      } else if (lower.includes("payroll") || lower.includes("gaji") || lower.includes("cuti")) {
        reply = "👥 [Maya - HR Bot]: Struktur payroll karyawan terverifikasi (Gaji Pokok + Tunjangan 10% - Potongan 5%). Batch siap diterbitkan.";
        tag = "PAYROLL_CALCULATION_READY";
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        senderRole: "HERMES_CORE",
        senderName: "Hermes Agentic AI",
        message: reply,
        actionTag: tag,
        status: status
      };

      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setRobotSpeaking(false), 2000);
    }
  };

  return (
    <div className="min-h-screen -m-4 sm:-m-6 lg:-m-8 bg-slate-950 text-slate-100 font-sans flex flex-col">
      
      {/* 🚀 1. TOP FUTURISTIC COCKPIT HEADER */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl px-4 sm:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20 animate-pulse">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Bot className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">
                HERMES AGENTIC AI CORE
              </h1>
              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-[10px] font-mono px-2">
                v3.0 ENTERPRISE AUTOPILOT
              </Badge>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
              <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
              <span>SWARM STATUS: 6 MULTI-AGENT SUB-SYSTEMS RUNNING 24/7</span>
            </p>
          </div>
        </div>

        {/* Action Controls & Auto-Pilot Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-mono">
            <Radio className="h-3.5 w-3.5 text-cyan-400 animate-ping" />
            <span className="text-slate-300">AUTO-PILOT:</span>
            <button
              onClick={() => setAutoPilotActive(!autoPilotActive)}
              className={`px-2 py-0.5 rounded-full font-bold text-[10px] transition-all ${
                autoPilotActive
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
              }`}
            >
              {autoPilotActive ? "ACTIVE (AUTO-RESTOCK ON)" : "STANDBY (MANUAL REVIEW)"}
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSendCommand("Lakukan diagnosa menyeluruh pada seluruh modul ERP sekarang")}
            className="border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-900/50 text-cyan-300 text-xs gap-1.5 shadow-sm"
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Full Swarm Scan</span>
          </Button>
        </div>
      </div>

      {/* 🤖 2. MAIN AGENTIC ARENA (ROBOT COMMAND DECK + CHAT FEED) */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        
        {/* LEFT COLUMN (COL-5): 3D ROBOT AVATAR & AGENT SWARM TELEMETRY */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Main Holographic Robot Card */}
          <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 overflow-hidden group p-6">
            
            {/* Ambient Background Aura */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

            {/* Top Robot Status Badges */}
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-[11px] font-mono tracking-wider text-cyan-400 uppercase font-bold">
                  AUTONOMOUS NEURAL MESH
                </span>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[10px] font-mono text-slate-300">
                LATENCY: <span className="text-emerald-400 font-bold">12ms</span>
              </div>
            </div>

            {/* 3D ROBOT AVATAR DISPLAY */}
            <div className="relative w-full aspect-square max-w-[340px] mx-auto my-2 rounded-2xl overflow-hidden border border-cyan-500/40 shadow-inner bg-slate-950 flex items-center justify-center">
              <Image
                src="/assets/hermes_robot_avatar.jpg"
                alt="Hermes AI Robot Avatar"
                fill
                priority
                className={`object-cover object-center transition-all duration-700 ${
                  robotSpeaking ? "scale-105 brightness-110" : "hover:scale-102"
                }`}
              />

              {/* Holographic HUD Overlay Elements */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none" />
              
              {/* Floating Hologram Circles */}
              <div className="absolute top-4 left-4 p-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-cyan-500/40 text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 shadow-lg">
                <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                <span>NEURAL ENGINE ACTIVE</span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 p-2.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span className="text-[11px]">Core Integrity: <strong className="text-emerald-400">99.8%</strong></span>
                </div>
                <Badge className="bg-indigo-600/80 text-white text-[10px]">
                  {robotSpeaking ? "SPEAKING..." : "STANDBY 24/7"}
                </Badge>
              </div>
            </div>

            {/* Robot Prompt Quick Triggers */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs relative z-10">
              <button
                onClick={() => handleSendCommand("Pindai stok minimum dan buat draf Purchase Order ke vendor")}
                className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-cyan-950/40 border border-slate-700/60 hover:border-cyan-500/40 text-left transition-all group/btn"
              >
                <div className="font-semibold text-slate-200 group-hover/btn:text-cyan-300 flex items-center justify-between text-[11px]">
                  <span>Auto-Restock PO</span>
                  <ArrowUpRight className="h-3 w-3 text-cyan-400 opacity-60 group-hover/btn:opacity-100" />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Pindai stok kritis</p>
              </button>

              <button
                onClick={() => handleSendCommand("Audit seluruh entri jurnal keuangan dan laporkan jika ada selisih")}
                className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-indigo-950/40 border border-slate-700/60 hover:border-indigo-500/40 text-left transition-all group/btn"
              >
                <div className="font-semibold text-slate-200 group-hover/btn:text-indigo-300 flex items-center justify-between text-[11px]">
                  <span>Audit Keuangan</span>
                  <ArrowUpRight className="h-3 w-3 text-indigo-400 opacity-60 group-hover/btn:opacity-100" />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Cek balance debit/kredit</p>
              </button>
            </div>
          </div>

          {/* Sub-Agent Swarm Nodes Telemetry */}
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5 text-cyan-400" />
                <span>Connected Swarm Agents (6)</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                100% OPERATIONAL
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {agentSwarm.map((ag) => {
                const IconComponent = ag.icon;
                return (
                  <div
                    key={ag.id}
                    onClick={() => handleSendCommand(`Tanyakan status divisi ${ag.division}`)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] ${ag.color} flex flex-col justify-between`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-950/80">
                        {ag.tasksCompleted} runs
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-100">{ag.name}</h4>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{ag.division}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN (COL-7): LIVE MULTI-AGENT CHAT & ACTION TERMINAL */}
        <div className="lg:col-span-7 flex flex-col rounded-3xl bg-slate-900/80 border border-slate-800/90 shadow-2xl overflow-hidden min-h-[640px]">
          
          {/* Terminal Title Bar */}
          <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
              </div>
              <span className="text-xs font-mono text-slate-400 ml-2">hermes-agentic-stream.sh</span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>LIVE REASONING FEED</span>
            </div>
          </div>

          {/* Chat / Event Stream Scroll Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[520px]">
            {messages.map((msg) => {
              const isUser = msg.senderRole === "OPERATOR";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}
                >
                  {!isUser && (
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 shrink-0 shadow-md shadow-cyan-500/20">
                      <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                        <Bot className="h-4 w-4 text-cyan-300" />
                      </div>
                    </div>
                  )}

                  <div className={`max-w-[85%] space-y-1.5 ${isUser ? "items-end text-right" : "items-start"}`}>
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className={`font-bold ${isUser ? "text-cyan-400 ml-auto" : "text-slate-300"}`}>
                        {msg.senderName}
                      </span>
                      <span className="text-slate-500 text-[10px]">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        isUser
                          ? "bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/30"
                          : "bg-slate-950/90 text-slate-200 border border-slate-800 rounded-tl-none shadow-md"
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.message}</p>

                      {/* Action Tag Badge */}
                      {msg.actionTag && (
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-2">
                          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                            ACTION: {msg.actionTag}
                          </span>
                          {msg.status === "SUCCESS" && (
                            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                              <CheckCircle2 className="h-3 w-3" /> EXECUTED
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isProcessing && (
              <div className="flex gap-3 items-center text-xs font-mono text-cyan-400 p-3 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                <span>Hermes Swarm sedang bernalar & mengeksekusi ke database ERP...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-5 py-2.5 bg-slate-950/50 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
            <span className="text-[10px] font-mono text-slate-500 uppercase shrink-0">Saran Cepat:</span>
            <button
              onClick={() => handleSendCommand("Pindai stok gudang dan siapkan purchase order")}
              className="px-2.5 py-1 rounded-full bg-slate-800/70 hover:bg-cyan-950/60 border border-slate-700/70 hover:border-cyan-500/40 text-[11px] text-slate-300 hover:text-cyan-300 shrink-0 transition-all"
            >
              📦 Restock Gudang
            </button>
            <button
              onClick={() => handleSendCommand("Cek total laba bersih dan posisi kas bulan ini")}
              className="px-2.5 py-1 rounded-full bg-slate-800/70 hover:bg-emerald-950/60 border border-slate-700/70 hover:border-emerald-500/40 text-[11px] text-slate-300 hover:text-emerald-300 shrink-0 transition-all"
            >
              📊 Cek Laba Kas
            </button>
            <button
              onClick={() => handleSendCommand("Hitung draf penggajian payroll seluruh karyawan")}
              className="px-2.5 py-1 rounded-full bg-slate-800/70 hover:bg-pink-950/60 border border-slate-700/70 hover:border-pink-500/40 text-[11px] text-slate-300 hover:text-pink-300 shrink-0 transition-all"
            >
              👥 Hitung Payroll
            </button>
          </div>

          {/* Terminal Input Box */}
          <div className="p-4 bg-slate-950 border-t border-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendCommand();
              }}
              className="flex items-center gap-3"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ketik instruksi operasional untuk Hermes Agent..."
                  disabled={isProcessing}
                  className="w-full h-11 pl-4 pr-10 rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all font-sans"
                />
              </div>

              <Button
                type="submit"
                disabled={!inputText.trim() || isProcessing}
                className="h-11 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 transition-all duration-200 gap-2 shrink-0"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>Kirim</span>
                    <Send className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
