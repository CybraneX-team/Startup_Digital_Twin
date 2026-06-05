import { useMemo } from 'react';
import {
  ChevronDown,
  Maximize2,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  WORKSPACE_CANVAS_CARDS,
  WORKSPACE_CANVAS_CONNECTIONS,
  type WorkspaceCanvasCard,
} from '../../lib/workspaceLayoutData';
import { WorkspaceCanvasFrame } from './WorkspaceCanvasFrame';

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

function CardIcon({ kind, color }: { kind?: WorkspaceCanvasCard['icon']; color: string }) {
  const cls = 'w-3.5 h-3.5';
  const style = { color };
  switch (kind) {
    case 'trend':
      return <TrendingUp className={cls} style={style} strokeWidth={2} />;
    case 'target':
      return <Target className={cls} style={style} strokeWidth={2} />;
    case 'shield':
      return <ShieldCheck className={cls} style={style} strokeWidth={2} />;
    case 'price':
      return <Tag className={cls} style={style} strokeWidth={2} />;
    default:
      return null;
  }
}

function CheckRow({ label, color }: { label: string; color: string }) {
  return (
    <li className="flex items-center gap-1.5 text-[10px] text-white/75">
      <svg viewBox="0 0 12 12" className="w-3 h-3 shrink-0" style={{ color }} fill="none">
        <path
          d="M2.5 6.2 4.8 8.6 9.6 3.4"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {label}
    </li>
  );
}

function OpenAILogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor" aria-hidden>
      <path d="M22.28 9.82a5.98 5.98 0 0 0-.52-4.91 6.05 6.05 0 0 0-6.51-2.9A6.07 6.07 0 0 0 4.98 4.18a5.98 5.98 0 0 0-3.99 2.9 6.05 6.05 0 0 0 .74 7.1 5.98 5.98 0 0 0 .51 4.91 6.05 6.05 0 0 0 6.52 2.9A5.98 5.98 0 0 0 13.26 22a6.05 6.05 0 0 0 5.77-4.21 5.99 5.99 0 0 0 4-2.9 6.05 6.05 0 0 0-.75-7.07zm-9.02 12.6a4.48 4.48 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.78.78 0 0 0 .39-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.05v5.58a4.5 4.5 0 0 1-4.49 4.5zM3.6 18.3a4.47 4.47 0 0 1-.54-3.01l.14.08 4.78 2.76c.24.14.53.14.77 0l5.84-3.37v2.33a.08.08 0 0 1-.03.06L9.74 19.95a4.5 4.5 0 0 1-6.14-1.65zM2.34 7.9a4.48 4.48 0 0 1 2.34-1.97V11.6a.77.77 0 0 0 .38.68l5.81 3.35-2.02 1.17a.08.08 0 0 1-.07 0l-4.83-2.79A4.5 4.5 0 0 1 2.34 7.9zm16.6 3.86L13.1 8.38l2.02-1.16a.08.08 0 0 1 .07 0l4.83 2.79a4.5 4.5 0 0 1-.68 8.12v-5.69a.78.78 0 0 0-.39-.68zm2.01-3.03l-.14-.09-4.77-2.78a.78.78 0 0 0-.78 0L9.43 9.23V6.9a.07.07 0 0 1 .03-.06l4.83-2.79a4.5 4.5 0 0 1 6.68 4.66zM8.33 12.85l-2.02-1.17a.08.08 0 0 1-.04-.05V6.05a4.5 4.5 0 0 1 7.38-3.45l-.14.08L8.73 5.44a.78.78 0 0 0-.39.68l-.01 6.73zm1.1-2.36L12 9.05l2.6 1.5v3l-2.6 1.5-2.6-1.5v-3z" />
    </svg>
  );
}

/* ── card body per variant ─────────────────────────────────────── */

function CardHeader({ card }: { card: WorkspaceCanvasCard }) {
  return (
    <div className="flex items-start justify-between gap-2 mb-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <CardIcon kind={card.icon} color={card.accent} />
        <span
          className="ws-card-eyebrow truncate"
          style={{ color: `${card.accent}` }}
        >
          {card.title}
        </span>
      </div>
      <X className="ws-card-close w-3.5 h-3.5 shrink-0" strokeWidth={2} />
    </div>
  );
}

