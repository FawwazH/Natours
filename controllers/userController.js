const multer = require('multer');
const sharp = require('sharp');
const User = require('./../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const e = require('express');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//     destination: (req, file, cb) => {
//      cb(null, 'public/img/users');
//     },
//     filename: (req, file, cb) => {
//         //user-id-timestamp.file-ext
//         const ext = file.mimetype.split('/')[1];
//         cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//     }
// });
//Image is not stored on disk, instead keep the image in memory
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')){
        cb(null, true)
    }else{
        cb(new AppError('Not an image! Please upload only images.', 400)
        , false)
    }
}

//MULTER
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});
 exports.uploadUserPhoto = upload.single('photo');



exports.resizeUserPhoto = catchAsync(async(req, res, next) => {
    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
    
    if(!req.file) return next();
    await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat('jpeg')
        .jpeg({quality: 90})
        .toFile(`public/img/users/${req.file.filename}`);
    //Writing to file on the disk

    next();
});

const filterObj = (obj, ...allowedFields) => {
//allowedFields is a rest parameter which would create an array
//containing all of the arguments passed in after the first arg
   const newObj = {};
    Object.keys(obj).forEach(el => {
        if(allowedFields.includes(el)) newObj[el] = obj[el];
    })
    return newObj;

};

//ME endpoint, where a user can access all his data -using the 
//get one factory function using the ID coming from the currently
//logged in user, in this way, we do not have to pass in any ID
//as a URL parameter
exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
};


exports.getAllUsers = factory.getAll(User);


//Allow the currenlty logged in user to manipulate his user data
exports.updateMe = catchAsync(async (req, res, next) => {
    //1. Create error if user POSTS password data
    if(req.body.password || req.body.passwordConfirm){
        return next(new AppError('This route is not for password updates. Please use /updateMyPassword', 400));
    }
   
    //2. Update user document -- we can try to do it with user.save
    //(i.e. getting the user and updating the properties then saving
    //the doc.) The problem with this is that there are some fields
    //that are required which we are not updating and because of this,
    //we will get some error. Now instead we use find by Id and update
    //New is set to true to send the updated document and the 2nd arg
    //is the object what we want to update to.
    //We do not want the user to update everything in the body.
    //For example we dont want the user to be able to change his role
    //to admin
    const filteredBody = filterObj(req.body, 'name', 'email');
    if(req.file) filteredBody.photo = req.file.filename;
    //So we only keep the name and email in the body so only 
    //these fields can be updated in the DB
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
        new: true,
        runValidators: true
    });
   
    res.status(200).json({
        status: 'success',
        data:{
            user: updatedUser
        }
    })
});

//Allow the user to delete his account - we do not delete his doc
//from the DB. Instead we set the account to inactive so the
//user can one day reactivate the account
exports.deleteMe = catchAsync(async(req, res, next)=> {
    await User.findByIdAndUpdate(req.user.id, {active:false});
    res.status(204).json({
        status: 'success',
        data: null
    })

});

exports.getUser = factory.getOne(User);

// exports.getUser = (req, res) => {
//     res.status(500).json({
//         status: 'error',
//         message: 'This route is not yet defined!'
//     })
// };

exports.createUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not yet defined! Please use sign up instead'
    })
};

//When using findByIdAndUpdate, no save middleware runs
//DO not update passwords with this
exports.updateUser = factory.updateOne(User);
// exports.updateUser = (req, res) => {
//     res.status(500).json({
//         status: 'error',
//         message: 'This route is not yet defined!'
//     })
// };

exports.deleteUser = factory.deleteOne(User);

// exports.deleteUser = (req, res) => {
//     res.status(500).json({
//         status: 'error',
//         message: 'This route is not yet defined!'
//     })
// };