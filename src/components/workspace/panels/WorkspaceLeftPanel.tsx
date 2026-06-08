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
} from 'lucide-react';

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
  active?: boolean;
  badge?: number;
};

const NAV_UNIVERSE: NavItem[] = [
  { id: 'sphere', label: 'Sphere', customIcon: 'sphere', active: true },
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

function NavSection({
  title,
  items,
  showDivider,
}: {
  title: string;
  items: NavItem[];
  showDivider?: boolean;
}) {
  return (
    <div className="ws-nav-section">
      {showDivider && <hr className="ws-nav-divider" />}
      <p className="ws-nav-section-title">{title}</p>
      <ul className="ws-nav-list">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = item.active;

          return (
            <li key={item.id}>
              <button
                type="button"
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
                  <ChevronRight
                    className="ws-nav-chevron w-4 h-4 shrink-0"
                    strokeWidth={2}
                  />
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
  return (
    <aside className={`ws-left-nav flex flex-col bg-black/10 shrink-0 backdrop-blur-sm h-full ${className ?? ''}`}>
      <nav className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <NavSection title="MY UNIVERSE" items={NAV_UNIVERSE} />
        <NavSection title="MY WORK" items={NAV_WORK} showDivider />
        <NavSection title="SHORTCUTS" items={NAV_SHORTCUTS} showDivider />
      </nav>

      <hr className="ws-nav-divider mx-1" />
      <button type="button" className="ws-nav-item ws-nav-new-shortcut w-full mx-0 mb-1">
        <Plus className="w-[18px] h-[18px] shrink-0 stroke-[1.75]" />
        <span className="flex-1 text-left">New Shortcut</span>
      </button>
    </aside>
  );
}
