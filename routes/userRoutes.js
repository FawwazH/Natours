const express = require('express');

const userController = require('./../controllers/userController');
const authController = require('./../controllers/authController');
const reviewController = require('./../controllers/reviewController');


const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);


//All the below routes require authentication. Instead of writing
//authController.protect on all routes, we can create a middleware
//on the miniapplication that is the router
//It will only call the next middleware next() (i.e. update pw), 
//if the user is authenticated
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);
router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMe',userController.uploadUserPhoto, userController.resizeUserPhoto, userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo('admin'));

router
    .route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser);

router
    .route('/:id')
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);




module.exports = router;