function CardBody({ card }: { card: WorkspaceCanvasCard }) {
  switch (card.variant) {
    case 'hero':
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
                <OpenAILogo />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">{card.title}</h3>
                <span className="text-[11px] text-white/45">{card.subtitle}</span>
              </div>
            </div>
            <X className="ws-card-close w-4 h-4 shrink-0" strokeWidth={2} />
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {card.tags?.map(t => (
              <span key={t} className="ws-hero-tag">
                {t}
              </span>
            ))}
          </div>

          <div className="mt-auto pt-3 h-16">
            <MiniArea color={card.accent} id={card.id} />
          </div>
        </div>
      );

    case 'chart-bars':
      return (
        <div className="flex flex-col h-full">
          <CardHeader card={card} />
          {card.subtitle && (
            <p className="text-[11px] italic text-white/80 leading-snug mb-2">
              {card.subtitle}
            </p>
          )}
          <MiniBars color={card.accent} />
        </div>
      );

    case 'list-radar':
      return (
        <div className="flex flex-col h-full">
          <CardHeader card={card} />
          <div className="flex gap-2 flex-1 min-h-0">
            <ul className="flex-1 space-y-1 text-[10px] text-white/70">
              {card.items?.map(item => (
                <li key={item} className="flex items-center gap-1.5">
                  <span
                    className="w-1 h-1 rounded-full shrink-0"
                    style={{ background: card.accent }}
                  />
                  {item}
                </li>
              ))}
            </ul>
            <div className="w-[42%] shrink-0">
              <MiniRadar color={card.accent} />
            </div>
          </div>
          {card.extra && (
            <span className="text-[9px] text-white/35 self-end mt-1">{card.extra}</span>
          )}
        </div>
      );

    case 'avatars':
      return (
        <div className="flex flex-col h-full">
          <CardHeader card={card} />
          <ul className="space-y-0.5 text-[11px] italic text-white/80 mb-auto">
            {card.items?.map(item => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex -space-x-2">
              {['#fb7185', '#fb923c', '#38bdf8', '#a78bfa', '#34d399'].map((c, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full border-2"
                  style={{ background: c, borderColor: '#0c1020' }}
                />
              ))}
            </div>
            {card.metric && (
              <span className="text-[11px] font-semibold" style={{ color: card.accent }}>
                {card.metric}
              </span>
            )}
          </div>
        </div>
      );

    case 'gauge':
      return (
        <div className="flex flex-col h-full">
          <CardHeader card={card} />
          <div className="flex items-center gap-3 flex-1">
            <ul className="flex-1 space-y-1.5">
              {card.checks?.map(c => (
                <CheckRow key={c} label={c} color={card.accent} />
              ))}
            </ul>
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <GaugeRing color={card.accent} value={Number(card.metric?.replace('%', '')) || 0} />
              <span className="text-[9px] text-white/45">Confidence</span>
            </div>
          </div>
        </div>
      );

    case 'line':
      return (
        <div className="flex flex-col h-full">
          <CardHeader card={card} />
          <ul className="space-y-1 mb-1">
            {card.checks?.map(c => (
              <CheckRow key={c} label={c} color={card.accent} />
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

  return (
    <div className="ws-canvas-wrap flex-1 min-h-0 flex flex-col justify-end px-1 pb-2">
      <div className="ws-canvas-trapezium flex-1 min-h-0 min-w-0">
        <WorkspaceCanvasFrame
          tabLabel={<span className="ws-canvas-tab-label -ml-40 mt-2">Active Canvas</span>}
        >
          <div className="ws-canvas-toolbar ws-canvas-inset -mt-40 shrink-0 flex items-center justify-between gap-3 pb-2 pt-0">
            <button
              type="button"
              className="flex bg-transparent items-center gap-1.5 text-xs font-medium text-white/85 px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/[0.06]"
            >
              AI Chat Product Strategy
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" className="ws-icon-btn" aria-label="View options">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-white/40 tabular-nums px-1">100%</span>
              <button type="button" className="ws-icon-btn" aria-label="Fullscreen">
                <Maximize2 className="w-3.5 h-3.5" />
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
            <div className="absolute inset-y-4 inset-x-[8%]">
              {/* glowing curved connectors */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                {connections.map(c => (
                  <path
                    key={`${c.id}-glow`}
                    d={c.path}
                    fill="none"
                    stroke="rgba(125, 211, 252, 0.25)"
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

              {/* cards — 3D glass slab */}
              {WORKSPACE_CANVAS_CARDS.map(card => (
                <article
                  key={card.id}
                  className={`ws-glass-block absolute ${card.variant === 'hero' ? 'ws-glass-block--hero' : ''}`}
                  style={{
                    left: `${card.x}%`,
                    top: `${card.y}%`,
                    width: `${card.w}%`,
                    height: `${card.h}%`,
                    ['--card-accent' as string]: card.accent,
                  }}
                >
                  <div className="ws-glass-block__extrude" aria-hidden />
                  <div className="ws-glass-block__face">
                    <CardBody card={card} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </WorkspaceCanvasFrame>
      </div>
    </div>
  );
}
