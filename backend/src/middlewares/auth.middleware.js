import { getAuth } from '@clerk/express';
import User from '../models/user.model.js';
import asyncHandle from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

const protectedRoute = asyncHandle(async (req, res, next) => {
    const { userId } = getAuth(req);
    if (!userId) {
        throw new ApiError(401, 'Unauthorized');
    }
    const user = await User.findOne({ clerkId: userId });
    if (!user) {
        throw new ApiError(404, 'User profile is not synced yet');
    }
    req.user = user;
    next();
});

export default protectedRoute;



// Incoming Request
//         ↓
// clerkMiddleware
//         ↓
// getAuth(req)
//         ↓
// Authenticated?
//       ├── No → 401 Unauthorized
//       └── Yes
//              ↓
// Find User by clerkId
//              ↓
// User Exists?
//       ├── No → 404 User profile is not synced yet
//       └── Yes
//              ↓
// Attach req.user
//              ↓
// next()