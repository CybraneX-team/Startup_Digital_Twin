export type PersistedUniverseNavLevel = 'industry' | 'subdomain' | 'company';

export type PersistedUniverseNav = {
  level: PersistedUniverseNavLevel;
  industryId: string;
  subdomainId?: string;
  companyId?: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
};

const STORAGE_KEY = 'universe3d_nav_state';

export function saveUniverseNavState(state: PersistedUniverseNav | null): void {
  if (!state) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadUniverseNavState(): PersistedUniverseNav | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedUniverseNav;
    if (!parsed?.level || !parsed?.industryId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearUniverseNavState(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
