import express from "express"; 
import cors from "cors"; 
import cookieParser from "cookie-parser"; 
//setup for an Express.js server with middleware 
const app = express(); // Creating an instance of Express application
 
// CORS Middleware: Allowing cross-origin requests from specified origin with credentials
app.use(cors({
    origin: process.env.CORS_ORIGIN, // Allowing requests from specific origin defined in environment variable
    credentials: true // Allowing credentials (cookies) to be sent along with requests
}));

// Middleware to parse JSON requests and set a size limit of 16kb
app.use(express.json({ limit: "16kb" }));

// Middleware to parse URL-encoded requests with extended options and set a size limit of 16kb
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Middleware to serve static files from the 'public' directory
app.use(express.static("public"));

// Middleware to parse cookies from incoming requests
app.use(cookieParser());


// import routes
import userRouter from "./routes/user.routes.js"
//userRouter is just a variable name you choose to represent the router you imported from the user.routes.js file. 

//  routes  declaration
app.use("/api/v1/users", userRouter)
// Mounting the userRouter to handle routes under the '/api/v1/users' path.
// app.use() is a middleware function used to mount middleware or sub-applications to specified paths.


export default app; 
