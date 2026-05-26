import { useState } from 'react';
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

  // When dept is selected in 3D → update sidebar
  const handleDepartmentChange = (id: string | null) => {
    setSelectedDeptId(id);
    if (id === null) setInternalPath([]);
  };

  return (
    <div className="w-full h-[calc(100vh-56px)] -mb-8 bg-[#05040f] overflow-hidden relative">
      {/* ── 3D Polytope Canvas ── */}
      <UniversalPolytope
        companyName={companyName}
        onDepartmentChange={handleDepartmentChange}
        onInternalPathChange={setInternalPath}
        requestSelectDeptId={selectedDeptId}
      />

      {/* ── Left sidebar panel — bottom-left floating overlay ── */}
      <div
        className="absolute bottom-6 left-4 z-20 pointer-events-auto"
        style={{ pointerEvents: 'auto' }}
      >
        <PolytopeSidePanel
          departments={store.departments}
          selectedDeptId={selectedDeptId}
          onDeptSelect={(id) => {
            setSelectedDeptId(id);
            if (id === null) setInternalPath([]);
          }}
          selectedInternalPath={internalPath}
          onAddDepartment={handleAddDepartment}
          onAddNode={handleAddNode}
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
