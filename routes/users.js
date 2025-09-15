const express = require('express')
const router = express.Router()
const User = require('../models/User')
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');


router.get('/signup', (req, res) => {
    res.render('site/signup')
})


router.post('/signup',
    body('name').notEmpty().withMessage('Please enter your name'),
    body('surname').notEmpty().withMessage('Please enter your surname'),
    body('email').notEmpty().withMessage('Please enter your email address').bail()
        .isEmail().withMessage('Please enter a valid email address'),
    body('password').notEmpty().withMessage('Please enter your password').bail()
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').notEmpty().withMessage('Please confirm your password').bail()
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
    body('ageCheck').notEmpty().withMessage('You must confirm you are over 18'),
    body('termsCheck').notEmpty().withMessage('You must accept the terms of service and privacy policy'),


    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => ({
                param: error.param,
                msg: error.msg
            }));
            return res.status(400).render('site/signup', {
                errors: errorMessages, values: req.body
            });
        }
        try {
            const existingUser = await User.findOne({ email: req.body.email });
            if (existingUser) {
                const errorMessages = [{
                    param: 'email',
                    msg: 'This email address is already in use.'
                }];
                return res.status(400).render('site/signup', {
                    errors: errorMessages, values: req.body
                });
            }

            const emailVerificationToken = crypto.randomBytes(32).toString('hex');
            const emailVerificationTokenExpires = Date.now() + 3600000;

            const user = new User({
                name: req.body.name,
                surname: req.body.surname,
                email: req.body.email,
                password: req.body.password,
                emailVerificationToken,
                emailVerificationTokenExpires
            });

            await user.save();

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
                to: req.body.email,
                from: process.env.ADMIN_EMAIL,
                subject: 'Email Verification',
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
               
            </style>
            </head>
            <body>
                <div class="email-container">
                    <p class="title"><strong>Welcome to Therapy Treasure</strong></p>
                    <p>Please click the link below to verify your email address</p>
                    <p style="margin-top: 16px; margin-bottom: 16px;"><a href="http://localhost:4000/users/verify-email/${emailVerificationToken}" style="color: #231942;" >Verify Email</a></p>
                    <p>This link will expire in 1 hour.</p>
                </div>
            </body>
            </html>
                `
            };

            await transporter.sendMail(mailOptions);


            req.session.sessionFlash = {
                type: 'alert',
                message: 'Please check your email for verification.'
            };
            res.redirect('/users/signin');

        } catch (err) {
            console.error(err);
            res.status(500).send('Error signing up');
        }
    });

router.get('/verify-email/:token', async (req, res) => {
    try {
        const user = await User.findOne({
            emailVerificationToken: req.params.token,
            emailVerificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            req.session.sessionFlash = {
                type: 'alert-danger',
                message: 'Email verification token is invalid or has expired.'
            };
            return res.redirect('/users/signin');
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationTokenExpires = undefined;

        await user.save();

        req.session.sessionFlash = {
            type: 'alert-success',
            message: 'Your email has been successfully verified. You can now log in.'
        };
        res.redirect('/users/signin');
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred during email verification');
    }
});


router.get('/signin', (req, res) => {
    res.render('site/signin')
})

router.post('/signin', body('email').notEmpty().withMessage('Please enter your email address').bail()
    .isEmail().withMessage('Please enter a valid email address'),
    body('password').notEmpty().withMessage('Please enter your password'),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => ({
                param: error.param,
                msg: error.msg
            }));
            return res.status(400).render('site/signin', {
                errors: errorMessages, values: req.body
            });
        }

        const { email, password } = req.body;

        try {
            const user = await User.findOne({ email, emailVerified: true });
            let loginErrors = [];
            if (user) {
                const isMatch = await user.comparePassword(password);
                if (isMatch) {
                    req.session.userId = user._id
                    res.redirect('/');
                } else {
                    loginErrors.push({ param: 'password', msg: 'Incorrect password' });
                    res.render('site/signin', { loginErrors, values: req.body });
                }
            } else {
                loginErrors.push({ param: 'email', msg: 'User not found' });
                res.render('site/signin', { loginErrors, values: req.body });
            }
        } catch (error) {
            console.log(error);
            res.status(500).send('An error occurred');
        }
    });

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/')
    })
})

router.get('/forgotpassword', (req, res) => {
    res.render('site/forgotpassword');
});

router.post('/forgotpassword', async (req, res) => {
    try {
        const userEmail = req.body.email;
        const user = await User.findOne({ email: userEmail });

        if (!user) {
            res.status(404).send('User not found');
            return;
        }

        const resetPasswordToken = crypto.randomBytes(32).toString('hex');
        const resetPasswordTokenExpires = Date.now() + 3600000;

        user.resetPasswordToken = resetPasswordToken;
        user.resetPasswordTokenExpires = resetPasswordTokenExpires;
        await user.save();

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
            to: userEmail,
            from: process.env.ADMIN_EMAIL,
            subject: 'Reset your Therapy Treasure Password',
            text: `We received your request\n\nNow you can reset your password!\n\nReset password\n\nYou have 1 hour to choose your password. After this time, you will need to request a new password.\n\nDidn't ask for a new password? You can ignore this email.`,
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
               
            </style>
            </head>
            <body>
                <div class="email-container">
                    <p class="title"><strong>We received your request</strong></p>
                    <p>Now you can reset your password!</p>
                    <p style="margin-top: 16px; margin-bottom: 16px;"><a href="http://localhost:4000/users/resetpassword/${resetPasswordToken}" style="background-color: #231942; color: white; padding: 14px 25px; text-align: center; text-decoration: none; display: inline-block;">Reset password</a></p>
                    <p>You have 1 hour to choose your password. After this time, you will need to request a new password.</p>
                    <p>Didn't ask for a new password? You can ignore this email.</p>
                </div>
            </body>
            </html>`
        };

        await transporter.sendMail(mailOptions);

        res.render('site/emailsent', { email: userEmail });

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred');
    }
});

router.get('/resetpassword/:token', async (req, res) => {
    const token = req.params.token;

    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.render('invalidToken');

        }

        res.render('site/resetpassword', { token: token });
    } catch (err) {
        console.error(err);
        req.session.sessionFlash = {
            type: 'alert-danger',
            message: 'An error occurred during the password reset process.'
        };
        res.redirect('/users/forgotpassword');
    }
});


router.post('/resetpassword/:token',
    body('password').notEmpty().withMessage('Please enter your password').bail()
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('confirmPassword').notEmpty().withMessage('Please confirm your password').bail()
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => ({
                param: error.param,
                msg: error.msg
            }));
            const token = req.params.token;
            return res.status(400).render('site/resetpassword', {
                errors: errorMessages, values: req.body, token: token
            });
        }
        try {
            const user = await User.findOne({
                resetPasswordToken: req.params.token,
                resetPasswordTokenExpires: { $gt: Date.now() }
            });

            if (!user) {
                return res.render('invalidToken');

            }

            const newPassword = req.body.password;
            const confirmPassword = req.body.confirmPassword;

            if (await user.comparePassword(newPassword)) {
                req.session.sessionFlash = {
                    type: 'alert-danger',
                    message: 'New password cannot be the same as the old one.'
                };
                return res.redirect(`/users/resetpassword/${token}`);
            }

            user.isResettingPassword = true;

            //hash new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            user.password = hashedPassword;

            user.resetPasswordToken = undefined;
            user.resetPasswordTokenExpires = undefined;

            await user.save();
            req.session.sessionFlash = {
                type: 'alert-success',
                message: 'Your password has been successfully reset. You can now log in with your new password.'
            };
            res.redirect('/users/signin');
        } catch (err) {
            console.error(err);
            req.session.sessionFlash = {
                type: 'alert-danger',
                message: 'An error occurred during the password reset process.'
            };
            res.redirect('/users/forgotpassword');
        }
    });


module.exports = router

