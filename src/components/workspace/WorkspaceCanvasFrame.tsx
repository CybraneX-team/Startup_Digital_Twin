import type { CSSProperties, ReactNode } from 'react';
import {
  CANVAS_BODY_TOP,
  CANVAS_CLIP_PATH_ID,
  CANVAS_FRAME_PATH,
  CANVAS_FRAME_PATH_NORMALIZED,
  CANVAS_FRAME_VIEWBOX,
  CANVAS_TAB_REGION,
} from './canvasFrameShape';

interface WorkspaceCanvasFrameProps {
  tabLabel?: ReactNode;
  children: ReactNode;
}

export function WorkspaceCanvasFrame({ tabLabel, children }: WorkspaceCanvasFrameProps) {
  const { w, h } = CANVAS_FRAME_VIEWBOX;

  const innerStyle: CSSProperties = {
    clipPath: `url(#${CANVAS_CLIP_PATH_ID})`,
    WebkitClipPath: `url(#${CANVAS_CLIP_PATH_ID})`,
  };

  return (
    <div className="ws-canvas-frame">
      <svg
        className="ws-canvas-frame-svg"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <clipPath id={CANVAS_CLIP_PATH_ID} clipPathUnits="objectBoundingBox">
            <path d={CANVAS_FRAME_PATH_NORMALIZED} />
          </clipPath>
        </defs>
        <path className="ws-canvas-frame-fill" d={CANVAS_FRAME_PATH} />
        <path className="ws-canvas-frame-stroke" d={CANVAS_FRAME_PATH} />
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
