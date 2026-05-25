import UniversalPolytope from '../components/UniversalPolytope';
import { useAuth } from '../lib/auth';
import { useCompany } from '../lib/db/companies';

export default function UniversalPage() {
  const { profile } = useAuth();
  const { company } = useCompany(profile?.company_id);
  
  // Use the actual company name from the database, fallback to heuristic if loading
  const companyName = company?.name || (profile?.company_id ? profile?.first_name ? `${profile.first_name}'s workspace` : 'My workspace' : 'Universal Polytope');

  return (
    <div className="w-full h-[calc(100vh-56px)] -mb-8 bg-[#05040f] overflow-hidden">
      <div className="w-full h-full relative">
        <UniversalPolytope companyName={companyName} />
      </div>
    </div>
  );
}
