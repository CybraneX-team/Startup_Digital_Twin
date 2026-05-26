import { useState, useRef, useEffect } from 'react';
import { Search, Command, ArrowLeft, Plus, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { UExternalNode, UInternalNode } from '../lib/universalPolytopeData';
import { U_DOMAIN_COLOR } from '../lib/universalPolytopeData';

export interface PolytopeSidePanelProps {
  departments: UExternalNode[];
  selectedDeptId: string | null;
  onDeptSelect: (id: string | null) => void;
  /** The currently-selected internal node path (array of node IDs from root → leaf) */
  selectedInternalPath: string[];
  onAddDepartment?: () => void;
  onAddNode?: (deptId: string) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function findNodeAtPath(nodes: UInternalNode[], path: string[]): UInternalNode | null {
  if (path.length === 0) return null;
  const node = nodes.find(n => n.id === path[0]);
  if (!node) return null;
  if (path.length === 1) return node;
  return findNodeAtPath(node.children ?? [], path.slice(1));
}

function getNodesAtPath(dept: UExternalNode, path: string[]): UInternalNode[] {
  if (path.length === 0) return dept.internalNodes;
  const node = findNodeAtPath(dept.internalNodes, path);
  return node?.children ?? [];
}

/** Recursively collect every internal node from a dept with its parent dept reference */
interface InternalNodeResult {
  node: UInternalNode;
  dept: UExternalNode;
  deptColor: string;
  path: string[]; // ancestry IDs
}

function collectAllInternalNodes(
  nodes: UInternalNode[],
  dept: UExternalNode,
  deptColor: string,
  ancestorPath: string[] = []
): InternalNodeResult[] {
  const results: InternalNodeResult[] = [];
  for (const node of nodes) {
    const path = [...ancestorPath, node.id];
    results.push({ node, dept, deptColor, path });
    if (node.children && node.children.length > 0) {
      results.push(...collectAllInternalNodes(node.children, dept, deptColor, path));
    }
  }
  return results;
}

// ── Node type badge ───────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  team:     '#60a5fa',
  process:  '#a78bfa',
  project:  '#34d399',
  resource: '#fbbf24',
  decision: '#f472b6',
  risk:     '#f87171',
  metric:   '#22d3ee',
};

// ── Main component ────────────────────────────────────────────────────────────

export function PolytopeSidePanel({
  departments,
  selectedDeptId,
  onDeptSelect,
  selectedInternalPath,
  onAddDepartment,
  onAddNode,
}: PolytopeSidePanelProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeDepts = departments.filter(d => d.domain !== 'inactive');
  const selectedDept = activeDepts.find(d => d.id === selectedDeptId) ?? null;
  const showingNodes = selectedDeptId !== null && selectedDept !== null;
  const isSearchActive = searchQuery.trim().length > 0;

  // ── Search results: departments + all internal nodes ──────────────────────
  const q = searchQuery.toLowerCase();
  const deptResults = isSearchActive
    ? activeDepts.filter(d =>
        d.label.toLowerCase().includes(q) ||
        d.domain.toLowerCase().includes(q) ||
        d.cluster.toLowerCase().includes(q)
      )
    : activeDepts;

  const internalNodeResults: InternalNodeResult[] = isSearchActive
    ? activeDepts.flatMap(dept => {
        const color = U_DOMAIN_COLOR[dept.domain] ?? '#6366f1';
        return collectAllInternalNodes(dept.internalNodes, dept, color).filter(r =>
          r.node.label.toLowerCase().includes(q) ||
          r.node.type.toLowerCase().includes(q)
        );
      })
    : [];

  // Internal nodes at the current drill-down level
  const visibleNodes = selectedDept ? getNodesAtPath(selectedDept, selectedInternalPath) : [];
  const deptColor = selectedDept ? (U_DOMAIN_COLOR[selectedDept.domain] ?? '#6366f1') : '#C1AEFF';

  // Key that forces list re-animation on level change
  const listKey = `${isSearchActive ? 'search-' + q : (selectedDeptId ?? 'root')}-${selectedInternalPath.join('.')}`;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Clear search when drilling into dept
  useEffect(() => {
    if (showingNodes) setSearchQuery('');
  }, [showingNodes]);

  // Section label logic
  const sectionLabel = isSearchActive
    ? 'SEARCH RESULTS'
    : !showingNodes
    ? 'DEPARTMENTS'
    : selectedInternalPath.length === 0
    ? 'INTERNAL NODES'
    : 'SUB-NODES';

  return (
    <div className="flex flex-col items-start gap-3">
      {/* ── Search bar — visible only in departments view (not when inside a dept) ── */}
      {!showingNodes && (
        <div
          className="relative rounded-2xl overflow-hidden shadow-xl"
          style={{
            width: '196px',
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex items-center px-3 py-2.5">
            <Search className="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search departments & nodes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-gray-500"
            />
            <div
              className="flex items-center gap-0.5 ml-2 opacity-50 shrink-0 bg-white/10 px-1.5 py-0.5 rounded"
              title="Cmd+K"
            >
              <Command className="w-2.5 h-2.5 text-gray-300" />
              <span className="text-[9px] text-gray-300 font-medium">K</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Main panel ── */}
      <div
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{
          width: '196px',
          maxHeight: '440px',
          background: 'rgba(0, 0, 0, 0.72)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* ── Back nav (dept drill-down) ── */}
        {showingNodes && (
          <div
            className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0 panel-slide-in"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              onClick={() => onDeptSelect(null)}
              className="flex items-center gap-1.5 text-[11px] font-medium transition-colors hover:text-white"
              style={{ color: '#C1AEFF' }}
            >
              <ArrowLeft className="w-3 h-3" />
              Departments
            </button>
          </div>
        )}

        {/* ── Section header ── */}
        <div key={listKey + '-hdr'} className="px-3 pt-3 pb-1 shrink-0 panel-slide-in">
          <span className="text-[10px] font-semibold tracking-widest" style={{ color: '#5E5E5E' }}>
            {sectionLabel}
          </span>

          {/* Dept name sub-header when inside a dept */}
          {showingNodes && selectedDept && (
            <p className="text-[11px] font-semibold mt-0.5 truncate" style={{ color: deptColor }}>
              {selectedDept.label}
            </p>
          )}

          {/* Search result count */}
          {isSearchActive && (
            <p className="text-[10px] mt-0.5" style={{ color: '#4b5563' }}>
              {deptResults.length + internalNodeResults.length} result{deptResults.length + internalNodeResults.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* ── Scrollable list ── */}
        <div
          key={listKey}
          className="overflow-y-auto flex-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isSearchActive ? (
            /* ── SEARCH RESULTS: departments + internal nodes ── */
            deptResults.length === 0 && internalNodeResults.length === 0 ? (
              <div className="px-3 py-6 text-[11px] text-center" style={{ color: '#4b5563' }}>
                No results found
              </div>
            ) : (
              <>
                {/* Matching departments */}
                {deptResults.map((dept, i) => {
                  const color = U_DOMAIN_COLOR[dept.domain] ?? '#6366f1';
                  return (
                    <button
                      key={dept.id}
                      onClick={() => onDeptSelect(dept.id)}
                      className="panel-item-in w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.06] group"
                      style={{ animationDelay: `${i * 22}ms` }}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125"
                        style={{ background: color, boxShadow: `0 0 8px ${color}70` }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[12px] text-gray-300 group-hover:text-white transition-colors leading-tight truncate">
                          {dept.label}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>
                          dept
                        </span>
                      </span>
                      <ChevronRight className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: '#6b7280' }} />
                    </button>
                  );
                })}

                {/* Separator if both types have results */}
                {deptResults.length > 0 && internalNodeResults.length > 0 && (
                  <div className="mx-3 my-1" style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
                )}

                {/* Matching internal nodes */}
                {internalNodeResults.map((result, i) => {
                  const typeColor = TYPE_COLORS[result.node.type] ?? '#94a3b8';
                  return (
                    <button
                      key={result.node.id}
                      onClick={() => {
                        // Select the parent department → triggers camera fly in 3D
                        onDeptSelect(result.dept.id);
                      }}
                      className="panel-item-in w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.06] group"
                      style={{ animationDelay: `${(deptResults.length + i) * 22}ms` }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: result.deptColor, opacity: 0.8 }}
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[12px] text-gray-300 group-hover:text-white transition-colors leading-tight truncate">
                          {result.node.label}
                        </span>
                        <span className="flex items-center gap-1 mt-0.5">
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded capitalize"
                            style={{ background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}30` }}
                          >
                            {result.node.type}
                          </span>
                          <span className="text-[9px] truncate" style={{ color: '#4b5563' }}>
                            {result.dept.label}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </>
            )
          ) : !showingNodes ? (
            /* ── DEPARTMENTS list ── */
            deptResults.length === 0 ? (
              <div className="px-3 py-6 text-[11px] text-center" style={{ color: '#4b5563' }}>
                No departments found
              </div>
            ) : (
              deptResults.map((dept, i) => {
                const color = U_DOMAIN_COLOR[dept.domain] ?? '#6366f1';
                return (
                  <button
                    key={dept.id}
                    onClick={() => onDeptSelect(dept.id)}
                    className="panel-item-in w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.06] group"
                    style={{ animationDelay: `${i * 22}ms` }}
                  >
                    {/* Color dot */}
                    <span
                      className="w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125"
                      style={{ background: color, boxShadow: `0 0 8px ${color}70` }}
                    />
                    {/* Text — score removed */}
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12px] text-gray-300 group-hover:text-white transition-colors leading-tight truncate">
                        {dept.label}
                      </span>
                      <span className="block text-[10px] leading-tight mt-0.5" style={{ color: '#4b5563' }}>
                        {dept.internalNodes.length} domain{dept.internalNodes.length !== 1 ? 's' : ''}
                      </span>
                    </span>
                    {/* Chevron */}
                    <ChevronRight
                      className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
                      style={{ color: '#6b7280' }}
                    />
                  </button>
                );
              })
            )
          ) : (
            /* ── INTERNAL NODES list ── */
            visibleNodes.length === 0 ? (
              <div className="px-3 py-6 text-[11px] text-center" style={{ color: '#4b5563' }}>
                No {selectedInternalPath.length === 0 ? 'internal nodes' : 'sub-nodes'} yet
              </div>
            ) : (
              visibleNodes.map((node, i) => {
                const typeColor = TYPE_COLORS[node.type] ?? '#94a3b8';
                return (
                  <button
                    key={node.id}
                    className="panel-item-in w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.06] group"
                    style={{ animationDelay: `${i * 22}ms` }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0 flex-shrink-0"
                      style={{ background: deptColor, opacity: 0.85 }}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[12px] text-gray-300 group-hover:text-white transition-colors leading-tight truncate">
                        {node.label}
                      </span>
                      <span className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded capitalize"
                          style={{
                            background: `${typeColor}18`,
                            color: typeColor,
                            border: `1px solid ${typeColor}30`,
                          }}
                        >
                          {node.type}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })
            )
          )}
        </div>

        {/* ── Add button — always pinned at bottom ── */}
        <div
          className="px-3 pb-3 pt-2 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <button
            onClick={() => {
              if (!showingNodes) {
                onAddDepartment?.();
              } else {
                onAddNode?.(selectedDeptId!);
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{
              background: !showingNodes ? 'rgba(99,102,241,0.12)' : `${deptColor}18`,
              border: `1px solid ${!showingNodes ? 'rgba(99,102,241,0.35)' : `${deptColor}35`}`,
              color: !showingNodes ? '#a5b4fc' : deptColor,
              transition: 'all 0.15s ease',
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            {!showingNodes ? 'Add Department' : 'Add Internal Node'}
          </button>
        </div>
      </div>

      {/* ── VC & Mentors + Startup Network pills ── */}
      <div className="flex flex-col gap-2 w-full" style={{ width: '196px' }}>
        <button
          onClick={() => navigate('/ecosystem/vc-connect')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 border backdrop-blur-md transition-all hover:text-white hover:border-sky-500/30"
          style={{ background: 'rgba(0,0,0,0.55)', borderColor: 'rgba(148,163,184,0.1)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
          VC &amp; Mentors
        </button>
        <button
          onClick={() => navigate('/ecosystem/network')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 border backdrop-blur-md transition-all hover:text-white hover:border-teal-500/30"
          style={{ background: 'rgba(0,0,0,0.55)', borderColor: 'rgba(148,163,184,0.1)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
          Startup Network
        </button>
      </div>
    </div>
  );
}
