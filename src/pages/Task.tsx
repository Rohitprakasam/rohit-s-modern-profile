import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";

/* ─── Types ─── */
type TrackerType = "expense" | "income" | "task" | "reminder" | "note" | "exam_study" | "health_checkin" | "meal" | "chore";

interface TrackerEntry {
  _id: string;
  type: TrackerType;
  title: string;
  amount: number | null;
  category: string | null;
  status: string;
  source?: string;
  createdAt: string;
}

const WATER_TARGET = 3000;

/* ─── Helpers ─── */
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch { return ""; }
}

function formatToday(): string {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ─── Input parser ─── */
interface ParsedInput { type: TrackerType; title: string; amount?: number; category?: string; status?: string; }

function parseInput(raw: string): ParsedInput {
  const text = raw.trim();
  const expense = text.match(/^(?:spent|spend|paid)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*(?:on|for)?\s*(.*)$/i);
  if (expense) return { type: "expense", amount: Number(expense[1]), title: expense[2] || "Expense", category: expense[2] || "General", status: "done" };

  const waterMatch = text.match(/^(?:drank|drink|water)\s*(\d+(?:\.\d+)?)\s*(ml|milliliters|glasses?|cups?)?/i);
  if (waterMatch) {
    const qty = Number(waterMatch[1]);
    const unit = (waterMatch[2] || "ml").toLowerCase();
    const finalAmount = unit.startsWith("glass") || unit.startsWith("cup") ? qty * 250 : qty;
    return { type: "health_checkin", title: `Drank ${finalAmount}ml of water`, amount: finalAmount, category: "Water", status: "done" };
  }

  const study = text.match(/^(?:studied|study)\s*(\d+(?:\.\d+)?)?\s*(?:hours?|hrs?)?\s*(.*)$/i);
  if (study) return { type: "exam_study", title: `${study[2] || "Study"}${study[1] ? ` · ${study[1]} hours` : ""}`, amount: study[1] ? Number(study[1]) : 1.0, category: study[2] || "General", status: "done" };

  if (/\b(?:medicine|sleep|woke|workout|walk)\b/i.test(text)) return { type: "health_checkin", title: text, category: "General", status: "done" };

  const task = text.match(/^(?:task:|remind me to|done:?)\s*(.*)$/i);
  if (task?.[1]) return { type: "task", title: task[1], status: /^done/i.test(text) ? "done" : "open" };

  return { type: "note", title: text, status: "done" };
}

/* ─── Tab IDs ─── */
type TaskTab = "chat" | "exam" | "water" | "budget" | "settings";

/* ─── Main Page Component ─── */
export default function TaskPage() {
  const [entries, setEntries] = useState<TrackerEntry[] | null>(null);
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<TaskTab>("chat");
  const timelineRef = useRef<HTMLDivElement>(null);

  // Exam settings
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [editingExam, setEditingExam] = useState(false);
  const [draftExamName, setDraftExamName] = useState("");
  const [draftExamDate, setDraftExamDate] = useState("");

  // Settings
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [persona, setPersona] = useState("girlfriend");
  const [settingsSaving, setSettingsSaving] = useState(false);

  // WhatsApp
  const [whatsappSending, setWhatsappSending] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<"idle" | "success" | "error">("idle");

  const loadEntries = useCallback(() => {
    fetch("/api/tracker")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.entries)) setEntries(data.entries);
        if (Array.isArray(data.savingsGoals)) setSavingsGoals(data.savingsGoals);
      })
      .catch(() => {});
  }, []);

  const loadSettings = useCallback(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data?.whatsappPhone) setWhatsappPhone(data.whatsappPhone);
        if (data?.persona) setPersona(data.persona);
        if (data?.examName) setExamName(data.examName);
        if (data?.examDate) setExamDate(data.examDate);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { loadEntries(); loadSettings(); }, [loadEntries, loadSettings]);
  useEffect(() => { if (timelineRef.current) timelineRef.current.scrollTop = timelineRef.current.scrollHeight; }, [entries]);

  /* ─── Actions ─── */
  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      const parsed = parseInput(text);
      await fetch("/api/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed, source: "app" }),
      });
      loadEntries();
    } finally { setSending(false); }
  };

  const toggleTask = async (entry: TrackerEntry) => {
    const nextStatus = entry.status === "done" ? "open" : "done";
    setEntries((curr) => (curr ?? []).map((e) => e._id === entry._id ? { ...e, status: nextStatus } : e));
    await fetch("/api/tracker", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ _id: entry._id, status: nextStatus }) });
    loadEntries();
  };

  const logWater = async (amount: number) => {
    await fetch("/api/tracker", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "health_checkin", title: `Drank ${amount}ml of water`, amount, category: "Water", status: "done", source: "app" }),
    });
    loadEntries();
  };

  const saveExam = async () => {
    if (!draftExamName.trim() || !draftExamDate.trim()) return;
    await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ examName: draftExamName, examDate: draftExamDate }) });
    setExamName(draftExamName);
    setExamDate(draftExamDate);
    setEditingExam(false);
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsappPhone, persona }),
      });
    } finally { setSettingsSaving(false); }
  };

  const triggerWhatsApp = async () => {
    setWhatsappSending(true);
    setWhatsappStatus("idle");
    try {
      const res = await fetch("/api/whatsapp-send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      setWhatsappStatus(res.ok ? "success" : "error");
    } catch { setWhatsappStatus("error"); }
    finally { setWhatsappSending(false); setTimeout(() => setWhatsappStatus("idle"), 4000); }
  };

  /* ─── Derived Data ─── */
  const displayEntries = (entries ?? []).slice().reverse();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthEntries = (entries ?? []).filter(e => new Date(e.createdAt) >= startOfMonth);
  const incomeThisMonth = monthEntries.filter(e => e.type === "income").reduce((s, e) => s + (e.amount ?? 0), 0);
  const spentThisMonth = monthEntries.filter(e => e.type === "expense").reduce((s, e) => s + (e.amount ?? 0), 0);
  
  const spentToday = (entries ?? []).filter((e) => e.type === "expense" && typeof e.amount === "number" && new Date(e.createdAt).toDateString() === new Date().toDateString()).reduce((sum, e) => sum + (e.amount ?? 0), 0);
  
  const daysInMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).getDate();
  const daysRemainingInMonth = daysInMonth - new Date().getDate() + 1;
  const totalSaved = savingsGoals.reduce((s, g) => s + (g.savedAmount || 0), 0);
  const safeToSpend = Math.max(0, (incomeThisMonth - spentThisMonth - totalSaved) / daysRemainingInMonth);
  
  const remaining = Math.max(0, safeToSpend - spentToday);
  const spentPct = safeToSpend > 0 ? Math.min(100, (spentToday / safeToSpend) * 100) : 0;
  const todayTasks = (entries ?? []).filter((e) => e.type === "task");
  const openTasks = todayTasks.filter((t) => t.status === "open").length;
  const doneTasks = todayTasks.filter((t) => t.status === "done").length;

  const todayWater = (entries ?? []).filter((e) => {
    if (e.type !== "health_checkin" || e.category !== "Water") return false;
    return new Date(e.createdAt).toDateString() === new Date().toDateString();
  }).reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const waterPct = Math.min(100, (todayWater / WATER_TARGET) * 100);

  const daysRemaining = (() => {
    if (!examDate) return null;
    const diff = new Date(examDate).getTime() - new Date().setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const studyBySubject: Record<string, number> = {};
  (entries ?? []).filter((e) => e.type === "exam_study").forEach((e) => {
    const sub = e.category || "General";
    studyBySubject[sub] = (studyBySubject[sub] || 0) + (e.amount ?? 1.0);
  });
  const totalStudyHrs = Object.values(studyBySubject).reduce((a, b) => a + b, 0);

  const TABS: { id: TaskTab; label: string; emoji: string; badge?: string }[] = [
    { id: "chat", label: "Log", emoji: "💬", badge: openTasks > 0 ? `${openTasks}` : undefined },
    { id: "exam", label: "Exam", emoji: "📚", badge: daysRemaining !== null ? `${daysRemaining}d` : undefined },
    { id: "water", label: "Water", emoji: "💧", badge: `${waterPct.toFixed(0)}%` },
    { id: "budget", label: "Money", emoji: "💰", badge: `₹${spentToday.toFixed(0)}` },
    { id: "settings", label: "Settings", emoji: "⚙️" },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 pointer-events-none bg-gradient-to-br from-orange-950/20 via-transparent to-blue-950/20" />

      {/* ───── Topbar ───── */}
      <header className="sticky top-0 z-50 h-16 flex justify-between items-center px-4 md:px-8 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-4">
          <span className="font-bold text-orange-500 text-lg tracking-tight">RohitOS</span>
          <span className="hidden md:inline text-[11px] uppercase tracking-widest text-gray-500 border-l border-white/10 pl-4">Task Companion</span>
        </div>
        <div className="flex items-center gap-2">
          {/* WhatsApp Send Button */}
          <button
            onClick={triggerWhatsApp}
            disabled={whatsappSending}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border ${
              whatsappStatus === "success"
                ? "bg-green-500/20 border-green-500/50 text-green-400"
                : whatsappStatus === "error"
                ? "bg-red-500/20 border-red-500/50 text-red-400"
                : "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
            } disabled:opacity-50`}
          >
            <span>{whatsappStatus === "success" ? "✅" : whatsappStatus === "error" ? "❌" : "📤"}</span>
            <span className="hidden sm:inline">
              {whatsappSending ? "Sending..." : whatsappStatus === "success" ? "Sent!" : whatsappStatus === "error" ? "Failed" : "WhatsApp"}
            </span>
          </button>
          <Link to="/admin" className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-white/5 transition border border-white/10">
            ⚙️
          </Link>
          <Link to="/" className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-white/5 transition border border-white/10">
            🏠
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 md:px-8 py-6 space-y-6">
        {/* ───── Greeting + Stat Chips ───── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[.18em] text-orange-400">{formatToday()}</p>
            <h1 className="text-3xl md:text-4xl font-bold">{greeting()}, Rohit</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <StatChip emoji="✅" label="Done" value={`${doneTasks}`} color="text-green-400" />
            <StatChip emoji="⏳" label="Open" value={`${openTasks}`} color="text-orange-400" />
            <StatChip emoji="💧" label="Water" value={`${todayWater}ml`} color="text-cyan-400" />
            <StatChip emoji="📖" label="Study" value={`${totalStudyHrs.toFixed(1)}h`} color="text-purple-400" />
          </div>
        </div>

        {/* ───── Tab Navigation ───── */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mb-2">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs uppercase tracking-widest transition-all duration-300 whitespace-nowrap border ${
                  active
                    ? "bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/20"
                    : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>{tab.emoji}</span>
                {tab.label}
                {tab.badge && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-white/10 text-gray-400"}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ───── Tab Content ───── */}
        <div>
          {activeTab === "chat" && (
            <ChatPanel
              entries={displayEntries}
              input={input}
              sending={sending}
              timelineRef={timelineRef}
              todayTasks={todayTasks}
              onInput={setInput}
              onSend={send}
              onToggleTask={toggleTask}
              loadEntries={loadEntries}
            />
          )}

          {activeTab === "exam" && (
            <ExamPanel
              examName={examName}
              examDate={examDate}
              daysRemaining={daysRemaining}
              studyBySubject={studyBySubject}
              totalStudyHrs={totalStudyHrs}
              editingExam={editingExam}
              draftExamName={draftExamName}
              draftExamDate={draftExamDate}
              onStartEditing={() => { setDraftExamName(examName); setDraftExamDate(examDate); setEditingExam(true); }}
              onCancelEditing={() => setEditingExam(false)}
              onDraftNameChange={setDraftExamName}
              onDraftDateChange={setDraftExamDate}
              onSaveExam={saveExam}
              onInput={setInput}
            />
          )}

          {activeTab === "water" && (
            <WaterPanel todayWater={todayWater} waterPct={waterPct} onLogWater={logWater} entries={entries} />
          )}

          {activeTab === "budget" && (
            <BudgetPanel spentToday={spentToday} remaining={remaining} spentPct={spentPct} entries={entries} incomeThisMonth={incomeThisMonth} spentThisMonth={spentThisMonth} safeToSpend={safeToSpend} savingsGoals={savingsGoals} />
          )}

          {activeTab === "settings" && (
            <SettingsPanel
              whatsappPhone={whatsappPhone}
              persona={persona}
              saving={settingsSaving}
              onPhoneChange={setWhatsappPhone}
              onPersonaChange={setPersona}
              onSave={saveSettings}
            />
          )}
        </div>
      </div>
    </main>
  );
}

/* ═══════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════ */

function StatChip({ emoji, label, value, color }: { emoji: string; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
      <span className="text-sm">{emoji}</span>
      <span className="text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
      <span className={`text-xs font-bold ${color}`}>{value}</span>
    </div>
  );
}

/* ─── Settings Panel ─── */
function SettingsPanel({ whatsappPhone, persona, saving, onPhoneChange, onPersonaChange, onSave }: {
  whatsappPhone: string; persona: string; saving: boolean;
  onPhoneChange: (v: string) => void; onPersonaChange: (v: string) => void; onSave: () => void;
}) {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-5">
        <h3 className="text-lg font-semibold text-orange-400 flex items-center gap-2">
          ⚙️ WhatsApp Settings
        </h3>
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
            Your WhatsApp Phone Number (with country code)
          </label>
          <input
            type="text"
            value={whatsappPhone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="e.g. 919876543210"
            className="w-full h-10 px-4 text-sm bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-orange-500 placeholder-gray-600"
          />
          <p className="text-[10px] text-gray-500 mt-1">Format: country code + number, no spaces or + sign (e.g. 919876543210)</p>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">
            AI Persona
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "girlfriend", label: "💕 Girlfriend", desc: "Romantic Tanglish" },
              { id: "friend", label: "🤝 Friend", desc: "Casual Tanglish" },
              { id: "eng-frd", label: "🇬🇧 English", desc: "Casual English" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => onPersonaChange(p.id)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  persona === p.id
                    ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
                    : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                }`}
              >
                <div className="text-sm font-semibold">{p.label}</div>
                <div className="text-[10px] mt-0.5 text-gray-500">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-orange-500 text-white font-semibold text-sm hover:bg-orange-600 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

/* ─── Chat Panel ─── */
function ChatPanel({
  entries, input, sending, timelineRef, todayTasks,
  onInput, onSend, onToggleTask, loadEntries,
}: {
  entries: TrackerEntry[]; input: string; sending: boolean; timelineRef: React.RefObject<HTMLDivElement | null>;
  todayTasks: TrackerEntry[];
  onInput: (v: string) => void; onSend: () => void; onToggleTask: (e: TrackerEntry) => void;
  loadEntries: () => void;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Chat column */}
      <div className="xl:col-span-2 flex flex-col bg-white/5 rounded-2xl overflow-hidden h-[520px] border border-white/10">
        <div className="px-5 py-3 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <h2 className="text-lg font-semibold text-orange-400">Activity Log</h2>
          <p className="text-xs text-gray-500">Type naturally: &quot;study 2 hrs Polity&quot;, &quot;water 500ml&quot;, &quot;spent 150 on lunch&quot;</p>
        </div>
        <div ref={timelineRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth">
          <div className="flex justify-center my-1">
            <span className="px-3 py-0.5 rounded-full bg-white/5 text-gray-500 text-[10px] uppercase tracking-wider border border-white/10">{formatToday()}</span>
          </div>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <span className="text-4xl">💬</span>
              <p className="text-sm text-gray-500">No logs yet today. Start typing to log!</p>
            </div>
          ) : entries.map((entry) => <TrackerBubble key={entry._id} entry={entry} onToggleTask={onToggleTask} />)}
        </div>
        <div className="p-3 bg-white/5 backdrop-blur-xl border-t border-white/10">
          <div className="relative flex items-center">
            <input value={input} onChange={(e) => onInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
              placeholder="Log something… e.g. 'study 2 hours Polity'"
              className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-4 pr-12 text-white text-sm focus:outline-none focus:border-orange-500 transition-all placeholder:text-gray-600" type="text"
            />
            <button onClick={onSend} disabled={sending || !input.trim()}
              className="absolute right-1.5 w-9 h-9 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600 transition disabled:opacity-50" aria-label="Send">
              📤
            </button>
          </div>
        </div>
      </div>

      {/* Agenda sidebar */}
      <div className="flex flex-col gap-4">
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 space-y-4">
          <h3 className="text-base font-semibold text-orange-400 flex items-center gap-2">
            📋 Today&apos;s Tasks
          </h3>

          {/* Quick add form */}
          <form onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            const title = data.get("title")?.toString().trim();
            if (!title) return;
            await fetch("/api/tracker", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: "task", title, status: "open", source: "app" })
            });
            form.reset();
            loadEntries();
          }} className="space-y-2 border-b border-white/10 pb-4">
            <div className="flex gap-2">
              <input required name="title" placeholder="New task title..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 placeholder:text-gray-600" />
              <button type="submit" className="bg-orange-500 text-white px-3 rounded-xl text-xs font-semibold hover:bg-orange-600 transition">Add</button>
            </div>
          </form>

          {todayTasks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No tasks yet.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto">
              {todayTasks.map((task) => {
                const done = task.status === "done";
                return (
                  <button key={task._id} onClick={() => onToggleTask(task)}
                    className={`p-3 bg-white/5 border border-white/10 rounded-xl flex gap-3 items-center hover:bg-white/10 transition text-left w-full ${done ? "opacity-50" : ""}`}>
                    <span className="text-sm">{done ? "✅" : "⬜"}</span>
                    <p className={`text-sm text-white truncate ${done ? "line-through" : ""}`}>{task.title}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Exam Panel ─── */
function ExamPanel({
  examName, examDate, daysRemaining, studyBySubject, totalStudyHrs,
  editingExam, draftExamName, draftExamDate,
  onStartEditing, onCancelEditing, onDraftNameChange, onDraftDateChange, onSaveExam, onInput,
}: {
  examName: string; examDate: string; daysRemaining: number | null;
  studyBySubject: Record<string, number>; totalStudyHrs: number;
  editingExam: boolean; draftExamName: string; draftExamDate: string;
  onStartEditing: () => void; onCancelEditing: () => void;
  onDraftNameChange: (v: string) => void; onDraftDateChange: (v: string) => void; onSaveExam: () => void;
  onInput: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Countdown hero */}
      <div className="md:col-span-2 xl:col-span-1 bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col items-center justify-center text-center gap-4">
        {examName && !editingExam ? (
          <>
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-orange-500/30 to-purple-500/20 border-4 border-orange-500/40 flex items-center justify-center">
              <span className="text-4xl font-black text-white">{daysRemaining}</span>
            </div>
            <p className="text-xs uppercase tracking-widest text-gray-500">Days Remaining</p>
            <div>
              <p className="text-lg font-bold text-white">{examName}</p>
              <p className="text-xs text-gray-500 mt-0.5">Target: {examDate}</p>
            </div>
            <button onClick={onStartEditing} className="mt-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-wider text-gray-400 hover:text-orange-400 hover:border-orange-400/40 transition">
              ✏️ Change Exam
            </button>
          </>
        ) : (
          <div className="w-full space-y-4">
            <div className="text-3xl">🎓</div>
            <h3 className="text-lg font-semibold text-white">{editingExam ? "Update Target Exam" : "Set Your Target Exam"}</h3>
            <input value={draftExamName} onChange={(e) => onDraftNameChange(e.target.value)} placeholder="e.g. UPSC Prelims 2026"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500" />
            <input type="date" value={draftExamDate} onChange={(e) => onDraftDateChange(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500" />
            <div className="flex gap-2">
              <button onClick={onSaveExam} className="flex-1 rounded-xl bg-orange-500 text-white font-semibold text-sm py-2.5 hover:bg-orange-600 transition">Save Exam</button>
              {editingExam && <button onClick={onCancelEditing} className="px-4 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white transition">Cancel</button>}
            </div>
          </div>
        )}
      </div>

      {/* Study hours breakdown */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h3 className="text-base font-semibold text-purple-400 mb-4 flex items-center gap-2">
          📊 Study Hours by Subject
        </h3>
        {Object.keys(studyBySubject).length === 0 ? (
          <div className="text-center py-8">
            <span className="text-3xl">📖</span>
            <p className="text-sm text-gray-500 mt-2">No study sessions logged yet.</p>
            <p className="text-xs text-gray-600 mt-1">Type &quot;study 2 hrs Polity&quot; in the Log tab</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(studyBySubject).sort((a, b) => b[1] - a[1]).map(([sub, hrs]) => {
              const pct = totalStudyHrs > 0 ? (hrs / totalStudyHrs) * 100 : 0;
              return (
                <div key={sub}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-white truncate max-w-[180px]">{sub}</span>
                    <span className="text-xs font-bold text-purple-400">{hrs.toFixed(1)} hrs</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <div className="pt-3 border-t border-white/10 flex justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wider">Total</span>
              <span className="text-sm font-bold text-orange-400">{totalStudyHrs.toFixed(1)} hours</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick tips */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h3 className="text-base font-semibold text-orange-400 mb-4 flex items-center gap-2">
          💡 Quick Commands
        </h3>
        <div className="space-y-3">
          {[
            ["study 2 hrs Polity", "Log 2 hours of Polity study"],
            ["study 1.5 hours GK", "Log 1.5 hours of General Knowledge"],
            ["study 3 hrs Math", "Log 3 hours of Mathematics"],
            ["study History", "Log 1 hour of History (default)"],
          ].map(([cmd, desc]) => (
            <button
              key={cmd}
              type="button"
              onClick={() => onInput(cmd)}
              className="w-full text-left p-3 bg-white/5 hover:bg-white/10 transition rounded-xl border border-white/10 block group"
            >
              <code className="text-xs text-orange-400 font-mono">{cmd}</code>
              <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Water Panel ─── */
function WaterPanel({ todayWater, waterPct, onLogWater, entries }: {
  todayWater: number; waterPct: number; onLogWater: (ml: number) => void; entries: TrackerEntry[] | null;
}) {
  const waterEntries = (entries ?? []).filter((e) => e.type === "health_checkin" && e.category === "Water" && new Date(e.createdAt).toDateString() === new Date().toDateString()).reverse();
  const glassCount = Math.round(todayWater / 250);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Progress hero */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10 flex flex-col items-center text-center gap-5">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="url(#waterGrad)" strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${waterPct * 0.975} 100`} className="transition-all duration-700" />
            <defs><linearGradient id="waterGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#4edea3" /><stop offset="100%" stopColor="#00bcd4" /></linearGradient></defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-white">{waterPct.toFixed(0)}%</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Hydrated</span>
          </div>
        </div>
        <div>
          <p className="text-xl font-bold text-white">{todayWater} <span className="text-sm font-normal text-gray-500">/ {WATER_TARGET} ml</span></p>
          <p className="text-xs text-gray-500 mt-1">~{glassCount} glasses today</p>
        </div>
        <div className="flex gap-3 w-full">
          {[250, 500, 750].map((ml) => (
            <button key={ml} onClick={() => onLogWater(ml)}
              className="flex-1 py-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-sm font-semibold text-cyan-400 transition flex items-center justify-center gap-1.5">
              ➕ {ml}ml
            </button>
          ))}
        </div>
      </div>

      {/* Water log history */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h3 className="text-base font-semibold text-cyan-400 mb-4 flex items-center gap-2">
          📜 Today&apos;s Hydration Log
        </h3>
        {waterEntries.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-3xl">💧</span>
            <p className="text-sm text-gray-500 mt-2">No water logged today</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[350px] overflow-y-auto">
            {waterEntries.map((e) => (
              <div key={e._id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center gap-2">
                  <span>💧</span>
                  <span className="text-sm text-white">{e.amount}ml</span>
                </div>
                <span className="text-[10px] text-gray-500">{formatTime(e.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Budget Panel ─── */
function BudgetPanel({ spentToday, remaining, spentPct, entries, incomeThisMonth, spentThisMonth, safeToSpend, savingsGoals }: {
  spentToday: number; remaining: number; spentPct: number; entries: TrackerEntry[] | null;
  incomeThisMonth: number; spentThisMonth: number; safeToSpend: number; savingsGoals: any[];
}) {
  const expenseEntries = (entries ?? []).filter((e) => e.type === "expense").reverse();
  const byCategory: Record<string, number> = {};
  expenseEntries.forEach((e) => { byCategory[e.category || "General"] = (byCategory[e.category || "General"] || 0) + (e.amount ?? 0); });

  const totalSaved = savingsGoals.reduce((s, g) => s + (g.savedAmount || 0), 0);
  const emergencyReserve = incomeThisMonth * 0.10;
  let healthScore = 50;
  if (incomeThisMonth > 0) {
    if (spentThisMonth < incomeThisMonth) healthScore += 20;
    if (totalSaved > 0) healthScore += 15;
    if (spentToday <= safeToSpend) healthScore += 15;
  } else { healthScore = 0; }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Summary */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h3 className="text-base font-semibold text-orange-400 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">📊 Budget Overview</span>
          <span className="text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md">Score: {Math.min(100, healthScore)}/100</span>
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-[10px] text-gray-500 uppercase">Income</p>
            <p className="text-lg font-bold text-green-400 mt-1">₹{incomeThisMonth.toFixed(0)}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-[10px] text-gray-500 uppercase">Spent (Month)</p>
            <p className="text-lg font-bold text-red-400 mt-1">₹{spentThisMonth.toFixed(0)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Spent Today</p>
              <p className="text-2xl font-bold text-red-400 mt-0.5">₹{spentToday.toFixed(0)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Safe to Spend</p>
              <p className="text-2xl font-bold text-green-400 mt-0.5">₹{safeToSpend.toFixed(0)}</p>
            </div>
          </div>
          <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div className={`h-full rounded-full transition-all duration-500 ${spentPct > 100 ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${Math.min(100, spentPct)}%` }} />
          </div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500">
            {spentPct > 100 ? "Over daily budget limit!" : `${spentPct.toFixed(0)}% of safe daily budget used`}
          </p>

          {Object.keys(byCategory).length > 0 && (
            <div className="pt-3 border-t border-white/10 space-y-2">
              <h4 className="text-[10px] uppercase tracking-wider text-gray-500">By Category</h4>
              {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                <div key={cat} className="flex justify-between items-center p-2 bg-white/5 rounded-lg border border-white/10">
                  <span className="text-xs text-white">{cat}</span>
                  <span className="text-xs font-bold text-red-400">₹{amt.toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Savings Goals */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <h3 className="text-base font-semibold text-green-400 mb-4 flex items-center gap-2">
            🏦 Savings Goals
          </h3>
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
            <p className="text-xs text-gray-400 uppercase">Recommended Emergency Reserve</p>
            <p className="text-lg font-bold text-green-400 mt-1">₹{emergencyReserve.toFixed(0)} <span className="text-[10px] font-normal text-gray-500">(10% of Income)</span></p>
          </div>
          
          {savingsGoals.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-2">No active savings goals. Type &quot;save for iPhone 80k&quot;</p>
          ) : (
            <div className="space-y-4">
              {savingsGoals.map((goal: any) => {
                const pct = Math.min(100, (goal.savedAmount / goal.targetAmount) * 100);
                return (
                  <div key={goal._id} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-white">{goal.name}</span>
                      <span className="text-green-400 font-bold">₹{goal.savedAmount} <span className="text-gray-500 text-xs">/ ₹{goal.targetAmount}</span></span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent expenses */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <h3 className="text-base font-semibold text-red-400 mb-4 flex items-center gap-2">
            🧾 Recent Expenses
          </h3>
          {expenseEntries.length === 0 ? (
            <div className="text-center py-4">
              <span className="text-3xl">💳</span>
              <p className="text-sm text-gray-500 mt-2">No expenses logged</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[150px] overflow-y-auto">
              {expenseEntries.map((e) => (
                <div key={e._id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/10">
                  <div>
                    <p className="text-sm text-white">{e.title}</p>
                    <p className="text-[10px] text-gray-500">{e.category || "General"} · {formatTime(e.createdAt)}</p>
                  </div>
                  <span className="text-sm font-bold text-red-400">₹{(e.amount ?? 0).toFixed(0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Chat Bubble ─── */
function TrackerBubble({ entry, onToggleTask }: { entry: TrackerEntry; onToggleTask: (e: TrackerEntry) => void }) {
  if (entry.source === "assistant") {
    return (
      <div className="flex gap-3 items-start w-full max-w-[85%]">
        <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs">🤖</span>
        </div>
        <div className="bg-orange-500/5 border border-orange-500/20 p-3 rounded-2xl rounded-tl-sm backdrop-blur-md">
          <p className="text-sm text-white whitespace-pre-wrap">{entry.title}</p>
          <span className="text-[10px] text-gray-500 mt-1 block">{formatTime(entry.createdAt)}</span>
        </div>
      </div>
    );
  }

  if (entry.type === "task") {
    const done = entry.status === "done";
    return (
      <div className="flex gap-3 items-start w-full max-w-[85%] self-end flex-row-reverse">
        <div className="w-7 h-7 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs">📝</span>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-2xl rounded-tr-sm backdrop-blur-md">
          <button onClick={() => onToggleTask(entry)} className="flex items-center gap-2 text-left">
            <span className="text-sm">{done ? "✅" : "⬜"}</span>
            <p className={`text-sm text-white ${done ? "line-through opacity-60" : ""}`}><span className="font-semibold">Task:</span> {entry.title}</p>
          </button>
          <span className="text-[10px] text-gray-500 mt-1 block text-right">{formatTime(entry.createdAt)}</span>
        </div>
      </div>
    );
  }

  const configs: Record<string, { emoji: string; color: string; label: string }> = {
    expense: { emoji: "💸", color: "text-red-400", label: `₹${(entry.amount ?? 0).toFixed(0)} · ${entry.category || "General"}` },
    income: { emoji: "💵", color: "text-green-400", label: `₹${(entry.amount ?? 0).toFixed(0)} · ${entry.title}` },
    exam_study: { emoji: "📖", color: "text-purple-400", label: entry.title },
    health_checkin: { emoji: entry.category === "Water" ? "💧" : "❤️", color: entry.category === "Water" ? "text-cyan-400" : "text-pink-400", label: entry.title },
    meal: { emoji: "🍽️", color: "text-yellow-400", label: entry.title },
    chore: { emoji: "🧹", color: "text-green-400", label: entry.title },
    reminder: { emoji: "⏰", color: "text-yellow-400", label: entry.title },
  };
  const cfg = configs[entry.type] || { emoji: "📌", color: "text-gray-400", label: entry.title };

  return (
    <div className="flex gap-3 items-start w-full max-w-[85%]">
      <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-xs">{cfg.emoji}</span>
      </div>
      <div className="bg-white/5 border border-white/10 p-3 rounded-2xl rounded-tl-sm backdrop-blur-md">
        <p className="text-sm text-white">{cfg.label}</p>
        <span className="text-[10px] text-gray-500 mt-1 block">{formatTime(entry.createdAt)}</span>
      </div>
    </div>
  );
}
