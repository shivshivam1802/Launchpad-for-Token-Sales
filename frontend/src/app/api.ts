const API_BASE = '/api/backend';

export interface ProjectData {
  id?: string;
  name: string;
  ticker: string;
  logoUrl?: string;
  bannerUrl?: string;
  description: string;
  whitepaperUrl?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  githubUrl?: string;
  auditUrl?: string;
  status?: string;
  contractAddress?: string;
  tokenomics?: any;
  roadmap?: any;
  team?: any;
  owner?: {
    walletAddress: string;
  };
}

export const launchpadApi = {
  // 1. Signature-based Login
  async getNonce(walletAddress: string): Promise<string> {
    const res = await fetch(`${API_BASE}/auth/nonce?walletAddress=${walletAddress}`);
    if (!res.ok) throw new Error('Failed to fetch nonce');
    const data = await res.json();
    return data.nonce;
  },

  async login(walletAddress: string, signature: string): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress, signature }),
    });
    if (!res.ok) throw new Error('Login signature verification failed');
    return res.json();
  },

  // 2. Projects & Applications
  async createProject(token: string, project: ProjectData): Promise<ProjectData> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(project),
    });
    if (!res.ok) throw new Error('Failed to submit application');
    return res.json();
  },

  async getProjects(status?: string): Promise<ProjectData[]> {
    const url = status ? `${API_BASE}/projects?status=${status}` : `${API_BASE}/projects`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load projects');
    return res.json();
  },

  async getProjectDetails(id: string): Promise<ProjectData> {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    if (!res.ok) throw new Error('Failed to load project details');
    return res.json();
  },

  async getOwnerProjects(token: string): Promise<ProjectData[]> {
    const res = await fetch(`${API_BASE}/projects/owner`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to load owner projects');
    return res.json();
  },

  async updateProjectStatus(token: string, projectId: string, status: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Unauthorized or failed to update project status');
    return res.json();
  },

  async linkContract(token: string, projectId: string, contractAddress: string): Promise<any> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/link-contract`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ contractAddress }),
    });
    if (!res.ok) throw new Error('Failed to link token sale contract');
    return res.json();
  },

  // 3. Cache Synchronization
  async cacheNewSale(saleAddress: string, ownerAddress: string): Promise<any> {
    const res = await fetch(`${API_BASE}/sync/sale`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saleAddress, ownerAddress }),
    });
    return res.json();
  },

  async syncSaleState(saleAddress: string): Promise<any> {
    const res = await fetch(`${API_BASE}/sync/sale/${saleAddress}`, {
      method: 'POST',
    });
    return res.json();
  },

  // 4. Analytics
  async getAnalytics(): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics`);
    if (!res.ok) throw new Error('Failed to load analytics');
    return res.json();
  },
};
