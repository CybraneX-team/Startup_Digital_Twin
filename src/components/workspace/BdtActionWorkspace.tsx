import { useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { PlasmaSphere } from '../PolytopeShared';
import { X, ChevronRight, Zap, Briefcase, Activity, Bookmark, BookmarkCheck, ExternalLink, Users, UserPlus, Pencil, Trash2 } from 'lucide-react';
import type { UInternalNode, UExternalNode } from '../../lib/usePolytopeStore';
import { U_DOMAIN_COLOR } from '../../lib/usePolytopeStore';
import { useSavedWorkflows } from '../../lib/useSavedWorkflows';

export interface BdtActionWorkspaceProps {
  node: UInternalNode;
  department: UExternalNode;
  allDepartments: UExternalNode[];
  onClose: () => void;
  onDepartmentClick: (deptId: string) => void;
  isOpen?: boolean;
  canEdit?: boolean;
  onAddMember?: (deptId: string, nodeId: string) => void;
  onEditMember?: (dept: UExternalNode, node: UInternalNode, memberIndex: number) => void;
  onDeleteMember?: (dept: UExternalNode, node: UInternalNode, memberIndex: number) => void;
}

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon?: any }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon className="w-3.5 h-3.5 text-white/40" />}
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">{children}</span>
    </div>
  );
}

function GlassCard({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; }) {
  return (
    <div className={`anw-glass-card ${className}`} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '20px', ...style }}>
      {children}
    </div>
  );
}

