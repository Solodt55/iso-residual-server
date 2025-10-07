import { db } from '../lib/database.lib.js';
import Constants from '../lib/constants.lib.js';

export default class AgentsModel {

    static createAgent = async (agent) => {
        try {
            const result = await db.dbAgents().insertOne(agent);
            if (!result.acknowledged) {
                throw new Error('Model Error: Error adding agent to DB');
            }
            return result;
        } catch (error) {
            throw error;
        }
    };

    static createAgents = async (agents) => {
        try {
            const result = await db.dbAgents().insertMany(agents);
            if (!result.acknowledged) {
                throw new Error('Model Error: Error adding agents to DB');
            }
            return result;
        } catch (error) {
            throw error;
        }
    };
    
    static getAgent = async (organizationID, agentID) => {
        try {
            const agent = await db.dbAgents().findOne({organizationID,  agentID }, { projection: Constants.DEFAULT_PROJECTION });
            if (!agent) {
                return { message: `No agent found with ID ${agentID}` };
            }
            return agent;
        } catch (error) {
            throw error; // Make sure error is thrown for consistency
        }
    }

    static getAgentByID = async (agentID) => {
        try {
            // console.log(`[getAgentByID] Looking for agent with agentID: ${agentID}`);
            const agent = await db.dbAgents().findOne({ agentID }, { projection: Constants.DEFAULT_PROJECTION });
            if (!agent) {
                // console.log(`[getAgentByID] No agent found with agentID: ${agentID}`);
                return null;
            }
            // console.log(`[getAgentByID] Found agent: ${agent.agentID} with ${agent.clients?.length || 0} clients`);
            return agent;
        } catch (error) {
            // console.error(`[getAgentByID] Error finding agent by ID ${agentID}:`, error);
            throw error;
        }
    }

    static getAgents = async (organizationID) => {
        try {
            // console.log('Fetching agents for organization:', organizationID);
            const agents = await db.dbAgents().find({organizationID}, { projection: Constants.DEFAULT_PROJECTION }).toArray();
            if (agents.length === 0) {
                return { message: 'No agents found' };
            }
            return agents;
        } catch (error) {
            throw error;
        }
    };

    static updateAgent = async (organizationID, agent) => {
        try {
            const result = await db.dbAgents().replaceOne({organizationID,  agentID: agent.agentID }, agent);
            if (result.matchedCount === 0) {
                return { message: 'Agent not found to update' };
            }
            if (!result.acknowledged) {
                throw new Error('Model Error: Error updating agent in DB');
            }
            return result;
        } catch (error) {
            throw error;
        }
    };

    static deleteAgent = async (organizationID, agentID) => {
        try {
            const result = await db.dbAgents().deleteOne({organizationID,  agentID });
            if (result.deletedCount === 0) {
                return { message: 'Agent not found to delete' };
            }
            if (!result.acknowledged) {
                throw new Error('Model Error: Error deleting agent in DB');
            }
            return result;
        } catch (error) {
            throw error;
        }
    };

    static getMerchantByID = async (organizationID, merchantID) => {
        try {
            // console.log('Searching for merchantID:', merchantID, 'in organizationID:', organizationID);
            // console.log('for the love of god please say this is not running')
            const agent = await db.dbAgents().findOne(
                { 
                    organizationID,
                    'clients.merchantID': merchantID 
                },
                { 
                    projection: {
                        'clients.$': 1,
                        fName: 1,
                        lName: 1,
                        agentID: 1,
                        company: 1,
                        manager: 1,
                        agentSplit: 1,
                        managerSplit: 1
                    }
                }
            );
            // console.log('Agent found:', agent);
            if (!agent) {
                return { message: `No merchant found with ID ${merchantID}` };
            }

            // Get the matching client from the clients array
            const merchant = agent.clients.find(client => client.merchantID === merchantID);
            
            // Transform merchant data if agentSplit exists
            let transformedMerchant = { ...merchant };
            if (merchant.agentSplit) {
                transformedMerchant = {
                    merchantID: merchant.merchantID,
                    merchantName: merchant.merchantName,
                    branchID: merchant.branchID,
                    agent: [{
                        name: `${agent.fName} ${agent.lName}`,
                        split: merchant.agentSplit
                    }]
                };

                // Add other existing properties
                if (merchant.partners) transformedMerchant.partners = merchant.partners;
                if (merchant.reps) transformedMerchant.reps = merchant.reps;
                if (merchant.totalRepsSplitCount) transformedMerchant.totalRepsSplitCount = merchant.totalRepsSplitCount;
            }
            // console.log('Transformed Merchant:', transformedMerchant);
            return {
                merchant: transformedMerchant,
                agent: {
                    fName: agent.fName,
                    lName: agent.lName,
                    agentID: agent.agentID,
                    company: agent.company,
                    manager: agent.manager,
                    managerSplit: agent.managerSplit,
                    agentSplit: agent.agentSplit
                }
            };
        } catch (error) {
            throw error;
        }
    };

