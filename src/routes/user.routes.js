import { Router } from "express";
import registerUser from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth_middleware.js";
const router= Router()
// routes 
// Define a route for handling POST requests to '/register'
router.route("/register").post(
    // Middleware for handling file uploads using the 'upload.fields' middleware function.
    // It expects an array of objects, each describing a file field with its name and maximum count.
    // In this case, it expects files for 'avatar' and 'coverImage' fields with specified maximum counts.
    upload.fields([
        {
            name: "avatar",       // Name of the field for avatar files
            maxCount: 1           // Maximum number of files allowed for avatar
        },
        {
            name: "coverImage",   // Name of the field for cover image files
            maxCount: 1          // Maximum number of files allowed for cover image
        }
    ]),
    // Handler function 'registerUser' to process the registration logic after file uploads.
    registerUser
);
router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,  logoutUser)
 export default router