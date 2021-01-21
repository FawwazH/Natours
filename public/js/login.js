import axios from 'axios';
import {showAlert} from './alerts';

export const login = async (email, password) => {
    console.log(email, password);
    try{
        const res = await axios({
            method: 'POST',
            //This only works because both from and back end are hosted
            //on the same URL. Its a relative path ('/')
            url: '/api/v1/users/login',
            //Specifying the body data (i.e. req.body)
            data: {
                email: email,
                password: password
            }
        });

        if(res.data.status === 'success'){
            showAlert('success', 'Logged in successfully!')
            window.setTimeout(()=> {
                location.assign('/');
            }, 1500);
        }
    }catch(err){
        showAlert('error', err.response.data.message);
    }

};


export const logOut = async () => {
    try{
        const res = await axios({
            method: 'GET',
            url: '/api/v1/users/logout'
        })
        if(res.data.status === 'success') location.reload(true);
    }catch(err){
        showAlert('error', 'Error logging out! Try again');
    }
}



