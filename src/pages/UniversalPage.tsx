import { useState, useRef } from 'react';
import UniversalPolytope from '../components/UniversalPolytope';
import { PolytopeSidePanel } from '../components/PolytopeSidePanel';
import { PolytopeManager } from '../components/PolytopeManager';
import { usePolytopeStore } from '../lib/usePolytopeStore';
import { useAuth } from '../lib/auth';
import { useCompany } from '../lib/db/companies';

export default function UniversalPage() {
  const { profile } = useAuth();
  const { company } = useCompany(profile?.company_id);
  const store = usePolytopeStore();

  // Sidebar state — which dept is selected in sidebar, and internal drill-down path
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [internalPath, setInternalPath] = useState<string[]>([]);
  // Counter incremented each time the sidebar's back button is pressed
  const [internalBackStep, setInternalBackStep] = useState(0);

  // requestSelectDeptId is only set when the SIDEBAR triggers a selection,
  // so the 3D scene camera flies in. When the 3D scene selects a dept itself
  // (user clicks a node), we just update selectedDeptId directly without
  // re-triggering the camera fly (the 3D scene already handles it).
  const [requestSelectDeptId, setRequestSelectDeptId] = useState<string | null | undefined>(undefined);

  // Track whether the last selection came from the 3D scene (to avoid loop)
  const selectionFromScene = useRef(false);

  // PolytopeManager (CRUD modal) controlled externally by sidebar Add buttons
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerView, setManagerView] = useState<any>({ type: 'home' });

  // Use the actual company name from the database, fallback to heuristic if loading
  const companyName = company?.name || (profile?.company_id
    ? profile?.first_name ? `${profile.first_name}'s workspace` : 'My workspace'
    : 'Universal Polytope');

  const handleAddDepartment = () => {
    setManagerView({ type: 'addDept' });
    setManagerOpen(true);
  };

  const handleAddNode = (deptId: string) => {
    const dept = store.departments.find(d => d.id === deptId);
    if (dept) {
      setManagerView({ type: 'addNode', dept });
      setManagerOpen(true);
    }
  };

  // When dept is selected in 3D scene → update sidebar highlight only (no camera retrigger)
  const handleDepartmentChange = (id: string | null) => {
    selectionFromScene.current = true;
    setSelectedDeptId(id);
    if (id === null) {
      setInternalPath([]);
      setRequestSelectDeptId(null);
      setInternalBackStep(0); // reset when leaving dept
    }
    // Reset flag after state batch
    setTimeout(() => { selectionFromScene.current = false; }, 0);
  };

  // When sidebar selects a dept → update selectedDeptId AND trigger camera fly in 3D
  const handleSidebarDeptSelect = (id: string | null) => {
    setSelectedDeptId(id);
    if (id === null) {
      setInternalPath([]);
      setRequestSelectDeptId(null);
      setInternalBackStep(0);
    } else {
      setRequestSelectDeptId(id);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-56px)] -mb-8 bg-[#05040f] overflow-hidden relative">
      {/* ── 3D Polytope Canvas ── */}
      <UniversalPolytope
        companyName={companyName}
        onDepartmentChange={handleDepartmentChange}
        onInternalPathChange={setInternalPath}
        requestSelectDeptId={requestSelectDeptId}
        requestBackStep={internalBackStep}
      />

      {/* ── Left sidebar panel — fixed bottom-left, above all overlays ── */}
      <div
        className="fixed bottom-6 left-4 z-[60] pointer-events-auto"
      >
        <PolytopeSidePanel
          departments={store.departments}
          selectedDeptId={selectedDeptId}
          onDeptSelect={handleSidebarDeptSelect}
          selectedInternalPath={internalPath}
          onAddDepartment={handleAddDepartment}
          onAddNode={handleAddNode}
          onInternalBack={() => setInternalBackStep(c => c + 1)}
        />
      </div>

      {/* ── CRUD modal — controlled by sidebar Add buttons ── */}
      <PolytopeManager
        departments={store.departments}
        onAddDepartment={store.addDepartment}
        onUpdateDepartment={store.updateDepartment}
        onDeleteDepartment={store.deleteDepartment}
        onAddNode={store.addNode}
        onUpdateNode={store.updateNode}
        onDeleteNode={store.deleteNode}
        onReset={store.resetToDefaults}
        forceOpen={managerOpen}
        forcedView={managerView}
        onForcedClose={() => setManagerOpen(false)}
      />
    </div>
  );
}
