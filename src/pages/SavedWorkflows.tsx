import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark, BookmarkX, Search, X, ChevronRight, ChevronDown, ChevronUp,
  ExternalLink, Trash2, StickyNote, Clock, Briefcase, TrendingUp, GraduationCap,
  Globe, Layers, ArrowLeft, Filter, Sparkles,
} from 'lucide-react';
import {
  useSavedWorkflows,
  ROLE_COLORS,
  ROLE_ORDER,
  type SavedWorkflowItem,
  type SavedWorkflowGroup,
  type SavedWorkflowCompanyGroup,
  COMPANY_TAG_LABELS,
  COMPANY_TAG_COLORS,
  COMPANY_TAG_ICONS,
} from '../lib/useSavedWorkflows';
import type { UserPlanetRole } from '../data/companyPlanetRoots';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const ROLE_ICONS: Record<UserPlanetRole, any> = {
  career: GraduationCap,
  founder: Briefcase,
  investor: TrendingUp,
};

const ROLE_BORDER: Record<UserPlanetRole, string> = {
  career: 'rgba(96,165,250,0.3)',
  founder: 'rgba(249,115,22,0.3)',
  investor: 'rgba(34,211,238,0.3)',
};

const ROLE_BG_GRADIENT: Record<UserPlanetRole, string> = {
  career: 'linear-gradient(135deg, rgba(96,165,250,0.08) 0%, rgba(167,139,250,0.05) 100%)',
  founder: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(251,146,60,0.05) 100%)',
  investor: 'linear-gradient(135deg, rgba(34,211,238,0.08) 0%, rgba(52,211,153,0.05) 100%)',
};



// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      {/* Animated ring */}
      <div className="relative mb-8">
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle, rgba(193,174,255,0.12) 0%, transparent 70%)',
            border: '1px solid rgba(193,174,255,0.12)',
            boxShadow: '0 0 80px rgba(193,174,255,0.08), inset 0 0 40px rgba(193,174,255,0.04)',
          }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(193,174,255,0.08)',
              border: '1px solid rgba(193,174,255,0.18)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <Bookmark className="w-9 h-9" style={{ color: '#C1AEFF', opacity: 0.7 }} />
          </div>
        </div>
        {/* Floating sparkle dots */}
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: '#C1AEFF',
              opacity: 0.3 + (i % 3) * 0.15,
              top: `${50 + 48 * Math.sin((deg * Math.PI) / 180)}%`,
              left: `${50 + 48 * Math.cos((deg * Math.PI) / 180)}%`,
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 6px #C1AEFF',
            }}
          />
        ))}
      </div>

      <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">No saved workflows yet</h2>
      <p className="text-sm text-white/35 max-w-md leading-relaxed mb-10">
        Explore the 3D Universe, drill into a Company Planet, and bookmark any root system, branch, or action node to build your intelligence library.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/3d')}
          className="flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.03] hover:brightness-110"
          style={{
            background: 'linear-gradient(135deg, rgba(249,198,255,0.22), rgba(193,174,255,0.18))',
            border: '1px solid rgba(193,174,255,0.35)',
            color: '#EDD9FF',
            boxShadow: '0 0 32px rgba(193,174,255,0.18), inset 0 1px 0 rgba(255,255,255,0.1)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <Globe className="w-4 h-4" />
          Open 3D Universe
        </button>
        <button
          onClick={() => navigate('/overview')}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-medium transition-all hover:bg-white/[0.06]"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.45)',
            backdropFilter: 'blur(8px)',
          }}
        >
          Dashboard
        </button>
      </div>

      {/* How-to hint */}
      <div
        className="mt-12 flex items-start gap-3 text-left rounded-2xl px-5 py-4 max-w-sm"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Sparkles className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#C1AEFF', opacity: 0.6 }} />
        <p className="text-[11px] text-white/30 leading-relaxed">
          <span className="text-white/50 font-medium">Tip:</span> Hover any node in the Planet 2D view to reveal the bookmark icon. Click it to save that workflow context instantly.
        </p>
      </div>
    </div>
  );
}

// ── Note Editor ───────────────────────────────────────────────────────────────

