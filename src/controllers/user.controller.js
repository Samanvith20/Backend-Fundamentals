import AsyncHandler from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import  {ApiResponse } from "../utils/ApiResponse.js"
import  jwt  from "jsonwebtoken";
const generateAccessAndRefereshTokens = async(userId) => {
    try {
      // Retrieve user from the database
        const user = await User.findById(userId);
        // Generate access token and refresh token
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        // Update user's refresh token and save to the database
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        console.error("Error generating tokens:", error);
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
}
// register user Handler
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
    // console.log("email is", email);
    // console.log(password);

    // Checking if username or email is provided
    if (!username && !email) {
        throw new ApiError(400, "username or email is required");
    }
    if (!password) {
        throw new ApiError(400, "password is required");
    }
    // Finding the user by username or email
    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    // If user does not exist, throw a 404 error
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }
    //console.log(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    
    // Checking if the provided password is valid
    const isPasswordValid = await user.isPasswordCorrect(password);

    // If password is invalid, throw a 401 error
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    // Generating access and refresh tokens for the user
    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);
   //console.log(generateAccessAndRefereshTokens);
    // Configuring options for setting cookies
    const options = {
        httpOnly: true,
        secure: false,
    };

    // Setting cookies and sending response
    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {
                    user: loggedInUser, accessToken, refreshToken
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
//  refreshAccessToken Handler   
const refreshAccessToken = AsyncHandler(async(req, res) => {
    // Extract the refresh token from cookies or request body
    const incomingToken = req.cookies.refreshToken || req.body.refreshToken;

    // Check if incoming token exists
    if (!incomingToken) {
        throw new ApiError(401, "unauthorized request");
    }

    try {
        // Verify the refresh token
        const decodedToken = jwt.verify(incomingToken, process.env.REFRESH_TOKEN_SECRET);

        // Find the user associated with the decoded token
        const user = User.findById(decodedToken?._id);

        // Check if user exists
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        // Check if incoming refresh token matches user's refresh token
        if (incomingToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        // Options for setting cookies
        const options = {
            httpOnly: true,
            secure: true
        };

        // Generate new access and refresh tokens
        const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id);

        // Set new cookies and send response
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200, 
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        // Handle verification errors
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});
 //password change Handler
const passwordChange = AsyncHandler(async (req, res) => {
    // Extracting old password and new password from the request body
    const { oldpassword, newpassword } = req.body;

    // Find the user by their ID
    const user = User.findById(user?._id); // Finding the user by their ID

    // Check if the old password is correct
    const isPasswordCorrect = user.isPasswordCorrect(oldpassword); // Verifying the old password

    // If old password is incorrect, throw an error
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    // Update the user's password with the new password
    user.password = newpassword;

    // Save the updated user document to the database
    await user.save({ validateBeforeSave: false }); // Skipping validation before saving

    // Send a success response if the password is changed successfully
    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

const currentUser= AsyncHandler(async(req,res)=>{
     return res.status(200).json
     (
        new ApiResponse
        (
        200,
        req.user,
        "User fetched successfully"))
})
// function to update users details
const updateUserDetails = AsyncHandler(async (req, res) => {
    // Extract username and email from the request body
    const { username, email } = req.body;

    // Check if both username and email are missing
    if (!username && !email) {
        throw new ApiError(400, "All fields are required");
    }

    // Find and update the user details based on the user's ID
    const user = await User.findByIdAndUpdate(
        req.user._id, // Use req.user._id to get the user's ID
        {
            $set: {
                username: username, // Update username
                email: email // Update email
            }
        },
        {
            new: true // Return the updated document
        }
    ).select("-password"); // Exclude the password from the returned user object

    // Send a success response with the updated user details
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"));
});
 // Function to update user's avatar
const updateUserAvatar = AsyncHandler(async (req, res) => {
    // Get the local path of the avatar file from the request
    const avatarLocalPath = req.file?.path;

    // Check if the avatar file is missing
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }
     // Retrieve the old avatar URL from the user document
     const user1 = await User.findById(req.user?._id);
     const oldAvatarUrl = user1.avatar;
       // Delete the old avatar from Cloudinary if it exists
    if (oldAvatarUrl) {
        // Extract the public ID from the old avatar URL
        const publicId = extractPublicId(oldAvatarUrl);
        
        // Delete the old avatar from Cloudinary
        await deleteFromCloudinary(publicId);
    }

    // Upload the avatar file to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    // Check if there was an error while uploading the avatar
    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar");
    }

    // Update the user's avatar URL in the database
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password");

    // Send a success response with the updated user details
    return res.status(200).json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

// Function to update user's cover image
const updateCoverImage = AsyncHandler(async (req, res) => {
    // Get the local path of the cover image file from the request
    const userLocalPath = req.file?.path;

    // Check if the cover image file is missing
    if (!userLocalPath) {
        throw new ApiError(400, "Cover image file was missing");
    }
      // Retrieve the old avatar URL from the user document
    const user1 = await User.findById(req.user?._id);
    const oldCoverImageUrl = user1.avatar;
// Delete the old avatar from Cloudinary if it exists
if (oldCoverImageUrl) {
    // Extract the public ID from the old avatar URL
    const publicId = extractPublicId(oldCoverImageUrl);
    
    // Delete the old avatar from Cloudinary
    await deleteFromCloudinary(publicId);
}
     

    // Upload the cover image file to Cloudinary
    const coverImage = await uploadOnCloudinary(userLocalPath);

    // Check if there was an error while uploading the cover image
    if (!coverImage?.url) {
        throw new ApiError(400, "Error while uploading cover image");
    }

    // Update the user's cover image URL in the database
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage?.url
            }
        },
        { new: true }
    ).select("-password");

    // Send a success response
    return res.status(200).json(new ApiResponse(200, user, "Cover image updated successfully"));
});
const getUserChannelProfile = AsyncHandler(async (req, res) => {
    const { username } = req.params;

    // Check if username is provided
    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing");
    }

    try {
        const channel = await User.aggregate([
            {
                $match: {
                    // Match the username in a case-insensitive manner
                    username: username?.toLowerCase()
                }
            },
            {
                // $lookup stages are used to perform a left outer join with the Subscriptions collection. 
                $lookup: {
                    from: "Subscriptions",
                    localField: "_id",  //local collection that you want to use for matching with documents in the foreign collection.
                    foreignField: "subscriber", // foreign collection that you want to use for matching with documents in the local collection.
                    as: "subscribes"  // Output array field where the matched orders will be stored
                }
             },
            {
                $lookup: {
                    from: "Subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribedTo"
                }
            },
            {
                //$addFields stage is used to add computed fields to the documents:
                $addFields: {
                    // Count the number of subscribers
                    subscribersCount: { $size: "$subscribes" },
                    // Count the number of channels subscribed to
                    channelsSubscribedToCount: { $size: "$subscribedTo" },
                    // Check if the user is subscribed to the channel
                    isSubscribed: {
                        $cond: {
                            if: {
                                $in: [req.user?._id, "$subscribes.subscriber"]
                            },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
      
                $project: {   // The $project stage is used to include or exclude fields from the output document.
                    fullName: 1,
                    username: 1,
                    subscribersCount: 1,
                    channelsSubscribedToCount: 1,
                    isSubscribed: 1,
                    avatar: 1,
                    coverImage: 1,
                    email: 1
                }
            }
        ]);
        
    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

        // Send the channel data in the response
        return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
    } catch (error) {
        // Handle any errors that occur during aggregation
        console.error(error);
        throw new ApiError(500, "Internal Server Error");
    }
});

const getWatchHistory = asyncHandler(async(req, res) => {
    // Retrieve the user's watch history using aggregation pipeline
    const user = await User.aggregate([
        {
            // Match the user by their ID
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            // Perform a lookup to fetch videos from the 'videos' collection
            $lookup: {
                from: "videos",
                localField: "watchHistory", // Field in the 'users' collection
                foreignField: "_id", // Field in the 'videos' collection
                as: "watchHistory", // Store the matched videos in 'watchHistory' array
                pipeline: [
                    {
                        // Perform a lookup to fetch the owner details from the 'users' collection
                        $lookup: {
                            from: "users",
                            localField: "owner", // Field in the 'videos' collection
                            foreignField: "_id", // Field in the 'users' collection
                            as: "owner", // Store the matched user details in 'owner' array
                            pipeline: [
                                {
                                    // Project only necessary fields of the owner
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        // Add a new field 'owner' to the video object with the first matched owner details
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    // Respond with a JSON object containing the watch history
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory, // Extract the watch history from the user object
            "Watch history fetched successfully"
        )
    );
});


export  {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    passwordChange,
    currentUser,
    updateUserDetails,
    updateUserAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
}
