import { useState } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { 
  useSavedWorkflows, 
  COMPANY_TAG_LABELS, 
  COMPANY_TAG_ICONS, 
  COMPANY_TAG_COLORS, 
  type CompanyTag 
} from '../../lib/useSavedWorkflows';
import type { UserPlanetRole } from '../../data/companyPlanetRoots';

export interface CompanyTagDropdownProps {
  companyId: string;
  companyName: string;
  role?: UserPlanetRole; // Defaults to active_role in local storage or 'founder'
  industryColor?: string;
}

export function CompanyTagDropdown({
  companyId,
  companyName,
  role,
  industryColor = '#C1AEFF',
}: CompanyTagDropdownProps) {
  const { save, items, remove } = useSavedWorkflows();
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Resolve role
  const resolvedRole = role ?? ((localStorage.getItem('active_role') as UserPlanetRole) || 'founder');

  // Find if this specific planet is already tagged for this role
  const savedItem = items.find(
    i => i.level === 'planet' && i.companyId === companyId && i.role === resolvedRole
  );
  const activeTag = savedItem?.planetTag;

  const handleTag = (tag: CompanyTag, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Map roles to labels if we are guessing it
    const roleLabels: Record<UserPlanetRole, string> = {
      career: 'Career User',
      founder: 'Founder',
      investor: 'Investor'
    };

    if (activeTag === tag && savedItem) {
      remove(savedItem.id);
    } else {
      if (savedItem) remove(savedItem.id);
      save({
        level: 'planet',
        planetTag: tag,
        companyId,
        companyName,
        role: resolvedRole,
        roleLabel: roleLabels[resolvedRole],
      });
    }
    setMenuOpen(false);
  };

  const ActiveIcon = activeTag ? COMPANY_TAG_ICONS[activeTag] : null;
  const activeColor = activeTag ? COMPANY_TAG_COLORS[activeTag] : industryColor;

  return (
    <div className="relative w-full" onClick={e => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen(!menuOpen);
        }}
        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
        style={{
          background: activeTag ? `${activeColor}15` : 'rgba(255,255,255,0.03)',
          border: `1px solid ${activeTag ? activeColor + '40' : 'rgba(255,255,255,0.08)'}`,
          color: activeTag ? activeColor : 'rgba(255,255,255,0.5)',
        }}
      >
        <div className="flex items-center gap-2">
          {ActiveIcon && <ActiveIcon className="w-3.5 h-3.5" />}
          {activeTag ? COMPANY_TAG_LABELS[activeTag] : 'Tag Company'}
        </div>
        <ChevronRight className="w-3.5 h-3.5 transition-transform" />
      </button>

      {menuOpen && (
        <div
          className="absolute left-[115%] top-0 w-48 rounded-xl overflow-hidden shadow-2xl z-[9999] border border-white/10"
          style={{
            background: 'rgba(15, 15, 20, 0.95)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <div className="py-1">
            {(Object.entries(COMPANY_TAG_LABELS) as [CompanyTag, string][]).map(([tag, label]) => {
              const Icon = COMPANY_TAG_ICONS[tag];
              const color = COMPANY_TAG_COLORS[tag];
              const isActive = activeTag === tag;
              return (
                <button
                  key={tag}
                  onClick={(e) => handleTag(tag, e)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                    <span className="text-[11px] font-semibold text-white/80">{label}</span>
                  </div>
                  {isActive && <Check className="w-3.5 h-3.5" style={{ color }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
