// used to structure and represent HTTP responses in an Express.js application.
class ApiResponse {
    // Constructor method to initialize the response properties
    constructor(statusCode, data, message = "Success") {
        // Initialize properties such as status code, data, message, and success status
        this.statusCode = statusCode; // HTTP status code of the response
        this.data = data; // Data to be sent in the response body
        this.message = message; // Optional message to accompany the response
        // Determine the success status based on the status code (< 400 indicates success)
        this.success = statusCode < 400;
    }
}

// Export the ApiResponse class to be used in other parts of the application
export { ApiResponse };
