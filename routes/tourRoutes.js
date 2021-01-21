const express = require('express');

const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');

const reviewRouter = require('./../routes/reviewRoutes');

const router = express.Router();

//This tour router should use the review router in case it
//ever encounters a route like this. Another example of mounting 
//a router.
router.use('/:tourId/reviews', reviewRouter);


//This will only run for the getting a specific tour not a user since
//it is specified in the tour router
// router.param('id', tourController.checkID);
router
    .route('/top-5-cheap')
    .get(tourController.aliasTopTours, tourController.getAllTours);

router
    .route('/tour-stats')
    .get(tourController.getTourStats);

    router
    .route('/monthly-plan/:year')
    .get(authController.protect, 
        authController.restrictTo('admin','lead-guide', 'guide'), 
        tourController.getMonthlyPlan);


//You want to know tours that are starting a certain distance from 
//you.
router.route('/tours-within/:distance/center/:latlng/unit/:unit')
.get(tourController.getToursWithin);

//Using geospatial aggregation to calculate distances to all tours
//from a certain point
router.route('/distances/:latlng/unit/:unit')
.get(tourController.getDistances);

router
    .route('/')
    //Protecting the get all tours route, before running the 
    //getAllTours handler, verfiy if the user is logged in or 
    //not using middleware
    .get(tourController.getAllTours)
    .post(authController.protect, 
        authController.restrictTo('admin', 'lead-guide'), 
        tourController.createTour);

   

router
    .route('/:id')
    .get(tourController.getTour)
    .patch(authController.protect, 
        authController.restrictTo('admin','lead-guide'), 
        tourController.uploadTourImages,
        tourController.resizeTourImages,
        tourController.updateTour)
    .delete(authController.protect, 
        authController.restrictTo('admin','lead-guide'), 
        tourController.deleteTour);

//NESTED ROUTES
//In reality when creating a review, the user ID should come from the
//currently logged in user and a tour ID should come from the 
//current tour and these should be encoded into the URL(route)
//E.g. POST /tour/234fad/reviews -- this is a nested route
//since reviews is a child of tours. The route means, access the
//reviews resource on the tours resource
//GET /tour/234fad/reviews -- this should get us all the reviews
//for the requested tour
//where 234fad is the tour ID
//GET /tour/234fad/reviews/9898 - accessing a particular review
// router.route('/:tourId/reviews').post(authController.protect, 
// authController.restrictTo('user'), reviewController.createReview);




module.exports = router;