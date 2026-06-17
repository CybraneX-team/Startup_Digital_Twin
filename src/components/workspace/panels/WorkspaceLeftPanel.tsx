import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { useFounderWorkspace } from '../../../context/FounderWorkspaceContext';

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

function NavSection({
  title,
  items,
  showDivider,
}: {
  title: string;
  items: NavItem[];
  showDivider?: boolean;
}) {
  const {
    activeSidebarTab,
    setActiveSidebarTab,
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    deleteWorkspace,
    renameWorkspace,
  } = useFounderWorkspace();

  const [activeDropdownWsId, setActiveDropdownWsId] = useState<string | null>(null);
  const [editingWsId, setEditingWsId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);

  // Close dropdown on clicking outside
  useEffect(() => {
    if (!activeDropdownWsId) return;
    const handleOutsideClick = () => {
      setActiveDropdownWsId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [activeDropdownWsId]);

  return (
    <div className="ws-nav-section">
      {showDivider && <hr className="ws-nav-divider" />}
      <p className="ws-nav-section-title">{title}</p>
      <ul className="ws-nav-list">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = item.id === activeSidebarTab && item.id !== 'projects';

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  if (item.id === 'projects') {
                    setIsProjectsExpanded(!isProjectsExpanded);
                  } else {
                    setActiveSidebarTab(item.id);
                  }
                }}
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
                {item.id === 'projects' ? (
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      isProjectsExpanded ? 'rotate-90 text-white/50' : 'text-white/30'
                    }`}
                    strokeWidth={1.5}
                  />
                ) : (
                  isActive && (
                    <ChevronRight
                      className="ws-nav-chevron w-4 h-4 shrink-0"
                      strokeWidth={2}
                    />
                  )
                )}
              </button>

              {/* Sub-projects list expanded under Projects tab when expanded */}
              {item.id === 'projects' && isProjectsExpanded && (
                <ul className="pl-6 mt-1.5 mb-2 space-y-1.5 border-l border-white/10 ml-5">
                  {workspaces.map(ws => {
                    const isActiveWorkspace = ws.id === activeWorkspaceId;
                    const isEditing = editingWsId === ws.id;

                    return (
                      <li key={ws.id} className="relative group">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => {
                              if (editingName.trim()) {
                                renameWorkspace(ws.id, editingName.trim());
                              }
                              setEditingWsId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (editingName.trim()) {
                                  renameWorkspace(ws.id, editingName.trim());
                                }
                                setEditingWsId(null);
                              } else if (e.key === 'Escape') {
                                setEditingWsId(null);
                              }
                            }}
                            className="bg-white/10 text-white border border-white/20 rounded px-2 py-1 text-[11px] w-full focus:outline-none focus:border-indigo-500"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isActiveWorkspace) {
                                  setActiveWorkspaceId(ws.id);
                                }
                                const rect = e.currentTarget.getBoundingClientRect();
                                setCoords({ top: rect.top, left: rect.right + 8 });
                                setActiveDropdownWsId(activeDropdownWsId === ws.id ? null : ws.id);
                              }}
                              className={`flex items-center gap-2 w-full text-left py-1.5 px-2.5 rounded-md text-[11px] font-medium transition-colors ${
                                isActiveWorkspace
                                  ? 'text-white bg-white/10'
                                  : 'text-white/60 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isActiveWorkspace
                                    ? 'bg-indigo-400 shadow-[0_0_8px_#818cf8]'
                                    : 'bg-white/10 border border-white/20'
                                }`}
                              />
                              <span className="truncate flex-1">{ws.name}</span>
                              <span className="text-[9px] text-white/30 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                •••
                              </span>
                            </button>

                            {/* Dropdown Menu for Switch/Rename/Delete via Portal to avoid overflow clipping */}
                            {activeDropdownWsId === ws.id && createPortal(
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="fixed w-32 bg-[#121215]/95 border border-white/10 rounded-lg py-1 shadow-2xl z-[99999] backdrop-blur-md animate-in fade-in slide-in-from-left-2 duration-150"
                                style={{
                                  top: coords.top,
                                  left: coords.left,
                                }}
                              >
                                {!isActiveWorkspace && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveWorkspaceId(ws.id);
                                      setActiveDropdownWsId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 text-[10px] font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    Switch to
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingWsId(ws.id);
                                    setEditingName(ws.name);
                                    setActiveDropdownWsId(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 text-[10px] font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  Rename
                                </button>
                                {workspaces.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      deleteWorkspace(ws.id);
                                      setActiveDropdownWsId(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 text-[10px] font-semibold text-rose-400/90 hover:text-rose-400 hover:bg-white/5 transition-colors flex items-center gap-1.5"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    Delete
                                  </button>
                                )}
                              </div>,
                              document.body
                            )}
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
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
    <aside className={`ws-left-nav flex flex-col shrink-0 h-full ${className ?? ''}`}>
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
