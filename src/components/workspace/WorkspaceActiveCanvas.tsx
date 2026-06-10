import { useEffect, useMemo, useState, useRef } from 'react';
import {
  ArrowLeft,
  Building2,
  Maximize2,
  Minimize2,
  Share2,
  ShieldAlert,
  SlidersHorizontal,
  Tag,
  Target,
  TrendingUp,
  Plus,
  Check,
  Send,
  User,
  UploadCloud,
  FileText,
  X,
  Paperclip,
  ChevronDown,
  ChevronUp,
  Cpu,
  Bot,
  Zap,
  Brain,
  Database,
} from 'lucide-react';
import {
  WORKSPACE_CANVAS_CARDS,
  WORKSPACE_CANVAS_CONNECTIONS,
  type WorkspaceCanvasCard,
} from '../../lib/workspaceLayoutData';
import { WorkspaceCanvasFrame } from './WorkspaceCanvasFrame';
import { useFounderWorkspace } from '../../context/FounderWorkspaceContext';
import { BrainIcon } from './BrainIcon';

/* ── tiny chart primitives ─────────────────────────────────────── */

function MiniBars({ color }: { color: string }) {
  const heights = [38, 58, 44, 72, 50, 66, 82, 60];
  return (
    <div className="flex items-end gap-[3px] h-12 mt-auto">
      {heights.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-[2px]"
          style={{ height: `${h}%`, background: `${color}${i % 2 ? 'cc' : '77'}` }}
        />
      ))}
    </div>
  );
}

function MiniRadar({ color }: { color: string }) {
  const ring = (s: number) =>
    [
      [50, 50 - 42 * s],
      [50 + 40 * s, 50 - 13 * s],
      [50 + 25 * s, 50 + 34 * s],
      [50 - 25 * s, 50 + 34 * s],
      [50 - 40 * s, 50 - 13 * s],
    ]
      .map(p => p.join(','))
      .join(' ');
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      {[1, 0.66, 0.33].map(s => (
        <polygon
          key={s}
          points={ring(s)}
          fill="none"
          stroke={color}
          strokeWidth={0.8}
          strokeOpacity={0.25}
        />
      ))}
      {[0, 1, 2, 3, 4].map(i => {
        const pts = ring(1).split(' ')[i];
        return (
          <line
            key={i}
            x1="50"
            y1="50"
            x2={pts.split(',')[0]}
            y2={pts.split(',')[1]}
            stroke={color}
            strokeWidth={0.6}
            strokeOpacity={0.2}
          />
        );
      })}
      <polygon
        points={[
          [50, 18],
          [80, 42],
          [66, 74],
          [30, 70],
          [20, 40],
        ]
          .map(p => p.join(','))
          .join(' ')}
        fill={`${color}33`}
        stroke={color}
        strokeWidth={1.2}
        strokeOpacity={0.85}
      />
    </svg>
  );
}

function MiniArea({ color, id }: { color: string; id: string }) {
  return (
    <svg viewBox="0 0 120 44" preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.45} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        fill={`url(#area-${id})`}
        points="0,34 16,30 32,20 48,26 64,12 80,18 96,8 120,14 120,44 0,44"
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeOpacity={0.9}
        points="0,34 16,30 32,20 48,26 64,12 80,18 96,8 120,14"
      />
    </svg>
  );
}

function MiniLine({ color, id }: { color: string; id: string }) {
  return (
    <svg viewBox="0 0 120 40" preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id={`line-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        fill={`url(#line-${id})`}
        points="0,30 18,26 34,30 52,18 70,24 88,10 106,16 120,4 120,40 0,40"
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeOpacity={0.9}
        points="0,30 18,26 34,30 52,18 70,24 88,10 106,16 120,4"
      />
    </svg>
  );
}

function GaugeRing({ color, value }: { color: string; value: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: 56, height: 56 }}>
      <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={4} />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ filter: `drop-shadow(0 0 4px ${color}aa)` }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[13px] font-bold"
        style={{ color }}
      >
        {value}%
      </span>
    </div>
  );
}

function CardIcon({ kind, color, id }: { kind?: WorkspaceCanvasCard['icon']; color: string; id?: string }) {
  const cls = 'w-3.5 h-3.5';
  const style = { color };

  if (id === 'company_hub') {
    return <Building2 className={cls} style={style} strokeWidth={2} />;
  }
  if (id === 'departments') {
    return <SlidersHorizontal className={cls} style={style} strokeWidth={2} />;
  }

  switch (kind) {
    case 'trend':
      return <TrendingUp className={cls} style={style} strokeWidth={2} />;
    case 'target':
      return <Target className={cls} style={style} strokeWidth={2} />;
    case 'shield':
      return <ShieldAlert className={cls} style={style} strokeWidth={2} />;
    case 'price':
      return <Tag className={cls} style={style} strokeWidth={2} />;
    default:
      return null;
  }
}

function CheckRow({ label, color, done }: { label: string; color: string; done?: boolean }) {
  return (
    <li className="flex items-center gap-1.5 text-[10px] text-white/75">
      <svg viewBox="0 0 12 12" className={`w-3 h-3 shrink-0 transition-colors ${done ? 'text-emerald-400' : ''}`} style={{ color: done ? undefined : color }} fill="none">
        <path
          d={done ? "M2.5 6.2 4.8 8.6 9.6 3.4" : "M2 6h8"}
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={done ? 'line-through text-white/40' : ''}>{label}</span>
    </li>
  );
}

/* ── card body per variant ─────────────────────────────────────── */

function CardHeader({ card }: { card: WorkspaceCanvasCard }) {
  return (
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <CardIcon kind={card.icon} color={card.accent} id={card.id} />
        <span
          className="ws-card-eyebrow truncate"
          style={{ color: `${card.accent}` }}
        >
          {card.title}
        </span>
      </div>
    </div>
  );
}

