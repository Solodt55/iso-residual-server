import jwt from 'jsonwebtoken';
import AgentsModel from '../models/agents.model.js';

export const agentAccessControl = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Expecting "Bearer <token>"
    console.log('Agent Access Control: Checking agent access');
    
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ error: 'Authorization token is required.' });
    }

    try {
        console.log('Verifying token...');
        // Verify the token
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        
        // If user is admin, allow full access
        if (decodedToken.isAdmin) {
            console.log('User is admin - full access granted');
            req.user = decodedToken;
            return next();
        }

        console.log('User is not admin - checking agent access');
        
        // For non-admin users, only allow GET requests
        if (req.method !== 'GET') {
            console.log(`Non-admin user attempted ${req.method} request - denied`);
            return res.status(403).json({ 
                error: 'Forbidden: Non-admin users can only make GET requests to agent endpoints.' 
            });
        }

        // Check if user's userID matches any agentID in the agents table
        const organizationID = req.params.organizationID;
        const userID = decodedToken.userID || decodedToken.username; // Use userID if available, fallback to username
        
        console.log(`Checking if userID ${userID} matches any agentID in organization ${organizationID}`);
        
        try {
            // Check if there's an agent with this userID as agentID
            const agent = await AgentsModel.getAgent(organizationID, userID);
            
            if (!agent) {
                console.log(`No agent found with agentID matching userID ${userID}`);
                return res.status(403).json({ 
                    error: 'Forbidden: You can only access your own agent data.' 
                });
            }

            console.log(`Agent found with matching userID ${userID} - access granted`);
            
            // Store user info and agent info in request for use in controllers
            req.user = decodedToken;
            req.userAgent = agent;
            
            // If this is a request for a specific agent, ensure it matches the user's agent
            if (req.params.agentID && req.params.agentID !== userID) {
                console.log(`User ${userID} attempted to access different agent ${req.params.agentID}`);
                return res.status(403).json({ 
                    error: 'Forbidden: You can only access your own agent data.' 
                });
            }

            next();
        } catch (agentError) {
            console.error('Error checking agent access:', agentError);
            return res.status(403).json({ 
                error: 'Forbidden: Unable to verify agent access.' 
            });
        }

    } catch (error) {
        console.error('JWT verification error:', error);
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

export const adminOrAgentAccess = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Authorization token is required.' });
    }

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        
        // If admin, allow all access
        if (decodedToken.isAdmin) {
            req.user = decodedToken;
            return next();
        }

        // If not admin, apply agent-specific restrictions
        return agentAccessControl(req, res, next);
        
    } catch (error) {
        console.error('JWT verification error:', error);
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};