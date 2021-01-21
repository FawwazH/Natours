const path = require('path');
const express = require('express');
const app = express();
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongooseSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');

//IMPORTS
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');



//To trust proxies - Heroku configuration
app.enable('trust proxy');

//Setting up PUG template engine
app.set('view engine', 'pug');
//The templates are the view in MVC
app.set('views', path.join(__dirname, 'views'));


//Serving static files
app.use(express.static(path.join(__dirname, 'public')));

//Setting security HTTP headers
app.use(helmet({ contentSecurityPolicy: false }) );

//Random code

app.use(morgan('dev'));

//Limit the number of request from a single IP
const limiter = rateLimit({
    //How many req per IP for a given time
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!' 
});
//Affect all of the routes that start with /api
app.use('/api',limiter);

//Body parser, reading data from body into req.body
app.use(express.json({
    limit: '10kb'
}));

//Parses information from a form
app.use(express.urlencoded({extended: true, limit: '10kb'}));

//Parses the data from cookies
app.use(cookieParser());

//Data sanitization - clean all the data that comes into the 
//app from malicious code (i.e. code trying to attack our app)
//Data sanitizations against NoSQL query injection
app.use(mongooseSanitize());
//Mongoose sanitize looks at the request body, the request query
//string and also request.params and filter out all dollar signs and dots


//Data sanitization against XSS
app.use(xss());
//Cleans any user input from malicious HTML code

//Preventing parameter pollution. (For example, if a hacker specifies
//sort twice in the get all tours route). Clears up the query string
//Also, whitelisting some params so we can use multiple params
//such as duration=5&duration=9
app.use(hpp({
    whitelist: ['duration', 'ratingsQuantity', 'ratingsAverage', 'difficulty', 'price']
}));

app.use((req, res, next) => {
    req.requestTime = new Date().toISOString();
    next();
});

app.use(compression());

//Mounting a new router on a route in this case we are mounting the
//new router (tourRoute and userRoute) on the corresponding route
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

//ERROR HANDLING MIDDLEWARE
app.use(globalErrorHandler);

module.exports = app;











