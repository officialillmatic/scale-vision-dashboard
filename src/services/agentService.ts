
// Main agent service - exports all functionality from modular files
export type { Agent, UserAgent } from "./agent/agentTypes";

export {
  fetchAgents,
  fetchUserAgents,
  fetchUserAccessibleAgents,
  fetchCompanyUserAgents
} from "./agent/agentQueries";

export {
  createAgent,
  updateAgent,
  deleteAgent,
  assignAgentToUser,
  removeAgentFromUser,
  updateUserAgentPrimary
} from "./agent/agentMutations";