function NoteEditor({ item, onUpdate }: { item: SavedWorkflowItem; onUpdate: (note: string) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(item.note ?? '');
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) taRef.current?.focus();
  }, [open]);

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[10px] font-medium transition-all rounded-full px-2 py-0.5"
        style={{
          color: item.note ? '#C1AEFF' : 'rgba(255,255,255,0.22)',
          background: item.note ? 'rgba(193,174,255,0.08)' : 'transparent',
          border: item.note ? '1px solid rgba(193,174,255,0.15)' : '1px solid transparent',
        }}
        title={open ? 'Close note' : item.note ? 'Edit note' : 'Add note'}
      >
        <StickyNote className="w-2.5 h-2.5" />
        {item.note ? 'Note' : 'Add note'}
      </button>
      {open && (
        <div className="mt-2">
          <textarea
            ref={taRef}
            rows={2}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Add a note..."
            className="w-full text-xs resize-none rounded-xl px-3 py-2 outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.75)',
              backdropFilter: 'blur(8px)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(193,174,255,0.4)')}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              onUpdate(draft);
            }}
          />
        </div>
      )}
      {!open && item.note && (
        <p className="mt-1 text-[10px] text-white/30 italic line-clamp-1">{item.note}</p>
      )}
    </div>
  );
}

// ── Saved Item Card ───────────────────────────────────────────────────────────

