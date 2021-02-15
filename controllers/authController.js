const crypto = require('crypto');
const {promisify} = require('util');
const jwt = require('jsonwebtoken');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

const signToken = id => {
    return jwt.sign({id}, process.env.JWT_SECRET,{
        expiresIn: process.env.JWT_EXPIRES_IN
    })
};


const createSendToken = (user, statusCode, req, res) => {
    //Sending JWT via Cookie
    //A cookie is a small piece of text a server can send to 
    //clients. When the client receives a cookie, it will
    //automaically store it and automatically send it back 
    //along with all future requests to the same server
    const token = signToken(user._id);

    //To send a cookie, we have to attach it to the response object
    const cookieOptions = {
        //The client will delete the cookie after this time has expired
        expires:new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN *24 * 60 *60 * 1000),
        //The cookie will only be sent on a secure conn, only using HTTPS
        //secure: true,
        //So the cookie can not be accessed or modified in any way by the browser
        httpOnly: true,
        //Only if the request is secure and the x-forward is for heroku
        secure: req.secure || req.headers['x-forward-proto'] === 'https'
    }
    
    
    res.cookie('jwt', token, cookieOptions)

    //Remove pw from output
    user.password = undefined;
    res.status(statusCode).json({
        status: 'success',
        token,
        data:{
            user
        }
    })
};



exports.signup = catchAsync(async (req, res, next) => {
    //In User.create, we pass in an object with the data from
    //which the user should be created
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        role: req.body.role
        //passwordChangedAt: req.body.passwordChangedAt
    })

    const url = `${req.protocol}://${req.get('host')}/me`;
    // console.log(url);
    await new Email(newUser, url).sendWelcome();
    
    //Log the new user in as soon as they sign up
    //The ID is the payload
    //The option we pass is the time after which the token is invalid
    //const token = signToken(newUser._id)

    //Now sending the token to the client in the response
    createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
    //same as saying: const email = req.body.email (Destructuring)
    const {email, password} = req.body;

    //1. Check if email and password is provided
    if(!email || !password){
       return next (new AppError('Please provide email and password',
        400));
    }
    //2. Check if the user exists && if password is correct
    //We explicity selected that we want the password in the 
    //user variable using select and +
    const user = await User.findOne({email:email})
    .select('+password');

    //The user variable is a user document because it is the 
    //result of querying the user model so it has access to 
    //the created instance method

    //Now comparing the pw in the DB with the pw the user
    //just presented
    //Using the bcrypt package we can compare the original
    //pw with the hased/encrypted one.

     //3. If everything is ok, send the JSON web token to client
     //We could have done this seperately (i.e. first checking
     //for the user then checking for the correct pw, but we
     //would give a potential attaker whether the email or
     //pw is incorrect)
    if(!user || !(await user.correctPassword(password, user.password))){
        return next (new AppError('Incorrect email or password',
        401));
    }
    createSendToken(user, 200, req, res);
});


//To LOGOUT the user we will create a log out route that sends
//back a new cookie with the same name but no JWT token 
//which will over ride the current cookie in the browser 
//with one that has the same name but no token
//So when this cookie is sent with the next request, we 
//will not be able to identify the user as logged in.
exports.logout = (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    })
    res.status(200).json({status: 'success'});
};




exports.protect = catchAsync(async (req, res, next) => {
    let token;
    //1. Get token and check if it exists
    //The token on the client side is sent with the request 
    //as a header called authorization and conventionally starts
    //with 'Bearer'
    if(req.headers.authorization && 
        req.headers.authorization.startsWith('Bearer')){
            token = req.headers.authorization.split(' ')[1];
            //We can also authorize clients based on tokens 
            //sent via cookies and not only the authorization header
        }else if(req.cookies.jwt){
            token = req.cookies.jwt;
        }

        if(!token){
            return next(new AppError('You are not logged in. Please log in to get access', 401));
        }
    
    
    //2. Verification the token -- Verification of the signature
    //This step we verify if someone manipulated the data (payload)
    // or the token has expired
    //Also using util to promisify the verification
    //Note the cb function runs as soon as the verification 
    //has been completed meaning the verify function is async
    //Promisify is used when you want to convert a callback 
    //function into a promise based function
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);  
    //Returns the decoded payload 

    //3. Check if user still exists --for example, someone created
    //a user was given a token, then after some time deleted their
    //account
    const currentUser = await User.findById(decoded.id);
    if(!currentUser){
        return next(new AppError('The user belonging to this token no longer exists', 401));
    }

    //4. Check if user changed password after the JWT token 
    //was issued
    if (currentUser.changedPasswordAfter(decoded.iat)){
        return next(new AppError('User recently changed password! Please login again', 401));   
    }

    //Grant access to protected route
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
});


