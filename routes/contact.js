const express = require('express')
const router = express.Router()
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');

router.get('/', (req, res) => {
    res.render('site/contact')
})

router.post('/messagesend',
    body('name').notEmpty().withMessage('Please enter your name'),
    body('surname').notEmpty().withMessage('Please enter your surname'),
    body('email').notEmpty().withMessage('Please enter your email address').bail()
        .isEmail().withMessage('Please enter a valid email address'),
    body('message').notEmpty().withMessage('Please enter a message'),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => ({
                param: error.param,
                msg: error.msg
            }));
            return res.status(400).render('site/contact', {
                errors: errorMessages, values: req.body
            });
        }
        try {
            const name = req.body.name;
            const surname = req.body.surname;
            const email = req.body.email;
            const phone = req.body.phone;
            const message = req.body.message;

            const transporter = nodemailer.createTransport({
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

            const mailOptions = {
                to: '"TherapyTreasure Contact Form" <therapytreasure@outlook.com>',
                from: process.env.ADMIN_EMAIL,
                subject: 'New Contact Message',
                text: `You have received a new contact message:\n\nName: ${name} ${surname}\nEmail: ${email}\nPhone: ${phone}\n\nMessage:\n${message}`,
                html: `
            <html>
            <head>
            <link href="https://fonts.googleapis.com/css2?family=Open+Sans&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Open Sans', sans-serif;
                }
                .email-container {
                    padding: 20px;
                    background-color: #ffffff;
                    max-width: 600px;
                    margin: 0 auto;
                }
                .header {
                    background-color: #5e548e;
                    color: white;
                    padding: 20px;
                    font-size: 24px;
                    font-weight: bold;
                }
                .content {
                    padding: 20px;
                }
                .label {
                    font-weight: bold;
                }
            </style>
            </head>
            <body>
                <div class="email-container">
                    <div class="header">New Contact Message</div>
                    <div class="content">
                        <p><span class="label">Name:</span> ${name} ${surname}</p>
                        <p><span class="label">Email:</span> ${email}</p>
                        <p><span class="label">Phone:</span> ${phone}</p>
                        <p><span class="label">Message:</span></p>
                        <p>${message}</p>
                    </div>
                </div>
            </body>
            </html>
            
            `
            };

            await transporter.sendMail(mailOptions);

            req.session.sessionFlash = {
                type: 'alert alert-success',
                message: 'Your message has been sent.'
            }
            req.session.save();

            res.redirect('/contact');

        } catch (err) {
            console.error(err);
            res.status(500).send('An error occurred');
        }
    });

module.exports = router
