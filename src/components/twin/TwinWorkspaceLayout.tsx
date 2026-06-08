import { ChevronDown } from 'lucide-react';
import {
  WorkspaceLeftPanel,
  WorkspaceActiveCanvasPanel,
  WorkspaceRightPanel,
} from '../workspace/panels';
import type { TwinWorkspacePhase } from '../../lib/twinWorkspaceTransition';

export interface TwinWorkspaceLayoutProps {
  phase: TwinWorkspacePhase;
  onClose?: () => void;
}

/** Panel chrome only — universe stays visible as the background (no workspace shell). */
export function TwinWorkspaceLayout({ phase, onClose }: TwinWorkspaceLayoutProps) {
  if (phase !== 'entering' && phase !== 'open' && phase !== 'closing') return null;

  const isClosing = phase === 'closing';
  const panelMotionClass = isClosing
    ? 'twin-workspace-panel--out'
    : 'twin-workspace-panel--in';

  return (
    <div
      className={`twin-workspace-shell ${
        isClosing
          ? 'twin-workspace-shell--closing'
          : phase === 'open'
            ? 'twin-workspace-shell--open'
            : 'twin-workspace-shell--entering'
      }`}
    >
      <button
        type="button"
        onClick={onClose}
        disabled={isClosing}
        className="twin-workspace-close group -mb-18"
        aria-label="Close workspace"
      >
        <span className="twin-workspace-close__chevrons" aria-hidden>
          <ChevronDown
            className="twin-workspace-close__chevron twin-workspace-close__chevron--first"
            strokeWidth={2.25}
          />
          <ChevronDown
            className="twin-workspace-close__chevron twin-workspace-close__chevron--second"
            strokeWidth={2.25}
          />
        </span>
        <span className="twin-workspace-close__label">Close Workspace</span>
      </button>

      <div className={`twin-workspace-panel twin-workspace-panel--left ${panelMotionClass}`}>
        <WorkspaceLeftPanel className="h-full" />
      </div>

      <div className={`twin-workspace-panel twin-workspace-panel--right ${panelMotionClass}`}>
        <WorkspaceRightPanel className="h-full max-h-full" />
      </div>

      <div className={`twin-workspace-panel twin-workspace-panel--canvas ${panelMotionClass}`}>
        <WorkspaceActiveCanvasPanel />
      </div>
    </div>
  );
}
