import { createContext, useContext, useState, type ReactNode } from 'react';


export interface OKRGoal {
  id: string;
  label: string;
  done: boolean;
}

export interface DepartmentFTE {
  id: string;
  name: string;
  fte: number;
  roles: string[];
}

export interface RiskBlocker {
  id: string;
  label: string;
  status: 'Active' | 'Mitigated';
  impact: 'High' | 'Medium' | 'Low';
}

export interface GTMChannel {
  id: string;
  name: string;
  budget: number; // percentage (0-100)
  impact: string;
}

export interface FocusTask {
  id: string;
  label: string;
  done: boolean;
}

interface FounderWorkspaceContextType {
  // OKRs & Goals
  goals: OKRGoal[];
  toggleGoal: (id: string) => void;
  addGoal: (label: string) => void;
  goalProgress: number;

  // Financial Metrics
  cashBalance: number;
  baseMRR: number;
  mrrGrowthRate: number; // 0 to 50 %
  setMrrGrowthRate: (rate: number) => void;
  operatingBurn: number;
  projectedRunway: number; // in months
  monthlyRev: number;

  // Departments & FTE
  departments: DepartmentFTE[];
  hireHeadcount: (deptId: string, role: string) => void;
  totalFTE: number;

  // Risks & Blockers
  risks: RiskBlocker[];
  mitigateRisk: (id: string) => void;
  addRisk: (label: string, impact: 'High' | 'Medium' | 'Low') => void;
  confidenceScore: number;

  // GTM & Channels
  gtmChannels: GTMChannel[];
  updateGTMChannelBudget: (id: string, budget: number) => void;

  // Focus Today Tasks
  tasks: FocusTask[];
  toggleTask: (id: string) => void;
  addTask: (label: string) => void;
  dismissTask: (id: string) => void;
  
  resetWorkspace: () => void;
}

const FounderWorkspaceContext = createContext<FounderWorkspaceContextType | undefined>(undefined);

const DEFAULT_GOALS: OKRGoal[] = [
  { id: 'g1', label: 'Launch Canvas v2', done: false },
  { id: 'g2', label: 'Hire VP of Eng', done: false },
  { id: 'g3', label: 'Close Seed Round', done: false },
];

const DEFAULT_DEPARTMENTS: DepartmentFTE[] = [
  { id: 'eng', name: 'Product & Eng', fte: 14, roles: ['Director of Engineering', 'Tech Lead', '6x Fullstack Devs', '3x Frontend Devs', '3x AI Engineers'] },
  { id: 'gtm', name: 'Sales & GTM', fte: 8, roles: ['VP of Sales', '2x Account Executives', '4x SDRs', 'Developer Advocate'] },
  { id: 'ops', name: 'Ops & Finance', fte: 3, roles: ['Chief of Staff', 'Finance Manager', 'Operations Specialist'] },
  { id: 'hr', name: 'HR & Recruiting', fte: 2, roles: ['Senior Recruiter', 'HR Generalist'] },
];

const DEFAULT_RISKS: RiskBlocker[] = [
  { id: 'r1', label: 'Recruiting delay: VP Eng candidate dropoff', status: 'Active', impact: 'High' },
  { id: 'r2', label: 'Competitor pricing: Meta undercutting API costs', status: 'Active', impact: 'Medium' },
  { id: 'r3', label: 'Compliance deadline: SOC2 audit readiness gap', status: 'Active', impact: 'High' },
];

const DEFAULT_GTM: GTMChannel[] = [
  { id: 'direct', name: 'Direct Enterprise GTM', budget: 50, impact: 'High LTV' },
  { id: 'seo', name: 'Inbound SEO/Content', budget: 30, impact: 'Low CAC' },
  { id: 'devrel', name: 'Developer Relations', budget: 20, impact: 'Viral Growth' },
];

const DEFAULT_TASKS: FocusTask[] = [
  { id: 't1', label: 'Review candidate resumes for VP Eng', done: false },
  { id: 't2', label: 'Finalize investor deck for Series A', done: false },
  { id: 't3', label: 'Approve Q2 budget proposal', done: false },
  { id: 't4', label: 'Review SOC2 compliance checklist', done: false },
];