function SavedItemCard({
  item,
  onRemove,
  onUpdateNote,
}: {
  item: SavedWorkflowItem;
  onRemove: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  const breadcrumb = [
    item.rootLabel,
    item.branchLabel,
    item.actionLabel,
  ].filter(Boolean);

  const isPlanetLevel = item.level === 'planet';
  const tagColor = isPlanetLevel && item.planetTag ? COMPANY_TAG_COLORS[item.planetTag] : item.rootColor || ROLE_COLORS[item.role];

  return (
    <div
      className="relative rounded-2xl transition-all duration-300 overflow-hidden"
      style={{
        background: hovered
          ? `linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.025) 100%)`
          : 'rgba(255,255,255,0.025)',
        border: `1px solid ${hovered ? `${tagColor}35` : 'rgba(255,255,255,0.07)'}`,
        padding: '14px 16px 14px 20px',
        boxShadow: hovered
          ? `0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px ${tagColor}15`
          : '0 2px 8px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(12px)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Glowing left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl"
        style={{
          background: `linear-gradient(180deg, ${tagColor}cc 0%, ${tagColor}44 100%)`,
          boxShadow: `2px 0 12px ${tagColor}50`,
        }}
      />
      {/* Subtle top highlight */}
      <div
        className="absolute top-0 left-3 right-3 h-px rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${tagColor}25, transparent)` }}
      />

      <div className="flex items-start justify-between gap-3">
        {/* Left: Breadcrumb + meta */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb or Tag Badge */}
          <div className="flex items-center gap-1 flex-wrap mb-1.5">
            {isPlanetLevel && item.planetTag ? (() => {
              const Icon = COMPANY_TAG_ICONS[item.planetTag];
              return (
                <span 
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border shadow-lg"
                  style={{
                    background: `${tagColor}15`,
                    borderColor: `${tagColor}40`,
                    color: tagColor,
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[12px] font-bold tracking-wide uppercase">
                    {COMPANY_TAG_LABELS[item.planetTag]}
                  </span>
                </span>
              );
            })() : breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-2.5 h-2.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.18)' }} />}
                <span
                  className="text-[12px] leading-tight"
                  style={{
                    color: i === 0 ? item.rootColor : i === breadcrumb.length - 1 ? '#EDD9FF' : 'rgba(255,255,255,0.5)',
                    fontWeight: i === 0 ? 600 : i === breadcrumb.length - 1 ? 600 : 400,
                    textShadow: i === 0 ? `0 0 12px ${item.rootColor}50` : 'none',
                  }}
                >
                  {crumb}
                </span>
              </span>
            ))}
          </div>

          {/* Hint */}
          {item.actionHint && (
            <p className="text-[11px] text-white/30 mb-2 leading-snug">{item.actionHint}</p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.22)' }}>
              <Clock className="w-2.5 h-2.5" />
              {timeAgo(item.savedAt)}
            </span>
            <span className="w-px h-3" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest"
              style={{
                background: `${ROLE_COLORS[item.role]}12`,
                color: ROLE_COLORS[item.role],
                border: `1px solid ${ROLE_COLORS[item.role]}30`,
                boxShadow: `0 0 8px ${ROLE_COLORS[item.role]}15`,
              }}
            >
              {isPlanetLevel ? 'Planet Tag' : item.level}
            </span>
          </div>

          {/* Note */}
          <div className="mt-2">
            <NoteEditor item={item} onUpdate={(note) => onUpdateNote(item.id, note)} />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {item.level === 'action' && item.branchId && item.actionId && (
            <button
              onClick={() => navigate('/3d', { state: { actionWorkspaceContext: item } })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all hover:scale-105 hover:brightness-110"
              style={{
                background: `linear-gradient(135deg, ${ROLE_COLORS[item.role]}25, ${ROLE_COLORS[item.role]}15)`,
                border: `1px solid ${ROLE_COLORS[item.role]}40`,
                color: ROLE_COLORS[item.role],
                boxShadow: `0 0 16px ${ROLE_COLORS[item.role]}20`,
                backdropFilter: 'blur(8px)',
              }}
              title="Open workspace"
            >
              <ExternalLink className="w-3 h-3" />
              Open
            </button>
          )}
          <button
            onClick={() => onRemove(item.id)}
            className="w-7 h-7 rounded-xl flex items-center justify-center transition-all hover:scale-110"
            style={{
              background: 'rgba(248,113,113,0.06)',
              border: '1px solid rgba(248,113,113,0.12)',
              color: 'rgba(248,113,113,0.4)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#f87171';
              (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.18)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.3)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(248,113,113,0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.4)';
              (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.06)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.12)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
            title="Remove"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Company Group ─────────────────────────────────────────────────────────────

function CompanyGroup({
  group,
  roleColor,
  onRemove,
  onUpdateNote,
}: {
  group: SavedWorkflowCompanyGroup;
  roleColor: string;
  onRemove: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="mb-4">
      <button
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl mb-2 transition-all hover:bg-white/[0.04] text-left group"
        onClick={() => setCollapsed(c => !c)}
      >
        {/* Company avatar */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold transition-all group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${roleColor}25, ${roleColor}12)`,
            border: `1px solid ${roleColor}40`,
            color: roleColor,
            boxShadow: `0 0 12px ${roleColor}15`,
            backdropFilter: 'blur(8px)',
          }}
        >
          {group.companyName[0]?.toUpperCase()}
        </div>
        <span className="text-sm font-semibold text-white/70 flex-1 group-hover:text-white/90 transition-colors">{group.companyName}</span>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full mr-1"
          style={{
            background: `${roleColor}12`,
            color: `${roleColor}`,
            border: `1px solid ${roleColor}20`,
          }}
        >
          {group.items.length}
        </span>
        {collapsed
          ? <ChevronDown className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
          : <ChevronUp className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
        }
      </button>

      {!collapsed && (
        <div className="space-y-2 ml-2 pl-4" style={{ borderLeft: `1px solid ${roleColor}18` }}>
          {group.items.map(item => (
            <SavedItemCard
              key={item.id}
              item={item}
              onRemove={onRemove}
              onUpdateNote={onUpdateNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Role Section ──────────────────────────────────────────────────────────────

function RoleSection({
  group,
  onRemove,
  onUpdateNote,
}: {
  group: SavedWorkflowGroup;
  onRemove: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const RoleIcon = ROLE_ICONS[group.role];
  const total = group.companies.reduce((s, c) => s + c.items.length, 0);

  return (
    <div
      className="mb-5 rounded-3xl overflow-hidden"
      style={{
        border: `1px solid ${ROLE_BORDER[group.role]}`,
        background: ROLE_BG_GRADIENT[group.role],
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Role header */}
      <button
        className="w-full flex items-center gap-3 px-5 py-4 transition-all hover:bg-white/[0.02] text-left"
        style={{
          borderBottom: collapsed ? 'none' : `1px solid ${ROLE_BORDER[group.role]}`,
        }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: `linear-gradient(135deg, ${group.roleColor}28, ${group.roleColor}14)`,
            border: `1px solid ${group.roleColor}45`,
            backdropFilter: 'blur(12px)',
          }}
        >
          <RoleIcon style={{ color: group.roleColor, width: 18, height: 18 }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2.5">
            <span
              className="text-base font-bold"
              style={{ color: group.roleColor }}
            >
              {group.roleLabel}
            </span>
            <span
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
              style={{
                background: `${group.roleColor}15`,
                color: group.roleColor,
                border: `1px solid ${group.roleColor}30`,
                boxShadow: `0 0 10px ${group.roleColor}15`,
              }}
            >
              {total} saved
            </span>
          </div>
          <p className="text-[11px] text-white/25 mt-0.5">
            {group.companies.length} {group.companies.length === 1 ? 'company' : 'companies'}
          </p>
        </div>
        {collapsed
          ? <ChevronDown className="w-4 h-4 text-white/25" />
          : <ChevronUp className="w-4 h-4 text-white/25" />
        }
      </button>

      {!collapsed && (
        <div className="p-5">
          {group.companies.map(company => (
            <CompanyGroup
              key={company.companyId}
              group={company}
              roleColor={group.roleColor}
              onRemove={onRemove}
              onUpdateNote={onUpdateNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SavedWorkflows() {
  const { items: _items, totalCount, remove, updateNote, clear, grouped } = useSavedWorkflows();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserPlanetRole | 'all'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Filter
  const filteredGroups = useMemo(() => {
    let result = grouped;

    if (roleFilter !== 'all') {
      result = result.filter(g => g.role === roleFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result
        .map(g => ({
          ...g,
          companies: g.companies
            .map(c => ({
              ...c,
              items: c.items.filter(item =>
                item.companyName.toLowerCase().includes(q) ||
                (item.rootLabel ?? '').toLowerCase().includes(q) ||
                (item.branchLabel ?? '').toLowerCase().includes(q) ||
                (item.actionLabel ?? '').toLowerCase().includes(q) ||
                (item.note ?? '').toLowerCase().includes(q)
              ),
            }))
            .filter(c => c.items.length > 0),
        }))
        .filter(g => g.companies.length > 0);
    }

    return result;
  }, [grouped, roleFilter, search]);

  const isEmpty = totalCount === 0;
  const filteredEmpty = !isEmpty && filteredGroups.length === 0;

  return (
    <div
      className="fixed inset-0 flex"
      style={{ background: '#080810' }}
    >
      {/* Deep space background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 15% 0%, rgba(193,174,255,0.08) 0%, transparent 55%),
            radial-gradient(ellipse 50% 40% at 85% 100%, rgba(96,165,250,0.05) 0%, transparent 50%),
            radial-gradient(ellipse 40% 30% at 60% 50%, rgba(249,115,22,0.03) 0%, transparent 50%)
          `,
          zIndex: 0,
        }}
      />
      {/* Star-field dots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: i % 5 === 0 ? 2 : 1,
              height: i % 5 === 0 ? 2 : 1,
              background: 'white',
              opacity: 0.04 + (i % 4) * 0.03,
              top: `${(i * 7.3 + 13) % 100}%`,
              left: `${(i * 11.7 + 5) % 100}%`,
            }}
          />
        ))}
      </div>

      {/* ── Main content area ── */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* Top bar: search + header */}
        <div
          className="shrink-0 flex flex-col gap-4 px-8 py-5"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.25)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10 shrink-0"
              style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
              title="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex-1">
              <h1 className="text-lg font-bold text-white tracking-tight">
                {roleFilter === 'all' ? 'All Saved Workflows' : `${roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)} Mode`}
              </h1>
              <p className="text-[11px] text-white/25 mt-0.5">
                Roots · Branches · Action nodes — grouped by company
              </p>
            </div>

            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
                width: 260,
              }}
            >
              <Search className="w-3.5 h-3.5 text-white/25 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search workflows…"
                className="flex-1 bg-transparent text-xs outline-none"
                style={{ color: 'rgba(255,255,255,0.75)', minWidth: 0 }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="w-4 h-4 rounded flex items-center justify-center hover:bg-white/10 transition-all shrink-0"
                >
                  <X className="w-3 h-3 text-white/30" />
                </button>
              )}
            </div>

            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:brightness-110 shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(249,198,255,0.15), rgba(193,174,255,0.1))',
                border: '1px solid rgba(193,174,255,0.3)',
                color: '#EDD9FF',
                boxShadow: '0 0 16px rgba(193,174,255,0.15)',
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Export To WorkOs
            </button>

            {totalCount > 0 && (
              <div>
                {showClearConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/35">Clear all?</span>
                    <button
                      onClick={() => { clear(); setShowClearConfirm(false); }}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all hover:brightness-110"
                      style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:bg-white/10"
                      style={{ color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium transition-all"
                    style={{
                      color: 'rgba(248,113,113,0.45)',
                      border: '1px solid rgba(248,113,113,0.1)',
                      background: 'rgba(248,113,113,0.04)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = '#f87171';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.45)';
                      (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.04)';
                    }}
                  >
                    <BookmarkX className="w-3.5 h-3.5" />
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Filters Row */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setRoleFilter('all')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl transition-all hover:scale-[1.02]"
              style={{
                background: roleFilter === 'all' ? 'rgba(193,174,255,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${roleFilter === 'all' ? 'rgba(193,174,255,0.3)' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: roleFilter === 'all' ? '0 0 20px rgba(193,174,255,0.12)' : 'none',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Layers className="w-3.5 h-3.5" style={{ color: roleFilter === 'all' ? '#C1AEFF' : 'rgba(255,255,255,0.45)' }} />
              <span className="text-xs font-semibold" style={{ color: roleFilter === 'all' ? '#EDD9FF' : 'rgba(255,255,255,0.45)' }}>
                All Modes
              </span>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(193,174,255,0.18)', color: '#C1AEFF' }}
              >
                {totalCount}
              </span>
            </button>
            {ROLE_ORDER.map(role => {
              const g = grouped.find(gr => gr.role === role);
              if (!g) return null;
              const count = g.companies.reduce((s, c) => s + c.items.length, 0);
              const RoleIcon = ROLE_ICONS[role];
              const color = ROLE_COLORS[role];
              return (
                <button
                  key={role}
                  onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-2xl transition-all hover:scale-[1.02]"
                  style={{
                    background: roleFilter === role ? `${color}14` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${roleFilter === role ? `${color}35` : 'rgba(255,255,255,0.07)'}`,
                    boxShadow: roleFilter === role ? `0 0 20px ${color}12` : 'none',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <RoleIcon className="w-3.5 h-3.5" style={{ color }} />
                  <span className="text-xs font-semibold capitalize" style={{ color: roleFilter === role ? '#EDD9FF' : 'rgba(255,255,255,0.45)' }}>
                    {role}
                  </span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${color}18`, color }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
            {search && (
              <div
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs ml-auto"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                <Filter className="w-3 h-3" />
                Filtering: "{search}"
                <button onClick={() => setSearch('')} className="ml-1 hover:text-white/70 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
          {isEmpty ? (
            <EmptyState />
          ) : filteredEmpty ? (
            <div className="flex flex-col items-center py-24 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <Search className="w-7 h-7 text-white/15" />
              </div>
              <p className="text-sm font-medium text-white/30 mb-1">No results found</p>
              <p className="text-xs text-white/20 mb-6">Try a different search or filter</p>
              <button
                onClick={() => { setSearch(''); setRoleFilter('all'); }}
                className="text-xs px-4 py-2 rounded-xl transition-all hover:bg-white/[0.06]"
                style={{ color: '#C1AEFF', border: '1px solid rgba(193,174,255,0.15)' }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="p-8">
              {/* Role sections */}
              {filteredGroups.map(group => (
                <RoleSection
                  key={group.role}
                  group={group}
                  onRemove={remove}
                  onUpdateNote={updateNote}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
