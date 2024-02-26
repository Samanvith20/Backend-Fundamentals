// Import necessary modules and dependencies
import AsyncHandler from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";

// Define a handler function for registering a new user
const registerUser = AsyncHandler(async (req, res) => {
    // Destructure user details from the request body
    const { email, username, password, fullName } = req.body;

    // Validate if any of the required fields are empty
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }
     //     const fields = [fullName, email, username, password];
      // some is used for checking if at least one element satisfies a condition, while map is used for transforming elements and creating a new array based on those transformations.
      // TRIM()  whitespace characters from both ends of a string. Whitespace characters include spaces, tabs, and newlines.
 // Check if any field is empty
// const isEmpty = fields.map(field => field?.trim() === "");

 // Check if any field is empty
// if (isEmpty.includes(true)) {
//     throw new ApiError(400, "All fields are required");
// }


    // Check if a user with the provided username or email already exists in the database
    const existedUser = await User.findOne({
        $or: [
            { username }, // Check if the username matches
            { email }     // Check if the email matches
        ]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // Retrieve local paths of avatar and cover image files from the request
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // Validate if avatar file is provided
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Upload avatar and cover image files to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    // Validate if avatar file is uploaded successfully
    if (!avatar) {
        throw new ApiError(400, "Avatar file upload failed");
    }

    // Create a new user object and save it to the database
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    // Retrieve the created user details excluding password and refresh token
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    // Check if user creation is successful
    if (!createdUser) {
        throw new ApiError(500, "Failed to register the user");
    }

    // Return success response with the created user details
    return res.status(201).json({
        success: true,
        data: createdUser,
        message: "User registered successfully"
    });
});

// Export the registerUser handler function
export default registerUser;
