import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/auth.jsx";
import BrandLogo from "../components/brandLogo2.jsx";
import DoctorScene from "../components/DoctorScene";
import { analyzePatientStoryDistilBert } from "../services/advisoryApi";

import {
  HomeIcon,
  UserCircleIcon as UserCircle,
  ArrowRightOnRectangleIcon,
  PhotoIcon,
  ShieldCheckIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  SparklesIcon,
  BeakerIcon,
  FireIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function prettyCategory(category) {
  const map = {
    absorption_effect: "Absorption concern",
    possible_interaction: "Possible interaction",
    side_effect: "Side effect concern",
    better_with_food: "Better taken with food",
    missed_dose: "Missed dose",
    overdose: "Overdose concern",
    insufficient_information: "Need more details",
  };
  return map[category] || "Medicine advice";
}

function prettySeverity(severity) {
  if (severity === 2) return { label: "High risk", short: "Urgent attention" };
  if (severity === 1) return { label: "Moderate risk", short: "Be careful" };
  return { label: "Low risk", short: "General guidance" };
}

function prettyTiming(timing, data) {
  if (!timing) return "";
  const t = timing.toLowerCase();
  if (data?.reasons?.includes("glycemic_control")) {
    return "Eat before taking this medicine to avoid low blood sugar";
  }
  if (t.includes("24")) return "Avoid this for the rest of the day";
  if (t.includes("immediate")) return "Get medical advice immediately";
  if (t.includes("meal")) {
    return "Take this medicine with food (do not skip meals)";
  }
  if (t.includes("empty")) return "Take on an empty stomach";
  return timing;
}

function buildFriendlyBotText(data) {
  if (data.message) return data.message;
  const category = prettyCategory(data.interaction_category);
  let intro = "";

  if (data.interaction_category === "overdose") {
    intro = "It sounds like you may have taken more medicine than intended.";
  } else if (data.interaction_category === "missed_dose") {
    intro = "It sounds like you may have missed a dose of your medicine.";
  } else if (data.interaction_category === "possible_interaction") {
    intro = "This combination may cause a medicine-related problem.";
  } else if (data.interaction_category === "absorption_effect") {
    intro = "This may affect how well the medicine is absorbed or works.";
  } else if (data.interaction_category === "side_effect") {
    intro =
      "This may increase the chance of unwanted symptoms or side effects.";
  } else if (data.interaction_category === "insufficient_information") {
    intro = "I do not have enough details to assess this properly.";
  } else if (data.interaction_category === "better_with_food") {
    intro = "This medicine works better when taken with food.";
  } else if (data.interaction_category === "no_clear_interaction") {
    intro =
      "No clear interaction could be identified from the information provided.";
  } else {
    intro = category;
  }

  const friendlyTitle =
    data.severity === 2
      ? "High risk"
      : data.severity === 1
      ? "Please be careful"
      : "Good to know";

  return [
    `${friendlyTitle}: ${intro}`,
    data.explanation || "",
    data.advice ? `What you should do: ${data.advice}` : "",
    data.timing_window && data.timing_window !== "unknown"
      ? `When to be careful: ${prettyTiming(data.timing_window, data)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/* ─── severity theming ─────────────────────────────────────────────────────── */

function getSeverityConfig(severity) {
  if (severity === 2)
    return {
      bubble: "bg-red-50 border border-red-200 text-slate-800",
      badge: "bg-red-100 text-red-700 border border-red-200",
      tag: "bg-red-100 text-red-700",
      dot: "bg-red-500",
      label: "High risk",
    };

  if (severity === 1)
    return {
      bubble: "bg-amber-50 border border-amber-200 text-slate-800",
      badge: "bg-amber-100 text-amber-700 border border-amber-200",
      tag: "bg-amber-100 text-amber-700",
      dot: "bg-amber-500",
      label: "Moderate risk",
    };

  return {
    bubble: "bg-emerald-50 border border-emerald-200 text-slate-800",
    badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    tag: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    label: "Low risk",
  };
}

/* ─── sub-components ───────────────────────────────────────────────────────── */

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 0.15, 0.3].map((delay, i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-violet-400"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay }}
        />
      ))}
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left ${
        active
          ? "bg-violet-500/20 text-violet-300"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

/* ─── main component ───────────────────────────────────────────────────────── */

export default function PatientStoryChat() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("symptom-drug");
  const [story, setStory] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: "bot",
      text: "Hello! 👋 Tell me what medicine you took, what you ate or drank, and when it happened — I'll assess any potential risks.",
    },
  ]);

  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  const handleNavigation = useCallback(
    (path) => {
      navigate(path);
      setSidebarOpen(false);
    },
    [navigate]
  );

  const handleLogout = useCallback(() => {
    logout();
    navigate("/");
    setSidebarOpen(false);
  }, [logout, navigate]);

  const menuItems = [
  { key: "dashboard", icon: HomeIcon, label: "Dashboard", path: "/dashboard" },
  { key: "food-drug", icon: ShieldCheckIcon, label: "Food Drug Interaction", path: "/advisory" },
  { key: "meal-plan", icon: ClipboardDocumentListIcon, label: "Meal Plan Advisor", path: "/meal-plan" },
  { key: "drug-image", icon: PhotoIcon, label: "Drug Image Analyzer", path: "/drug-image" },
  { key: "symptom-drug", icon: SparklesIcon, label: "Patient Story Analyzer", path: "/story-analyzer" },
  { key: "history", icon: ClockIcon, label: "History", path: "/history" },
];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  const examplePrompts = useMemo(
    () => [
      "I took my antibiotic and then drank milk",
      "I drank alcohol after taking my sleeping pill",
      "I skipped breakfast and took my diabetes medicine",
      "I accidentally took my medicine twice this morning",
    ],
    []
  );

  const handleSend = async () => {
    const trimmed = story.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { type: "user", text: trimmed }]);
    setStory("");
    setLoading(true);
    setSpeaking(true);

    try {
      const [data] = await Promise.all([
        analyzePatientStoryDistilBert({ story: trimmed }),
        new Promise((r) => setTimeout(r, 1800)),
      ]);

      const botText = buildFriendlyBotText(data);
      setMessages((prev) => [
        ...prev,
        { type: "bot", text: botText.trim(), meta: data },
      ]);
    } catch (err) {
      await new Promise((r) => setTimeout(r, 1500));
      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          text:
            err?.error ||
            err?.details ||
            err?.message ||
            "Something went wrong.",
          meta: { severity: 1 },
        },
      ]);
    } finally {
      setLoading(false);
      setSpeaking(false);
    }
  };

  const onEnterSend = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };



const SidebarContent = () => (
  <div className="h-full w-100 bg-gradient-to-b from-[#2f2971] via-[#2a246a] to-[#251f5e] text-white flex flex-col shadow-2xl">
    <div className="h-16 flex items-center justify-between gap-3 px-6 border-b border-white/10">
      <div
        className="shrink-0 flex items-center cursor-pointer group"
        onClick={() => {
          handleNavigation("/");
          setSidebarOpen(false);
        }}
      >
        <div className="transform group-hover:scale-105 transition-transform duration-200">
          <BrandLogo />
        </div>
      </div>

      <button
        onClick={() => setSidebarOpen(false)}
        className="p-2 rounded-xl hover:bg-white/10 transition"
      >
        <XMarkIcon className="h-5 w-5 text-white" />
      </button>
    </div>

    <nav className="flex-1 px-4 py-6 space-y-2">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.key;

        return (
          <button
            key={item.key}
            onClick={() => {
              setActiveTab(item.key);
              handleNavigation(item.path);
              setSidebarOpen(false);
            }}
            className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200 ${
              active
                ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
                : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
            }`}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </button>
        );
      })}

      <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
        <button
          onClick={() => {
            setActiveTab("profile");
            navigate("/profile");
            setSidebarOpen(false);
          }}
          className={`relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200 ${
            activeTab === "profile"
              ? "bg-white text-[#2f2971] rounded-r-full -ml-4 pl-10"
              : "text-white hover:bg-white/10 rounded-r-full -ml-4 pl-10"
          }`}
        >
          <UserCircle className="h-5 w-5" />
          My Profile
        </button>

        <button
          onClick={() => {
            handleLogout();
            setSidebarOpen(false);
          }}
          className="relative w-full flex items-center gap-3 px-6 py-3.5 text-sm font-semibold transition-all duration-200 text-white hover:bg-red-500/20 rounded-r-full -ml-4 pl-10"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </nav>
  </div>
);
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <div className="flex min-h-screen">
       <AnimatePresence>
  {sidebarOpen && (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setSidebarOpen(false)}
        className="fixed inset-0 z-40 bg-black/50"
      />

      <motion.aside
        initial={{ x: -320 }}
        animate={{ x: 0 }}
        exit={{ x: -320 }}
        transition={{ type: "tween", duration: 0.25 }}
        className="fixed left-0 top-0 z-50 h-full"
      >
        <SidebarContent />
      </motion.aside>
    </>
  )}
