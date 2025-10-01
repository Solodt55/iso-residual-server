import jwt from 'jsonwebtoken';

export const isAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Expecting "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: 'Authorization token is required.' });
    }

    try {
        // Verify the token
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

        // Check if the decoded token has the isAdmin flag set to true
        if (!decodedToken.isAdmin) {
            return res.status(403).json({ error: 'Forbidden: You do not have admin access.' });
        }
        next(); // Token is valid, user is an admin, proceed to the next middleware or route handler
    } catch (error) {
        console.error('JWT verification error:', error);
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

// Alternative: Create a flexible middleware that takes allowed routes as parameter
export const adminOrAllowedRoutes = (allowedRoutes = []) => {
    return (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Authorization token is required.' });
        }

        try {
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

            // Check if user is admin
            if (decodedToken.isAdmin) {
                return next();
            }

            // Check if current route is in allowed list
            const isAllowedRoute = allowedRoutes.some(allowed => 
                req.path.includes(allowed.path) && 
                (!allowed.method || req.method === allowed.method)
            );

            if (isAllowedRoute || decodedToken.isAdmin) {
                req.user = decodedToken;
                return next();
            }

            return res.status(403).json({ error: 'Forbidden: You do not have access.' });
        } catch (error) {
            console.error('JWT verification error:', error);
            return res.status(401).json({ error: 'Invalid or expired token.' });
        }
    };
};