import AgentsModel from '../models/agents.model.js';
import UsersModel from '../models/users.model.js';
import Agent from '../classes/agent.class.js';
import User from '../classes/user.class.js';
import AgentsUtil from '../utils/agents.util.js';
import { parseFile } from '../utils/fileParser.util.js';
import c from 'config';

export default class AgentsCoordinator {

    static createAgent = async (organizationID, agent) => {
        try {
            // If user_id is provided, check if agent with this user_id already exists
            if (agent.user_id) {
                const existingAgent = await AgentsModel.getAgentByUserId(organizationID, agent.user_id);
                if (existingAgent) {
                    return { 
                        acknowledged: false, 
                        message: "Agent with this user_id already exists",
                        existingAgent 
                    };
                }
            }

            // Create new agent
            const newAgent = new Agent(
                organizationID, 
                agent.fName, 
                agent.lName, 
                agent.clients,
                agent.company,
                agent.manager,
                agent.additional_splits,
                agent.user_id  // Add user_id if provided
            );
            // create new user for agent
            const newUser = new User(
                newAgent.agentID,  // userID
                organizationID,    // organizationID
                agent.organization,
                agent.fName,
                agent.lName,
                agent.email,
                agent.username,
                agent.password,
                agent.isAdmin
            );
            
            const userResult = await UsersModel.addUser(newUser);
            
            if (!userResult.acknowledged) {
                return {
                    acknowledged: false,
                    message: "Error creating user for agent: " + userResult.message
                };
            }

            const result = await AgentsModel.createAgent(newAgent);
            
            return { ...result, agentID: newAgent.agentID };
        } catch (error) {
            throw error;
        }
    };
    
    static reauditAgents = async (organizationID, agentsData) => {
        try {
            if (!agentsData || agentsData.length === 0) {
                throw new Error('No agents data provided for re-audit.');
            }
    
            // Get a list of all agents for an organization
            let agents = await AgentsModel.getAgents(organizationID);
    
            // Ensure agents is an array
            if (!Array.isArray(agents)) {
                agents = [];
            }
    
            // Use the utility to process the agents array for re-audit
            const { agentsArray, needsAudit, rejectedMerchants } = AgentsUtil.buildAgentsArray(organizationID, agents, agentsData);
    
            // Add or update agents in the database based on the re-audit
            const allResults = [];
            for (const agent of agentsArray) {
                let result;
                if (Array.isArray(agents) && agents.some(a => a.fName === agent.fName && a.lName === agent.lName)) {
                    // Update existing agent
                    result = await AgentsModel.updateAgent(organizationID, agent);
                    if (!result.acknowledged) {
                        throw new Error('Error updating agent: ' + result.message);
                    }
                } else {
                    // Add new agent
                    result = await AgentsModel.createAgent(agent);
                    if (!result.acknowledged) {
                        throw new Error('Error adding agent: ' + result.message);
                    }
                }
                allResults.push(result);
            }
    
            // Return the results along with needsAudit and rejectedMerchants
            return { results: allResults, needsAudit, rejectedMerchants };
        } catch (error) {
            throw new Error('Error during re-audit in coordinator: ' + error);
        }
    };
    

    static uploadAgents = async (organizationID, fileBuffer, mimetype) => {
        try {
            const csvData = await parseFile(fileBuffer, mimetype);
            if (!csvData || csvData.length === 0) {
                throw new Error('Parsed data is empty. Please check the input file.');
            }
    
            // Get a list of all agents for an organization
            let agents = await AgentsModel.getAgents(organizationID);
    
            // Ensure agents is an array
            if (!Array.isArray(agents)) {
                agents = [];
            }
    
            // Use the utility to build the agents array and collect any rows needing audit or rejection
            const { agentsArray, needsAudit, rejectedMerchants } = AgentsUtil.buildAgentsArray(organizationID, agents, csvData);
    
            // Add or update the agents in the database
            const allResults = [];
            // const updatedAgents = [];
            const createdAgents = [];
            
            for (const agent of agentsArray) {
                let result;
                let agentData;
                
                if (Array.isArray(agents) && agents.some(a => a.fName === agent.fName && a.lName === agent.lName)) {
                    // Update existing agent
                    result = await AgentsModel.updateAgent(organizationID, agent);
                    if (!result.acknowledged) {
                        throw new Error('Error updating agent: ' + result.message);
                    }
                    // Get the updated agent data
                    agentData = await AgentsModel.getAgent(organizationID, agent.agentID);
                    createdAgents.push(agentData);
                } else {
                    // Add new agent
                    result = await AgentsModel.createAgent(agent);
                    if (!result.acknowledged) {
                        throw new Error('Error adding agent: ' + result.message);
                    }
                    // Get the created agent data
                    agentData = await AgentsModel.getAgent(organizationID, agent.agentID);
                    createdAgents.push(agentData);
                }
                allResults.push(result);
            }
    
            // Return results, needsAudit, rejectedMerchants, and agent data to the controller
            return { 
                results: allResults, 
                needsAudit, 
                rejectedMerchants,
                // updatedAgents,
                createdAgents,
                // totalUpdated: updatedAgents.length,
                // totalCreated: createdAgents.length
            };
        } catch (error) {
            throw new Error('Error adding agents in coordinator: ' + error);
        }
    };
    
    

