//Object from the script we included in tour.pug
const stripe = Stripe('pk_test_51IBPpGAvXXxy5JzEITNM7FHzBO83axYWOp62YrmZ3Qphi9m2RrKeJeupsjlKtLl1P7YaQvVgQTy0Q6a4VGbo3dOx00flo8lZiC');

import axios from 'axios';
import {showAlert} from './alerts';


export const bookTour = async (tourId) => {
    try{
    //1. Get the checkout session from the endpoint
    const session = await axios(`http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`);
    //2. Create checkout form + charge the credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    })
    }catch(err){
        console.log(err);
        showAlert('error', err)
    }
    
};

