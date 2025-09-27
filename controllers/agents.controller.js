import AgentsCoordinator from '../coordinators/agents.coordinator.js';

export const createAgent = async (req, res, next) => {
    try {
        const result = await AgentsCoordinator.createAgent(req.params.organizationID, req.body);
        if (!result.acknowledged) {
            return res.status(400).send(result);
        } else {
            return res.status(201).send(result);
        }
    } catch (error) {
        next(error); // Pass error to centralized error handler
    }
};

export const uploadAgents = async (req, res, next) => {
    try {
        const file = req.file;
        const organizationID = req.params.organizationID;

        // Check if file is present
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileBuffer = file.buffer;
        const mimetype = file.mimetype;

        // Validate file format (CSV or XLSX)
        if (!['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mimetype)) {
            return res.status(400).json({ message: 'Invalid file format' });
        }

        // Call the coordinator to process agents from the file
        const { results, needsAudit, rejectedMerchants, createdAgents } = await AgentsCoordinator.uploadAgents(organizationID, fileBuffer, mimetype);

        // If no agents were created, return an error message
        if (!results || results.length === 0) {
            return res.status(400).json({ message: 'Agents not created' });
        } else {
            // Return created agents, any leads that need auditing, and rejected merchants
            return res.status(200).json({
                message: 'Agents processed successfully',
                results,
                needsAudit,
                rejectedMerchants,
                createdAgents
            });
        }
    } catch (error) {
        next(error);
    }
};

export const reauditAgents = async (req, res, next) => {
    try {
        const organizationID = req.params.organizationID;
        const agentsData = req.body; 
        // Check if agents data is present
        if (!agentsData || agentsData.length === 0) {
            return res.status(400).json({ message: 'No agents data provided for re-audit.' });
        }

        // Process the agents data directly using the coordinator (similar to uploadAgents)
        const { results, needsAudit, rejectedMerchants } = await AgentsCoordinator.reauditAgents(organizationID, agentsData);

        // If no agents were updated, return an error message
        if (!results || results.length === 0) {
            return res.status(400).json({ message: 'No agents updated during re-audit.' });
        } else {
            // Return updated agents, any leads that need auditing, and rejected merchants
            return res.status(200).json({
                message: 'Re-audit processed successfully',
                results,
                needsAudit,
                rejectedMerchants
            });
        }
    } catch (error) {
        next(error);
    }
};

export const getAgent = async (req, res, next) => {
    try {
        // Check if user is admin or has restricted access
        if (req.user && !req.user.isAdmin && req.userAgent) {
            // Non-admin user: return only their own agent data
            console.log(`Non-admin user ${req.user.username} accessing specific agent - returning their agent data`);
            return res.status(200).send(req.userAgent);
        } else {
            // Admin user: get any agent
            const result = await AgentsCoordinator.getAgent(req.params.organizationID, req.params.agentID);
            if (result.message) {
                return res.status(404).send(result);
            } else {
                return res.status(200).send(result);
            }
        }
    } catch (error) {
        next(error);
    }
};

export const getAgents = async (req, res, next) => {
    try {
        // Check if user is admin or has restricted access
        if (req.user && !req.user.isAdmin && req.userAgent) {
            // Non-admin user: return only their own agent data
            console.log(`Non-admin user ${req.user.username} accessing agents - returning only their agent data`);
            return res.status(200).send([req.userAgent]);
        } else {
            // Admin user: return all agents
            const result = await AgentsCoordinator.getAgents(req.params.organizationID);
            if (result.message) {
                return res.status(404).send(result);
            } else {
                return res.status(200).send(result);
            }
        }
    } catch (error) {
        next(error);
    }
};

export const updateAgent = async (req, res, next) => {
    try {
        const result = await AgentsCoordinator.updateAgent(req.params.organizationID, req.params.agentID, req.body);
        if (result.success === false) {
            return res.status(400).send(result);
        } else {
            return res.status(200).send(result);
        }
    } catch (error) {
        next(error);
    }
};

export const deleteAgent = async (req, res, next) => {
    try {
        const result = await AgentsCoordinator.deleteAgent(req.params.organizationID, req.params.agentID);
        if (!result.acknowledged) {
            return res.status(400).send(result);
        } else {
            return res.status(204).send(); // Send 204 No Content for successful deletion
        }
    } catch (error) {
        next(error);
    }
};

export const getMerchantByID = async (req, res, next) => {
    try {
        // Check if user is admin or has restricted access
        if (req.user && !req.user.isAdmin && req.userAgent) {
            // Non-admin user: check if merchant belongs to their agent
            const merchantID = req.params.merchantID;
            const userAgent = req.userAgent;
            
            // Check if the merchant is in the user's agent clients list
            const hasAccess = userAgent.clients && userAgent.clients.some(client => 
                client.merchantID === merchantID
            );
            
            if (!hasAccess) {
                console.log(`Non-admin user ${req.user.username} attempted to access merchant ${merchantID} not in their client list`);
                return res.status(403).json({ 
                    error: 'Forbidden: You can only access merchants assigned to you.' 
                });
            }
            
            console.log(`Non-admin user ${req.user.username} accessing their merchant ${merchantID}`);
        }
        
        // Proceed with the merchant lookup (for both admin and authorized non-admin users)
        const result = await AgentsCoordinator.getMerchantByID(req.params.organizationID, req.params.merchantID);
        if (!result.success) {
            return res.status(404).send(result);
        } else {
            return res.status(200).send(result);
        }
    } catch (error) {
        next(error);
    }
};

export const getAgentByUserId = async (req, res, next) => {
    try {
        const result = await AgentsCoordinator.getAgentByUserId(req.params.organizationID, req.params.userId);
        if (!result.acknowledged) {
            return res.status(404).send(result);
        }
        return res.status(200).send(result);
    } catch (error) {
        next(error);
    }
};
