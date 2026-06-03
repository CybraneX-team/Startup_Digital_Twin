import { Briefcase, Rocket, TrendingUp } from 'lucide-react';
import type { UserPlanetRole } from '../data/companyPlanetRoots';

export interface CompanyRoleModalProps {
  companyName: string;
  industryColor?: string;
  onSelect: (role: UserPlanetRole) => void;
  onClose: () => void;
}

const ROLES: {
  id: UserPlanetRole;
  title: string;
  subtitle: string;
  icon: typeof Briefcase;
  accent: string;
}[] = [
  {
    id: 'career',
    title: 'Career User',
    subtitle: 'Roles, skills, hiring pathways, and network routes',
    icon: Briefcase,
    accent: '#60a5fa',
  },
  {
    id: 'founder',
    title: 'Founder',
    subtitle: 'Competition, customers, positioning, and people to contact',
    icon: Rocket,
    accent: '#f97316',
  },
  {
    id: 'investor',
    title: 'Investor',
    subtitle: 'Growth, moat, risk, capital signals, and diligence',
    icon: TrendingUp,
    accent: '#22d3ee',
  },
];

export default function CompanyRoleModal({
  companyName,
  industryColor = '#C1AEFF',
  onSelect,
  onClose,
}: CompanyRoleModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(8, 8, 12, 0.92)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 border-b border-white/5">
          <p className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: '#5E5E5E' }}>
            Industry OS · Planet Mode
          </p>
          <h2 className="text-lg font-semibold text-white mt-1">{companyName}</h2>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            Same planet, different root systems. Choose how you want to explore this company.
          </p>
        </div>

        <div className="p-4 flex flex-col gap-2">
          {ROLES.map(role => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => onSelect(role.id)}
                className="group flex items-start gap-3 w-full text-left px-3.5 py-3 rounded-xl transition-all hover:scale-[1.01]"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${role.accent}55`;
                  e.currentTarget.style.background = `${role.accent}12`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                }}
              >
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${role.accent}22`, color: role.accent }}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white group-hover:text-white">
                    {role.title}
                  </span>
                  <span className="block text-[11px] text-gray-400 mt-0.5 leading-snug">
                    {role.subtitle}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-5 pb-4 flex justify-between items-center">
          <span className="text-[10px]" style={{ color: industryColor }}>
            Roots sized by relevance · brighter = stronger signal
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
