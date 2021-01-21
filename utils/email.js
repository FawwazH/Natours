const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
    constructor(user, url){
        this.to = user.email;
        this.firstName = user.name.split(' ')[0];
        this.url = url;
        this.from = `Jonas Schmedtmann <${process.env.EMAIL_FROM}>`;

    }
    newTransport(){
        if(process.env.NODE_ENV === 'production'){
            //Sendgrind
            //Note sendgrid required a waiting period to confirm
            //account so I moved on ahead with course and wrote the 
            //logic below 
            return nodemailer.createTransport({
                service: 'SendGrid',
                auth: {
                    user: process.env.SENDGRID_USERNAME,
                    pass: process.env.SENDGRID_PASSWORD
                }
            })
        }

        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
            
        })
    }
    async send(template, subject){
        //1. Render HTML for email based on PUG template
        //In this case __dirname is where the current script is
        //running (i.e. the utilities folder) Creates HTML from a 
        //PUG template
        const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`,{
            firstName: this.firstName,
            url: this.url,
            subject
        });

        //2. Define the email options
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject: subject,
            html: html,
            //Stripping away the html and leaving only content
            //personal pref also in regard to spam emails
            text: htmlToText.fromString(html)
        }

        //3. Create a transport and send email
        await this.newTransport().sendMail(mailOptions);
        
    }
    async sendWelcome(){
        await this.send('Welcome', 'Welcome to the Natours Family!');
    }

    async sendPasswordReset(){
        await this.send('passwordReset', 'Your password reset token (valid for only 10 minutes)')
    }
};



