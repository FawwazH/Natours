const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');




//Now enabling the review router to get access to the tour Id from
//the tour route, since the routers below havent any access to it
const router = express.Router({mergeParams: true});

router.use(authController.protect);

router.route('/')
.get(reviewController.getAllReviews)
.post(authController.restrictTo('user'), 
    reviewController.setTourUserIds,
    reviewController.createReview);


router.route('/:id')
.get(reviewController.getReview)
.patch(authController.restrictTo('user', 'admin'), 
reviewController.updateReview)
.delete(authController.restrictTo('user', 'admin'),
reviewController.deleteReview);

module.exports = router;