import { Plus, X } from 'lucide-react';
import {
  WORKSPACE_FOCUS_TASKS,
  WORKSPACE_FOCUS_VISIBLE_COUNT,
} from '../../lib/workspaceLayoutData';

function FocusTaskCheck({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="ws-focus-check ws-focus-check--done" aria-hidden>
        <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
          <path
            d="M2.5 6.2 4.8 8.5 9.5 3.5"
            stroke="#ffffff"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return <span className="ws-focus-check ws-focus-check--open" aria-hidden />;
}

export function WorkspaceFocusToday() {
  const total = WORKSPACE_FOCUS_TASKS.length;
  const doneCount = WORKSPACE_FOCUS_TASKS.filter(t => t.done).length;
  const pct = Math.round((doneCount / total) * 100);
  const visible = WORKSPACE_FOCUS_TASKS.slice(0, WORKSPACE_FOCUS_VISIBLE_COUNT);
  const moreCount = total - WORKSPACE_FOCUS_VISIBLE_COUNT;

  return (
    <div className="ws-focus-panel w-[220px] ml-12 shrink-0">
      <div className="ws-focus-header">
        <h2 className="ws-focus-title">Focus Today</h2>
        <button type="button" className="ws-focus-close" aria-label="Dismiss Focus Today">
          <X className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </div>

      <p className="ws-focus-status">
        {doneCount} of {total} tasks completed
      </p>

      <div className="ws-focus-progress-row">
        <div className="ws-focus-progress-track">
          <div className="ws-focus-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="ws-focus-pct tabular-nums">{pct}%</span>
      </div>

      <ul className="ws-focus-list">
        {visible.map(task => (
          <li key={task.id}>
            <div className="ws-focus-task">
              <FocusTaskCheck done={task.done} />
              <span className={task.done ? 'ws-focus-task-label ws-focus-task-label--done' : 'ws-focus-task-label'}>
                {task.label}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {moreCount > 0 && (
        <button type="button" className="ws-focus-more">
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          <span>{moreCount} more tasks</span>
        </button>
      )}
    </div>
  );
}
