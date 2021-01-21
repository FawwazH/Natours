const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');
const User = require('./userModel');

const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must have a name'],
        unique: true,
        trim: true,
        maxlength: [40, 'A tour name must have less or equal 40 chars'],
        minlength: [10, 'A tour name must have more or equal 10 chars']
    },
    slug: String,
    duration:{
        type: Number,
        required: [true, 'A tour must have a duration']
    },
    maxGroupSize:{
        type: Number,
        required: [true, 'A tour must have a group size']
    },
    difficulty:{
        type: String,
        required: [true, 'A tour must have a difficulty'],
        enum: {
           values: ['easy','medium', 'difficult'],
           message: 'Difficulty ie either easy, medium, difficult'

        }
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, 'Rating must be above 1.0'],
        max: [5, 'Rating must be below 5.0']
    },
    ratingsQuantity:{
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: [true, 'A tour must have a price']
    },
    priceDiscount:{
       type: Number,
       //Where the val is the priceDiscount input from the user
       //We need to return true or false from this function
       //Also the this value refers to the current doc. 
       validate:{
           validator: function(val){
            return val < this.price; //False will give validation err
            },
       message: 'Discount price should be below regular price'
         }
    //There is an important caviet here, inside a validator
    //function, the this keyword is only going to point to the 
    //current document when we are creating a new document.
    //So the function would not work on update.
    }, 
    summary:{
        type: String,
        trim: true,
        required: [true, 'A tour must have a description']
    },
    description:{
        type: String,
        trim: true
    },
    imageCover:{
        type: String,
        required: [true, 'A tour must have a cover Image']
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now()
    },
    startDates: [Date],
    secretTour:{
        type: Boolean,
        default:false
    },
    startLocation:{
        //Geospatial data (GeoJSON)
        type:{
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    //EMBEDDED DOCUMENTS - This array of objects will create new docs
    //inside of the parent document (in this case is the tour)
    locations: [
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    //To embed the users(i.e. tour guides, lead guides) in the 
    //tours document, when creating a new tour document the user
    //will add an array of user IDs and we can get the corresponding
    //user docs using there IDs and add them to the tour docs.
    //Recall a drawback of this is that we would have the same
    //data twice in the DB since we keep the users seperate for
    //the authorization and authentication processes. Additionally,
    //consider if a tour guide updates his email address or changes
    //his information, we would have to check if that tour has that
    //user as a guide and also update the information there as well
    // guides: Array

    //Now using child referencing instead to relate the tour guides
    //or lead tour guides (i.e. users) in the tour document
    //So again, these would be sub-docs/embedded in the tour doc.
    guides: [
        {
        //This means is that we expect the type of each array element
        //to be a MongoDB id
            type: mongoose.Schema.ObjectId,
            //This is how we establish references between diff
            //datasets in Mongoose. Also, for this we dont even
            //need to import the User model into the document
            ref: 'User'
        }
    ]
}, {
    //SCHEMA OPTIONS for virtual property
    toJSON: {virtuals: true},
    toObject: {virtuals: true}

});

//INDEXES
//Sorting the price index in ascending order -- limit the number
//of docs scanne per query (i.e. increase READ performance)
tourSchema.index({price: 1, ratingsAverage: -1});
tourSchema.index({slug: 1});
//For geospatial data, this index needs to be a 2D sphere index
//if the data describes real points on the Earth. Or a 2D index
//if using fictional points
tourSchema.index({startLocation: '2dsphere'});

//DOCUMENT MIDDLEWARE. This callback function would be called
//before a document is saved to the DB (i.e. runs before the
//.save() and .create() commands, not on insertMany())
tourSchema.pre('save', function(next){
    //The this keyword is going to point to the current document
    // console.log(this);
    //So now we can still act on the data before its saved to DB
    //Now creating a slug (a string that we can put in the URL 
    //usually based on some string like the name) for each of the 
    //documents
    this.slug = slugify(this.name, {lower: true});
    next();
});
//The middleware above is called a pre-save hook

// tourSchema.pre('save', function(next){
//     console.log('Will save document....');
//     next();
// });

// //In the case of post middleware has access not only to next 
// //but also to the document that was just saved to DB
// tourSchema.post('save', function(doc, next){
//     console.log(doc);
//     next();
// });


//Using pre-save middleware to retrieve the users inputted in the
//tour document upon creation to find those users and add them to 
//the tour document as part of the embedded route
// tourSchema.pre('save', async function(next){
//     //An array of the inputted users into the tour doc
//     const guidesPromises = this.guides.map(async id => 
//         await User.findById(id));
//        this.guides =  await Promise.all(guidesPromises);
//        next();
      
// });

tourSchema.virtual('duartionWeeks').get(function () {
    return this.duration/7;
});

//How are we going to access reviews on the tours. Since we can 
//access tours and users on the review
//Virtual populate is a way for example of keeping he array 
//of review ID's on a tour document without actually persisting it
//to the DB. So we would not face the problem of creating so huge
//of an array on a certain tour document that it has no more space
//(Overcomes the problem with child ref.)
tourSchema.virtual('reviews', {
    //The name of the model we want to ref
    ref: 'Review',
    //Specify the name of the fields to connect the datasets
    //The name of the field in the other model (Review model)
    //where the reference (tour) to the current model is stored
    foreignField: 'tour',
    //Where the ID is actually stored in the current model(i.e tour)
    localField: '_id'
})




//QUERY MIDDLEWARE - allows us to run functions before or 
//after a query is executed.
//When the Tour.find() query is created, this middleware is run
//before the query is executed.
//A regular expression is used here because if we use the find 
//hook, it would run for queries using find and not for find one
//etc as defined in the get one tour route. 
tourSchema.pre(/^find/, function (next){
    //The this keyword will now point at the current query and
    //not the current document as opposed to doc middleware
    //Before the query is executed, we run this query middleware
    this.find({secretTour: {$ne: true}});
    this.start = Date.now();
        next();
});

tourSchema.pre(/^find/, function(next){
    //Note: populate method only works on a query
    //Using populate to replace the referenced children (i.e. IDs)
    //with the actual related data (i.e. the user info)
    //This would result in the data appearing as it has been 
    //embedded when in reality, it is in a completely different
    //collection. So populate the guides field in the Tour model
    this.populate({
        path:'guides',
        //So we do not get the following
        select: '-__v -passwordChangedAt'
    });

    next();

});

//Happens afer the query is executed
tourSchema.post(/^find/, function(docs, next){
    console.log(`Query took ${Date.now() - this.start} milliseconds`)
    next();
});
    




//AGGREGATION MIDDLEWARE - allows us to add hooks before or
//after an aggregation happens
tourSchema.pre('aggregate', function(next){
    //Unshift used to add el to beginning of array
    //Removing from the output all docs that have a secret tour
    this.pipeline().unshift({$match: {secretTour: {$ne: true}}});
    console.log(this);
    next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;

