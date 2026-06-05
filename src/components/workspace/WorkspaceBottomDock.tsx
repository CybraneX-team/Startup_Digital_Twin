import type { ComponentType } from 'react';
import {
  ChartSquare,
  Code,
  DocumentText,
  Link1,
  MagicStar,
  Note,
  TableDocument,
  TaskSquare,
  type IconProps,
} from 'iconsax-reactjs';
import { WORKSPACE_TOOLBAR_ITEMS } from '../../lib/workspaceLayoutData';

type ToolbarItem = (typeof WORKSPACE_TOOLBAR_ITEMS)[number];

const TOOLBAR_ICONS: Record<ToolbarItem, ComponentType<IconProps>> = {
  Note,
  Task: TaskSquare,
  File: DocumentText,
  Link: Link1,
  Table: TableDocument,
  Chart: ChartSquare,
  Code,
  'AI Assistant': MagicStar,
};

const ICON_SIZE = 14;

export function WorkspaceBottomDock() {
  return (
    <div className="ws-bottom-dock shrink-0 flex items-end justify-between gap-4 px-1 pb-1 pointer-events-none">
      <div className="pointer-events-auto w-[228px]" />

      <div className="pointer-events-auto flex-1 flex justify-center">
        <div className="ws-toolbar ws-glass-strong flex items-center gap-0.5 px-2 py-1.5 rounded-2xl">
          {WORKSPACE_TOOLBAR_ITEMS.map(label => {
            const Icon = TOOLBAR_ICONS[label];
            const isAi = label === 'AI Assistant';

            return (
              <button
                key={label}
                type="button"
                className={
                  isAi
                    ? 'ws-toolbar-ai flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold'
                    : 'ws-toolbar-btn flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium text-white/55'
                }
              >
                <Icon
                  size={ICON_SIZE}
                  variant={isAi ? 'Bold' : 'Linear'}
                  color="currentColor"
                />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pointer-events-auto w-[268px]" />
    </div>
  );
}
