const crypto = require('crypto');
const mongoose =require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');



//Creating Schema
const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: [true, 'Please tell us your name!']
    },
    email:{
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']   
    },
    photo: {type: String,
    default: 'default.jpg'},
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        //When getting the user info, wont return the encrypted PW
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm password'],
        validate: {
            //This only works on User.save or User.create
            validator: function(el){
                return el === this.password;
                //Will return a validation error if false
            },
            message: 'Passwords are not the same'
        }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active:{
        type: Boolean,
        default:true,
        select: false
    }
});

//Using document middleware to encrypt the passwords
//The encryption is then gonna happen between the moment 
//that we receive the data and the moment where it is
//persisted in the database
userSchema.pre('save', async function(next){
//We only want to encrypt the password if the password field
//has been updated or created new (not if other fields updated)
    if (!this.isModified('password')) return next();
    
    //This.password - the password in the current doc
    //12 describes how CPU intensive the salt should be
    //(salt is the process of generating a string to encrypt data)
    this.password = await bcrypt.hash(this.password, 12);
    

    //Deleting the confirmed password
    this.passwordConfirm = undefined;
    next();

});

//Password save at property
userSchema.pre('save', function(next){
    //If we did not modify the password or if the document is new
    //property then do not manipulate the passwordChangedAt
    if(!this.isModified('password') || this.isNew)
    return next();

    this.passwordChangedAt = Date.now() - 1000;
    //Sometimes saving to the DB is a bit slower than issuing the
    //JSON web token such that the changed password timestamp 
    //is set a bit after the JSON web token is created. This would
    //make it so that the user will not be able to log in using the
    //new token (i.e. issued token time stamp is before the 
    // changed password timestamp which will not allow logging in)
    next();
});


//QUERY MIDDLEWARE
userSchema.pre(/^find/, function(next){
    //Used a reg-exp looking for words or strings that start with find
    //this points to the current query
    //We want to find all documents that have the query property set 
    //to true.
    //This middleware would run before the query (i.e. the User.find in
    //the user controller)
    //All docs where active us not equal to false
    this.find({active: {$ne: false}});
    next();

});


//An instance method - a method that is available on all docs
//of a certain collection
userSchema.methods.correctPassword = async function(candidatePassword,
    userPassword){
    //this.password points to the current document's password
    //however, it wont be available since in the schema,
    //password is set to elect:false. This function returns
    //true or false (i.e. is passwords are the same or not)
    return await bcrypt.compare(candidatePassword, userPassword);
}

//Another instance method. JWT time stamp is when the token 
//was created. This points to doc
//Has the user changed his password after the token was issued?
userSchema.methods.changedPasswordAfter = function(JWTTimestamp){
    let changedTimestamp;
    //Only if the password.changedAt property exists do the 'if'
    if(this.passwordChangedAt){
        //console.log(this.passwordChangedAt, JWTTimestamp);
        //Converting the this.password.changedAt into a form similar to 
        // to JWT time stamp (2021-04-30T00:00:00.000Z 1609794058)
        changedTimestamp = parseInt(this.passwordChangedAt.getTime()/1000, 10); 
        
    }
    //FALSE means password was not changed (the day or time at
    //which the token was issued is less than the changedTimestamp)
    return JWTTimestamp < changedTimestamp;
};


userSchema.methods.createPasswordResetToken = function(){
    //Never set plain reset token in DB, so we encrypt it and 
    //then save to DB. We are going to send the plain token to the 
    //user's email (i.e. return reset Token)
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    console.log({resetToken}, this.passwordResetToken)
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;