function CardBody({ card }: { card: WorkspaceCanvasCard }) {
  const {
    goals,
    goalProgress,
    projectedRunway,
    operatingBurn,
    monthlyRev,
    departments,
    totalFTE,
    risks,
    confidenceScore,
    gtmChannels,
  } = useFounderWorkspace();

  switch (card.id) {
    case 'company_hub':
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, color-mix(in srgb, ${card.accent} 40%, transparent), transparent)`,
                  border: `1px solid color-mix(in srgb, ${card.accent} 35%, transparent)`,
                }}
              >
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">{card.title}</h3>
                <span className="text-[11px] text-white/45">{card.subtitle}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="ws-hero-tag text-[9px] px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-md">
              Runway: {projectedRunway} Mo
            </span>
            <span className="ws-hero-tag text-[9px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-md">
              OKRs: {goalProgress}%
            </span>
            <span className="ws-hero-tag text-[9px] px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-md">
              FTE: {totalFTE}
            </span>
          </div>

          <div className="mt-auto pt-3 h-16">
            <MiniArea color={card.accent} id={card.id} />
          </div>
        </div>
      );

    case 'metrics':
      return (
        <div className="flex flex-col h-full">
          <CardHeader card={card} />
          <p className="text-[10px] text-white/40 mb-2 font-medium">
            Runway: <span className="text-emerald-400 font-bold">{projectedRunway} Months</span>
          </p>
          <div className="grid grid-cols-2 gap-1 mb-2 text-[10px] text-white/60">
            <div>Burn: <span className="text-red-400 font-semibold">${Math.round(operatingBurn / 1000)}k</span></div>
            <div>Rev: <span className="text-emerald-400 font-semibold">${Math.round(monthlyRev / 1000)}k</span></div>
          </div>
          <MiniBars color={card.accent} />
        </div>
      );

    case 'departments':
      return (
        <div className="flex flex-col h-full">
          <CardHeader card={card} />
          <div className="flex gap-2 flex-1 min-h-0">
            <ul className="flex-1 space-y-1 text-[9px] text-white/70">
              {departments.map(d => (
                <li key={d.id} className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full shrink-0" style={{ background: card.accent }} />
                    {d.name.split(' ')[0]}
                  </span>
                  <span className="font-semibold text-white/40">{d.fte}</span>
                </li>
              ))}
            </ul>
            <div className="w-[38%] shrink-0">
              <MiniRadar color={card.accent} />
            </div>
          </div>
          <span className="text-[9px] text-white/35 self-end mt-1">{totalFTE} Total FTE</span>
        </div>
      );

    case 'goals':
      return (
        <div className="flex flex-col h-full">
          <CardHeader card={card} />
          <ul className="space-y-1 text-[10px] text-white/80 mb-auto">
            {goals.slice(0, 3).map(g => (
              <li key={g.id} className="flex items-center gap-1.5 truncate">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${g.done ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <span className={g.done ? 'line-through text-white/40' : ''}>{g.label}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-white/5">
            <span className="text-[9px] text-white/45">OKR Goals Complete</span>
            <span className="text-[11px] font-bold text-rose-400">{goalProgress}%</span>
          </div>
        </div>
      );

    case 'risks':
      return (
        <div className="flex flex-col h-full">
          <CardHeader card={card} />
          <div className="flex items-center gap-3 flex-1">
            <ul className="flex-1 space-y-1">
              {risks.slice(0, 3).map(r => (
                <CheckRow key={r.id} label={r.label.split(':')[1]?.trim() || r.label} color={card.accent} done={r.status === 'Mitigated'} />
              ))}
            </ul>
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <GaugeRing color={card.accent} value={confidenceScore} />
              <span className="text-[8px] text-white/45">Risk Index</span>
            </div>
          </div>
        </div>
      );

    case 'gtm':
      return (
        <div className="flex flex-col h-full">
          <CardHeader card={card} />
          <ul className="space-y-1 mb-1">
            {gtmChannels.map(c => (
              <CheckRow key={c.id} label={`${c.name.split(' ')[0]} (${c.budget}%)`} color={card.accent} />
            ))}
          </ul>
          <div className="mt-auto h-12">
            <MiniLine color={card.accent} id={card.id} />
          </div>
        </div>
      );

    default:
      return null;
  }
}

function CompactCardBody({ card }: { card: WorkspaceCanvasCard }) {
  const {
    goalProgress,
    projectedRunway,
    totalFTE,
    confidenceScore,
    gtmChannels,
  } = useFounderWorkspace();

  let metricValue = '';
  let metricLabel = '';

  switch (card.id) {
    case 'company_hub':
      metricValue = 'Series A';
      metricLabel = 'Active Plan';
      break;
    case 'metrics':
      metricValue = `${projectedRunway} Mo`;
      metricLabel = 'Cash Runway';
      break;
    case 'departments':
      metricValue = `${totalFTE}`;
      metricLabel = 'Total FTEs';
      break;
    case 'goals':
      metricValue = `${goalProgress}%`;
      metricLabel = 'OKR Progress';
      break;
    case 'risks':
      metricValue = `${confidenceScore}%`;
      metricLabel = 'Confidence';
      break;
    case 'gtm':
      metricValue = `${gtmChannels.length}`;
      metricLabel = 'GTM Channels';
      break;
  }

  return (
    <div className="flex flex-col h-full justify-between py-0.5">
      <div className="flex items-center gap-1.5 min-w-0">
        <CardIcon kind={card.icon} color={card.accent} id={card.id} />
        <span
          className="ws-card-eyebrow truncate text-[10px]"
          style={{ color: card.accent }}
        >
          {card.id === 'company_hub' ? 'FounderOS' : card.title}
        </span>
      </div>
      <div className="mt-1">
        <div className="text-[20px] font-black text-white tracking-tight leading-none" style={{ textShadow: `0 0 10px ${card.accent}44` }}>
          {metricValue}
        </div>
        <span className="text-[9px] text-white/40 font-medium block mt-1 truncate">
          {metricLabel}
        </span>
      </div>
    </div>
  );
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  file?: {
    name: string;
    size: string;
    type: string;
  };
}
interface ParsedMessage {
  thinkingContent: string | null;
  mainContent: string;
}

const parseMessageText = (text: string): ParsedMessage => {
  const thinkingMatch = text.match(/^:::thinking\n([\s\S]*?)\n:::\n\n?([\s\S]*)$/);
  if (thinkingMatch) {
    return {
      thinkingContent: thinkingMatch[1],
      mainContent: thinkingMatch[2],
    };
  }
  return {
    thinkingContent: null,
    mainContent: text,
  };
};

function ThinkingBlock({ content }: { content: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const steps = content
    .split('\n')
    .map(line => line.replace(/^>\s*/, '').trim())
    .filter(Boolean);

  return (
    <div className="mb-3 rounded-xl border border-purple-500/10 bg-purple-500/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-medium text-purple-300 hover:text-purple-200 bg-purple-500/[0.04] hover:bg-purple-500/[0.08] transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <BrainIcon size={12} className="text-purple-400 animate-pulse" />
          <span>Thinking Process</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-purple-400/70" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-purple-400/70" />
        )}
      </button>
      {isOpen && (
        <div className="p-3 text-[11px] font-mono text-purple-200/60 space-y-1.5 border-t border-purple-500/10 bg-black/20">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-purple-400 select-none">›</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
}

function CustomDropdown({ value, onChange, options }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 bg-white/[0.03] border border-white/10 hover:border-white/20 text-white/80 hover:text-white text-[11px] font-medium rounded-lg px-2.5 py-1.5 transition-colors cursor-pointer select-none"
      >
        {selectedOption.icon}
        <span>{selectedOption.label}</span>
        <ChevronDown className={`w-3 h-3 text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-1.5 left-0 z-50 min-w-[165px] bg-[#121215]/95 border border-white/10 rounded-xl p-1 shadow-2xl backdrop-blur-xl animate-slide-up-fade">
          {options.map(option => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all text-left cursor-pointer ${isSelected
                  ? 'bg-indigo-500/15 text-indigo-300'
                  : 'text-white/70 hover:text-white hover:bg-white/[0.04]'
                  }`}
              >
                <div className="flex items-center gap-1.5">
                  {option.icon}
                  <span>{option.label}</span>
                </div>
                {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkspaceChatCopilot() {
  const {
    goals,
    addGoal,
    goalProgress,
    cashBalance,
    baseMRR,
    mrrGrowthRate,
    operatingBurn,
    projectedRunway,
    monthlyRev,
    departments,
    hireHeadcount,
    totalFTE,
    risks,
    addRisk,
    confidenceScore,
    gtmChannels,
  } = useFounderWorkspace();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your FounderOS AI Copilot. I have access to your workspace metrics (runway, OKRs, FTE count, risks, and GTM strategy). Ask me to analyze metrics, add new objectives, or run simulations!',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash');
  const [reasoningLevel, setReasoningLevel] = useState('standard');

  const modelOptions: DropdownOption[] = [
    { value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', icon: <Zap className="w-3.5 h-3.5 text-amber-400" /> },
    { value: 'gemini-3.5-pro', label: 'Gemini 3.5 Pro', icon: <Cpu className="w-3.5 h-3.5 text-indigo-400" /> },
    { value: 'founder-copilot', label: 'FounderOS Copilot v2', icon: <Bot className="w-3.5 h-3.5 text-purple-400" /> },
  ];

  const reasoningOptions: DropdownOption[] = [
    { value: 'standard', label: 'Standard Reasoning', icon: <SlidersHorizontal className="w-3.5 h-3.5 text-white/50" /> },
    { value: 'deep-thought', label: 'Deep Thought', icon: <Brain className="w-3.5 h-3.5 text-purple-400 animate-pulse" /> },
  ];

  const [activeView, setActiveView] = useState<'upload' | 'nodes'>('upload');
  const [showNodesDrawer, setShowNodesDrawer] = useState(false);

  const getNodeMetric = (id: string) => {
    switch (id) {
      case 'company_hub':
        return { value: 'Series A', label: 'Active Plan' };
      case 'metrics':
        return { value: `${projectedRunway} Mo`, label: 'Cash Runway' };
      case 'departments':
        return { value: `${totalFTE} FTEs`, label: 'Operator Payroll' };
      case 'goals':
        return { value: `${goalProgress}%`, label: 'OKRs Complete' };
      case 'risks':
        return { value: `${confidenceScore}%`, label: 'Confidence Index' };
      case 'gtm':
        return { value: `${gtmChannels.length} Channels`, label: 'GTM Strategy' };
      default:
        return { value: '-', label: 'Metric' };
    }
  };

  const handleNodeQuickQuery = (node: WorkspaceCanvasCard) => {
    const queryMap: Record<string, string> = {
      company_hub: 'What is our OKRs milestone and payroll headcount?',
      metrics: 'How does our cash runway look?',
      departments: 'Show our payroll departments and operator headcount',
      goals: 'List our active OKRs and goals',
      risks: 'What active blockers and risks are registered?',
      gtm: 'What is our GTM and channels wedge strategy?',
    };
    const queryText = queryMap[node.id] || `Tell me about the ${node.title} node`;
    handleSend(queryText);
  };

  const handleFileUpload = (file: File) => {
    setStagedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const triggerScroll = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = (text: string) => {
    if (!text.trim() && !stagedFile) return;

    const sizeStr = stagedFile
      ? stagedFile.size > 1024 * 1024
        ? `${(stagedFile.size / (1024 * 1024)).toFixed(1)} MB`
        : `${(stagedFile.size / 1024).toFixed(0)} KB`
      : '';

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: text.trim() || `Uploaded file: ${stagedFile?.name}`,
      timestamp: new Date(),
      file: stagedFile ? {
        name: stagedFile.name,
        size: sizeStr,
        type: stagedFile.type,
      } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    const fileToUpload = stagedFile;
    setStagedFile(null);
    triggerScroll();

    // AI thinking state simulation
    setTimeout(() => {
      let replyText = '';
      const query = text.toLowerCase();

      let reasoningPrefix = '';
      if (reasoningLevel === 'deep-thought') {
        const thinkingSteps = [
          `Parsing input query: "${text || 'File upload analysis'}"`,
          `Querying digital twin metrics context...`,
          fileToUpload ? `Accessing attachment meta: ${fileToUpload.name} (${sizeStr})` : null,
          `Configuring simulation variables on model: ${selectedModel}`,
          `Evaluating runway correlation (${projectedRunway} months remaining)`,
          `Synthesizing response payload...`
        ].filter(Boolean);
        reasoningPrefix = `:::thinking\n${thinkingSteps.map(step => `> ${step}`).join('\n')}\n:::\n\n`;
      }

      if (fileToUpload) {
        replyText = `### File Attached & Parsed Successfully\n\nI have received your file **${fileToUpload.name}** (${sizeStr}) and integrated its data points into the **FounderOS Twin Model**.\n\n${text.trim() ? `In response to your query *"${text.trim()}"*:\n\n` : ''}- **Target Entity**: Startup financials and pipeline\n- **Extracted Fields**: Operations log, channel weights\n\nWhat analysis or simulation would you like to run on this data?`;
      } else if (query.includes('runway') || query.includes('cash') || query.includes('burn') || query.includes('rev')) {
        replyText = `### Financial Projections Analysis\n\n- **Projected Cash Runway**: **${projectedRunway} Months**\n- **Monthly Revenue (MRR)**: **$${monthlyRev.toLocaleString()}** (Base: $${baseMRR.toLocaleString()} with **${mrrGrowthRate}%** growth)\n- **Operating Burn (Est)**: **$${operatingBurn.toLocaleString()}/mo**\n- **Total Cash Balance**: **$${cashBalance.toLocaleString()}**\n\n*Simulator suggestion:* Adjust the MRR Growth Rate slider on your **Financial Metrics** card to project runway extensions under higher growth profiles.`;
      } else if (query.includes('goals') || query.includes('okr') || query.includes('milestone')) {
        const pending = goals.filter(g => !g.done);
        const completed = goals.filter(g => g.done);
        replyText = `### OKRs & Milestone Status\n\n- **Completion rate**: **${goalProgress}%** (${completed.length} of ${goals.length} achieved)\n\n**Achieved Milestones:**\n${completed.map(g => ` - [x] ${g.label}`).join('\n') || ' - None yet'}\n\n**Pending Milestones:**\n${pending.map(g => ` - [ ] ${g.label}`).join('\n') || ' - None! All OKRs complete.'}\n\n*Action tip:* You can log a new OKR directly by typing: \`add okr: [your new goal text]\``;
      } else if (query.includes('risk') || query.includes('blocker') || query.includes('mitigat')) {
        const activeRisks = risks.filter(r => r.status !== 'Mitigated');
        const mitigatedRisks = risks.filter(r => r.status === 'Mitigated');
        replyText = `### Security & Risk Dashboard\n\n- **Roadmap Confidence Score**: **${confidenceScore}%**\n\n**Active Blockers:**\n${activeRisks.map(r => ` - [ ] [${r.impact} Impact] ${r.label}`).join('\n') || ' - None! Your risk roadmap is clear.'}\n\n**Mitigated Blockers:**\n${mitigatedRisks.map(r => ` - [x] [Mitigated] ${r.label}`).join('\n') || ' - None'}\n\n*Action tip:* Log a blocker by typing: \`add blocker: [issue text]\``;
      } else if (query.includes('gtm') || query.includes('channel') || query.includes('market')) {
        replyText = `### GTM & Channel Allocation\n\n- **Active Wedge Channels**: **${gtmChannels.length} channels configured**\n\n**Budget Weightings:**\n${gtmChannels.map(c => ` - **${c.name}**: **${c.budget}%** (Focus: *${c.impact}*)`).join('\n')}\n\n*GTM balance strategy:* Adjust budgets dynamically on the **GTM & Channels** card. High direct weights leverage Series A runway targets, while dev relations boost product scaling.`;
      } else if (query.includes('add okr:') || query.includes('add goal:')) {
        const goalText = text.replace(/^(add okr:|add goal:)/i, '').trim();
        if (goalText) {
          addGoal(goalText);
          replyText = `✅ **Objective Added Successfully!**\n\nI have appended **"${goalText}"** to your OKR roster. Your goals card has been refreshed.`;
        } else {
          replyText = `Could you please specify the text for the new OKR? Example: \`add okr: Launch Beta version 1.0\``;
        }
      } else if (query.includes('add blocker:') || query.includes('add risk:')) {
        const riskText = text.replace(/^(add blocker:|add risk:)/i, '').trim();
        if (riskText) {
          addRisk(riskText, 'Medium');
          replyText = `⚠️ **Blocker Reported!**\n\nI have logged **"${riskText}"** as a Medium-impact blocker in your risks registry.`;
        } else {
          replyText = `Please describe the blocker. Example: \`add blocker: API provider rate limits\``;
        }
      } else if (query.includes('hire') || query.includes('add role')) {
        const roleText = text.replace(/^(hire|add role)/i, '').trim();
        if (roleText) {
          hireHeadcount('eng', roleText);
          replyText = `👤 **Headcount Expansion Logged!**\n\nI have added **"${roleText}"** to the Engineering division roster. Your team payroll now tracks **${totalFTE + 1} FTEs** across all divisions.`;
        } else {
          replyText = `Please specify the job title. Example: \`hire Senior QA Engineer\``;
        }
      } else if (query.includes('fte') || query.includes('department') || query.includes('team') || query.includes('payroll')) {
        replyText = `### Division Payroll & Roster\n\n- **Total FTEs**: **${totalFTE} Operators**\n\n**Divisional Headcounts:**\n${departments.map(d => ` - **${d.name}**: **${d.fte} FTEs** (${d.roles.length} roles)`).join('\n')}\n\n*Action tip:* Expand payroll in Engineering by typing: \`hire [role title]\``;
      } else {
        replyText = `### How can I help you build your startup twin?\n\nI can run simulator operations and update your workspace variables dynamically. Try typing one of these instructions:\n\n- **"How does our cash runway look?"** to fetch runway projections.\n- **"List our active OKRs"** to review milestone completion.\n- **"What blockers are active?"** to check risks.\n- **"add okr: Launch Android App"** to append a goal.\n- **"add blocker: Database migration delay"** to report a risk.\n- **"hire Senior Backend Engineer"** to log payroll expansion.`;
      }

      if (selectedModel === 'gemini-3.5-pro') {
        replyText += `\n\n*Calculations optimized by Gemini 3.5 Pro.*`;
      } else if (selectedModel === 'founder-copilot') {
        replyText += `\n\n*Optimized by FounderOS Twin Agent Engine.*`;
      }

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: reasoningPrefix + replyText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);
      triggerScroll();
    }, 800);
  };

  const suggestedChips = [
    { text: 'Analyze Runway & Burn', prompt: 'How does our cash runway look?' },
    { text: 'List Active OKRs', prompt: 'List our active OKRs' },
    { text: 'Check active blockers', prompt: 'What blockers are active?' },
    { text: 'Expand engineering headcount', prompt: 'hire Senior Backend Engineer' },
  ];

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-full min-h-0 bg-[#151518]/75 rounded-2xl border border-white/5 overflow-hidden relative"
    >
      {/* Floating Pill selector for Saved Nodes when conversation is active */}
      {messages.length > 1 && (
        <div className="absolute top-3 right-4 z-20">
          <button
            type="button"
            onClick={() => setShowNodesDrawer(!showNodesDrawer)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#121215]/90 hover:bg-[#1a1a1f] border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-full text-[10px] font-semibold transition-all shadow-lg backdrop-blur-md cursor-pointer select-none"
          >
            <Database className="w-3 h-3 text-indigo-400" />
            <span>Saved Nodes</span>
            {showNodesDrawer
              ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              : <ChevronDown className="w-3 h-3 opacity-50" />
            }
          </button>
        </div>
      )}

      {/* Saved Nodes Drawer — slides down from top when showNodesDrawer is true */}
      <div
        className="absolute left-0 right-0 top-0 z-30 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden"
        style={{
          maxHeight: showNodesDrawer && messages.length > 1 ? '260px' : '0px',
          opacity: showNodesDrawer && messages.length > 1 ? 1 : 0,
          pointerEvents: showNodesDrawer && messages.length > 1 ? 'auto' : 'none',
        }}
      >
        <div className="bg-[#111114]/96 backdrop-blur-xl border-b border-white/5 px-4 pt-12 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-bold text-white/80 tracking-wide uppercase">Workspace Nodes</span>
              <span className="text-[9px] text-white/30 font-mono">{WORKSPACE_CANVAS_CARDS.length} synced</span>
            </div>
            <button
              type="button"
              onClick={() => setShowNodesDrawer(false)}
              className="p-1 rounded-md text-white/35 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[160px] scrollbar-thin pr-0.5">
            {WORKSPACE_CANVAS_CARDS.map(node => {
              const metric = getNodeMetric(node.id);
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => {
                    handleNodeQuickQuery(node);
                    setShowNodesDrawer(false);
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg border border-white/5 bg-white/[0.02] hover:border-indigo-500/25 hover:bg-indigo-500/[0.04] transition-all cursor-pointer text-left group"
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 border"
                    style={{ background: `${node.accent}12`, borderColor: `${node.accent}24` }}
                  >
                    <CardIcon kind={node.icon} color={node.accent} id={node.id} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-white/80 group-hover:text-indigo-300 transition-colors truncate leading-tight">
                      {node.id === 'company_hub' ? 'FounderOS' : node.title}
                    </p>
                    <p className="text-[9px] text-white/35 truncate leading-tight">{metric.value}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0 ws-chat-messages-container">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
          >
            {/* Avatar */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${msg.sender === 'user'
                ? 'bg-indigo-500/20 border-indigo-400/30 text-indigo-300'
                : 'bg-purple-500/20 border-purple-400/30 text-purple-300'
                }`}
            >
              {msg.sender === 'user' ? (
                <User className="w-3.5 h-3.5" />
              ) : (
                <BrainIcon size={14} />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`p-3.5 rounded-2xl text-[13px] leading-relaxed border backdrop-blur-md ${msg.sender === 'user'
                ? 'bg-indigo-500/10 border-indigo-500/20 text-white rounded-tr-none'
                : 'bg-white/[0.03] border-white/5 text-white/90 rounded-tl-none'
                }`}
            >
              {msg.file ? (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/10 max-w-[280px]">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-indigo-500/20 text-indigo-300 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{msg.file.name}</p>
                    <p className="text-[10px] text-white/40">{msg.file.size}</p>
                  </div>
                </div>
              ) : (
                (() => {
                  const { thinkingContent, mainContent } = parseMessageText(msg.text);
                  return (
                    <>
                      {thinkingContent && <ThinkingBlock content={thinkingContent} />}
                      {mainContent.split('\n').map((line, idx) => {
                        if (line.startsWith('### ')) {
                          return <h3 key={idx} className="text-sm font-bold text-white mb-2 mt-1 first:mt-0">{line.replace('### ', '')}</h3>;
                        }
                        if (line.startsWith('- ') || line.startsWith(' - ')) {
                          let cleaned = line.replace(/^(\s*-\s*)/, '');
                          let isChecked = false;
                          let isUnchecked = false;
                          if (cleaned.startsWith('[x] ')) {
                            cleaned = cleaned.replace('[x] ', '');
                            isChecked = true;
                          } else if (cleaned.startsWith('[ ] ')) {
                            cleaned = cleaned.replace('[ ] ', '');
                            isUnchecked = true;
                          }

                          const parts = cleaned.split('**');
                          const renderedContent = parts.map((part, pIdx) =>
                            pIdx % 2 === 1 ? <strong key={pIdx} className="text-white font-semibold">{part}</strong> : part
                          );

                          return (
                            <div key={idx} className="flex items-start gap-2 ml-1 text-white/80 my-0.5">
                              {isChecked && <Check className="w-3 h-3 text-emerald-400 mt-1 shrink-0" />}
                              {isUnchecked && <span className="w-3 h-3 border border-white/20 rounded-sm mt-1 shrink-0" />}
                              {!isChecked && !isUnchecked && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />}
                              <span>{renderedContent}</span>
                            </div>
                          );
                        }

                        const parts = line.split('**');
                        const renderedLine = parts.map((part, pIdx) =>
                          pIdx % 2 === 1 ? <strong key={pIdx} className="text-white font-semibold">{part}</strong> : part
                        );

                        return <p key={idx} className="mb-1 last:mb-0">{renderedLine}</p>;
                      })}
                    </>
                  );
                })()
              )}
            </div>
          </div>
        ))}

        {messages.length === 1 && activeView === 'upload' && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-indigo-500/30 hover:bg-indigo-500/[0.02] rounded-2xl p-8 h-[65%] mt-6 transition-all cursor-pointer group text-center select-none"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.03] group-hover:bg-indigo-500/10 group-hover:text-indigo-400 text-white/40 border border-white/5 transition-all mb-3">
              <UploadCloud className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-xs font-semibold text-white/80 group-hover:text-white transition-colors">
              Drag & drop files here, or click to upload
            </p>
            <p className="text-[10px] text-white/45 mt-1">
              Supports CSV, PDF, JSON, XLS, XLSX, TXT up to 10MB
            </p>
          </div>
        )}

        {messages.length === 1 && activeView === 'nodes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 h-[65%] mt-6 overflow-y-auto min-h-0 scrollbar-thin">
            {WORKSPACE_CANVAS_CARDS.map(node => {
              const metric = getNodeMetric(node.id);
              return (
                <div
                  key={node.id}
                  onClick={() => handleNodeQuickQuery(node)}
                  className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:border-indigo-500/20 hover:bg-indigo-500/[0.02] transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center border"
                        style={{
                          background: `${node.accent}12`,
                          borderColor: `${node.accent}24`,
                        }}
                      >
                        <CardIcon kind={node.icon} color={node.accent} id={node.id} />
                      </div>
                      <span className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {node.id === 'company_hub' ? 'FounderOS' : node.title}
                      </span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.04] text-white/40 font-mono">NODE_OK</span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-sm font-black text-white/90">{metric.value}</span>
                    <span className="text-[10px] text-white/40">{metric.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {messages.length === 1 && (
          <div className="flex justify-center items-center gap-2 mt-4 select-none">
            <button
              type="button"
              onClick={() => setActiveView('upload')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${activeView === 'upload'
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 shadow-lg shadow-indigo-500/5'
                  : 'bg-white/[0.02] border-white/5 text-white/45 hover:text-white/80 hover:bg-white/[0.04]'
                }`}
            >
              File Upload
            </button>
            <button
              type="button"
              onClick={() => setActiveView('nodes')}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${activeView === 'nodes'
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 shadow-lg shadow-indigo-500/5'
                  : 'bg-white/[0.02] border-white/5 text-white/45 hover:text-white/80 hover:bg-white/[0.04]'
                }`}
            >
              Saved Nodes
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompt chips (visible only if dialogue is starting or quiet) */}
      {messages.length === 1 && (
        <div className="px-6 py-2 flex flex-wrap gap-2 justify-center">
          {suggestedChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(chip.prompt)}
              className="text-[11px] font-medium text-indigo-200/70 hover:text-white px-3 py-1.5 rounded-lg bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/10 hover:border-indigo-500/20 transition-all cursor-pointer"
            >
              {chip.text}
            </button>
          ))}
        </div>
      )}

      {/* Input container */}
      <div className="p-4 border-t border-white/5 bg-[#0d0d0f]/90 flex flex-col gap-3">
        {/* Staged File Preview */}
        {stagedFile && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.04] border border-white/10 max-w-[280px] animate-slide-up-fade">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/20 text-indigo-300 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{stagedFile.name}</p>
                <p className="text-[10px] text-white/40">
                  {stagedFile.size > 1024 * 1024
                    ? `${(stagedFile.size / (1024 * 1024)).toFixed(1)} MB`
                    : `${(stagedFile.size / 1024).toFixed(0)} KB`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStagedFile(null)}
              className="p-1 text-white/40 hover:text-white rounded-md hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Box Card */}
        <div className="flex gap-2 items-center w-full">
          {/* Main input wrapper */}
          <div className="relative flex-1 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] focus-within:border-indigo-500/40 focus-within:bg-white/[0.03] transition-all px-3 py-1.5 min-w-0">
            {/* <Sparkles className="w-4 h-4 text-indigo-400/60 pointer-events-none shrink-0" /> */}

            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSend(inputValue);
              }}
              placeholder="Type a message to analyze metrics or run simulations..."
              className="flex-1 bg-transparent text-xs text-white placeholder-white/35 focus:outline-none min-w-0"
            />

            {/* Toolbar controls inside the input wrapper on the right */}
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {/* Model Custom Select */}
              <CustomDropdown
                value={selectedModel}
                onChange={setSelectedModel}
                options={modelOptions}
              />

              {/* Reasoning Level Custom Select */}
              <CustomDropdown
                value={reasoningLevel}
                onChange={setReasoningLevel}
                options={reasoningOptions}
              />
            </div>
          </div>

          {/* Attach Button (outside) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 bg-white/[0.03] border border-white/10 hover:bg-white/5 hover:border-white/20 text-white/60 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Attach file"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSend(inputValue)}
            className="p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-xl transition-colors shrink-0 cursor-pointer flex items-center justify-center"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isDragging && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#070914]/85 border-2 border-indigo-500/40 rounded-2xl backdrop-blur-md animate-slide-up-fade pointer-events-none">
          <div className="scale-105 transition-transform duration-300 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4 animate-bounce">
              <UploadCloud className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-white">Drop your files here</p>
            <p className="text-xs text-white/50 mt-1">Ready to attach to Copilot chat</p>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".csv,.pdf,.json,.xls,.xlsx,.txt"
      />
    </div>
  );
}

/* ── connection geometry (0–100 stage space) ───────────────────── */

type Pt = { x: number; y: number };

function edgeAnchors(from: WorkspaceCanvasCard, to: WorkspaceCanvasCard): [Pt, Pt] {
  const fc = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
  const tc = { x: to.x + to.w / 2, y: to.y + to.h / 2 };
  const dx = tc.x - fc.x;
  const dy = tc.y - fc.y;

  const anchor = (card: WorkspaceCanvasCard, towardX: number, towardY: number): Pt => {
    if (Math.abs(towardX) >= Math.abs(towardY)) {
      // horizontal exit
      return {
        x: towardX >= 0 ? card.x + card.w : card.x,
        y: card.y + card.h / 2,
      };
    }
    return {
      x: card.x + card.w / 2,
      y: towardY >= 0 ? card.y + card.h : card.y,
    };
  };

  return [anchor(from, dx, dy), anchor(to, -dx, -dy)];
}

function curvePath(s: Pt, e: Pt): string {
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const cx = s.x + dx * 0.5;
    return `M ${s.x} ${s.y} C ${cx} ${s.y}, ${cx} ${e.y}, ${e.x} ${e.y}`;
  }
  const cy = s.y + dy * 0.5;
  return `M ${s.x} ${s.y} C ${s.x} ${cy}, ${e.x} ${cy}, ${e.x} ${e.y}`;
}

export function WorkspaceActiveCanvas() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeDetailCard, setActiveDetailCard] = useState<string | null>(null);
  const [renderedCard, setRenderedCard] = useState<string | null>(null);

  const isDetailTransition = activeDetailCard !== null || renderedCard !== null;
  const transClass = isDetailTransition
    ? 'duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]'
    : 'duration-[2200ms] ease-[cubic-bezier(0.645,0.045,0.355,1)]';

  useEffect(() => {
    if (activeDetailCard) {
      setRenderedCard(activeDetailCard);
    } else {
      const timer = setTimeout(() => {
        setRenderedCard(null);
      }, 500); // matches duration-500 card details transition
      return () => clearTimeout(timer);
    }
  }, [activeDetailCard]);

  const {
    goals,
    toggleGoal,
    addGoal,
    goalProgress,
    cashBalance,
    baseMRR,
    mrrGrowthRate,
    setMrrGrowthRate,
    operatingBurn,
    projectedRunway,
    monthlyRev,
    departments,
    hireHeadcount,
    totalFTE,
    risks,
    mitigateRisk,
    addRisk,
    confidenceScore,
    gtmChannels,
    updateGTMChannelBudget,
  } = useFounderWorkspace();

  // Selected department state for the FTE pane
  const [selectedDeptId, setSelectedDeptId] = useState<string>('eng');
  const selectedDept = departments.find(d => d.id === selectedDeptId) || departments[0];

  // Forms states
  const [newGoalText, setNewGoalText] = useState('');
  const [newRiskText, setNewRiskText] = useState('');
  const [newRiskImpact, setNewRiskImpact] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newRoleText, setNewRoleText] = useState('');

  useEffect(() => {
    const handleCollapse = () => {
      setIsFullscreen(false);
      setActiveDetailCard(null);
    };
    window.addEventListener('collapse-workspace-canvas', handleCollapse);
    return () => {
      window.removeEventListener('collapse-workspace-canvas', handleCollapse);
    };
  }, []);

  const cardMap = useMemo(
    () => Object.fromEntries(WORKSPACE_CANVAS_CARDS.map(c => [c.id, c])),
    [],
  );

  const connections = useMemo(
    () =>
      WORKSPACE_CANVAS_CONNECTIONS.map(([from, to]) => {
        const a = cardMap[from];
        const b = cardMap[to];
        if (!a || !b) return null;
        const [s, e] = edgeAnchors(a, b);
        return { id: `${from}-${to}`, path: curvePath(s, e), s, e };
      }).filter(Boolean) as { id: string; path: string; s: Pt; e: Pt }[],
    [cardMap],
  );

  const handleCardClick = (e: React.MouseEvent, cardId: string) => {
    if ((e.target as HTMLElement).closest('.ws-card-close')) {
      e.stopPropagation();
      return;
    }
    setActiveDetailCard(cardId);
  };

  const handleAddGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoalText.trim()) {
      addGoal(newGoalText.trim());
      setNewGoalText('');
    }
  };

  const handleAddRiskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRiskText.trim()) {
      addRisk(newRiskText.trim(), newRiskImpact);
      setNewRiskText('');
    }
  };

  const handleAddRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoleText.trim()) {
      hireHeadcount(selectedDeptId, newRoleText.trim());
      setNewRoleText('');
    }
  };

  return (
    <div className={`ws-canvas-wrap flex-1 min-h-0 flex flex-col justify-end px-1 pb-2 ${isFullscreen ? 'ws-canvas-wrap--fullscreen' : ''}`}>
      <div className="ws-canvas-trapezium flex-1 min-h-0 min-w-0">
        <WorkspaceCanvasFrame
          isFullscreen={isFullscreen}
        >
          <div className="ws-canvas-toolbar ws-canvas-inset shrink-0 flex items-center justify-between gap-3 pb-2 pt-0">
            <div className="flex items-center gap-2">
              {activeDetailCard && (
                <button
                  type="button"
                  onClick={() => setActiveDetailCard(null)}
                  className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white px-2 py-1 rounded-md bg-white/5 border border-white/10 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}
              <span className="text-xs font-semibold text-white/90 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5">
                {activeDetailCard
                  ? `FounderOS / ${cardMap[activeDetailCard]?.title || 'Command'}`
                  : 'Founder Workspace Overview'}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className={`ws-icon-btn ${isFullscreen ? 'ws-icon-btn--active' : ''}`}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                onClick={() => setIsFullscreen(prev => !prev)}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                className="ws-btn-share flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
            </div>
          </div>

          <div className="ws-canvas-toolbar-divider ws-canvas-inset" />

          <div className="relative flex-1 min-h-0 overflow-hidden ws-canvas-stage-pad pb-3 pt-1">
            {/* ── High-Level Overview Splayed Canvas Cards Layer ── */}
            <div
              className={`ws-canvas-stage-area absolute transition-all ${transClass} ${activeDetailCard ? 'ws-canvas-stage-area--active' : ''
                }`}
              style={
                activeDetailCard
                  ? {
                    left: '0%',
                    right: '0%',
                    top: '0px',
                    bottom: '0px',
                    height: '100%',
                  }
                  : isFullscreen
                    ? {
                      left: '2%',
                      right: '2%',
                      top: '8px',
                      bottom: '8px',
                      height: 'calc(100% - 16px)',
                    }
                    : {
                      left: '8%',
                      right: '8%',
                      top: '16px',
                      bottom: 'calc(100% - 436px)',
                      height: '420px',
                    }
              }
            >
              {/* glowing curved connectors */}
              <svg
                className={`absolute inset-0 w-full h-full pointer-events-none overflow-visible transition-opacity duration-[2200ms] ease-[cubic-bezier(0.645,0.045,0.355,1)] ${activeDetailCard || isFullscreen ? 'opacity-0' : 'opacity-100'
                  }`}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {connections.map(c => (
                  <path
                    key={`${c.id}-glow`}
                    d={c.path}
                    fill="none"
                    stroke="rgba(125, 211, 252, 0.12)"
                    strokeWidth={4}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                  />
                ))}
                {connections.map(c => (
                  <path
                    key={c.id}
                    d={c.path}
                    fill="none"
                    stroke="rgba(147, 197, 253, 0.85)"
                    strokeWidth={1.25}
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                  />
                ))}
              </svg>

              {/* connector node dots (kept circular via separate layer) */}
              <div className={`transition-opacity duration-300 ${activeDetailCard || isFullscreen ? 'opacity-0' : 'opacity-100'}`}>
                {connections.map(c => (
                  <div key={`${c.id}-nodes`} className="pointer-events-none">
                    <span
                      className="ws-conn-node"
                      style={{ left: `${c.s.x}%`, top: `${c.s.y}%` }}
                    />
                    <span
                      className="ws-conn-node"
                      style={{ left: `${c.e.x}%`, top: `${c.e.y}%` }}
                    />
                  </div>
                ))}
              </div>

              {/* cards — 3D glass slab */}
              {WORKSPACE_CANVAS_CARDS.map((card, index) => {
                const isActive = activeDetailCard === card.id;
                const isAnyActive = activeDetailCard !== null;
                const isHidden = isAnyActive && !isActive;

                return (
                  <article
                    key={card.id}
                    onClick={(e) => !isActive && handleCardClick(e, card.id)}
                    className={`ws-glass-block absolute transition-all ${transClass} ${card.variant === 'hero' ? 'ws-glass-block--hero' : ''
                      } ${isActive ? 'ws-glass-block--active' : ''} ${isActive
                        ? 'z-50 cursor-default'
                        : 'cursor-pointer hover:border-white/30 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]'
                      } ${isHidden
                        ? 'opacity-0 scale-90 pointer-events-none translate-y-4'
                        : 'opacity-100 scale-100 translate-y-0'
                      }`}
                    style={{
                      left: isActive ? '0%' : isFullscreen ? `${index * (15.5 + 1.4)}%` : `${card.x}%`,
                      top: isActive ? '0%' : isFullscreen ? '0px' : `${card.y}%`,
                      width: isActive ? '100%' : isFullscreen ? '15.5%' : `${card.w}%`,
                      height: isActive ? '100%' : isFullscreen ? '110px' : `${card.h}%`,
                      ['--card-accent' as string]: card.accent,
                    }}
                  >
                    <div
                      className={`ws-glass-block__face transition-all ${transClass}`}
                      style={{
                        padding: isActive ? '24px 32px' : '11px 12px',
                      }}
                    >
                      {/* Overview Content */}
                      <div className={`w-full h-full relative transition-all ${transClass} ${isActive ? 'opacity-0 pointer-events-none absolute inset-0' : 'opacity-100'
                        }`}>
                        {/* Compact Card Body (fullscreen view) */}
                        <div className={`absolute inset-0 transition-all ${transClass} ${isFullscreen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'
                          }`}>
                          <CompactCardBody card={card} />
                        </div>
                        {/* Normal Card Body (standard grid view) */}
                        <div className={`absolute inset-0 transition-all ${transClass} ${isFullscreen ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto'
                          }`}>
                          <CardBody card={card} />
                        </div>
                      </div>

                      {/* Detailed Content Container */}
                      {renderedCard === card.id && (
                        <div
                          className={`absolute inset-0 overflow-y-auto transition-all ${transClass} ${isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                            }`}
                          style={{
                            padding: '24px 32px',
                          }}
                        >
                          {renderedCard === 'company_hub' && (
                            <div className="space-y-4 max-w-5xl mx-auto">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 animate-slide-up-fade">
                                <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col justify-between">
                                  <span className="text-[11px] text-white/40">FTE Headcount</span>
                                  <span className="text-xl font-bold text-indigo-400 mt-2">{totalFTE} Operators</span>
                                </div>
                                <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col justify-between">
                                  <span className="text-[11px] text-white/40">Runway Duration</span>
                                  <span className="text-xl font-bold text-emerald-400 mt-2">{projectedRunway} Months</span>
                                </div>
                                <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col justify-between">
                                  <span className="text-[11px] text-white/40">OKR Accomplishments</span>
                                  <span className="text-xl font-bold text-rose-400 mt-2">{goalProgress}% Complete</span>
                                </div>
                                <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col justify-between">
                                  <span className="text-[11px] text-white/40">Confidence Score</span>
                                  <span className="text-xl font-bold text-amber-400 mt-2">{confidenceScore}%</span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div className="p-4 bg-white/5 border border-white/10 rounded-xl animate-slide-up-fade delay-100">
                                  <h3 className="text-xs font-semibold tracking-wider text-white/50 uppercase mb-3 flex items-center gap-1.5">
                                    <Target className="w-3.5 h-3.5 text-rose-400" />
                                    OKR Milestones
                                  </h3>
                                  <ul className="space-y-2">
                                    {goals.map(g => (
                                      <li key={g.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                                        <span className={g.done ? 'line-through text-white/40' : 'text-white/80'}>{g.label}</span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${g.done ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                          {g.done ? 'Accomplished' : 'Pending'}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="p-4 bg-white/5 border border-white/10 rounded-xl animate-slide-up-fade delay-150">
                                  <h3 className="text-xs font-semibold tracking-wider text-white/50 uppercase mb-3 flex items-center gap-1.5">
                                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                                    Risk Vectors
                                  </h3>
                                  <ul className="space-y-2">
                                    {risks.map(r => (
                                      <li key={r.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5">
                                        <span className={r.status === 'Mitigated' ? 'line-through text-white/40' : 'text-white/80'}>{r.label.split(':')[1] || r.label}</span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${r.status === 'Mitigated' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                          {r.status}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}

                          {renderedCard === 'metrics' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                              <div className="space-y-4 animate-slide-up-fade">
                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-between">
                                  <div>
                                    <span className="text-[11px] text-white/40 block">Projected Cash Runway</span>
                                    <div className="flex items-baseline gap-2 mt-1">
                                      <span className="text-4xl font-extrabold text-emerald-400">{projectedRunway}</span>
                                      <span className="text-sm text-white/60">months remaining</span>
                                    </div>
                                  </div>
                                  <div className="mt-4 text-xs text-white/50 border-t border-white/5 pt-3">
                                    Assumes cash reserves of <span className="text-white font-semibold">${(cashBalance).toLocaleString()}</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                                    <span className="text-[10px] text-white/40 block">Base MRR</span>
                                    <span className="text-lg font-bold text-white">${baseMRR.toLocaleString()}</span>
                                  </div>
                                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                                    <span className="text-[10px] text-white/40 block">Operating Burn (Est)</span>
                                    <span className="text-lg font-bold text-red-400">${operatingBurn.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-between animate-slide-up-fade delay-100">
                                <div>
                                  <h3 className="text-xs font-bold tracking-wider text-white/50 uppercase mb-4 flex items-center gap-1.5">
                                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                                    Financial Runway Simulator
                                  </h3>
                                  <p className="text-xs text-white/60 mb-6 leading-relaxed">
                                    Adjust your MRR Growth Rate to simulate how business performance stretches your startup cash runway.
                                  </p>

                                  <div className="space-y-2">
                                    <div className="flex justify-between items-baseline text-xs">
                                      <span className="text-white/65">MRR Growth Rate</span>
                                      <span className="text-indigo-400 font-bold">{mrrGrowthRate}% / Month</span>
                                    </div>
                                    <input
                                      type="range"
                                      min="0"
                                      max="50"
                                      value={mrrGrowthRate}
                                      onChange={e => setMrrGrowthRate(Number(e.target.value))}
                                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                  </div>
                                </div>

                                <div className="mt-6 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
                                  <strong className="text-indigo-300">Runway Forecast:</strong> Under an assumed <span className="font-semibold text-white">{mrrGrowthRate}%</span> growth rate, monthly revenues are projected at <span className="font-semibold text-white">${monthlyRev.toLocaleString()}</span>, resulting in a sustainable operating period.
                                </div>
                              </div>
                            </div>
                          )}

                          {renderedCard === 'departments' && (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-5xl mx-auto">
                              {/* Dept Selectors */}
                              <div className="md:col-span-5 space-y-2 animate-slide-up-fade">
                                <h3 className="text-xs font-bold tracking-wider text-white/50 uppercase mb-3">Company Divisions</h3>
                                {departments.map(d => (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => setSelectedDeptId(d.id)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl text-left border transition-all ${selectedDeptId === d.id
                                      ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-[0_0_12px_rgba(245,158,11,0.1)]'
                                      : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                                      }`}
                                  >
                                    <span className="text-xs font-semibold">{d.name}</span>
                                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-white font-bold">{d.fte} FTE</span>
                                  </button>
                                ))}
                              </div>

                              {/* Roles & Hiring */}
                              <div className="md:col-span-7 p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-between min-h-[300px] animate-slide-up-fade delay-100">
                                <div>
                                  <div className="flex items-start justify-between border-b border-white/10 pb-2 mb-3">
                                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">{selectedDept.name} Roster</h4>
                                    <span className="text-[10px] text-white/40">Total payroll includes {selectedDept.fte} positions</span>
                                  </div>
                                  <ul className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                    {selectedDept.roles.map((role, idx) => (
                                      <li key={idx} className="text-xs text-white/70 flex items-center gap-2">
                                        <span className="w-1 h-1 rounded-full bg-amber-400" />
                                        {role}
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <form onSubmit={handleAddRoleSubmit} className="mt-4 border-t border-white/5 pt-3">
                                  <label className="block text-[10px] text-white/45 uppercase tracking-wider mb-1.5">Plan Headcount Expansion</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={newRoleText}
                                      onChange={e => setNewRoleText(e.target.value)}
                                      placeholder="Role Title (e.g. Senior Frontend Dev)"
                                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                                    />
                                    <button
                                      type="submit"
                                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-xs font-bold text-amber-300 transition-colors flex items-center gap-1"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Hire
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          )}

                          {renderedCard === 'goals' && (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-5xl mx-auto">
                              {/* Goal Progress Dial */}
                              <div className="md:col-span-5 p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center animate-slide-up-fade">
                                <span className="text-[11px] text-white/40 block mb-4 uppercase tracking-widest font-semibold">OKR Completion Progress</span>
                                <div className="w-28 h-28 relative">
                                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
                                    <circle
                                      cx="50"
                                      cy="50"
                                      r="40"
                                      fill="none"
                                      stroke="#f43f5e"
                                      strokeWidth={8}
                                      strokeLinecap="round"
                                      strokeDasharray={2 * Math.PI * 40}
                                      strokeDashoffset={2 * Math.PI * 40 * (1 - goalProgress / 100)}
                                      style={{ filter: 'drop-shadow(0 0 8px rgba(244,63,94,0.4))' }}
                                    />
                                  </svg>
                                  <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-white">
                                    {goalProgress}%
                                  </span>
                                </div>
                                <span className="text-[10px] text-rose-300 font-semibold mt-4">
                                  {goals.filter(g => g.done).length} of {goals.length} Goals Logged
                                </span>
                              </div>

                              {/* OKR Tasks Checklist */}
                              <div className="md:col-span-7 p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-between min-h-[300px] animate-slide-up-fade delay-100">
                                <div>
                                  <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Executive Objectives</h3>
                                  <ul className="space-y-2 overflow-y-auto max-h-[160px] pr-1">
                                    {goals.map(g => (
                                      <li
                                        key={g.id}
                                        onClick={() => toggleGoal(g.id)}
                                        className="flex items-center gap-2.5 p-2 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 cursor-pointer transition-all"
                                      >
                                        <button
                                          type="button"
                                          className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${g.done ? 'bg-rose-500 border-rose-400 text-white' : 'border-white/20 bg-white/5'
                                            }`}
                                        >
                                          {g.done && <Check className="w-3 h-3 stroke-[3]" />}
                                        </button>
                                        <span className={`text-xs ${g.done ? 'line-through text-white/35' : 'text-white/80'}`}>{g.label}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <form onSubmit={handleAddGoalSubmit} className="mt-4 border-t border-white/5 pt-3">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={newGoalText}
                                      onChange={e => setNewGoalText(e.target.value)}
                                      placeholder="Add new goal/OKR..."
                                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-rose-500/50"
                                    />
                                    <button
                                      type="submit"
                                      className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 rounded-lg text-xs font-bold text-rose-300 transition-colors"
                                    >
                                      Add OKR
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          )}

                          {renderedCard === 'risks' && (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-5xl mx-auto">
                              {/* Risk Index Dial */}
                              <div className="md:col-span-4 p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center animate-slide-up-fade">
                                <span className="text-[10px] text-white/40 block mb-4 uppercase tracking-widest font-semibold">Security & Risk Index</span>
                                <GaugeRing color="#ef4444" value={confidenceScore} />
                                <span className="text-[10px] text-red-300 font-semibold mt-4 text-center leading-relaxed">
                                  Confidence Health: {confidenceScore}%
                                </span>
                              </div>

                              {/* Blockers Board */}
                              <div className="md:col-span-8 p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-between min-h-[300px] animate-slide-up-fade delay-100">
                                <div>
                                  <h3 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Mitigation Board</h3>
                                  <ul className="space-y-2 overflow-y-auto max-h-[160px] pr-1">
                                    {risks.map(r => (
                                      <li key={r.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5">
                                        <div>
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded mr-2 font-bold ${r.impact === 'High' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                                            }`}>
                                            {r.impact}
                                          </span>
                                          <span className={`text-xs ${r.status === 'Mitigated' ? 'line-through text-white/35' : 'text-white/80'}`}>
                                            {r.label}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => mitigateRisk(r.id)}
                                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${r.status === 'Mitigated'
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                            : 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'
                                            }`}
                                        >
                                          {r.status === 'Mitigated' ? 'Reopen Blocker' : 'Mitigate Blocker'}
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <form onSubmit={handleAddRiskSubmit} className="mt-4 border-t border-white/5 pt-3">
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="text"
                                      value={newRiskText}
                                      onChange={e => setNewRiskText(e.target.value)}
                                      placeholder="Log new blocker..."
                                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-red-500/50"
                                    />
                                    <select
                                      value={newRiskImpact}
                                      onChange={e => setNewRiskImpact(e.target.value as any)}
                                      className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/80 focus:outline-none"
                                    >
                                      <option value="High" className="bg-[#0c1020]">High</option>
                                      <option value="Medium" className="bg-[#0c1020]">Medium</option>
                                      <option value="Low" className="bg-[#0c1020]">Low</option>
                                    </select>
                                    <button
                                      type="submit"
                                      className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-xs font-bold text-red-300 transition-colors"
                                    >
                                      Report
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          )}

                          {renderedCard === 'gtm' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                              <div className="space-y-4 animate-slide-up-fade">
                                <h3 className="text-xs font-bold tracking-wider text-white/50 uppercase">Capital Allocation By Channel</h3>
                                <p className="text-xs text-white/50 leading-relaxed">
                                  Adjust channel allocations. Raising budget on one channel automatically balances resources across remaining channels.
                                </p>

                                <div className="space-y-4 pt-2">
                                  {gtmChannels.map(c => (
                                    <div key={c.id} className="space-y-1">
                                      <div className="flex justify-between items-baseline text-xs">
                                        <span className="text-white/85 font-medium">{c.name}</span>
                                        <span className="text-purple-300 font-bold">{c.budget}%</span>
                                      </div>
                                      <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={c.budget}
                                        onChange={e => updateGTMChannelBudget(c.id, Number(e.target.value))}
                                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col justify-between animate-slide-up-fade delay-100">
                                <div>
                                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2.5">GTM Strategy Analytics</h4>
                                  <ul className="space-y-3">
                                    {gtmChannels.map(c => (
                                      <li key={c.id} className="flex justify-between items-start text-xs border-b border-white/5 pb-2">
                                        <div>
                                          <span className="font-semibold text-white/90">{c.name.split(' ')[0]}</span>
                                          <p className="text-[10px] text-white/40 mt-0.5">Focus: {c.impact}</p>
                                        </div>
                                        <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">
                                          {c.budget > 40 ? 'Primary Wedge' : c.budget > 15 ? 'Balanced' : 'Incidental'}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs mt-4">
                                  <strong className="text-purple-300">Omnichannel Impact:</strong> Dynamic budget weighting guarantees a balanced marketing push aligned with Series A runway targets.
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}

              {isFullscreen && !activeDetailCard && (
                <div className="absolute inset-x-0 bottom-0 top-[134px] flex flex-col min-h-0 animate-slide-up-fade">
                  <WorkspaceChatCopilot />
                </div>
              )}
            </div>
          </div>
        </WorkspaceCanvasFrame>
      </div>
    </div>
  );
}
