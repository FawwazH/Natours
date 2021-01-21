const mongoose = require('mongoose');
const dotenv = require('dotenv');

//UNCAUGHT EXCEPTIONS - all errors or bugs that occur in 
//synchronous code but are not handled anywhere
process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION!');
    console.log(err.name, err.message);
    console.log('THE ERROR OCCURS HERE!');
    process.exit(1);
});

dotenv.config({path: './config.env'});
const app = require('./app');
const port = process.env.PORT || 3000;

//Environment variables are global variables that are used to 
//define the environments  in which a node app is running
// console.log(process.env);



//Errors can also occur outside of express, for example DB conn
//failure or we can not login.

//Conneting to DB
const DB = process.env.DATABASE.replace
('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
}).then(() => {
    console.log('DB connection successful!');
})

//To start a server. The callback function is what
//would be called as soon as the server starts 
//listening
const server = app.listen(port, () => {
    console.log(`App running on port ${port}...`);
});

//EVENT LISTENERS --HANDLING REJECTED PROMISES
//Each time there is an unhandled rejection somewhere in our app,
//the process object will emit an object called unhandled rejection
process.on('unhandledRejection', err => {
    console.log(err.name, err.errmsg);
    console.log('UNHANDLED REJECTION');
    //Shutting down gracefully (i.e. first close the server,
    // and only then shut down application) - This give the server
    //some time to finish all the requests that are still pending
    //or being currently handled and only after that, the server 
    //is closed
    server.close(() => {
    //Shutting down application. '1' stands for uncaught exception
    process.exit(1);
    });
});

process.on('SIGTERM', ()=> {
    console.log('SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        console.log('Process terminated!');
    })
})

