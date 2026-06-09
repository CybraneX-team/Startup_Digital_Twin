import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Layers, CheckCircle2, Loader2 } from 'lucide-react';
import type { UExternalNode, UInternalNode, UDomain } from '../lib/usePolytopeStore';
import { U_DOMAIN_COLOR } from '../lib/usePolytopeStore';
import { ImageUpload } from './ImageUpload';

// ── Types ──────────────────────────────────────────────────────────────────────

export type CreateDepartmentMode = 'department' | 'node' | 'member';

interface CreateDeptPanelProps {
  mode: 'department';
  /** Live-update dept name/domain in polytope while typing */
  onDraftUpdate?: (patch: Partial<Pick<UExternalNode, 'label' | 'domain'>>) => void;
  /** Screen-space position ref of the draft node (written by R3F scene each frame) */
  draftNodeScreenPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  onClose: (isCancel?: boolean) => void;
  onCreated: (data: Omit<UExternalNode, 'id' | 'internalNodes' | 'isDraft'>) => void;
}

interface CreateNodePanelProps {
  mode: 'node';
  dept: UExternalNode;
  /** Live-update node label in polytope while typing */
  onDraftUpdate?: (patch: Partial<Pick<UInternalNode, 'label' | 'type'>>) => void;
  /** Screen-space position ref of the draft node */
  draftNodeScreenPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  onClose: (isCancel?: boolean) => void;
  onCreated: (data: Omit<UInternalNode, 'id' | 'children'>) => void;
}

interface CreateMemberPanelProps {
  mode: 'member';
  dept: UExternalNode;
  /** Live-update node label in polytope while typing */
  onDraftUpdate?: (patch: any) => void;
  /** Screen-space position ref of the draft node */
  draftNodeScreenPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  onClose: (isCancel?: boolean) => void;
  onCreated: (data: any) => void;
}

type Props = CreateDeptPanelProps | CreateNodePanelProps | CreateMemberPanelProps;

// ── Constants ─────────────────────────────────────────────────────────────────

const DOMAINS: UDomain[] = ['direction', 'build', 'delivery', 'market', 'control', 'people'];
const NODE_TYPES: UInternalNode['type'][] = ['team', 'process', 'project', 'resource', 'decision', 'risk', 'metric'];

const DOMAIN_LABELS: Record<string, string> = {
  direction: 'Direction',
  build: 'Build',
  delivery: 'Delivery',
  market: 'Market',
  control: 'Control',
  people: 'People',
};

// ── Shared input styles ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#fff',
  borderRadius: '0.625rem',
  padding: '8px 12px',
  fontSize: '12px',
  outline: 'none',
  width: '100%',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#5E5E5E' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ScoreSlider({ value, onChange, label: _label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px]" style={{ color: '#5E5E5E' }}>
        <span>0 — Critical</span>
        <span style={{ color: '#a5b4fc', fontWeight: 700 }}>{value}</span>
        <span>100 — Excellent</span>
      </div>
      <input
        type="range" min={0} max={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#6366f1' }}
      />
    </div>
  );
}


// ── Department Form ────────────────────────────────────────────────────────────