export function BdtActionWorkspace({
  node,
  department,
  allDepartments,
  onClose,
  onDepartmentClick,
  isOpen = true,
  canEdit = false,
  onAddMember,
  onEditMember,
  onDeleteMember,
}: BdtActionWorkspaceProps) {
  const primaryColor = U_DOMAIN_COLOR[department.domain] || '#8b5cf6';
  const isTeamNode = node.type === 'team';
  const teamMembers = node.members ?? [];
  const teamMemberCount = node.memberCount ?? teamMembers.length;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('workspace_toggled', { detail: isOpen }));
    return () => {
      window.dispatchEvent(new CustomEvent('workspace_toggled', { detail: false }));
    };
  }, [isOpen]);

  const { save, remove, has, getId } = useSavedWorkflows();

  const lookup = {
    companyId: 'bdt-universal',
    role: 'founder' as any,
    rootId: department.id,
    branchId: department.id,
    actionId: node.id,
  };

  const alreadySaved = has(lookup);

  const handleToggleSave = useCallback(() => {
    if (alreadySaved) {
      const id = getId(lookup);
      if (id) remove(id);
    } else {
      save({
        level: 'action',
        companyId: lookup.companyId,
        companyName: 'Universal Polytope',
        role: lookup.role,
        roleLabel: 'Founder',
        rootId: department.id,
        rootLabel: department.label,
        rootColor: primaryColor,
        branchId: department.id,
        branchLabel: department.label,
        actionId: node.id,
        actionLabel: node.label,
        actionHint: node.type,
      });
    }
  }, [alreadySaved, save, remove, getId, lookup.companyId, lookup.role, department.id, department.label, primaryColor, node.id, node.label, node.type]);
  
  const PanelIcon = Activity;

  // Interrelated departments resolution
  const interrelatedDepts = (node.interrelatedDepartments || []).map(id => {
    return allDepartments.find(d => d.id === id);
  }).filter(Boolean) as UExternalNode[];

  return (
    <div 
      className="absolute inset-0 z-50 pointer-events-none flex"
      style={{ 
        opacity: isOpen ? 1 : 0,
        transition: 'opacity 0.4s ease-in-out',
        pointerEvents: isOpen ? 'auto' : 'none'
      }}
    >
      {/* LEFT 25% Node Overlay */}
      <div 
        className="w-[25vw] h-full relative flex items-center justify-center"
        style={{
          transform: isOpen ? 'scale(1) translateX(0)' : 'scale(0.8) translateX(-100px)',
          opacity: isOpen ? 1 : 0,
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          transitionDelay: isOpen ? '0.2s' : '0s'
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} />
            <group position={[0, 0.1, 0]}>
              <PlasmaSphere
                color={primaryColor}
                radius={0.375}
                opacity={1.0}
                glowIntensity={3.5}
                halo={false}
                depthWrite={false}
                speed={1.5}
              />
              <Billboard follow={true} lockX={false} lockY={false} lockZ={false} position={[0, -0.9, 0]}>
                <Text
                  color="#ffffff"
                  fontSize={0.12}
                  maxWidth={2.0}
                  lineHeight={1.1}
                  letterSpacing={0.06}
                  textAlign="center"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.008}
                  outlineColor="#000000"
                >
                  {node.label}
                </Text>
              </Billboard>
            </group>
          </Canvas>
        </div>
      </div>

      {/* RIGHT 75% Workspace Layout */}
      <div 
        className="w-[75vw] h-full relative z-10 flex flex-col overflow-hidden rounded-l-2xl shadow-2xl pointer-events-auto text-white"
        style={{ 
          background: 'rgba(10, 10, 14, 0.35)', 
          backdropFilter: 'blur(48px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.5)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
      {/* Dynamic ambient glow based on primary color */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20" 
        style={{ 
          background: `radial-gradient(circle at 50% -20%, ${primaryColor}40 0%, transparent 60%), 
                       radial-gradient(circle at 120% 80%, ${primaryColor}30 0%, transparent 50%)` 
        }} 
      />

      {/* Top Header Navigation */}
      <header className="relative z-10 shrink-0 px-8 py-5 flex items-center justify-between border-b rounded-tl-2xl" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(24px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg" style={{ background: `linear-gradient(135deg, ${primaryColor}33, ${primaryColor}22)`, border: `1px solid ${primaryColor}44`, boxShadow: `0 0 20px ${primaryColor}20` }}>
            <PanelIcon className="w-5 h-5" style={{ color: primaryColor }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest" style={{ background: `${primaryColor}22`, color: primaryColor, border: `1px solid ${primaryColor}44` }}>
                {node.type}
              </span>
              <span className="text-white/20 text-[10px]">/</span>
              <span className="text-[11px] text-white/40 uppercase tracking-wider">{department.label}</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              <span style={{ color: primaryColor }}>{department.label}</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/20" />
              <span className="text-white drop-shadow-md">{node.label}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110 shrink-0"
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Export To WorkOS
          </button>
          
          <button
            onClick={handleToggleSave}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${alreadySaved ? 'bg-white/10 text-white' : ''}`}
            style={{ 
              background: alreadySaved ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
              color: alreadySaved ? '#fff' : 'rgba(255,255,255,0.6)',
              border: alreadySaved ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.05)'
            }}
          >
            {alreadySaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            {alreadySaved ? 'Saved to Workflow' : 'Save Workflow'}
          </button>

          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 rounded-lg flex items-center gap-2 text-xs font-semibold transition-all hover:bg-white/10" 
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
          >
            <X className="w-3.5 h-3.5" />
            Close Workspace
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="relative z-10 flex-1 flex overflow-hidden">
        
        {/* Left Sidebar (Action Info & Context) */}
        <div className="w-80 shrink-0 flex flex-col border-r rounded-bl-2xl" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(10,10,14,0.4)', backdropFilter: 'blur(16px)' }}>
          <div className="p-6 flex-1 overflow-y-auto scrollbar-hide">
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2 leading-tight" style={{ textShadow: `0 0 30px ${primaryColor}40` }}>
              {node.label}
            </h1>
            
            <p className="text-sm leading-relaxed mb-8" style={{ color: primaryColor + 'aa' }}>
              Execute {node.type} tasks for {department.label}.
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <SectionTitle icon={Activity as any}>Task Status</SectionTitle>
                <div className="flex items-center gap-3 mt-3">
                  <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full w-1/4" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}88)` }} />
                  </div>
                  <span className="text-xs font-medium text-white/50">{node.score}%</span>
                </div>
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <SectionTitle icon={Briefcase as any}>Context</SectionTitle>
                <p className="text-xs text-white/50 leading-relaxed">
                  This task is part of the <strong>{department.label}</strong> workflow, optimizing your {department.domain} objectives.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area (Dynamic Panels) */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-hide relative">
          <div className="max-w-5xl mx-auto flex flex-col gap-5">
            {isTeamNode && (
              <GlassCard>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <SectionTitle icon={Users}>TEAM ROSTER</SectionTitle>
                    <p className="text-sm text-white/55">
                      {teamMemberCount} teammate{teamMemberCount === 1 ? '' : 's'} attached to this BDT node.
                    </p>
                  </div>
                  {canEdit && onAddMember && (
                    <button
                      type="button"
                      onClick={() => onAddMember(department.id, node.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:brightness-110 shrink-0"
                      style={{ background: `${primaryColor}18`, color: primaryColor, border: `1px solid ${primaryColor}40` }}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add Teammate
                    </button>
                  )}
                </div>

                {teamMembers.length === 0 ? (
                  <div className="rounded-xl border border-white/5 bg-[#111] px-4 py-5 text-sm text-white/40">
                    No teammates added yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {teamMembers.map((member, index) => (
                      <div
                        key={`${node.id}-member-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#111] p-3 group/member"
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{ background: `${primaryColor}18`, border: `1px solid ${primaryColor}35`, color: primaryColor }}
                        >
                          {member.name?.slice(0, 1).toUpperCase() || 'M'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white/90 truncate">{member.name}</p>
                          <p className="text-xs text-white/40 truncate">{member.role}</p>
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1 opacity-0 group-hover/member:opacity-100 transition-opacity shrink-0">
                            {onEditMember && (
                              <button
                                type="button"
                                onClick={() => onEditMember(department, node, index)}
                                className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors"
                                title="Edit teammate"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteMember && (
                              <button
                                type="button"
                                onClick={() => onDeleteMember(department, node, index)}
                                className="p-1.5 text-white/40 hover:text-rose-300 hover:bg-white/10 rounded transition-colors"
                                title="Delete teammate"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}

            <GlassCard>
              <SectionTitle icon={Zap}>WORKFLOW & DETAILS</SectionTitle>
              <h3 className="text-lg font-semibold text-white mb-4" style={{ color: primaryColor }}>{department.label}</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                {/* 1. Owner */}
                <div className="bg-[#111] p-4 rounded-xl border border-white/5">
                  <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Owner</p>
                  <p className="text-sm font-medium text-white/90">{node.owner || 'Domain Lead'}</p>
                </div>
                {/* 2. Status */}
                <div className="bg-[#111] p-4 rounded-xl border border-white/5">
                  <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Status</p>
                  <p className="text-sm font-medium text-white/90">{node.status || 'In Progress'}</p>
                </div>
                {/* 3. Output */}
                <div className="bg-[#111] p-4 rounded-xl border border-white/5">
                  <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Output</p>
                  <p className="text-sm font-medium text-white/90">{node.output || 'Deliverable'}</p>
                </div>
                {/* 4. Impact */}
                <div className="bg-[#111] p-4 rounded-xl border border-white/5">
                  <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">Impact</p>
                  <p className="text-sm font-medium text-white/90">{node.metricImpact || 'Efficiency'}</p>
                </div>
              </div>

              {node.workflowSteps && node.workflowSteps.length > 0 && (
                <div className="mb-8">
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">WORKFLOW STEPS</h4>
                  <div className="flex flex-col gap-4">
                    {node.workflowSteps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white/5 border border-white/10 shrink-0 text-xs text-white/60">
                          {idx + 1}
                        </div>
                        <p className="text-sm text-white/80">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {interrelatedDepts.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">INTERRELATED DEPARTMENTS</h4>
                  <div className="flex flex-col gap-3">
                    {interrelatedDepts.map(d => {
                      const dColor = U_DOMAIN_COLOR[d.domain] || '#8b5cf6';
                      return (
                        <button
                          key={d.id}
                          onClick={() => onDepartmentClick(d.id)}
                          className="w-full flex items-center justify-between p-3 rounded-xl border border-white/5 bg-[#111] hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dColor }} />
                            <span className="text-sm font-medium text-white/80">{d.label}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-white/20" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>

      </div>
    </div>
    </div>
  );
}
