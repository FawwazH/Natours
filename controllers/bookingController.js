const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('./../models/tourModel');
const Booking = require('./../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const User = require('../models/userModel');



exports.getCheckoutSession = catchAsync(async (req, res, next) => {
    // 1) Get the currently booked tour
    const tour = await Tour.findById(req.params.tourId);
    //console.log(tour);
  
    // 2) Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      success_url: `${req.protocol}://${req.get('host')}/my-tours`,
      cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
      customer_email: req.user.email,
      client_reference_id: req.params.tourId,
      line_items: [
        {
          name: `${tour.name} Tour`,
          description: tour.summary,
          images: [`${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`],
          amount: tour.price * 100,
          currency: 'usd',
          quantity: 1
        }
      ]
    });
  
    // 3) Create session as response
    res.status(200).json({
      status: 'success',
      session
    });
});







//Creates a new booking in DB
// exports.createBookingCheckout = catchAsync(async(req, res, next) => {
//     //This is temporary, because if a person knows the query string
//     //in the Url, they can make bookings without paying
//     //req.query is the query string
//     const {tour, user, price} = req.query;


//     if(!tour && !user && !price) return next();
//     await Booking.create({tour, user, price});
//     //Removing the query string from the URL
//     //req.originalUrl gives the original Url from which the request came
//     res.redirect(req.originalUrl.split('?')[0]);
    

// });

const createBookingCheckout = async session => {
  const tour = session.client_reference_id;
  const user = (await User.findOne({ email: session.customer_email })).id;
  const price = session.display_items[0].amount / 100;
  await Booking.create({tour, user, price});
}





exports.webhookCheckout = (req, res, next) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed')
    createBookingCheckout(event.data.object);

  res.status(200).json({ received: true });
};



  exports.createBooking = factory.createOne(Booking);
  exports.getBooking = factory.getOne(Booking);
  exports.getAllBookings = factory.getAll(Booking);
  exports.updateBooking = factory.updateOne(Booking);
  exports.deleteBooking = factory.deleteOne(Booking);

//In the Stripe webhook, the specified URL is where Stripe will 
//automatically send a POST request to whenever a checkout session
//has successfully completed. With this POST request, Stripe will
//send back the original session data that we created in 
//getCheckoutSession


