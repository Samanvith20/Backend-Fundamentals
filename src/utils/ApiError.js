// This class is designed to handle errors that occur within an API endpoint in an Express.js application

class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        
    ) {
        // Call the constructor of the parent Error class with the provided message
        super(message);
        
        // Initialize custom properties specific to the ApiError class
        this.statusCode = statusCode; // HTTP status code associated with the error
        this.data = null; // Additional data related to the error (can be used for debugging or logging)
        this.message = message; // Error message
        this.success = false; // Indicate that the response is not successful
        this.errors = errors; // Array containing details of specific errors (if any)

        
    }
}

// Export the ApiError class to make it available for use in other parts of the application
export { ApiError };
