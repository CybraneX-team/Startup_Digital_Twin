import { useMemo, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getPlanetRootsForCompany, type UserPlanetRole } from '../data/companyPlanetRoots';
import { ActionNodeWorkspace } from '../components/workspace/ActionNodeWorkspace';

export default function WorkspacePage() {
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('companyId') || 'demo';
  const companyName = searchParams.get('companyName') || 'My Workspace';
  const role = (searchParams.get('role') || 'founder') as UserPlanetRole;
  const rootId = searchParams.get('rootId');
  const branchId = searchParams.get('branchId');
  const actionId = searchParams.get('actionId');

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const planetContext = useMemo(() => {
    return getPlanetRootsForCompany(companyId, companyName, role);
  }, [companyId, companyName, role]);

  const resolvedNodes = useMemo(() => {
    if (!rootId || !branchId || !actionId) return null;
    const root = planetContext.roots.find(r => r.id === rootId);
    if (!root) return null;
    const branch = root.branches.find(b => b.id === branchId);
    if (!branch) return null;
    const action = branch.actions.find(a => a.id === actionId);
    if (!action) return null;
    return { root, branch, action };
  }, [planetContext, rootId, branchId, actionId]);

  if (!mounted) return null;

  if (!resolvedNodes) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white/50">
        Workspace node not found. Please launch this from the 3D Universe.
      </div>
    );
  }

  // The ActionNodeWorkspace itself will handle the full-screen layout 
  // since we will modify it to span 100% width and height.
  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      <ActionNodeWorkspace
        actionNode={resolvedNodes.action}
        branchNode={resolvedNodes.branch}
        rootNode={resolvedNodes.root}
        context={planetContext}
        fullScreen={true}
        onClose={() => {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ type: 'ACTION_WORKSPACE_CLOSED' }, '*');
          }
          window.close();
        }}
      />
    </div>
  );
}
