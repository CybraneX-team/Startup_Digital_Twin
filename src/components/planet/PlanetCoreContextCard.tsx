import type { PlanetCoreDetails } from '../../data/companyPlanetRoots';

export interface PlanetCoreContextCardProps {
  details: PlanetCoreDetails;
  industryColor?: string;
}

/** Company + role summary — lives in the side panel, not on the map center */
export function PlanetCoreContextCard({
  details,
  industryColor = '#C1AEFF',
}: PlanetCoreContextCardProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden shrink-0"
      style={{
        width: '196px',
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: `1px solid ${industryColor}33`,
        boxShadow: `0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 ${industryColor}18`,
      }}
    >
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${industryColor}, transparent)`,
        }}
      />
      <div className="px-3.5 py-3.5">
        <span
          className="inline-block text-[9px] font-bold tracking-[0.14em] uppercase px-2.5 py-1 rounded-full"
          style={{
            color: industryColor,
            border: `1px solid ${industryColor}55`,
            background: `${industryColor}14`,
          }}
        >
          {details.roleTag}
        </span>
        <h2 className="mt-2.5 text-[15px] font-bold text-white leading-tight truncate">
          {details.headline}
        </h2>
        <p className="text-[10px] font-semibold mt-0.5" style={{ color: industryColor }}>
          {details.subline}
        </p>

        <div className="mt-3 pt-3 grid grid-cols-3 gap-2 border-t border-white/[0.06]">
          {details.metrics.map(m => (
            <div key={m.label} className="text-center min-w-0">
              <p className="text-[11px] font-bold text-zinc-100 truncate">{m.value}</p>
              <p className="text-[7px] uppercase tracking-wider text-zinc-500 mt-1 leading-tight">
                {m.label}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[8px] text-zinc-500 leading-relaxed tracking-wide">
          {details.focusHint}
        </p>
      </div>
    </div>
  );
}
