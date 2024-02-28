import AsyncHandler from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}
const registerUser = AsyncHandler(async (req, res) => {
    // Destructure user details from the request body
    const { email, username, password, fullName } = req.body;
    console.log("userdetails:",password);

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
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path || null;
    // let coverImageLocalPath;
    // if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    //     coverImageLocalPath = req.files.coverImage[0].path
    // }

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
// Login user handler
const loginUser = AsyncHandler(async(req, res) => {
    // Extracting necessary fields from request body
    const { email, password, username } = req.body;

    // Checking if username or email is provided
    if (!username && !email) {
        throw new ApiError(400, "username or email is required");
    }

    // Finding the user by username or email
    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    // If user does not exist, throw a 404 error
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    // Checking if the provided password is valid
    const isPasswordValid = await user.isPasswordCorrect(password);

    // If password is invalid, throw a 401 error
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    // Generating access and refresh tokens for the user
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

    // Configuring options for setting cookies
    const options = {
        httpOnly: true,
        secure: true
    };

    // Setting cookies and sending response
    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {
                    user: loginUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        );
});

// Logout user handler
const logoutUser = AsyncHandler(async(req, res) => {
    // Unsetting refreshToken in the database for the logged-out user
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    );

    // Configuring options for clearing cookies
    const options = {
        httpOnly: true,
        secure: true
    };

    // Clearing cookies and sending response for successful logout
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"));
});







export  {registerUser,loginUser,logoutUser}
