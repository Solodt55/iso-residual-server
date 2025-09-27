import jwt from 'jsonwebtoken';
import AuthCoordinator from '../coordinators/auth.coordinator.js';

export const login = async (req, res) => {
    try {
        console.log("am I here");
        const { username, password } = req.body;
        console.log("username", username, 'password: ', password);
        const user = await AuthCoordinator.loginUser(username, password);
        if (!user) {
            console.log("Invalid credentials");
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        console.log("User found: ", user);
        // Create the token payload
        const tokenPayload = {
            userID: user.userID,  // Add userID to token
            username: user.username,
            organization: user.organizationID,
            isAdmin: user.isAdmin,  // Assuming `isAdmin` is a boolean property of `user`
            email: user.email || 'cody@gmail.com'
        };
        console.log("Token payload: ", tokenPayload);

        // Sign the token with the payload
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });
        console.log("successfull");
        // Respond with the token
        res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error("Login error: ", error);
        res.status(400).json({ message: error.message });
    }
};


export const signup = async (req, res) => {
    try {
        const result = await AuthCoordinator.addUser(req.body);
        if (result.isDupe) {
            res.status(200).json(result);
        } else {
            res.status(200).json(result);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const generateToken = async (req, res) => {
    try {
        const { username, roleId, email , user_id} = req.body;
        // Create the token payload with just username
        const tokenPayload = {
            username: username,
            organization: 'org-86f76df1',
            isAdmin: true,  // Assuming `isAdmin` is a boolean property of `user`
            roleId: roleId,
            email: email,
            user_id: user_id
        };

        // Sign the token with the payload
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

        // Respond with the token
        res.status(200).json({ 
            message: 'Token generated successfully', 
            token,
            payload: tokenPayload 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

