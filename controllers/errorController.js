const AppError = require('./../utils/appError');


const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    console.log(message);
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
    //Using REGEXP to find words between quotes
    const value = err.keyValue.name;
    const message = `Duplicate field value : ${value}. Please use another value`;
    return new AppError(message, 400);
   
};

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);

};

const handleJWTError = err => new AppError('Invalid token. Please log in again', 401);

const handleJWTExpiredError = () => 
new AppError('Your token has expired! Please login again.', 401);

const sendErrorDev = (err, req, res) => {
    // A) API
    if (req.originalUrl.startsWith('/api')) {
      return res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
      });
    }
  
    // B) RENDERED WEBSITE
    console.error('ERROR 💥', err);
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  };
  
  const sendErrorProd = (err, req, res) => {
    // A) API
    if (req.originalUrl.startsWith('/api')) {
      // A) Operational, trusted error: send message to client
      if (err.isOperational) {
        return res.status(err.statusCode).json({
          status: err.status,
          message: err.message
        });
      }
      // B) Programming or other unknown error: don't leak error details
      // 1) Log error
      console.error('ERROR 💥', err);
      // 2) Send generic message
      return res.status(500).json({
        status: 'error',
        message: 'Something went very wrong!'
      });
    }
  
    // B) RENDERED WEBSITE
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
      //console.log(err);
      return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: err.message
      });
    }
    // B) Programming or other unknown error: don't leak error details
    // 1) Log error
    console.error('ERROR 💥', err);
    // 2) Send generic message
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: 'Please try again later.'
    });
  };


module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    //Error message explanation depends on production or 
    //development stage
    if(process.env.NODE_ENV === 'development'){
        
        sendErrorDev(err, req, res);
        
    } else if(process.env.NODE_ENV === 'production'){
        
        let error = {...err};
        error.message = err.message;
        //Handling mongoose errors as well
        //CAST ERROR -If we put an invalid ID in get Tour 
        //for example
        
        //Note when destructuring, the err.name did not 
        //go into error, which is weird
        if(err.name === 'CastError')
        error = handleCastErrorDB(error)
      

        //Creating a tour with a duplicate name
        if(error.code === 11000)
        error = handleDuplicateFieldsDB(error);

        //VALIDATION ERROR -- updating a tour with incorrect field
        //(e.g. tourRating greater than 5)
        if(err.name === 'ValidationError')
        error = handleValidationErrorDB(error);

        if(err.name === 'JsonWebTokenError') 
        error = handleJWTError(error);

        if(err.name === 'TokenExpiredError')
        error = handleJWTExpiredError();

        sendErrorProd(error, req, res);

    }
};