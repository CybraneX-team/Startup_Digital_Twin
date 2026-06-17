import { useState, type CSSProperties } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  WorkspaceLeftPanel,
  WorkspaceActiveCanvasPanel,
  WorkspaceRightPanel,
} from '../workspace/panels';
import type { TwinWorkspacePhase } from '../../lib/twinWorkspaceTransition';
import { FounderWorkspaceProvider, useFounderWorkspace } from '../../context/FounderWorkspaceContext';

export interface TwinWorkspaceLayoutProps {
  phase: TwinWorkspacePhase;
  onClose?: () => void;
}

/** Panel chrome only — universe stays visible as the background (no workspace shell). */
export function TwinWorkspaceLayout({ phase, onClose }: TwinWorkspaceLayoutProps) {
  if (phase !== 'entering' && phase !== 'open' && phase !== 'closing') return null;

  return (
    <FounderWorkspaceProvider>
      <TwinWorkspaceLayoutInner phase={phase} onClose={onClose} />
    </FounderWorkspaceProvider>
  );
}

function TwinWorkspaceLayoutInner({ phase, onClose }: TwinWorkspaceLayoutProps) {
  const [isCollapsing, setIsCollapsing] = useState(false);
  const { scrollExpansion, isFullscreen } = useFounderWorkspace();

  const isClosing = phase === 'closing';
  const panelMotionClass = isClosing
    ? 'twin-workspace-panel--out'
    : 'twin-workspace-panel--in';

  const handleCloseClick = () => {
    if (isFullscreen || scrollExpansion > 0) {
      setIsCollapsing(true);
      window.dispatchEvent(new CustomEvent('collapse-workspace-canvas'));
      setTimeout(() => {
        setIsCollapsing(false);
        onClose?.();
      }, 2200);
    } else {
      onClose?.();
    }
  };

  const p = scrollExpansion / 100;

  // Inline styles for grid morphing when 0 < scrollExpansion < 100
  const shellStyle: CSSProperties | undefined = (scrollExpansion > 0 && scrollExpansion < 100)
    ? {
        gridTemplateColumns: `${(1 - p) * 228}px minmax(0, 1fr) ${(1 - p) * 268}px`,
        gridTemplateRows: `${(1 - p) * 34}vh minmax(0, 1fr)`,
        gap: `${(1 - p) * 12}px`,
        paddingLeft: `${(1 - p) * 12}px`,
        paddingRight: `${(1 - p) * 12}px`,
        paddingBottom: `${(1 - p) * 8}px`,
      }
    : undefined;

  return (
    <div
      className={`twin-workspace-shell ${isClosing
        ? 'twin-workspace-shell--closing'
        : phase === 'open'
          ? 'twin-workspace-shell--open'
          : 'twin-workspace-shell--entering'
        } ${scrollExpansion > 0 && scrollExpansion < 100 ? 'twin-workspace-shell--scrolling' : ''}`}
      style={shellStyle}
    >
      <button
        type="button"
        onClick={handleCloseClick}
        disabled={isClosing || isCollapsing}
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

      <div className="twin-workspace-fullscreen-hover-zone" />

      <div
        className={`twin-workspace-panel twin-workspace-panel--left ${panelMotionClass}`}
      >
        <WorkspaceLeftPanel className="h-full" />
      </div>

      <div className="twin-workspace-fullscreen-hover-zone-right" />

      <div
        className={`twin-workspace-panel twin-workspace-panel--right ${panelMotionClass}`}
      >
        <WorkspaceRightPanel className="h-full max-h-full" />
      </div>


      <div className={`twin-workspace-panel twin-workspace-panel--canvas ${panelMotionClass}`}>
        <WorkspaceActiveCanvasPanel />
      </div>
    </div>
  );
}


