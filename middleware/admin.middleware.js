import jwt from 'jsonwebtoken';

export const isAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Expecting "Bearer <token>"
    console.log('Admin Middleware: Checking admin access');
    if (!token) {
        console.log('No token provided');
        return res.status(401).json({ error: 'Authorization token is required.' });
    }

    try {
        console.log('Verifying token...');
        // Verify the token
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

        // Check if the decoded token has the isAdmin flag set to true
        if (!decodedToken.isAdmin) {
            console.log('User is not an admin');
            return res.status(403).json({ error: 'Forbidden: You do not have admin access.' });
        }
        next(); // Token is valid, user is an admin, proceed to the next middleware or route handler
    } catch (error) {
        console.error('JWT verification error:', error);
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};
