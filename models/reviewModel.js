const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'Review can not be empty']
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    createdAt:{
        type: Date,
        default: Date.now
    },
    tour: {
        //ID it receives 
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Review must belong to a tour.']
    },
    user:{
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Review must belong to a user.']
    }

},{
    //Virtuals - when we have a virtual property (i.e. a field not
    //stored in the DB but calculated using some other value) we
    //want this to show up whenever there is an output for it 
    toJSON: {virtuals: true},
    toObject: {virtuals: true}
});


//Prevent users from writing multiple reviews for the same tour.
//Each user should only review each tour once. A duplcate review
//happens when there is a review with the same user and same 
//tourId. Sol: the combination of user and tour to always be unique
reviewSchema.index({tour: 1, user: 1},{unique: true});



//QUERY MIDDLEWARE
reviewSchema.pre(/^find/, function(next){
    //Note: populate method only works on a query
    //Using populate to replace the referenced children (i.e. IDs)
    //with the actual related data (i.e. the user info)
    //This would result in the data appearing as it has been 
    //embedded when in reality, it is in a completely different
    //collection. So populate the tour and user fields in the Reviews 
    //model. 
    // this.populate({
    //     path: 'tour',
    //     select: 'name'
    // }).populate({
    //     //user info displaying NULL!
    //     path: 'user',
    //     select: 'name photo'
    // })

    this.populate({
        //user info displaying NULL!
        path: 'user',
        select: 'name photo'
    })

    next();

});



//Calculating the average rating and number of ratings of a tour
//each time a new review is added to that tour or when a review is
//updated or deleted. This would be done by writing a static method
//on Reviews Schema
reviewSchema.statics.calcAverageRatings = async function(tourId){
   //Takes in a tour ID, which is the tour ID to which the 
   //review belongs to. The this keyword points to the current model
   const stats = await this.aggregate([
        {
            //Selecting all the reviews that belong to the 
            //tour ID passed in (i.e. the tour we want to update)
            $match: {tour:tourId}
        },
        {
            $group: {
                //Calculating stats
                _id: '$tour',
                numRating: {$sum: 1},
                avgRating: {$avg: '$rating'}
            }
        }
   ])
   //Persisting the review statistics in the tour document
   if(stats.length > 0){
    await Tour.findByIdAndUpdate(tourId, {
        ratingsQuantity: stats[0].numRating,
        ratingsAverage: stats[0].avgRating
    });
   }else{
    await Tour.findByIdAndUpdate(tourId, {
        ratingsQuantity: 0,
        ratingsAverage: 4.5
    });
   } 
}
reviewSchema.post('save', function(){
    //this points to current Review
    this.constructor.calcAverageRatings(this.tour);
})

//Only query middleware works on findByIdAndUpdate and 
//findByIdAndDelete. In the query we dont have direct access
//to the document. We need access to the current review so we
//can extract the tourId and then calculate the stats there
reviewSchema.pre(/^findOneAnd/, async function(next){
    //the this keyword is the current query. We will execute the 
    //query then this will give us the required doc.
    this.r = await this.findOne();
    next();
})

//At this point in time where the query has finished and the 
//review has been updated, this is the perfect point in time 
//to calc stats.
reviewSchema.pre(/^findOneAnd/, async function(){
    //We pass this.r to between the pre and post query middleware
    await this.r.constructor.calcAverageRatings(this.r.tour)
})


const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;



