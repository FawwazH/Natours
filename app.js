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
const cors = require('cors');

//IMPORTS
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');
const viewRouter = require('./routes/viewRoutes');



//To trust proxies - Heroku configuration
app.enable('trust proxy');

//Setting up PUG template engine
app.set('view engine', 'pug');

//The templates are the view in MVC
app.set('views', path.join(__dirname, 'views'));

//CORS - cross origin resource sharing. For example say we have our
//app at https://natourscopy.herokuapp.com/api/v1/tours and some other
//website such as example.com is trying to access our API. This is called
//a cross origin request because herokuapp.com is a different domain
// than example.com. Usually cross origin requests are not allowed 
//and by default will fail unless we implement CORS. This only applies
//to requests made in the browser e.g. fetch/axios. Meaning that from
//the server we will always be able to make cross-origin requests without
//restrictions. To be considered cross-origin a request might come from
//a different domain, different subdomain, different protocol or 
//even a different port are considered a cross origin request.
//Now implementing cross origin sharing resource
//This add a couple of headers to our response 
//Access-Control-Allow-Origin * this means to allow all requests wherever
//they are coming from. This middleware only works for simpled requests
//such as GET and POST requests.
app.use(cors());

//Imagine if we had our API at api.natours.com but our front end app
//at natours.com so we only would want to allow access from the 
//natours.com origin we would use:
// app.use(cors({
//     origin: 'https://www.natours.com'
// }))

//Non simple requests, PUT, PATCH and DELETE or requests that send cookies
//These require a pre-flight phase. Whenever there is a non-simple request
// the browser we automatically issue the preflight phase. So before
//the real request actually happens the browser first does an option 
//request in order to figure out if the actual request is safe to send
//So on the server we would need to respond to that options request 
//Options is just another HTTP method. We would need to send back the
//same Access-Control-Allow-Origin header and this way, the browser
//will know the actual request is safe to perform and executes the req
app.options('*', cors());
//We could also only allow these non simple requests on specific routes
//app.options('/api/v1/tours/:id', cors());


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

//Stripe web hook. This route was defined in app.js and not
//in bookingRouter because in the webhookCheckout handler function,
//when we receive the body from Stripe, the Stripe function
//we are going to use to actually read the body needs this 
//body in raw form (i.e. not as JSON). The conversion to JSON
//occurs in app.use(express.json), so we put this middleware before
app.post('/webhook-checkout',
express.raw({type: 'application/json'}), 
bookingController.webhookCheckout);


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
//Enabling CORS on a specific route
// app.use('/api/v1/tours', app.use(cors()), tourRouter);
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











