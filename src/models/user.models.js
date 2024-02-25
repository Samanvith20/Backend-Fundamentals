import mongoose from "mongoose";
 const userSchema= new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true, 
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowecase: true,
            trim: true, 
        },
        fullName: {
            type: String,
            required: true,
            trim: true, 
            index: true
        },
        avatar: {
            type: String, // cloudinary url
            required: true,
        },
        coverImage: {
            type: String, // cloudinary url
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],
        password: {
            type: String,
            required: [true, 'Password is required']
        },
        refreshToken: {
            type: String
        }

    },
 
 {timestamps:true})

 //JWT tokens are used for generating secure tokens containing user information for authentication and authorization purposes,
 // while bcrypt is used for securely hashing passwords to protect user credentials in the database.


// Define a pre-save hook for the user schema
userSchema.pre("save", async function (next) {
    // Check if the password field has been modified
    if (!this.isModified("password")) return next();

    // Hash the password before saving it to the database
    try {
        // Hash the password using bcrypt with a salt factor of 10
        const hashedPassword = await bcrypt.hash(this.password, 10);
        
        // Update the password field with the hashed password
        this.password = hashedPassword;
        next(); // Call the next middleware in the Mongoose middleware stack
    } catch (error) {
        next(error); // Pass any errors to the next middleware
    }
});

// Define a method to compare the provided password with the stored hashed password
userSchema.methods.isPasswordCorrect = async function (password) {
    try {
        // Use bcrypt to compare the provided password with the stored hashed password
        return await bcrypt.compare(password, this.password);
    } catch (error) {
        return false; // Return false if there is an error during the comparison
    }
}

// Method to generate an access token for a user
userSchema.methods.generateAccessToken = function () {
    // Sign the JWT token with user-specific information as payload
    return jwt.sign(
        {
            _id: this._id,                  // User's unique identifier
            email: this.email,              // User's email address
            username: this.username,        // User's username
            fullName: this.fullName         // User's full name
        },
        process.env.ACCESS_TOKEN_SECRET,    // Secret key used to sign the token
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY   // Expiration time for the token
        }
    );
};

// Method to generate a refresh token for a user
userSchema.methods.generateRefreshToken = function () {
    // Sign the JWT token with user's unique identifier as payload
    return jwt.sign(
        {
            _id: this._id,                  // User's unique identifier
        },
        process.env.REFRESH_TOKEN_SECRET,   // Secret key used to sign the token
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY  // Expiration time for the token
        }
    );
};




 export const User= mongoose.model("User",userSchema)