    static getAgent = async (organizationID, agentID) => {
        try {
            const agent = await AgentsModel.getAgent(organizationID, agentID);
            if (!agent) {
                return { success: false, message: "Agent not found" };
            }
            return { success: true, agent };
        } catch (error) {
            throw error;
        }
    };

    static getAgents = async (organizationID,) => {
        try {
            const agents = await AgentsModel.getAgents(organizationID);
            return { success: true, agents };
        } catch (error) {
            throw error;
        }
    };

    static getUsersAgent = async (organizationID, userID) => {
        try {
            // console.log('=== COORDINATOR DEBUG ===');
            // console.log('getUsersAgent - organizationID:', organizationID);
            // console.log('getUsersAgent - userID:', userID);
            // console.log('About to call AgentsModel.getAgentByID with userID:', userID);
            // console.log('========================');
            
            const agent = await AgentsModel.getAgentByID(userID);
            
            // console.log('=== COORDINATOR RESULT ===');
            // console.log('Agent found for userID', userID, ':', agent);
            // console.log('=========================');
            
            if (!agent) {
                // console.log('=== NO AGENT FOUND ===');
                // console.log('Returning success: false with message for userID:', userID);
                // console.log('=====================');
                return { success: false, message: `No agent found with ID ${userID}` };
            }
            
            // console.log('=== AGENT FOUND ===');
            // console.log('Returning success: true with agent data');
            // console.log('==================');
            return { success: true, agents: agent };
        } catch (error) {
            // console.log('=== COORDINATOR ERROR ===');
            // console.log('Error in getUsersAgent:', error);
            // console.log('========================');
            throw error;
        }
    };

    static updateAgent = async (organizationID, agentID, update) => {
        try {
            const agent = await AgentsModel.getAgent(organizationID, agentID);
            if (!agent) {
                return { success: false, message: "Agent not found" };
            }
            // Apply the updates to the agent object
            const updatedAgent = new Agent(organizationID, agent.fName, agent.lName, agent.company, agent.manager,agent.clients,agent.additional_splits);

            updatedAgent.updateAgent(update); // This assumes updateAgent is defined in the Agent class

            const result = await AgentsModel.updateAgent(organizationID, updatedAgent);
            if (result.acknowledged) {
                return { success: true, agent: updatedAgent };
            } else {
                return { success: false, message: "Failed to update agent" };
            }
        } catch (error) {
            throw error;
        }
    };

    static deleteAgent = async (organizationID, agentID) => {
        try {
            const result = await AgentsModel.deleteAgent(organizationID, agentID);
            if (result.deletedCount > 0) {
                return result;
            }
            return { success: false, message: "Failed to delete agent" };
        } catch (error) {
            throw error;
        }
    };

    static getMerchantByID = async (organizationID, merchantID) => {
        try {
            const result = await AgentsModel.getMerchantByID(organizationID, merchantID);
            if (result.message) {
                return { success: false, message: result.message };
            }
            return { success: true, data: result };
        } catch (error) {
            throw error;
        }
    };

    static getAgentByUserId = async (organizationID, userId) => {
        try {
            const agent = await AgentsModel.getAgentByUserId(organizationID, userId);
            if (!agent) {
                return {
                    acknowledged: false,
                    message: "Agent not found with the given user_id"
                };
            }
            return {
                acknowledged: true,
                agent
            };
        } catch (error) {
            throw error;
        }
    };
}
