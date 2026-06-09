import { WORKSPACE_LIVE_SIGNALS } from '../../../lib/workspaceLayoutData';
import { WorkspaceFocusToday } from '../WorkspaceFocusToday';
import { WorkspaceCanvasMinimap } from '../WorkspaceCanvasMinimap';

function Sparkline({ trend }: { trend: 'up' | 'down' }) {
  const color = trend === 'up' ? '#34d399' : '#f87171';
  const points = trend === 'up' ? '0,12 8,8 16,10 24,4 32,6' : '0,4 8,8 16,6 24,12 32,10';
  return (
    <svg viewBox="0 0 32 14" className="w-8 h-4 shrink-0">
      <polyline fill="none" stroke={color} strokeWidth={1.5} points={points} />
    </svg>
  );
}

/** Reusable workspace right rail — live signals, focus today, minimap. */
export function WorkspaceRightPanel({ className }: { className?: string }) {
  return (
    <aside className={`ws-right-panel flex flex-col gap-3 shrink-0 min-h-0 ${className ?? ''}`}>
      <div className="ws-glass-strong rounded-2xl flex flex-col min-h-0 flex overflow-hidden">
        <div className="shrink-0 py-4 px-4.5 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            Live Signals
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
          {WORKSPACE_LIVE_SIGNALS.map(sig => (
            <article key={sig.id} className="ws-signal-card p-2.5">
              <div className="flex items-start justify-between gap-2">
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md shrink-0"
                  style={{ background: `${sig.tagColor}22`, color: sig.tagColor }}
                >
                  {sig.tag}
                </span>
                <Sparkline trend={sig.trend} />
              </div>
              <p className="text-[11px] font-medium text-white/85 mt-1.5 leading-snug">{sig.title}</p>
              <p className="text-[9px] text-white/35 mt-1">{sig.time}</p>
            </article>
          ))}
        </div>
      </div>

      <WorkspaceFocusToday />
      <WorkspaceCanvasMinimap />
    </aside>
  );
}
