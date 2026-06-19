import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ChartLine,
  ChevronRight,
  CircleDollarSign,
  Files,
  Folder,
  LayoutGrid,
  ListTodo,
  Megaphone,
  Plus,
  Rocket,
  Target,
  Users,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useFounderWorkspace } from '../../../context/FounderWorkspaceContext';
import { useProjectsStore, generateAlerts } from '../../../lib/useProjectsStore';

function SphereNavIcon({ className, active }: { className?: string; active?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke={active ? '#c4b5fd' : 'currentColor'}
      strokeWidth={1.5}
      strokeLinecap="round"
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        strokeDasharray={active ? '42 8' : undefined}
        strokeDashoffset={active ? '6' : undefined}
      />
      <circle cx="12" cy="12" r="2.5" fill={active ? '#ddd6fe' : 'currentColor'} stroke="none" />
      {active && <circle cx="12" cy="4.2" r="1.1" fill="#ffffff" stroke="none" opacity={0.95} />}
      <path d="M4 12h3M17 12h3" opacity={active ? 0.7 : 1} />
      <ellipse cx="12" cy="12" rx="8" ry="3" opacity={active ? 0.55 : 0.45} />
    </svg>
  );
}

type NavItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  customIcon?: 'sphere';
  badge?: number;
};

const NAV_UNIVERSE: NavItem[] = [
  { id: 'sphere', label: 'Sphere', customIcon: 'sphere' },
  { id: 'canvas', label: 'Canvas', icon: LayoutGrid },
  { id: 'signals', label: 'Signals', icon: Megaphone },
];

const NAV_WORK: NavItem[] = [
  { id: 'projects', label: 'Projects', icon: Folder },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'files', label: 'Files', icon: Files },
];

const NAV_SHORTCUTS: NavItem[] = [
  { id: 'roadmap', label: 'AI Product Roadmap', icon: Rocket },
  { id: 'fundraising', label: 'Fundraising Prep', icon: CircleDollarSign },
  { id: 'interviews', label: 'Customer Interviews', icon: Users },
  { id: 'competitors', label: 'Competitor Analysis', icon: ChartLine },
];

function NavSection({ title, items, showDivider }: { title: string; items: NavItem[]; showDivider?: boolean }) {
  const { activeSidebarTab, setActiveSidebarTab } = useFounderWorkspace();

  return (
    <div className="ws-nav-section">
      {showDivider && <hr className="ws-nav-divider" />}
      <p className="ws-nav-section-title">{title}</p>
      <ul className="ws-nav-list">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = item.id === activeSidebarTab;

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setActiveSidebarTab(item.id)}
                className={`ws-nav-item w-full ${isActive ? 'ws-nav-item--active' : ''}`}
              >
                {item.customIcon === 'sphere' ? (
                  <SphereNavIcon className="w-[18px] h-[18px] shrink-0" active={isActive} />
                ) : Icon ? (
                  <Icon className="w-[18px] h-[18px] shrink-0 stroke-[1.5]" />
                ) : null}
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge != null && (
                  <span className="ws-nav-badge tabular-nums">{item.badge}</span>
                )}
                {isActive && (
                  <ChevronRight className="ws-nav-chevron w-4 h-4 shrink-0" strokeWidth={2} />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Reusable workspace left nav — drop onto any page with `ws-left-nav` styling. */
export function WorkspaceLeftPanel({ className }: { className?: string }) {
  const { projects, tasks, decisions, risks, members } = useProjectsStore();
  const alerts = generateAlerts(projects, tasks, decisions, risks, members);
  const [expanded, setExpanded] = useState(false);
  const { setActiveSidebarTab } = useFounderWorkspace();

  const handleAlertClick = (a: any) => {
    setActiveSidebarTab('projects');
    if (a.projectId) {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-project', { detail: { projectId: a.projectId } }));
      }, 50);
    } else if (a.memberId) {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-my-work'));
      }, 50);
    }
  };

  return (
    <aside className={`ws-left-nav flex flex-col shrink-0 h-full ${className ?? ''}`}>
      <nav className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <NavSection title="MY UNIVERSE" items={NAV_UNIVERSE} />
        <NavSection title="MY WORK" items={NAV_WORK} showDivider />
        <NavSection title="SHORTCUTS" items={NAV_SHORTCUTS} showDivider />
      </nav>

      {/* AI Suggestions collapser */}
      {alerts.length > 0 && (
        <div className="mx-1.5 my-2 rounded-xl bg-white/[0.03] border border-white/8 overflow-hidden shrink-0">
          <button
            type="button"
            onClick={() => setExpanded(p => !p)}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-left text-[11px] font-bold text-violet-300 hover:text-violet-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            <span className="flex-1 truncate">AI Suggestions ({alerts.length})</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          
          {expanded && (
            <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-2 max-h-[140px] overflow-y-auto scrollbar-hide">
              {alerts.slice(0, 4).map((a, idx) => (
                <div
                  key={idx}
                  onClick={() => handleAlertClick(a)}
                  className="group cursor-pointer flex items-start gap-1.5 text-[10px] leading-relaxed text-white/70 hover:text-white transition-colors py-0.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white/85 truncate group-hover:underline">{a.title}</div>
                    <div className="text-[9px] text-white/45 truncate">{a.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <hr className="ws-nav-divider mx-1" />
      <button type="button" className="ws-nav-item ws-nav-new-shortcut w-full mx-0 mb-1">
        <Plus className="w-[18px] h-[18px] shrink-0 stroke-[1.75]" />
        <span className="flex-1 text-left">New Shortcut</span>
      </button>
    </aside>
  );
}
