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
        console.log('I should not be here')
        const result = await AgentsCoordinator.getAgent(req.params.organizationID, req.params.agentID);
        if (result.message) {
            return res.status(404).send(result);
        } else {
            return res.status(200).send(result);
        }
    } catch (error) {
        next(error);
    }
};

export const getUsersAgent = async (req, res, next) => {
    try {
        // console.log('=== getUsersAgent Controller Debug ===');
        // console.log('req.params:', req.params);
        // console.log('req.user:', req?.user);
        // console.log('organizationID:', req.params.organizationID);
        // console.log('userID from JWT:', req.user?.userID);
        // console.log('=======================================');
        
        const result = await AgentsCoordinator.getUsersAgent(req.params.organizationID, req.user.userID);
        
        // console.log('=== getUsersAgent Result ===');
        // console.log('result:', JSON.stringify(result, null, 2));
        // console.log('============================');
        
        if (result.message) {
            return res.status(404).send(result);
        } else {
            return res.status(200).send(result);
        }
    } catch (error) {
        // console.error('=== getUsersAgent Error ===');
        // console.error('error:', error);
        // console.error('===========================');
        next(error);
    }
};

export const getAgents = async (req, res, next) => {
    try {
        const result = await AgentsCoordinator.getAgents(req.params.organizationID);
        if (result.message) {
            return res.status(404).send(result);
        } else {
            return res.status(200).send(result);
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