function DeptFormContent({
  onDraftUpdate,
  onSave,
  onCancel,
  accentColor: _accentColor,
}: {
  onDraftUpdate?: (patch: Partial<Pick<UExternalNode, 'label' | 'domain'>>) => void;
  onSave: (data: Omit<UExternalNode, 'id' | 'internalNodes' | 'isDraft'>) => void;
  onCancel: () => void;
  accentColor: string;
}) {
  const [label, setLabel] = useState('');
  const [domain, setDomain] = useState<UDomain>('build');
  const [cluster, setCluster] = useState('');
  const [score, setScore] = useState(75);
  const [perf, setPerf] = useState(75);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const domainColor = U_DOMAIN_COLOR[domain] ?? '#6366f1';

  // Auto-focus name
  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 300);
  }, []);

  // Live-update draft node label/domain as user types
  const handleLabelChange = useCallback((v: string) => {
    setLabel(v);
    onDraftUpdate?.({ label: v || 'New Department' });
  }, [onDraftUpdate]);

  const handleDomainChange = useCallback((d: UDomain) => {
    setDomain(d);
    onDraftUpdate?.({ domain: d });
  }, [onDraftUpdate]);

  const isValid = label.trim().length > 0 && cluster.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
      setTimeout(() => {
        onSave({
          label: label.trim(),
          domain,
          cluster: cluster.trim(),
          score,
          metrics: { performance: perf, efficiency: perf, capacity: perf, alignment: perf, risk: 100 - perf },
        });
      }, 900);
    }, 400);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${domainColor}20` }}>
          <CheckCircle2 className="w-6 h-6" style={{ color: domainColor }} />
        </div>
        <p className="text-white text-sm font-semibold">Department Added!</p>
        <p className="text-[11px] text-center" style={{ color: '#5E5E5E' }}>
          <span style={{ color: domainColor }}>{label}</span> is now in the polytope
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>
      <div className="px-4 py-3.5 flex flex-col gap-3.5">
        {/* Name */}
        <Field label="Department Name *">
          <input
            ref={nameRef}
            type="text"
            placeholder="e.g. Engineering"
            value={label}
            onChange={e => handleLabelChange(e.target.value)}
            style={{
              ...inputStyle,
              fontSize: '14px',
              padding: '10px 12px',
              borderColor: `${domainColor}30`,
            }}
            onFocus={e => e.target.style.borderColor = `${domainColor}60`}
            onBlur={e => e.target.style.borderColor = `${domainColor}30`}
          />
        </Field>

        {/* Domain */}
        <Field label="Domain">
          <div className="grid grid-cols-3 gap-1.5">
            {DOMAINS.map(d => {
              const dc = U_DOMAIN_COLOR[d] ?? '#6366f1';
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleDomainChange(d)}
                  className="py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background: domain === d ? `${dc}25` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${domain === d ? dc : 'rgba(255,255,255,0.08)'}`,
                    color: domain === d ? dc : '#94a3b8',
                  }}
                >
                  {DOMAIN_LABELS[d]}
                </button>
              );
            })}
          </div>
        </Field>

        {/* Cluster */}
        <Field label="Cluster">
          <input
            type="text"
            placeholder="e.g. Core Engineering"
            value={cluster}
            onChange={e => setCluster(e.target.value)}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
        </Field>

        {/* Score */}
        <Field label={`Overall Score: ${score}`}>
          <ScoreSlider value={score} onChange={setScore} label="Score" />
        </Field>

        {/* Performance metric */}
        <Field label={`Performance: ${perf}`}>
          <input
            type="range" min={0} max={100} value={perf}
            onChange={e => setPerf(Number(e.target.value))}
            style={{ width: '100%', accentColor: domainColor }}
          />
        </Field>

        {/* Context badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px]"
          style={{
            background: `${domainColor}0a`,
            border: `1px solid ${domainColor}15`,
            color: domainColor,
          }}
        >
          <Layers className="w-3 h-3 shrink-0" />
          <span>New vertex in the <strong>{DOMAIN_LABELS[domain]}</strong> domain</span>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-end gap-2 px-4 py-3 shrink-0"
        style={{ borderTop: `1px solid ${domainColor}12` }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/5"
          style={{ color: '#5E5E5E' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !isValid}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90 disabled:opacity-40"
          style={{
            background: `linear-gradient(135deg, ${domainColor}, ${domainColor}bb)`,
            color: '#161618',
          }}
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Creating…</>
          ) : (
            'Create Department'
          )}
        </button>
      </div>
    </form>
  );
}

// ── Node Form ──────────────────────────────────────────────────────────────────

function NodeFormContent({
  dept,
  onDraftUpdate,
  onSave,
  onCancel,
}: {
  dept: UExternalNode;
  onDraftUpdate?: (patch: Partial<Pick<UInternalNode, 'label' | 'type'>>) => void;
  onSave: (data: Omit<UInternalNode, 'id' | 'children'>) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('');
  const [type, setType] = useState<UInternalNode['type']>('team');
  const [score, setScore] = useState(75);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const deptColor = U_DOMAIN_COLOR[dept.domain] ?? '#6366f1';

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 300);
  }, []);

  const handleLabelChange = useCallback((v: string) => {
    setLabel(v);
    onDraftUpdate?.({ label: v || 'New Node' });
  }, [onDraftUpdate]);

  const handleTypeChange = useCallback((t: UInternalNode['type']) => {
    setType(t);
    onDraftUpdate?.({ type: t });
  }, [onDraftUpdate]);

  const isValid = label.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
      setTimeout(() => {
        onSave({ label: label.trim(), type, score });
      }, 900);
    }, 400);
  };

  const TYPE_COLORS: Record<string, string> = {
    team: '#60a5fa', process: '#a78bfa', project: '#34d399',
    resource: '#fbbf24', decision: '#f472b6', risk: '#f87171', metric: '#22d3ee',
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${deptColor}20` }}>
          <CheckCircle2 className="w-6 h-6" style={{ color: deptColor }} />
        </div>
        <p className="text-white text-sm font-semibold">Node Added!</p>
        <p className="text-[11px] text-center" style={{ color: '#5E5E5E' }}>
          <span style={{ color: deptColor }}>{label}</span> joined{' '}
          <span className="text-white">{dept.label}</span>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>
      <div className="px-4 py-3.5 flex flex-col gap-3.5">
        {/* Name */}
        <Field label="Node Label *">
          <input
            ref={nameRef}
            type="text"
            placeholder="e.g. Backend Team"
            value={label}
            onChange={e => handleLabelChange(e.target.value)}
            style={{
              ...inputStyle,
              fontSize: '14px',
              padding: '10px 12px',
              borderColor: `${deptColor}30`,
            }}
            onFocus={e => e.target.style.borderColor = `${deptColor}60`}
            onBlur={e => e.target.style.borderColor = `${deptColor}30`}
          />
        </Field>

        {/* Type */}
        <Field label="Type">
          <div className="flex flex-wrap gap-1.5">
            {NODE_TYPES.map(t => {
              const tc = TYPE_COLORS[t] ?? '#94a3b8';
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className="px-2.5 py-1 rounded-lg text-[10px] font-semibold capitalize transition-all"
                  style={{
                    background: type === t ? `${tc}20` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${type === t ? tc : 'rgba(255,255,255,0.08)'}`,
                    color: type === t ? tc : '#64748b',
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </Field>

        {/* Score */}
        <Field label={`Score: ${score}`}>
          <ScoreSlider value={score} onChange={setScore} label="Score" />
        </Field>

        {/* Context badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px]"
          style={{
            background: `${deptColor}0a`,
            border: `1px solid ${deptColor}15`,
            color: deptColor,
          }}
        >
          <Layers className="w-3 h-3 shrink-0" />
          <span>Internal node of <strong>{dept.label}</strong></span>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-end gap-2 px-4 py-3 shrink-0"
        style={{ borderTop: `1px solid ${deptColor}12` }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/5"
          style={{ color: '#5E5E5E' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !isValid}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90 disabled:opacity-40"
          style={{
            background: `linear-gradient(135deg, ${deptColor}, ${deptColor}bb)`,
            color: '#161618',
          }}
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Adding…</>
          ) : (
            'Add Node'
          )}
        </button>
      </div>
    </form>
  );
}

// ── Member Form ──────────────────────────────────────────────────────────────────

function MemberFormContent({
  dept,
  onDraftUpdate,
  onSave,
  onCancel,
}: {
  dept: UExternalNode;
  onDraftUpdate?: (patch: any) => void;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const deptColor = U_DOMAIN_COLOR[dept.domain] ?? '#6366f1';

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 300);
  }, []);

  const handleNameChange = useCallback((v: string) => {
    setName(v);
    onDraftUpdate?.({ name: v || 'New Member' });
  }, [onDraftUpdate]);

  const handleRoleChange = useCallback((v: string) => {
    setRole(v);
    onDraftUpdate?.({ role: v || 'Member' });
  }, [onDraftUpdate]);

  const handleAvatarUrlChange = useCallback((v: string) => {
    setAvatarUrl(v);
    onDraftUpdate?.({ avatarUrl: v });
  }, [onDraftUpdate]);

  const isValid = name.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
      setTimeout(() => {
        onSave({ name: name.trim(), role: role.trim(), avatarUrl: avatarUrl.trim() });
      }, 900);
    }, 400);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${deptColor}20` }}>
          <CheckCircle2 className="w-6 h-6" style={{ color: deptColor }} />
        </div>
        <p className="text-white text-sm font-semibold">Member Added!</p>
        <p className="text-[11px] text-center" style={{ color: '#5E5E5E' }}>
          <span style={{ color: deptColor }}>{name}</span> joined the team
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>
      <div className="px-4 py-3.5 flex flex-col gap-3.5">
        {/* Name */}
        <Field label="Member Name *">
          <input
            ref={nameRef}
            type="text"
            placeholder="e.g. Alice Doe"
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            style={{
              ...inputStyle,
              fontSize: '14px',
              padding: '10px 12px',
              borderColor: `${deptColor}30`,
            }}
            onFocus={e => e.target.style.borderColor = `${deptColor}60`}
            onBlur={e => e.target.style.borderColor = `${deptColor}30`}
          />
        </Field>

        {/* Role */}
        <Field label="Role">
          <input
            type="text"
            placeholder="e.g. Developer"
            value={role}
            onChange={e => handleRoleChange(e.target.value)}
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
          />
        </Field>

        {/* Avatar Upload */}
        <Field label="Photo">
          <ImageUpload value={avatarUrl} onChange={handleAvatarUrlChange} deptColor={deptColor} />
        </Field>

        {/* Context badge */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px]"
          style={{
            background: `${deptColor}0a`,
            border: `1px solid ${deptColor}15`,
            color: deptColor,
          }}
        >
          <Layers className="w-3 h-3 shrink-0" />
          <span>Adding member to <strong>{dept.label}</strong></span>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-end gap-2 px-4 py-3 shrink-0"
        style={{ borderTop: `1px solid ${deptColor}12` }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/5"
          style={{ color: '#5E5E5E' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !isValid}
          className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-[11px] font-semibold transition-all hover:opacity-90 disabled:opacity-40"
          style={{
            background: `linear-gradient(135deg, ${deptColor}, ${deptColor}bb)`,
            color: '#161618',
          }}
        >
          {loading ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Adding…</>
          ) : (
            'Add Member'
          )}
        </button>
      </div>
    </form>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

export default function CreateDepartmentPanel(props: Props) {
  const [draftPos, setDraftPos] = useState<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number>(0);

  // Poll the draft node screen-position ref each frame
  useEffect(() => {
    const update = () => {
      const pos = props.draftNodeScreenPosRef.current;
      setDraftPos(pos ? { ...pos } : null);
      rafRef.current = requestAnimationFrame(update);
    };
    rafRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafRef.current);
  }, [props.draftNodeScreenPosRef]);

  const modalLeft = 24;
  const modalTop = 100;
  const modalWidth = 320;

  // Accent color: domain color for departments, dept color for nodes
  const accentColor = props.mode === 'department'
    ? U_DOMAIN_COLOR['build']
    : U_DOMAIN_COLOR[props.dept.domain] ?? '#6366f1';

  const title = props.mode === 'department' ? 'New Department' : props.mode === 'node' ? `Add Node — ${props.dept.label}` : `Add Member — ${props.dept.label}`;
  const subtitle = props.mode === 'department'
    ? 'New vertex in the polytope'
    : props.mode === 'node' ? `Internal node of ${props.dept.label}` : `Member of ${props.dept.label}`;

  const modalCenterY = modalTop + 280; // approximate center
  const modalRight = modalLeft + modalWidth;

  return (
    <>
      {/* Connector SVG line from panel to draft node */}
      {draftPos && (
        <svg
          style={{
            position: 'fixed',
            inset: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 998,
          }}
        >
          <line
            x1={modalRight + 8}
            y1={modalCenterY}
            x2={draftPos.x}
            y2={draftPos.y}
            stroke={accentColor}
            strokeWidth="1.5"
            strokeOpacity="0.4"
            strokeDasharray="4 4"
          />
          <circle cx={draftPos.x} cy={draftPos.y} r="4" fill={accentColor} fillOpacity="0.7" />
          <circle cx={modalRight + 8} cy={modalCenterY} r="3" fill={accentColor} fillOpacity="0.5" />
        </svg>
      )}

      {/* Floating left-side panel */}
      <div
        className="fixed z-[999] flex flex-col rounded-2xl overflow-hidden"
        style={{
          left: modalLeft,
          top: modalTop,
          width: modalWidth,
          maxHeight: `calc(100vh - ${modalTop + 40}px)`,
          background: 'rgba(10, 10, 12, 0.92)',
          border: `1px solid ${accentColor}25`,
          backdropFilter: 'blur(24px)',
          boxShadow: `0 0 80px ${accentColor}12, 0 24px 64px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)`,
          animation: 'panel-slide-in 0.3s cubic-bezier(0.23, 1, 0.32, 1) both',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2.5 px-4 py-3.5 shrink-0"
          style={{ borderBottom: `1px solid ${accentColor}15` }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}25` }}
          >
            <Layers className="w-4 h-4" style={{ color: accentColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-sm font-semibold leading-tight">{title}</h2>
            <p className="text-[10px] mt-0.5 truncate" style={{ color: '#5E5E5E' }}>{subtitle}</p>
          </div>
          <button
            onClick={() => props.onClose(true)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/10 shrink-0"
            style={{ color: '#5E5E5E' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form content */}
        {props.mode === 'department' ? (
          <DeptFormContent
            onDraftUpdate={props.onDraftUpdate}
            accentColor={accentColor}
            onSave={data => props.onCreated(data)}
            onCancel={() => props.onClose(true)}
          />
        ) : props.mode === 'node' ? (
          <NodeFormContent
            dept={props.dept}
            onDraftUpdate={props.onDraftUpdate}
            onSave={data => props.onCreated(data)}
            onCancel={() => props.onClose(true)}
          />
        ) : (
          <MemberFormContent
            dept={props.dept}
            onDraftUpdate={props.onDraftUpdate}
            onSave={data => props.onCreated(data)}
            onCancel={() => props.onClose(true)}
          />
        )}
      </div>
    </>
  );
}