    static getAgentByUserId = async (organizationID, userId) => {
        try {
            const agent = await db.dbAgents().findOne(
                { 
                    organizationID,
                    user_id: userId 
                },
                { projection: Constants.DEFAULT_PROJECTION }
            );
            return agent;
        } catch (error) {
            throw error;
        }
    };

    // Get all agents that have a split for a specific merchant if the merchant was added via the split method return array of agents with their split percentages
    static getAgentsMerchantSplitsByMerchantID = async (organizationID, merchantID) => {
        try {
            const agents = await db.dbAgents().find(
                { 
                    organizationID,
                    'clients.merchantID': merchantID,
                    'clients.fromSplit': true
                },
                { 
                    projection: {
                        fName: 1,
                        lName: 1,
                        clients: {
                            $elemMatch: { 
                                merchantID: merchantID,
                                fromSplit: true
                            }
                        }
                    }
                }
            ).toArray();

            if (!agents || agents.length === 0) {
                return [];
            }

            // Transform the data to the required format
            const result = agents.map(agent => {
                const merchant = agent.clients[0]; 
                
                return {
                    type: "rep",
                    name: `${agent.fName} ${agent.lName}`,
                    value: merchant.splitPercentage
                };
            });

            return result;
        } catch (error) {
            throw error;
        }
    };

    // Remove all instances of merchant matching the merchant id that was added via the split method
    static removeClientByMerchantIDFromSplit = async (merchantID) => {
        // console.log('Removing merchantID:', merchantID, 'from all agents');
        // if (merchantID === '6588000002455723') console.log(merchantID);
        try {
            const result = await db.dbAgents().updateMany(
                { 'clients.merchantID': merchantID },
                { $pull: { clients: { merchantID, fromSplit: true } } }
            );
            await db.dbAgents().updateMany(
                { 'clients.merchantID': merchantID },
                { $unset: { 'clients.$[elem].splitPercentage': "" } },
                {
                    arrayFilters: [
                        { 
                            "elem.merchantID": merchantID,
                            "elem.splitPercentage": { $exists: true }
                        }
                    ]
                }
            );
            if (!result.acknowledged) {
                throw new Error('Model Error: Error removing client from agents');
            }
            // if (merchantID === '6588000002455723') console.log(merchantID, result);
            return result;
        } catch (error) {
            throw error;
        }
    };

    // Add merchant to agent through split method
    static addMerchantToAgentFromSplit = async (agentName, merchantInfo, precent) => {
        try {
            // Create a fresh copy of the merchantInfo object for this agent
            const merchantCopy = JSON.parse(JSON.stringify(merchantInfo));
            
            // Set properties on the copy, not the original
            merchantCopy.fromSplit = true;
            merchantCopy.splitPercentage = precent;

            const parts = agentName.trim().split(/\s+/);
            const fName = parts[0];
            const lName = parts.slice(1).join(" ");

            const agent = await db.dbAgents().findOne(
                { 
                    fName: { $regex: new RegExp(`^${fName}\\s*$`) },
                    lName, 
                    'clients.merchantID': merchantCopy.merchantID 
                }
            );

            if (agent) {
                // console.log(`Agent with name ${fName} ${lName} already has merchant with ID ${merchantCopy.merchantID}. Updating splitPercentage if not present.`);
                // Agent and merchant exist, update splitPercentage ONLY if it does not already exist
                const updateResult = await db.dbAgents().updateOne(
                    {
                        fName: { $regex: new RegExp(`^${fName}\\s*$`) },
                        lName,
                        'clients.merchantID': merchantCopy.merchantID
                    },
                    { $set: { 'clients.$[elem].splitPercentage': precent } },
                    {
                        arrayFilters: [
                            { "elem.merchantID": merchantCopy.merchantID, "elem.splitPercentage": { "$exists": false } }
                        ]
                    }
                );
                if (updateResult.modifiedCount > 0) {
                    // console.log(`Successfully updated splitPercentage for merchantID ${merchantCopy.merchantID} under agent ${fName} ${lName}`);
                    return { message: 'splitPercentage set for existing merchant', result: updateResult };
                }
                // If no update was made, fall through to push logic
            }


            // Push if not found
            const result = await db.dbAgents().updateOne(
                { 
                    fName: { $regex:  new RegExp(`^${fName}\\s*$`) },
                    lName
                },
                { $push: { clients: merchantCopy } }
            );
            if (result.matchedCount === 0) {
                return { message: 'Agent not found to add merchant' };
            }
            if (!result.acknowledged) {
                throw new Error('Model Error: Error adding merchant to agent');
            }
            // console.log(fName, ' added merchant:', merchantCopy);
            return result;
        } catch (error) {
            throw error;
        }
    };
};
