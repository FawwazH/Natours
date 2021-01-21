const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

//FACTORY FUNCTION - a function that returns another function in our
//case, our handler functions for the  (for deleting, creating,
//updating and reading resources)
//The goal is to basically create a function which will then return
//a function that looks like exports.deleteTour but not only for
//the tour but also for reviews and users (all models)

exports.deleteOne = Model => catchAsync (async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id)
    if(!doc){
        return next(new AppError('No document found with that ID', 404));
    }
    res.status(204).json({
        status: 'success',
        data: null
    })
});

exports.updateOne = Model => catchAsync(async (req, res, next) => { 
    const doc = await Model.findByIdAndUpdate
    (req.params.id, req.body, {
        new: true,
        runValidators: true
    })
    if(!doc){
        return next(new AppError('No document found with that ID', 404));
    }
    res.status(200).json({
        status: 'success',
        data: {
            data: doc
        }
    })  
});

exports.createOne = Model => catchAsync (async (req, res, next) => {
    const doc = await Model.create(req.body);
        res.status(201).json({
            status: 'success',
            data: {
                data: doc
        }
    })
});

//Where popOptions is the .populate options
exports.getOne = (Model, popOptions) => catchAsync(async (req, res, next) => { 
    let query = Model.findById(req.params.id);
    if(popOptions) query = query.populate(popOptions);
    const doc = await query;
    
    if(!doc){
        return next(new AppError('No document found with that ID', 404));
    }
     res.status(200).json({
        status: 'success',
        data: {
            data: doc
        }
    })
});

exports.getAll = Model => catchAsync(async (req, res, next) => {
    //Allow for nested GET reviews on tour (hack)
    let filter = {};
    if(req.params.tourId) filter = {tour: req.params.tourId};
   
    const features = new APIFeatures(Model.find(filter), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

    const doc = await features.query;
    res.status(200).json({
        status: 'success',
        results: doc.length,
        data: {
            data: doc
        }
    })
});


// exports.getAllTours = catchAsync(async (req, res, next) => {
//     const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();

//     const tours = await features.query;
//     res.status(200).json({
//         status: 'success',
//         results: tours.length,
//         data: {
//             tours
//         }
//     })
// });

// exports.getTour = catchAsync(async (req, res, next) => {
//     //This populate is used in conjunction with the virtual populate
//     //in the tour model. Reviews is the field name to populate
//     const tour = await Tour.findById(req.params.id).populate('reviews');
    
//     //If there is no false
//     if(!tour){
//         return next(new AppError('No tour found with that ID', 404));
//     }
//     res.status(200).json({
//         status: 'success',
//         data: {
//             tour
//         }
//     })
// });

// exports.createTour = catchAsync (async (req, res, next) => {
//     const newTour = await Tour.create(req.body);
//         res.status(201).json({
//             status: 'success',
//             data: {
//                 tour: newTour
//         }
//     })
// });



// exports.deleteTour = catchAsync (async (req, res, next) => {
//     const tour = await Tour.findByIdAndDelete(req.params.id)
//     if(!tour){
//         return next(new AppError('No tour found with that ID', 404));
//     }
//     res.status(204).json({
//         status: 'success',
//         data: null
//     })
// });


// exports.updateTour = catchAsync(async (req, res, next) => { 
//     const tour = await Tour.findByIdAndUpdate
//     (req.params.id, req.body, {
//         new: true,
//         runValidators: true
//     })
//     if(!tour){
//         return next(new AppError('No tour found with that ID', 404));
//     }
//     res.status(200).json({
//         status: 'success',
//         data: {
//             tour
//         }
//     })  
// });