</AnimatePresence>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 md:px-6 border-b border-white/[0.07] bg-slate-950/80 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition"
              >
                <Bars3Icon className="h-5 w-5 text-slate-300" />
              </button>

              <div>
                <div className="text-sm font-semibold text-white">
                  Patient Story Analyzer
                </div>
                <div className="text-[11px] text-slate-500">
                  AI-powered medicine safety assistant
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Model Active
            </div>
          </header>

          <div className="flex-1 overflow-hidden">
            <div className="h-full mx-auto max-w-6xl px-4 py-5 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-4 lg:overflow-y-auto lg:max-h-[calc(100vh-5rem)]"
              >
                <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f1a] p-5">
                  <span className="inline-block px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 text-[11px] font-medium border border-violet-400/20 mb-3">
                    PharmaLink Advisory
                  </span>
                  <h1 className="text-lg font-bold text-white tracking-tight">
                    Patient Story Assistant
                  </h1>
                  <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
                    Describe what medicine you took, what you ate or drank, and
                    what happened after.
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-400/15 bg-gradient-to-b from-violet-500/10 to-transparent p-4 flex items-center justify-center min-h-[180px]">
                  <DoctorScene speaking={speaking && !loading} thinking={loading} />
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f1a] p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Quick examples
                  </p>
                  <div className="space-y-2">
                    {examplePrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => {
                          setStory(prompt);
                          textareaRef.current?.focus();
                        }}
                        className="w-full text-left text-sm text-slate-300 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-violet-400/25 hover:text-white transition-all duration-150"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#0d0f1a] overflow-hidden"
                style={{ maxHeight: "calc(100vh - 5.5rem)" }}
              >
                <div className="px-5 py-4 border-b border-white/[0.07]">
                  <h2 className="text-base font-semibold text-white">
                    Patient Story Chat
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Professional clinical-style assistant
                  </p>
                </div>

                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto px-5 py-5 space-y-4 scroll-smooth"
                >
                  <AnimatePresence mode="popLayout">
                    {messages.map((msg, idx) => {
                      const sev = msg.meta
                        ? getSeverityConfig(msg.meta.severity)
                        : null;

                      return (
                        <motion.div
                          key={`${msg.type}-${idx}`}
                          initial={{ opacity: 0, y: 12, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className={`flex gap-2.5 ${
                            msg.type === "user" ? "flex-row-reverse" : ""
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${
                              msg.type === "bot"
                                ? "bg-gradient-to-br from-violet-600 to-indigo-500 text-white"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {msg.type === "bot" ? "Rx" : "U"}
                          </div>

                          <div
                            className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                              msg.type === "user"
                                ? "bg-gradient-to-br from-violet-600 to-indigo-500 text-white rounded-tr-sm"
                                : msg.meta?.severity !== undefined
                                ? `${sev.bubble} rounded-tl-sm`
                                : "bg-slate-800/80 text-slate-100 border border-white/[0.07] rounded-tl-sm"
                            }`}
                          >
                            {msg.type === "bot" &&
                              msg.meta?.severity !== undefined && (
                                <div
                                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1 mb-2.5 ${sev.tag}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${sev.dot}`}
                                  />
                                  {sev.label}
                                </div>
                              )}

                            <div className="whitespace-pre-line">
                              {msg.text}
                            </div>

                            {msg.type === "bot" &&
                              msg.meta?.interaction_category && (
                                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-black/[0.07]">
                                  <span
                                    className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${sev.badge}`}
                                  >
                                    {prettyCategory(
                                      msg.meta.interaction_category
                                    )}
                                  </span>
                                  {msg.meta.confidence && (
                                    <span className="text-[11px] px-2.5 py-1 rounded-full font-medium bg-sky-100 text-sky-700 border border-sky-200">
                                      {(msg.meta.confidence * 100).toFixed(0)}%
                                      {" "}confidence
                                    </span>
                                  )}
                                </div>
                              )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {loading && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2.5"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        Rx
                      </div>
                      <div className="bg-slate-800/80 border border-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-3">
                        <p className="text-xs text-slate-400 mb-2">
                          Analyzing your story…
                        </p>
                        <TypingDots />
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="px-4 py-4 border-t border-white/[0.07]">
                  <div
                    className={`flex items-end gap-2.5 rounded-xl border bg-slate-900/80 px-3.5 py-2.5 transition-colors ${
                      story ? "border-violet-500/40" : "border-white/[0.08]"
                    }`}
                  >
                    <textarea
                      ref={textareaRef}
                      value={story}
                      onChange={(e) => setStory(e.target.value)}
                      onKeyDown={onEnterSend}
                      rows={2}
                      placeholder="Describe the patient story… e.g. I drank alcohol after taking a sedative and felt very sleepy"
                      className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-slate-500 outline-none leading-relaxed min-h-[44px] max-h-[120px]"
                    />
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={handleSend}
                      disabled={loading || !story.trim()}
                      className="shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center text-white transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed self-end mb-0.5"
                    >
                      <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                    </motion.button>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-600 px-1">
                    Every response includes a medicine-food interaction
                    explanation when enough details are provided.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}