//Only for rendered pages, no errors!
exports.isLoggedIn =  async (req, res, next) => {
    let token;
   //For the rendered website, the token will only be sent
   //using the cookies and never the authorization header
   //1. Verifies the token
    if(req.cookies.jwt){
        try{
        const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);  
 
        //2. Check if user still exists
        const currentUser = await User.findById(decoded.id);
        if(!currentUser){
            return next();
        }

        //3. Check if user recently changed password
        if (currentUser.changedPasswordAfter(decoded.iat)){
            return next();   
        }
        //There is a logged in user - Making user accesible to the
        //PUG templates (PUG templates have access to response.locals)
        res.locals.user =  currentUser;
        return next();
    }catch(err){
        return next();
    }}

    next();
    
};

//Authorization - verifying if a certain user has the rights 
//to interact with a certain resource (Not all logged in users
//will be allowed to perform the same actions)
//Since middleware functions can not take in paramaters besides
//req, res and next, we wrap it and return it from an external function
//that has access to parameters we need.
//So the miidlware function would have access to the ..roles param
//due to closures
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
    //roles['admin', 'lead-guide']
    //If the roles array does not include the role of the current
    //user then we do not give permission to that user
    if(!roles.includes(req.user.role)){
        return next(new AppError('You do not have permission to perform this action', 403));
        }

        next();
    }
};

//Resetting password - two steps
//1. The user sends a post request to a forgot password route, 
//only with the email address. This will create a reset token 
//and send that to the email address provided. A simple random 
//token not a JSON Web token


exports.forgotPassword = catchAsync(async (req, res, next) => {
    //1. Get user based on posted email
    const user = await User.findOne({email: req.body.email})
    if(!user){
        return next(new AppError('There is no user with email', 404));
    }

    //2. Generate random token
    const resetToken = user.createPasswordResetToken();
    await user.save({validateBeforeSave: false});


    //3. Send it back as an email
    //This is the URL we are sending to the user's email
    
    //const message = `Forgot your password? Submit a PATCH reques with your new password and password Confirm
    //to ${resetURL}. If you did not forget your password, please ignore this email.`;

    try{
        // await sendEmail({
        //     //req.body.email
        //     email: user.email,
        //     subject: 'Your password reset token (valid for 10 minutes)',
        //     message
        // })
        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
        await new Email(user, resetURL).sendPasswordReset();
        res.status(200).json({
            status: 'success',
            message: 'Token sent to email!'
        }) 
    }catch(err){
        //In the case something goes wrong with the sendEmail
        //function. We also need to reset the password reset token
        // and the password reset expired that was defined.
        //So at this point it is not enough to simply catch the err
        //and send it to the global err handling middleware
        user.PasswordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({validateBeforeSave: false});

        return next(new AppError('There was an error sending the email. Try again later', 500));
    }
});

//2.User sends that token from his email along with a new password
//in order to update his password


exports.resetPassword = catchAsync(async (req, res, next) => {
    //1. Get user based on the token, where the token would be
    //specified in the URL in req.params.token
    const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

    //Querying DB for user with encrypted token
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
      });
      


    //2. If token has not expired and there is a user, set the 
    //NEW PASSWORD
    //Rmr the sent URL contains the non-encrypted token. So we
    //now take that token, encrypt it and comapare it with the
    //encryted token in the DB
    if(!user){
        return next(new AppError('Token is invalid or has expired', 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.PasswordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();


    //3. Upadate changedPaaswordAt property for current user
    //This was done in a document middleware function

    //4. Log in user, send JWT
    createSendToken(user, 200, req, res);

});

//Allowing logged in user to change his password
exports.updatePassword = catchAsync(async (req, res, next) => {
  //User must provide current password before updating

  //1. Get user from collection
    const user = await User.findById(req.user.id).select('+password');
  
  //2. Check if the posted pw is correct
    if(!(await user.correctPassword(req.body.passwordCurrent, user.password))){
        return next(new AppError('Your current password is wrong.', 401));    
    }

  //3. If correct, update the password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    //Why did we not use user.findByIdAndUpdate instead of the 
    //previous three lines? It is because the validators only 
    //work using save or create and not findByIdAndUpdate.
    //Also, the pre-save middlewares would not run either

  //4. Log the user in, send JWT 
  createSendToken(user, 200, req, res);
});



