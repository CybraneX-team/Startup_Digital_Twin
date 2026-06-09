import type { CSSProperties, ReactNode } from 'react';
import {
  CANVAS_BODY_TOP,
  CANVAS_CLIP_PATH_ID,
  CANVAS_FRAME_PATH,
  CANVAS_FRAME_PATH_NORMALIZED,
  CANVAS_FRAME_VIEWBOX,
  CANVAS_TAB_REGION,
  CANVAS_FRAME_PATH_FULL,
  CANVAS_FRAME_PATH_FULL_NORMALIZED,
} from './canvasFrameShape';

interface WorkspaceCanvasFrameProps {
  tabLabel?: ReactNode;
  children: ReactNode;
  isFullscreen?: boolean;
}

export function WorkspaceCanvasFrame({ tabLabel, children, isFullscreen = false }: WorkspaceCanvasFrameProps) {
  const { w, h } = CANVAS_FRAME_VIEWBOX;

  const innerStyle: CSSProperties = {
    clipPath: `url(#${CANVAS_CLIP_PATH_ID})`,
    WebkitClipPath: `url(#${CANVAS_CLIP_PATH_ID})`,
  };

  const fillPath = isFullscreen ? CANVAS_FRAME_PATH_FULL : CANVAS_FRAME_PATH;
  const clipPath = isFullscreen ? CANVAS_FRAME_PATH_FULL_NORMALIZED : CANVAS_FRAME_PATH_NORMALIZED;

  return (
    <div className={`ws-canvas-frame ${isFullscreen ? 'ws-canvas-frame--fullscreen' : ''}`}>
      <svg
        className="ws-canvas-frame-svg"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <clipPath id={CANVAS_CLIP_PATH_ID} clipPathUnits="objectBoundingBox">
            <path d={clipPath} className="ws-canvas-clip-path" />
          </clipPath>
        </defs>
        <path className="ws-canvas-frame-fill" d={fillPath} />
        <path className="ws-canvas-frame-stroke" d={fillPath} />
      </svg>

      <div className="ws-canvas-frame-inner" style={innerStyle}>
        {tabLabel != null ? (
          <div
            className="ws-canvas-tab-slot"
            style={{
              left: `${CANVAS_TAB_REGION.left * 100}%`,
              top: `${CANVAS_TAB_REGION.top * 100}%`,
              width: `${CANVAS_TAB_REGION.width * 100}%`,
              height: `${CANVAS_TAB_REGION.height * 100}%`,
            }}
          >
            {tabLabel}
          </div>
        ) : null}
        <div
          className="ws-canvas-frame-body"
          style={{ paddingTop: `${CANVAS_BODY_TOP * 100}%` }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
