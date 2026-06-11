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
  vc: TrendingUp, // Let's use TrendingUp for vc, or maybe some other icon. TrendingUp is fine.
  investor: TrendingUp,
};

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Bookmark className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.25)' }} />
      </div>

      <h2 className="text-xl font-semibold text-white mb-2 tracking-tight">No saved workflows</h2>
      <p className="text-sm text-white/35 max-w-xs leading-relaxed mb-8">
        Explore the 3D Universe and bookmark any root, branch, or action node to build your library.
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/3d')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/10"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.75)',
          }}
        >
          <Globe className="w-4 h-4" />
          Open 3D Universe
        </button>
        <button
          onClick={() => navigate('/overview')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/[0.04]"
          style={{
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.35)',
          }}
        >
          Dashboard
        </button>
      </div>

      <div
        className="mt-10 flex items-start gap-3 text-left rounded-xl px-4 py-3.5 max-w-sm"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.25)' }} />
        <p className="text-[11px] text-white/25 leading-relaxed">
          <span className="text-white/40 font-medium">Tip:</span> Hover any node in the Planet 2D view to reveal the bookmark icon.
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
        className="flex items-center gap-1.5 text-[11px] font-medium transition-colors rounded-md px-2 py-0.5"
        style={{
          color: item.note ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
          background: item.note ? 'rgba(255,255,255,0.04)' : 'transparent',
          border: '1px solid transparent',
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
            className="w-full text-xs resize-none rounded-lg px-3 py-2 outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.65)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              onUpdate(draft);
            }}
          />
        </div>
      )}
      {!open && item.note && (
        <p className="mt-1 text-[10px] text-white/25 italic line-clamp-1">{item.note}</p>
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
      className="relative rounded-xl transition-all duration-200 overflow-hidden group"
      style={{
        background: hovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.055)'}`,
        padding: '12px 14px 12px 18px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left accent */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full"
        style={{ background: tagColor, opacity: hovered ? 0.7 : 0.35 }}
      />

      <div className="flex items-start justify-between gap-3">
        {/* Left: breadcrumb + meta */}
        <div className="flex-1 min-w-0">
          {/* Breadcrumb or Tag Badge */}
          <div className="flex items-center gap-1 flex-wrap mb-1">
            {isPlanetLevel && item.planetTag ? (() => {
              const Icon = COMPANY_TAG_ICONS[item.planetTag];
              return (
                <span
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-md"
                  style={{
                    background: `${tagColor}12`,
                    border: `1px solid ${tagColor}30`,
                    color: tagColor,
                  }}
                >
                  <Icon className="w-3 h-3" />
                  <span className="text-[11px] font-semibold tracking-wide uppercase">
                    {COMPANY_TAG_LABELS[item.planetTag]}
                  </span>
                </span>
              );
            })() : breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-2.5 h-2.5 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.15)' }} />}
                <span
                  className="text-[12px] leading-tight"
                  style={{
                    color: i === 0 ? item.rootColor : i === breadcrumb.length - 1 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
                    fontWeight: i === 0 || i === breadcrumb.length - 1 ? 500 : 400,
                  }}
                >
                  {crumb}
                </span>
              </span>
            ))}
          </div>

          {/* Hint */}
          {item.actionHint && (
            <p className="text-[11px] text-white/25 mb-1.5 leading-snug">{item.actionHint}</p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
              <Clock className="w-2.5 h-2.5" />
              {timeAgo(item.savedAt)}
            </span>
            <span className="w-px h-2.5" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-widest"
              style={{
                background: `${ROLE_COLORS[item.role]}10`,
                color: `${ROLE_COLORS[item.role]}bb`,
                border: `1px solid ${ROLE_COLORS[item.role]}20`,
              }}
            >
              {isPlanetLevel ? 'Planet' : item.level}
            </span>
          </div>

          {/* Note */}
          <div className="mt-2">
            <NoteEditor item={item} onUpdate={(note) => onUpdateNote(item.id, note)} />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {item.level === 'action' && item.branchId && item.actionId && (
            <button
              onClick={() => navigate('/3d', { state: { actionWorkspaceContext: item } })}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all hover:bg-white/10"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.55)',
              }}
              title="Open workspace"
            >
              <ExternalLink className="w-3 h-3" />
              Open
            </button>
          )}
          <button
            onClick={() => onRemove(item.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/10"
            style={{
              border: '1px solid transparent',
              color: 'rgba(248,113,113,0.35)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = '#f87171';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(248,113,113,0.2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.35)';
              (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
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
    <div className="mb-3">
      <button
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1.5 transition-all hover:bg-white/[0.03] text-left group"
        onClick={() => setCollapsed(c => !c)}
      >
        {/* Company avatar */}
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold"
          style={{
            background: `${roleColor}14`,
            border: `1px solid ${roleColor}25`,
            color: roleColor,
          }}
        >
          {group.companyName[0]?.toUpperCase()}
        </div>
        <span className="text-xs font-medium text-white/55 flex-1 group-hover:text-white/80 transition-colors">{group.companyName}</span>
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded mr-1"
          style={{
            background: `${roleColor}10`,
            color: `${roleColor}99`,
          }}
        >
          {group.items.length}
        </span>
        {collapsed
          ? <ChevronDown className="w-3 h-3 text-white/15 group-hover:text-white/30 transition-colors" />
          : <ChevronUp className="w-3 h-3 text-white/15 group-hover:text-white/30 transition-colors" />
        }
      </button>

      {!collapsed && (
        <div className="space-y-1.5 ml-2 pl-4" style={{ borderLeft: `1px solid rgba(255,255,255,0.06)` }}>
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
      className="mb-3 rounded-2xl overflow-hidden"
      style={{
        border: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      {/* Role header */}
      <button
        className="w-full flex items-center gap-3 px-5 py-3.5 transition-all hover:bg-white/[0.02] text-left"
        style={{
          borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.05)',
        }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: `${group.roleColor}12`,
            border: `1px solid ${group.roleColor}25`,
          }}
        >
          <RoleIcon style={{ color: group.roleColor, width: 15, height: 15 }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {group.roleLabel}
            </span>
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
              style={{
                background: `${group.roleColor}12`,
                color: `${group.roleColor}cc`,
              }}
            >
              {total} saved
            </span>
          </div>
          <p className="text-[10px] text-white/20 mt-0.5">
            {group.companies.length} {group.companies.length === 1 ? 'company' : 'companies'}
          </p>
        </div>
        {collapsed
          ? <ChevronDown className="w-3.5 h-3.5 text-white/20" />
          : <ChevronUp className="w-3.5 h-3.5 text-white/20" />
        }
      </button>

      {!collapsed && (
        <div className="px-4 py-3">
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
      style={{ background: '#0a0a0f' }}
    >
      {/* ── Main content area ── */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden">

        {/* ── Top bar ── */}
        <div
          className="shrink-0 px-6 py-4"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(10,10,15,0.9)',
          }}
        >
          {/* Row 1: Nav + title + actions */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(-1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-white/[0.06] shrink-0"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              title="Go back"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex-1">
              <h1 className="text-[15px] font-semibold text-white/85 tracking-tight">
                {roleFilter === 'all' ? 'Saved Workflows' : `${roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)} Mode`}
              </h1>
              <p className="text-[10px] text-white/20 mt-0.5">
                Roots · Branches · Action nodes — grouped by company
              </p>
            </div>

            {/* Search */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                width: 230,
              }}
            >
              <Search className="w-3.5 h-3.5 text-white/20 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search workflows…"
                className="flex-1 bg-transparent text-[12px] outline-none"
                style={{ color: 'rgba(255,255,255,0.65)', minWidth: 0 }}
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

            {/* Export button */}
            <button
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-medium transition-all hover:bg-white/[0.06] shrink-0"
              style={{
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Export To WorkOs
            </button>

            {/* Clear all */}
            {totalCount > 0 && (
              <div>
                {showClearConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-white/30">Clear all?</span>
                    <button
                      onClick={() => { clear(); setShowClearConfirm(false); }}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-all hover:brightness-110"
                      style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.18)' }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg font-medium transition-all hover:bg-white/[0.05]"
                      style={{ color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-xl font-medium transition-all hover:bg-red-500/[0.07]"
                    style={{
                      color: 'rgba(248,113,113,0.4)',
                      border: '1px solid rgba(248,113,113,0.08)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.color = '#f87171';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.4)';
                    }}
                  >
                    <BookmarkX className="w-3.5 h-3.5" />
                    Clear all
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Row 2: Filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setRoleFilter('all')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: roleFilter === 'all' ? 'rgba(255,255,255,0.08)' : 'transparent',
                border: `1px solid ${roleFilter === 'all' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
                color: roleFilter === 'all' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
              }}
            >
              <Layers className="w-3 h-3" />
              <span className="text-[11px] font-medium">All Modes</span>
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: roleFilter === 'all' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
                }}
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
              const active = roleFilter === role;
              return (
                <button
                  key={role}
                  onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
                  style={{
                    background: active ? `${color}12` : 'transparent',
                    border: `1px solid ${active ? `${color}28` : 'rgba(255,255,255,0.05)'}`,
                    color: active ? color : 'rgba(255,255,255,0.3)',
                  }}
                >
                  <RoleIcon className="w-3 h-3" style={{ color: active ? color : 'rgba(255,255,255,0.3)' }} />
                  <span className="text-[11px] font-medium capitalize">{role}</span>
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                    style={{ background: `${color}12`, color: active ? color : 'rgba(255,255,255,0.25)' }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {search && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] ml-auto"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.3)',
                }}
              >
                <Filter className="w-3 h-3" />
                "{search}"
                <button onClick={() => setSearch('')} className="ml-1 hover:text-white/60 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}
        >
          {isEmpty ? (
            <EmptyState />
          ) : filteredEmpty ? (
            <div className="flex flex-col items-center py-24 text-center">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Search className="w-5 h-5 text-white/15" />
              </div>
              <p className="text-sm font-medium text-white/30 mb-1">No results found</p>
              <p className="text-xs text-white/18 mb-5">Try a different search or filter</p>
              <button
                onClick={() => { setSearch(''); setRoleFilter('all'); }}
                className="text-[11px] px-4 py-2 rounded-xl transition-all hover:bg-white/[0.04]"
                style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="p-6 max-w-4xl mx-auto w-full">
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
