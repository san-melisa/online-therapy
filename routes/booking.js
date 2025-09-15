const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Schedule = require("../models/Schedule");
const Therapist = require("../models/Therapist");
const User = require("../models/User")
const nodemailer = require('nodemailer');


const requireUser = (req, res, next) => {
    if (res.locals.isUser) {
        return next();
    }
    return res.redirect('/users/signin');

};

router.get('/:therapistId', requireUser, async (req, res) => {
    try {
      const therapist = await Therapist.findById(req.params.therapistId).populate('user_id', 'name surname');
      const booking = await Booking.findOne({ therapist_id: therapist._id, user_id: req.session.userId });
      const schedule = await Schedule.find({ therapistId: therapist._id }).lean().exec();
      res.render('site/booking', { therapist, schedule, booking });
    } catch (err) {
      console.error(err);
    }
  });
  

router.post("/:therapistId", async (req, res) => {
    console.log(req.body)
    try {
        if (!req.body.appointmentDate || !req.body.appointmentTime) {
            res.status(400).send("Appointment date and time are required");
            return;

        }
        const booking = new Booking({
            user_id: req.session.userId,
            therapist_id: req.params.therapistId,
            meetingType: req.body.meetingType,
            platform: req.body.platform,
            platformDetails: req.body.platformDetails,
            appointmentDate: new Date(`${req.body.appointmentDate}T${req.body.appointmentTime}`),
        });

        await booking.save();

        const user = await User.findById(req.session.userId)

        const userEmail = user.email;

        const therapist = await Therapist.findById(req.params.therapistId).populate('user_id');

        const therapistEmail = therapist.user_id.email


        const transporter1 = nodemailer.createTransport({
            host: 'smtp.office365.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.ADMIN_EMAIL,
                pass: process.env.ADMIN_PASSWORD
            },
            tls: {
                ciphers: 'SSLv3'
            }
        });

        const transporter2 = nodemailer.createTransport({
            host: 'smtp.office365.com',
            port: 587,
            secure: false,
            auth: {
                user: process.env.ADMIN_EMAIL,
                pass: process.env.ADMIN_PASSWORD
            },
            tls: {
                ciphers: 'SSLv3'
            }
        });


        const mailOptions1 = {
            to: userEmail,
            from: process.env.ADMIN_EMAIL,
            subject: 'You incoming Appointment at Therapy Treasure ',
            html: `
        <html>
        <head>
        <link href="https://fonts.googleapis.com/css2?family=Open+Sans&display=swap" rel="stylesheet">
        <style>
            body {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 20px;
                font-family: Arial, sans-serif;
            }
            .email-container {
                text-align: center;
                padding: 20px;
                background-color: #ffffff;
                max-width: 600px;
                margin: 0 auto;

            }
            .title {
                font-size: 20px;
            }

            .appointment {
                background-color: #f9f9f9;
                padding: 10px;


            }

            ul {
                list-style: none;
            }

            
        </style>
        </head>
        <body>
        <pre>
        <div class="email-container">
                <p class="title"><strong>Thank you for choosing Therapy Treasure!</strong></p>
                <h3> Dear ${user.name}, </h3>
                <p> We are happy to report that your appointment has been made successfully.</p>
                <div class="appointment">
                    <ul> 
                        <li><strong> Appointment Details</strong></li>
                        <li> <strong> Date:</strong> ${req.body.appointmentDate}</li>
                        <li><strong> Time: </strong> ${req.body.appointmentTime} </li>
                        <li> <strong> Terapist:</strong> ${therapist.user_id.name} ${therapist.user_id.surname}</li>
                        <li><strong> Meeting Type: </strong> ${req.body.meetingType}</li>
                        <li> <strong> Choosen Platform: </strong> ${req.body.platform} </li>
                        <li> <strong>User Information:</strong> ${req.body.platformDetails}</li>
                    </ul>
               </div>
               <p>Please be ready at the appointment date and time. If you wish to cancel or change your appointment,
                 please log in to your Therapy Treasure account and follow the relevant steps.</p>
                 
                 
               <p>If you have any questions about your appointment or need support, do not hesitate to contact us. We will be happy to assist you.</p>
        
               <p>Sincerely,<br>Therapy Treasure Team</p>
        </div>
        </pre>
        </body>
        </html>`
        };

        const mailOptions2 = {
            to: therapistEmail,
            from: process.env.ADMIN_EMAIL,
            subject: 'A new therapy appointment has been scheduled with you',
            html: `
        <html>
        <head>
        <link href="https://fonts.googleapis.com/css2?family=Open+Sans&display=swap" rel="stylesheet">
        <style>
            body {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 20px;
                font-family: Arial, sans-serif;
            }
            .email-container {
                text-align: center;
                padding: 20px;
                background-color: #ffffff;
                max-width: 600px;
                margin: 0 auto;

            }
            .title {
                font-size: 20px;
            }

            .appointment {
                background-color: #f9f9f9;
                padding: 10px;


            }

            ul {
                list-style: none;
            }

            
        </style>
        </head>
        <body>
        <pre>
        <div class="email-container">
                <p class="title"><strong>You have a new appointment at Therapy Treasure!</strong></p>
                <div class="appointment">
                    <ul> 
                        <li><strong> Appointment Details</strong></li>
                        <li> <strong> Date:</strong> ${req.body.appointmentDate}</li>
                        <li><strong> Time: </strong> ${req.body.appointmentTime} </li>
                        <li> <strong> User:</strong>  ${user.name} ${user.surname}</li>
                        <li><strong> Meeting Type: </strong> ${req.body.meetingType}</li>
                        <li> <strong> Choosen Platform: </strong> ${req.body.platform} </li>
                        <li> <strong>User Information:</strong> ${req.body.platformDetails}</li>
                    </ul>
               </div>
               <p>Please be ready at the appointment date and time. If you wish to cancel or change your appointment,
                 please log in to your Therapy Treasure account and follow the relevant steps.</p>
                         
               <p>Sincerely,<br>Therapy Treasure Team</p>
        </div>
        </pre>
        </body>
        </html>`
        };
        await transporter1.sendMail(mailOptions1);
        await transporter2.sendMail(mailOptions2);


        res.redirect(`/therapist/${req.params.therapistId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});




module.exports = router;
