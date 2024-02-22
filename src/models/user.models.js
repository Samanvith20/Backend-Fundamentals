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

userSchema.methods.generateAccessToken= function (){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}



 export const User= mongoose.model("User",userSchema)