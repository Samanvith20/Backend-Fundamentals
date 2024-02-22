// Define a middleware function called AsyncHandler that handles asynchronous operations
const AsyncHandler = async (HandlerRequest) => {
    try {
        // Await the completion of the handler function and pass req, res, and next to it
        await HandlerRequest(req, res, next);
    } catch (error) {
        // If an error occurs, handle it by sending an appropriate response
        res.status(err.code || 500).json({
            success: false,
            message: err.message
        });
    }
};

// Export the AsyncHandler middleware function
export default AsyncHandler;





// Using promises for asynchronous handling
// Define a middleware function called asyncHandler that takes a requestHandler
// const asyncHandler = (requestHandler) => {
    // Return a middleware function that accepts req, res, and next
//     return (req, res, next) => {
        // Resolve the requestHandler and pass req, res, and next to it, and catch any errors
//         Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
//     };
// };

// Export the asyncHandler function
// export { asyncHandler };