export function FounderWorkspaceProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<OKRGoal[]>(DEFAULT_GOALS);
  const [departments, setDepartments] = useState<DepartmentFTE[]>(DEFAULT_DEPARTMENTS);
  const [risks, setRisks] = useState<RiskBlocker[]>(DEFAULT_RISKS);
  const [gtmChannels, setGtmChannels] = useState<GTMChannel[]>(DEFAULT_GTM);
  const [tasks, setTasks] = useState<FocusTask[]>(DEFAULT_TASKS);
  
  // Financial parameters
  const cashBalance = 1500000; // $1.5M cash
  const [mrrGrowthRate, setMrrGrowthRate] = useState(8); // 8% monthly growth
  const baseMRR = 125000; // $125k base MRR
  
  // Dynamic metrics
  const totalFTE = departments.reduce((acc, curr) => acc + curr.fte, 0);
  
  // Operating burn is base cost ($45k) + employee cost ($5.5k per FTE)
  const operatingBurn = 45000 + totalFTE * 5500;
  
  // Monthly revenue including growth multiplier
  const monthlyRev = Math.round(baseMRR * (1 + mrrGrowthRate / 100));
  
  // Net Burn = Operating Burn - Monthly Revenue (if monthly revenue is less than operating burn)
  const netBurn = Math.max(10000, operatingBurn - monthlyRev);
  const projectedRunway = Number((cashBalance / netBurn).toFixed(1));

  // Goal Progress
  const goalProgress = goals.length > 0 
    ? Math.round((goals.filter(g => g.done).length / goals.length) * 100) 
    : 0;

  // Confidence Score based on risks: starts at 50% and goes up by 15% per mitigated risk, capped at 100%
  const confidenceScore = Math.min(
    100,
    50 + risks.filter(r => r.status === 'Mitigated').length * 16.6
  );

  // Sync OKR goal completions to Focus Tasks
  const toggleGoal = (id: string) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        const nextDone = !g.done;
        // Check if there is an associated task and update it
        setTasks(tPrev => tPrev.map(t => {
          if (t.label.toLowerCase().includes(g.label.toLowerCase()) || 
              (g.id === 'g2' && t.id === 't1') || // VP Eng hiring sync
              (g.id === 'g3' && t.id === 't2')) { // Seed round deck sync
            return { ...t, done: nextDone };
          }
          return t;
        }));
        return { ...g, done: nextDone };
      }
      return g;
    }));
  };

  const addGoal = (label: string) => {
    const newId = `g_${Date.now()}`;
    setGoals(prev => [...prev, { id: newId, label, done: false }]);
    // Add to focus tasks as well
    setTasks(prev => [...prev, { id: `t_${Date.now()}`, label: `Align teams on OKR: ${label}`, done: false }]);
  };

  // Hire headcount
  const hireHeadcount = (deptId: string, role: string) => {
    setDepartments(prev => prev.map(d => {
      if (d.id === deptId) {
        return {
          ...d,
          fte: d.fte + 1,
          roles: [...d.roles, role],
        };
      }
      return d;
    }));
    // Add a corresponding task
    setTasks(prev => [
      { id: `t_${Date.now()}`, label: `Onboard new hire for ${role}`, done: false },
      ...prev
    ]);
  };

  // Mitigate risks
  const mitigateRisk = (id: string) => {
    setRisks(prev => prev.map(r => {
      if (r.id === id) {
        // Toggle status
        const nextStatus = r.status === 'Mitigated' ? 'Active' : 'Mitigated';
        // If mitigated, complete the corresponding task
        setTasks(tPrev => tPrev.map(t => {
          if ((r.id === 'r1' && t.id === 't1') || 
              (r.id === 'r3' && t.id === 't4') ||
              t.label.toLowerCase().includes(r.label.toLowerCase())) {
            return { ...t, done: nextStatus === 'Mitigated' };
          }
          return t;
        }));
        return { ...r, status: nextStatus };
      }
      return r;
    }));
  };

  const addRisk = (label: string, impact: 'High' | 'Medium' | 'Low') => {
    const newId = `r_${Date.now()}`;
    setRisks(prev => [...prev, { id: newId, label, status: 'Active', impact }]);
    // Add warning task
    setTasks(prev => [...prev, { id: `t_${Date.now()}`, label: `Mitigate risk: ${label}`, done: false }]);
  };

  // GTM Channels Budget adjustments
  const updateGTMChannelBudget = (id: string, budget: number) => {
    setGtmChannels(prev => {
      const target = prev.find(c => c.id === id);
      if (!target) return prev;
      
      const diff = budget - target.budget;
      const otherChannels = prev.filter(c => c.id !== id);
      
      // Distribute the inverse difference among other channels proportionally
      const otherSum = otherChannels.reduce((sum, c) => sum + c.budget, 0);
      if (otherSum === 0) {
        // Fallback split
        return prev.map(c => {
          if (c.id === id) return { ...c, budget };
          return { ...c, budget: Math.round((100 - budget) / otherChannels.length) };
        });
      }

      const updatedOther = otherChannels.map(c => {
        const share = c.budget / otherSum;
        const nextBudget = Math.max(0, Math.round(c.budget - diff * share));
        return { ...c, budget: nextBudget };
      });

      // Adjust the last one to make exactly sum to 100
      const total = budget + updatedOther.reduce((sum, c) => sum + c.budget, 0);
      if (total !== 100 && updatedOther.length > 0) {
        updatedOther[updatedOther.length - 1].budget += (100 - total);
      }

      return prev.map(c => {
        if (c.id === id) return { ...c, budget };
        const updated = updatedOther.find(uo => uo.id === c.id);
        return updated ? updated : c;
      });
    });
  };

  // Tasks operations
  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextDone = !t.done;
        // Check for goals/risks association
        if (t.id === 't1') {
          // VP Eng sync
          setRisks(rPrev => rPrev.map(r => r.id === 'r1' ? { ...r, status: nextDone ? 'Mitigated' : 'Active' } : r));
          setGoals(gPrev => gPrev.map(g => g.id === 'g2' ? { ...g, done: nextDone } : g));
        } else if (t.id === 't2') {
          // Seed round sync
          setGoals(gPrev => gPrev.map(g => g.id === 'g3' ? { ...g, done: nextDone } : g));
        } else if (t.id === 't4') {
          // SOC2 sync
          setRisks(rPrev => rPrev.map(r => r.id === 'r3' ? { ...r, status: nextDone ? 'Mitigated' : 'Active' } : r));
        }
        return { ...t, done: nextDone };
      }
      return t;
    }));
  };

  const addTask = (label: string) => {
    setTasks(prev => [...prev, { id: `t_${Date.now()}`, label, done: false }]);
  };

  const dismissTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const resetWorkspace = () => {
    setGoals(DEFAULT_GOALS);
    setDepartments(DEFAULT_DEPARTMENTS);
    setRisks(DEFAULT_RISKS);
    setGtmChannels(DEFAULT_GTM);
    setTasks(DEFAULT_TASKS);
    setMrrGrowthRate(8);
  };

  return (
    <FounderWorkspaceContext.Provider
      value={{
        goals,
        toggleGoal,
        addGoal,
        goalProgress,
        cashBalance,
        baseMRR,
        mrrGrowthRate,
        setMrrGrowthRate,
        operatingBurn,
        projectedRunway,
        monthlyRev,
        departments,
        hireHeadcount,
        totalFTE,
        risks,
        mitigateRisk,
        addRisk,
        confidenceScore,
        gtmChannels,
        updateGTMChannelBudget,
        tasks,
        toggleTask,
        addTask,
        dismissTask,
        resetWorkspace,
      }}
    >
      {children}
    </FounderWorkspaceContext.Provider>
  );
}

export function useFounderWorkspace() {
  const context = useContext(FounderWorkspaceContext);
  if (context === undefined) {
    throw new Error('useFounderWorkspace must be used within a FounderWorkspaceProvider');
  }
  return context;
}
