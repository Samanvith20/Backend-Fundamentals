import { ApiError } from "../utils/ApiError.js";
import AsyncHandler from "../utils/AsyncHandler.js"; 
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js"; 

// Middleware function to verify JWT token
export const verifyJWT = AsyncHandler(async(req, _, next) => {
    try {
        // Extract token from cookies or authorization header
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        
        // If no token found, throw Unauthorized error
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }
    
        // Verify the token using the access token secret
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        // Find the user associated with the decoded token ID
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    
        // If no user found, throw Unauthorized error
        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }
    
        // Attach the user object to the request for further use
        req.user = user;
        next(); // Move to the next middleware
    } catch (error) {
        // If any error occurs during token verification or user retrieval, throw Unauthorized error
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});
