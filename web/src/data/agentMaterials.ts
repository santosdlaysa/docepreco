import materials from './agentMaterials.json';

export interface AgentMaterial {
  id: string;
  area: string;
  title: string;
  text: string;
  audience?: string;
  action?: string;
}

// Curated templates only. Never include account data or financial snapshots here:
// frontend assets can be downloaded independently of the admin login.
export const agentMaterials: AgentMaterial[] = materials;
