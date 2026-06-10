// ─────────────────────────────────────────────────────────────────────────────
// Universal Polytope Data — Real Departments with Health Scores
//
// INACTIVE NODE FORMULA:
//   inactiveCount = nextPolytopeTarget(deptCount) - deptCount
//   Targets: [12, 20, 30, 42, 56, 72, 90, 110, 132]
//   13 depts → target 20 → 7 inactive nodes
// ─────────────────────────────────────────────────────────────────────────────

export type UDomain = 'direction' | 'build' | 'delivery' | 'market' | 'control' | 'people' | 'inactive';

export const U_DOMAIN_COLOR: Record<UDomain, string> = {
  direction: '#fde047',
  build:     '#8b5cf6',
  delivery:  '#06b6d4',
  market:    '#f97316',
  control:   '#10b981',
  people:    '#0ea5e9',
  inactive:  '#334155',
};

export interface TeamMember {
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface ProjectDetails {
  description?: string;
  status?: string;
  deadline?: string;
  budget?: string;
}

export interface UInternalNode {
  id: string;
  label: string;
  type: 'team' | 'process' | 'project' | 'resource' | 'decision' | 'risk' | 'metric';
  score: number;
  children?: UInternalNode[];
  memberCount?: number;
  members?: TeamMember[];
  projectDetails?: ProjectDetails;
}

export interface UExternalNode {
  id: string;
  label: string;
  domain: UDomain;
  cluster: string;
  score: number;
  metrics: {
    performance: number;
    efficiency: number;
    capacity: number;
    alignment: number;
    risk: number;
  };
  internalNodes: UInternalNode[];
  /** Transient flag — draft nodes are rendered in-scene but not persisted */
  isDraft?: boolean;
}

// ── Polytope vertex-count targets ───────────────────────────────────────────
const POLYTOPE_TARGETS = [12, 20, 30, 42, 56, 72, 90, 110, 132];

export function resolvePolytopeNodeCount(deptCount: number): {
  totalNodes: number;
  inactiveCount: number;
} {
  const minTotal = deptCount + 4;
  const target = POLYTOPE_TARGETS.find(t => t >= minTotal) ??
    Math.ceil(minTotal / 12) * 12;
  return { totalNodes: target, inactiveCount: target - deptCount };
}

// ── Internal node definitions per department ────────────────────────────────
type InternalDef = { 
  label: string; 
  type: UInternalNode['type']; 
  score: number; 
  memberCount?: number;
  members?: TeamMember[];
  projectDetails?: ProjectDetails;
  children?: InternalDef[] 
};

function buildTree(parentId: string, defs: InternalDef[], depth = 1): UInternalNode[] {
  return defs.map((d, i) => ({
    id: `${parentId}_d${depth}_${i}`,
    label: d.label,
    type: d.type,
    score: d.score,
    memberCount: d.memberCount,
    members: d.members,
    projectDetails: d.projectDetails,
    children: d.children ? buildTree(`${parentId}_d${depth}_${i}`, d.children, depth + 1) : [],
  }));
}

// Helper to gen members
function genMembers(count: number, roles: string[]): TeamMember[] {
  return Array.from({ length: count }).map((_, i) => ({
    name: `Member ${i + 1}`,
    role: roles[i % roles.length],
    avatarUrl: `https://i.pravatar.cc/150?u=user${Math.random()}`
  }));
}

// ── 13 Real Departments ─────────────────────────────────────────────────────
const DEPARTMENTS: UExternalNode[] = [
  {
    "id": "dept_engineering",
    "label": "Engineering",
    "domain": "build",
    "cluster": "Build",
    "score": 20,
    "metrics": {
      "performance": 91,
      "efficiency": 85,
      "capacity": 78,
      "alignment": 88,
      "risk": 14
    },
    "internalNodes": [
      {
        "id": "eng_d1_0",
        "label": "Backend Team",
        "type": "team",
        "score": 90,
        "children": [
          {
            "id": "eng_d1_0_d2_0",
            "label": "API Services",
            "type": "process",
            "score": 88,
            "children": [
              {
                "id": "eng_d1_0_d2_0_d3_0",
                "label": "Auth Module",
                "type": "resource",
                "score": 85,
                "children": []
              },
              {
                "id": "eng_d1_0_d2_0_d3_1",
                "label": "Rate Limiter",
                "type": "process",
                "score": 79,
                "children": []
              }
            ]
          },
          {
            "id": "eng_d1_0_d2_1",
            "label": "DB Migrations",
            "type": "project",
            "score": 76,
            "children": []
          }
        ]
      },
      {
        "id": "eng_d1_1",
        "label": "Frontend Team",
        "type": "team",
        "score": 85,
        "children": [
          {
            "id": "eng_d1_1_d2_0",
            "label": "Design System",
            "type": "project",
            "score": 92,
            "children": []
          },
          {
            "id": "eng_d1_1_d2_1",
            "label": "Perf Optimise",
            "type": "process",
            "score": 80,
            "children": []
          }
        ]
      },
      {
        "id": "eng_d1_2",
        "label": "Infra & DevOps",
        "type": "process",
        "score": 82,
        "children": [
          {
            "id": "eng_d1_2_d2_0",
            "label": "CI/CD Pipeline",
            "type": "process",
            "score": 88,
            "children": []
          },
          {
            "id": "eng_d1_2_d2_1",
            "label": "Cloud Costs",
            "type": "metric",
            "score": 70,
            "children": []
          }
        ]
      },
      {
        "id": "eng_d1_3",
        "label": "Tech Debt Risk",
        "type": "risk",
        "score": 62,
        "children": []
      }
    ]
  },
  {
    "id": "dept_product",
    "label": "Product",
    "domain": "direction",
    "cluster": "Direction",
    "score": 91,
    "metrics": {
      "performance": 93,
      "efficiency": 90,
      "capacity": 85,
      "alignment": 95,
      "risk": 8
    },
    "internalNodes": [
      {
        "id": "prd_d1_0",
        "label": "Roadmap Planning",
        "type": "process",
        "score": 94,
        "children": [
          {
            "id": "prd_d1_0_d2_0",
            "label": "Q3 Milestones",
            "type": "project",
            "score": 91,
            "children": []
          },
          {
            "id": "prd_d1_0_d2_1",
            "label": "Q4 Roadmap",
            "type": "project",
            "score": 88,
            "children": []
          }
        ]
      },
      {
        "id": "prd_d1_1",
        "label": "User Research",
        "type": "team",
        "score": 89,
        "children": [
          {
            "id": "prd_d1_1_d2_0",
            "label": "Interview Ops",
            "type": "process",
            "score": 87,
            "children": []
          },
          {
            "id": "prd_d1_1_d2_1",
            "label": "Usability Tests",
            "type": "metric",
            "score": 84,
            "children": []
          },
          {
            "label": "vfsdfvsv",
            "type": "team",
            "score": 75,
            "id": "node_1780051712818",
            "children": []
          }
        ]
      },
      {
        "id": "prd_d1_2",
        "label": "Feature Prioritise",
        "type": "decision",
        "score": 92,
        "children": []
      },
      {
        "id": "prd_d1_3",
        "label": "OKR Alignment",
        "type": "metric",
        "score": 95,
        "children": []
      },
      {
        "label": "sfwfwe",
        "type": "team",
        "score": 75,
        "id": "node_1780051689854",
        "children": []
      },
      {
        "label": "fukvukjuy",
        "type": "team",
        "score": 75,
        "id": "node_1780215997525",
        "children": []
      }
    ]
  },
  {
    "id": "dept_sales",
    "label": "Sales",
    "domain": "market",
    "cluster": "Market",
    "score": 78,
    "metrics": {
      "performance": 80,
      "efficiency": 74,
      "capacity": 82,
      "alignment": 76,
      "risk": 22
    },
    "internalNodes": [
      {
        "id": "sal_d1_0",
        "label": "Enterprise Sales",
        "type": "team",
        "score": 83,
        "children": [
          {
            "id": "sal_d1_0_d2_0",
            "label": "Account Execs",
            "type": "resource",
            "score": 80,
            "children": []
          },
          {
            "id": "sal_d1_0_d2_1",
            "label": "Deal Pipeline",
            "type": "process",
            "score": 77,
            "children": []
          }
        ]
      },
      {
        "id": "sal_d1_1",
        "label": "SMB Sales",
        "type": "team",
        "score": 75,
        "children": [
          {
            "id": "sal_d1_1_d2_0",
            "label": "Inbound Leads",
            "type": "process",
            "score": 78,
            "children": []
          },
          {
            "id": "sal_d1_1_d2_1",
            "label": "Conversion Rate",
            "type": "metric",
            "score": 69,
            "children": []
          }
        ]
      },
      {
        "id": "sal_d1_2",
        "label": "CRM Hygiene",
        "type": "process",
        "score": 65,
        "children": []
      },
      {
        "id": "sal_d1_3",
        "label": "Churn Risk",
        "type": "risk",
        "score": 55,
        "children": []
      },
      {
        "label": "ckdj",
        "type": "team",
        "score": 75,
        "id": "node_1780050085995",
        "children": []
      }
    ]
  },
  {
    "id": "dept_marketing",
    "label": "Marketing",
    "domain": "market",
    "cluster": "Market",
    "score": 72,
    "metrics": {
      "performance": 75,
      "efficiency": 68,
      "capacity": 74,
      "alignment": 72,
      "risk": 26
    },
    "internalNodes": [
      {
        "id": "mkt_d1_0",
        "label": "Brand & Content",
        "type": "team",
        "score": 80,
        "children": [
          {
            "id": "mkt_d1_0_d2_0",
            "label": "Blog & SEO",
            "type": "process",
            "score": 78,
            "children": []
          },
          {
            "id": "mkt_d1_0_d2_1",
            "label": "Social Media",
            "type": "process",
            "score": 70,
            "children": []
          }
        ]
      },
      {
        "id": "mkt_d1_1",
        "label": "Growth & Demand",
        "type": "process",
        "score": 68,
        "children": [
          {
            "id": "mkt_d1_1_d2_0",
            "label": "Paid Ads",
            "type": "resource",
            "score": 62,
            "children": []
          },
          {
            "id": "mkt_d1_1_d2_1",
            "label": "CAC Metric",
            "type": "metric",
            "score": 65,
            "children": []
          }
        ]
      },
      {
        "id": "mkt_d1_2",
        "label": "Campaign Budget",
        "type": "risk",
        "score": 58,
        "children": []
      }
    ]
  },
  {
    "id": "dept_hr",
    "label": "People & HR",
    "domain": "people",
    "cluster": "People",
    "score": 84,
    "metrics": {
      "performance": 86,
      "efficiency": 82,
      "capacity": 80,
      "alignment": 88,
      "risk": 12
    },
    "internalNodes": [
      {
        "id": "hr_d1_0",
        "label": "Talent Acquisition",
        "type": "process",
        "score": 88,
        "children": [
          {
            "id": "hr_d1_0_d2_0",
            "label": "Interview Process",
            "type": "process",
            "score": 85,
            "children": []
          },
          {
            "id": "hr_d1_0_d2_1",
            "label": "Offer Pipeline",
            "type": "metric",
            "score": 82,
            "children": []
          }
        ]
      },
      {
        "id": "hr_d1_1",
        "label": "L&D Programs",
        "type": "project",
        "score": 84,
        "children": [
          {
            "id": "hr_d1_1_d2_0",
            "label": "Onboarding",
            "type": "process",
            "score": 90,
            "children": []
          },
          {
            "id": "hr_d1_1_d2_1",
            "label": "Skills Matrix",
            "type": "resource",
            "score": 78,
            "children": []
          }
        ]
      },
      {
        "id": "hr_d1_2",
        "label": "Employee NPS",
        "type": "metric",
        "score": 80,
        "children": []
      },
      {
        "id": "hr_d1_3",
        "label": "Attrition Risk",
        "type": "risk",
        "score": 72,
        "children": []
      },
      {
        "label": "Customer realationship",
        "type": "team",
        "score": 30,
        "id": "node_1779772360113",
        "children": []
      }
    ]
  },
  {
    "id": "dept_finance",
    "label": "Finance",
    "domain": "control",
    "cluster": "Control",
    "score": 93,
    "metrics": {
      "performance": 95,
      "efficiency": 92,
      "capacity": 90,
      "alignment": 94,
      "risk": 6
    },
    "internalNodes": [
      {
        "id": "fin_d1_0",
        "label": "FP&A",
        "type": "process",
        "score": 96,
        "children": [
          {
            "id": "fin_d1_0_d2_0",
            "label": "P&L Reporting",
            "type": "metric",
            "score": 94,
            "children": []
          },
          {
            "id": "fin_d1_0_d2_1",
            "label": "Budget Tracking",
            "type": "process",
            "score": 92,
            "children": []
          }
        ]
      },
      {
        "id": "fin_d1_1",
        "label": "Treasury Ops",
        "type": "resource",
        "score": 90,
        "children": [
          {
            "id": "fin_d1_1_d2_0",
            "label": "Cash Flow Mgmt",
            "type": "metric",
            "score": 93,
            "children": []
          },
          {
            "id": "fin_d1_1_d2_1",
            "label": "FX Hedging",
            "type": "decision",
            "score": 88,
            "children": []
          }
        ]
      },
      {
        "id": "fin_d1_2",
        "label": "Audit Readiness",
        "type": "process",
        "score": 91,
        "children": []
      },
      {
        "id": "fin_d1_3",
        "label": "Compliance Risk",
        "type": "risk",
        "score": 85,
        "children": []
      }
    ]
  },
  {
    "id": "dept_operations",
    "label": "Operations",
    "domain": "control",
    "cluster": "Delivery",
    "score": 61,
    "metrics": {
      "performance": 63,
      "efficiency": 58,
      "capacity": 65,
      "alignment": 60,
      "risk": 38
    },
    "internalNodes": [
      {
        "id": "ops_d1_0",
        "label": "Supply Chain",
        "type": "process",
        "score": 60,
        "children": [
          {
            "id": "ops_d1_0_d2_0",
            "label": "Vendor Mgmt",
            "type": "resource",
            "score": 58,
            "children": []
          },
          {
            "id": "ops_d1_0_d2_1",
            "label": "Lead Times",
            "type": "metric",
            "score": 55,
            "children": []
          }
        ]
      },
      {
        "id": "ops_d1_1",
        "label": "Logistics",
        "type": "process",
        "score": 62,
        "children": [
          {
            "id": "ops_d1_1_d2_0",
            "label": "Last-Mile Ops",
            "type": "process",
            "score": 57,
            "children": []
          },
          {
            "id": "ops_d1_1_d2_1",
            "label": "Delivery SLA",
            "type": "metric",
            "score": 60,
            "children": []
          }
        ]
      },
      {
        "id": "ops_d1_2",
        "label": "Bottleneck Risk",
        "type": "risk",
        "score": 45,
        "children": []
      }
    ]
  },
  {
    "id": "dept_data",
    "label": "Data & Analytics",
    "domain": "build",
    "cluster": "Build",
    "score": 76,
    "metrics": {
      "performance": 78,
      "efficiency": 74,
      "capacity": 72,
      "alignment": 79,
      "risk": 20
    },
    "internalNodes": [
      {
        "id": "dat_d1_0",
        "label": "Data Engineering",
        "type": "team",
        "score": 80,
        "children": [
          {
            "id": "dat_d1_0_d2_0",
            "label": "Data Pipelines",
            "type": "process",
            "score": 77,
            "children": []
          },
          {
            "id": "dat_d1_0_d2_1",
            "label": "Warehouse Mgmt",
            "type": "resource",
            "score": 74,
            "children": []
          }
        ]
      },
      {
        "id": "dat_d1_1",
        "label": "BI & Reporting",
        "type": "team",
        "score": 75,
        "children": [
          {
            "id": "dat_d1_1_d2_0",
            "label": "Dashboard Suite",
            "type": "project",
            "score": 78,
            "children": []
          },
          {
            "id": "dat_d1_1_d2_1",
            "label": "Data Quality",
            "type": "metric",
            "score": 68,
            "children": []
          }
        ]
      },
      {
        "id": "dat_d1_2",
        "label": "ML Platform",
        "type": "project",
        "score": 72,
        "children": []
      },
      {
        "id": "dat_d1_3",
        "label": "Data Governance",
        "type": "process",
        "score": 65,
        "children": []
      }
    ]
  },
  {
    "id": "dept_design",
    "label": "Design",
    "domain": "build",
    "cluster": "Build",
    "score": 88,
    "metrics": {
      "performance": 91,
      "efficiency": 87,
      "capacity": 83,
      "alignment": 90,
      "risk": 10
    },
    "internalNodes": [
      {
        "id": "des_d1_0",
        "label": "UX Research",
        "type": "team",
        "score": 90,
        "children": [
          {
            "id": "des_d1_0_d2_0",
            "label": "Heuristic Review",
            "type": "process",
            "score": 88,
            "children": []
          },
          {
            "id": "des_d1_0_d2_1",
            "label": "Prototype Tests",
            "type": "project",
            "score": 85,
            "children": []
          }
        ]
      },
      {
        "id": "des_d1_1",
        "label": "Visual Design",
        "type": "team",
        "score": 87,
        "children": [
          {
            "id": "des_d1_1_d2_0",
            "label": "Brand System",
            "type": "resource",
            "score": 92,
            "children": []
          },
          {
            "id": "des_d1_1_d2_1",
            "label": "Icon Library",
            "type": "project",
            "score": 84,
            "children": []
          }
        ]
      },
      {
        "id": "des_d1_2",
        "label": "Design Ops",
        "type": "process",
        "score": 85,
        "children": []
      }
    ]
  },
  {
    "id": "dept_security",
    "label": "Security",
    "domain": "control",
    "cluster": "Control",
    "score": 69,
    "metrics": {
      "performance": 71,
      "efficiency": 65,
      "capacity": 68,
      "alignment": 73,
      "risk": 32
    },
    "internalNodes": [
      {
        "id": "sec_d1_0",
        "label": "AppSec",
        "type": "process",
        "score": 73,
        "children": [
          {
            "id": "sec_d1_0_d2_0",
            "label": "SAST / DAST",
            "type": "process",
            "score": 70,
            "children": []
          },
          {
            "id": "sec_d1_0_d2_1",
            "label": "Pen Test Cycle",
            "type": "project",
            "score": 68,
            "children": []
          }
        ]
      },
      {
        "id": "sec_d1_1",
        "label": "Infra Security",
        "type": "process",
        "score": 68,
        "children": [
          {
            "id": "sec_d1_1_d2_0",
            "label": "Zero Trust Net",
            "type": "project",
            "score": 65,
            "children": []
          },
          {
            "id": "sec_d1_1_d2_1",
            "label": "IAM Policy",
            "type": "resource",
            "score": 72,
            "children": []
          }
        ]
      },
      {
        "id": "sec_d1_2",
        "label": "Incident Response",
        "type": "process",
        "score": 62,
        "children": []
      },
      {
        "id": "sec_d1_3",
        "label": "Compliance Gap",
        "type": "risk",
        "score": 55,
        "children": []
      },
      {
        "id": "sec_d1_4",
        "label": "Threat Intel",
        "type": "process",
        "score": 75,
        "children": []
      },
      {
        "id": "sec_d1_5",
        "label": "Endpoint Protection",
        "type": "resource",
        "score": 82,
        "children": []
      },
      {
        "id": "sec_d1_6",
        "label": "Cloud Security",
        "type": "team",
        "score": 78,
        "children": []
      },
      {
        "id": "sec_d1_7",
        "label": "Data Privacy",
        "type": "process",
        "score": 85,
        "children": []
      },
      {
        "id": "sec_d1_8",
        "label": "Vulnerability Mgmt",
        "type": "process",
        "score": 66,
        "children": []
      },
      {
        "id": "sec_d1_9",
        "label": "Phishing Training",
        "type": "project",
        "score": 70,
        "children": []
      },
      {
        "id": "sec_d1_10",
        "label": "Access Control",
        "type": "decision",
        "score": 88,
        "children": []
      },
      {
        "id": "sec_d1_11",
        "label": "Security Audits",
        "type": "metric",
        "score": 80,
        "children": []
      },
      {
        "id": "sec_d1_12",
        "label": "Vendor Risk",
        "type": "risk",
        "score": 55,
        "children": []
      },
      {
        "id": "sec_d1_13",
        "label": "Disaster Recovery",
        "type": "process",
        "score": 64,
        "children": []
      }
    ]
  },
  {
    "id": "dept_legal",
    "label": "Legal & Compliance",
    "domain": "control",
    "cluster": "Control",
    "score": 89,
    "metrics": {
      "performance": 91,
      "efficiency": 88,
      "capacity": 86,
      "alignment": 92,
      "risk": 9
    },
    "internalNodes": [
      {
        "id": "leg_d1_0",
        "label": "Contract Mgmt",
        "type": "process",
        "score": 92,
        "children": [
          {
            "id": "leg_d1_0_d2_0",
            "label": "NDA Workflow",
            "type": "process",
            "score": 90,
            "children": []
          },
          {
            "id": "leg_d1_0_d2_1",
            "label": "SaaS Agreements",
            "type": "resource",
            "score": 88,
            "children": []
          }
        ]
      },
      {
        "id": "leg_d1_1",
        "label": "GDPR & Privacy",
        "type": "process",
        "score": 88,
        "children": [
          {
            "id": "leg_d1_1_d2_0",
            "label": "Data Mapping",
            "type": "project",
            "score": 86,
            "children": []
          },
          {
            "id": "leg_d1_1_d2_1",
            "label": "DPA Reviews",
            "type": "process",
            "score": 85,
            "children": []
          }
        ]
      },
      {
        "id": "leg_d1_2",
        "label": "IP Management",
        "type": "resource",
        "score": 87,
        "children": []
      },
      {
        "id": "leg_d1_3",
        "label": "Regulatory Risk",
        "type": "risk",
        "score": 78,
        "children": []
      }
    ]
  },
  {
    "id": "dept_strategy",
    "label": "Strategy",
    "domain": "direction",
    "cluster": "Direction",
    "score": 95,
    "metrics": {
      "performance": 97,
      "efficiency": 94,
      "capacity": 92,
      "alignment": 98,
      "risk": 4
    },
    "internalNodes": [
      {
        "id": "str_d1_0",
        "label": "Corporate OKRs",
        "type": "metric",
        "score": 98,
        "children": [
          {
            "id": "str_d1_0_d2_0",
            "label": "Goal Cascades",
            "type": "process",
            "score": 96,
            "children": []
          },
          {
            "id": "str_d1_0_d2_1",
            "label": "KR Tracking",
            "type": "metric",
            "score": 94,
            "children": []
          }
        ]
      },
      {
        "id": "str_d1_1",
        "label": "Market Intelligence",
        "type": "process",
        "score": 93,
        "children": [
          {
            "id": "str_d1_1_d2_0",
            "label": "Competitor Intel",
            "type": "resource",
            "score": 90,
            "children": []
          },
          {
            "id": "str_d1_1_d2_1",
            "label": "TAM Analysis",
            "type": "metric",
            "score": 92,
            "children": []
          }
        ]
      },
      {
        "id": "str_d1_2",
        "label": "M&A Pipeline",
        "type": "project",
        "score": 91,
        "children": []
      },
      {
        "id": "str_d1_3",
        "label": "Strategic Risk Reg",
        "type": "risk",
        "score": 88,
        "children": []
      }
    ]
  }
];

// ── Resolve padding ─────────────────────────────────────────────────────────
const ACTIVE_DEPT_COUNT = DEPARTMENTS.length; // 13
const { totalNodes, inactiveCount } = resolvePolytopeNodeCount(ACTIVE_DEPT_COUNT);

const inactiveNodes: UExternalNode[] = Array.from({ length: inactiveCount }).map((_, i) => ({
  id: `node_inactive_${i}`,
  label: `Node ${i + 1}`,
  domain: 'inactive' as UDomain,
  cluster: 'None',
  score: 0,
  metrics: { performance: 0, efficiency: 0, capacity: 0, alignment: 0, risk: 0 },
  internalNodes: [],
}));

// ── Interleave depts + inactive for even sphere distribution ────────────────
export const U_NODES: UExternalNode[] = (() => {
  const result: UExternalNode[] = [];
  let ai = 0, ii = 0;
  const ratio = inactiveCount / ACTIVE_DEPT_COUNT;
  let inactiveAcc = 0;
  for (let total = 0; total < totalNodes; total++) {
    inactiveAcc += ratio;
    if (ii < inactiveCount && inactiveAcc >= 1) {
      result.push(inactiveNodes[ii++]);
      inactiveAcc -= 1;
    } else if (ai < ACTIVE_DEPT_COUNT) {
      result.push(DEPARTMENTS[ai++]);
    } else {
      result.push(inactiveNodes[ii++]);
    }
  }
  return result;
})();
