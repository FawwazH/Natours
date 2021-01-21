//Extends so that our custom err handling class
//would inherit from the built in error class
class AppError extends Error {
    constructor(message, statusCode){
        //Use super to call the parent 
        //constructor. The message is the 
        //only param accepted by the built in 
        //err class
        super(message);
        this.statusCode = statusCode;
        //Testing if status Code starts with
        //4 or 5 
        this.status = `${statusCode}`
        .startsWith('4') ? 'fail' : 'error';
        //All the errors we create using this class would be
        //operational errors. (errs we can predict that will 
        //happen some time in the future) for ex. a user creating
        //a tour without the required fields
        //This is done so we can test if it is an operational err
        //and only send err messages back to client for these
        //operational errors created by our own class
        this.isOperational = true;
    
    //The stack trace shows us where the err happened
    //When a new object ic created and the function constructor 
    //is called then that function call is not going to appear
    //in the stack trace and pollute it
    Error.captureStackTrace(this, this.constructor);
    }

}

module.exports = AppError;