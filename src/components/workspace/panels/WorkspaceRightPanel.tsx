import { WorkspaceSignalsPanel } from '../WorkspaceSignalsPanel';
import { WorkspaceFocusToday } from '../WorkspaceFocusToday';

/** Right rail — live signals intelligence + focus today. */
export function WorkspaceRightPanel({ className }: { className?: string }) {
  return (
    <aside className={`ws-right-panel flex flex-col gap-3 shrink-0 h-full min-h-0 ${className ?? ''}`}>

      {/* ── Signals Intelligence ─────────────────────────────────────────── */}
      <div className="ws-glass-strong rounded-2xl flex flex-col flex-1 min-h-0 overflow-hidden p-3 pt-3.5">
        <WorkspaceSignalsPanel />
      </div>

      {/* ── Focus Today ──────────────────────────────────────────────────── */}
      <WorkspaceFocusToday />

    </aside>
  );
}
