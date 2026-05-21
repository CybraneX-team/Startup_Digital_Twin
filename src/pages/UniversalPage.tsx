import UniversalPolytope from '../components/UniversalPolytope';

export default function UniversalPage() {
  return (
    <div className="w-full h-screen bg-[#05040f] overflow-hidden">
      <div className="w-full h-[110vh] -mt-[10vh]">
        <UniversalPolytope />
      </div>
    </div>
  );
}
