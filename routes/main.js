const express = require('express')
const router = express.Router()
const Therapist = require('../models/Therapist')
const Expertise = require('../models/Expertise')
const User = require('../models/User')
const path = require('path')
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Category = require('../models/Category')
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Booking = require('../models/Booking')




router.get('/', async (req, res) => {
    try {
        const therapists = await Therapist.find({ status: 'approved', isVisible: true })
            .populate('user_id', 'name surname')
            .populate('expertiseAreas')
        const expertises = await Expertise.find({});
        const categories = await Category.find({});

        res.render('site/index', { therapists, expertises, categories });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving infos');
    }
});

router.get('/therapist/search', async (req, res) => {
    try {
        const searchQuery = req.query.search;

        const therapists = await Therapist.find({ status: 'approved', isVisible: true })
            .populate({
                path: 'user_id',
                match: {
                    $or: [
                        { name: { $regex: searchQuery, $options: 'i' } },
                        { surname: { $regex: searchQuery, $options: 'i' } }
                    ]
                },
                select: 'name surname'
            })
            .populate({
                path: 'expertiseAreas',
                match: { name: { $regex: searchQuery, $options: 'i' } }
            })
            .populate({
                path: 'categoryAreas',
                match: { name: { $regex: searchQuery, $options: 'i' } }
            })
            .exec();

        const filteredTherapists = therapists.filter(therapist => {
            const hasMatchingUser = therapist.user_id !== null;
            const hasMatchingExpertise = therapist.expertiseAreas.length > 0;
            const hasMatchingCategory = therapist.categoryAreas.length > 0;

            const matchesTitle = therapist.title && therapist.title.match(new RegExp(searchQuery, 'i'));
            const matchesEducation = therapist.university.some(education =>
                education.uniName.match(new RegExp(searchQuery, 'i')) ||
                education.degree.match(new RegExp(searchQuery, 'i')) ||
                education.department.match(new RegExp(searchQuery, 'i')) ||
                education.graduationYear.match(new RegExp(searchQuery, 'i'))
            );
            const matchesAbout = therapist.about && therapist.about.match(new RegExp(searchQuery, 'i'));
            const matchesCertificates = therapist.certificates && therapist.certificates.match(new RegExp(searchQuery, 'i'))


            return (
                hasMatchingUser ||
                hasMatchingExpertise ||
                hasMatchingCategory ||
                matchesTitle ||
                matchesEducation ||
                matchesAbout ||
                matchesCertificates
            );
        });

        const expertises = await Expertise.find({});
        const categories = await Category.find({});

        res.render('site/index', { therapists: filteredTherapists, expertises: expertises, categories: categories });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error retrieving infos');
    }
});


router.get('/therapist/:id', (req, res) => {
    Therapist.findById(req.params.id).populate('user_id', 'name surname createdAt')
        .populate('expertiseAreas', 'name')
        .populate('categoryAreas', 'name')
        .then(therapist => {
            if (!therapist) {
                res.status(404).send('No such a therapist');
            } else {
                Booking.findOne({ therapist_id: therapist._id, user_id: req.session.userId })
                    .then(booking => {
                        res.render('site/therapist', { therapist: therapist })
                    })
                    .catch(error => {
                        console.log(error);
                        res.status(500).send('An error occured.');
                    })
            }
        })
        .catch(error => {
            console.log(error);
            res.status(500).send('An error occured.');
        })
})

router.get('/applicationform', (req, res) => {
    res.render('site/applicationform')
})

const maxUniversities = 10;
const universityValidations = [];
for (let i = 0; i < maxUniversities; i++) {
    universityValidations.push(
        body(`university[${i}].uniName`).if(body(`university[${i}].uniName`).exists()).notEmpty().withMessage(`Please enter the university name for university ${i + 1}`),
        body(`university[${i}].degree`).if(body(`university[${i}].degree`).exists()).notEmpty().withMessage(`Please enter the degree for university ${i + 1}`),
        body(`university[${i}].department`).if(body(`university[${i}].department`).exists()).notEmpty().withMessage(`Please enter the department for university ${i + 1}`),
        body(`university[${i}].graduationYear`).if(body(`university[${i}].graduationYear`).exists()).notEmpty().withMessage(`Please enter the graduation year for university ${i + 1}`)
    );
}

async function commit(user, therapist) {
    const userSave = user.save();
    const therapistSave = therapist.save();
    await Promise.all([userSave, therapistSave]);
}

router.post('/therapist/apply',
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
    body('phone').notEmpty().withMessage('Please enter your phone number').bail()
        .isMobilePhone().withMessage('Please enter a valid phone number'),
    body('title').notEmpty().withMessage('Please enter your title'),
    body('licenceNumber').notEmpty().withMessage('Please enter your licence number'),


    body('cv').custom((value, { req }) => {
        if (req.files && req.files.cv) {
            if (!req.files.cv.mimetype.includes('pdf')) {
                throw new Error('Please upload your cv in PDF format');
            }
        } else {
            throw new Error('Please attach your cv');
        }
        return true;
    }),
    body('motivationLetter').custom((value, { req }) => {
        if (req.files && req.files.motivationLetter) {
            if (!req.files.motivationLetter.mimetype.includes('pdf')) {
                throw new Error('Please upload your motivation letter in PDF format');
            }
        }
        return true;
    }),
    body('referenceLetter').custom((value, { req }) => {
        if (req.files && req.files.referenceLetter) {
            if (!req.files.referenceLetter.mimetype.includes('pdf')) {
                throw new Error('Please upload your reference letter in PDF format');
            }
        }
        return true;
    }),
    ...universityValidations,


    async (req, res) => {
        console.log('req.body:', req.body);
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => ({
                param: error.param,
                msg: error.msg
            }));
            return res.status(400).render('site/applicationform', {
                errors: errorMessages, values: req.body
            });
        }
        const universityCount = parseInt(req.body.universityCount);
        const universities = [];

        for (let i = 0; i < universityCount; i++) {
            const uniName = req.body[`university[${i}].uniName`];
            const degree = req.body[`university[${i}].degree`];
            const department = req.body[`university[${i}].department`];
            const graduationYear = req.body[`university[${i}].graduationYear`];

            if (uniName && degree && department && graduationYear) {
                universities.push({
                    uniName,
                    degree,
                    department,
                    graduationYear
                });
            }
        }

        let cv, motivationLetter, referenceLetter;

        if (req.files) {
            cv = req.files.cv
            motivationLetter = req.files.motivationLetter;
            referenceLetter = req.files.referenceLetter;
        }

        if (cv && cv.name) {
            cv.mv(path.resolve(__dirname, '../public/files/cv', cv.name));
        }


        if (motivationLetter && motivationLetter.name) {
            motivationLetter.mv(path.resolve(__dirname, '../public/files/m_letter', motivationLetter.name));
        }


        if (referenceLetter && referenceLetter.name) {
            referenceLetter.mv(path.resolve(__dirname, '../public/files/r_letter', referenceLetter.name));
        }

        try {
            const existingUser = await User.findOne({ email: req.body.email });
            if (existingUser) {
                return res.status(409).send('E-mail address already exists');
            }

            const emailVerificationToken = crypto.randomBytes(32).toString('hex');
            const emailVerificationTokenExpires = Date.now() + 3600000;

            const user = new User({
                name: req.body.name,
                surname: req.body.surname,
                email: req.body.email,
                password: req.body.password,
                role: 'Therapist',
                emailVerificationToken,
                emailVerificationTokenExpires
            });

            const therapist = new Therapist({
                user_id: user._id,
                phone: req.body.phone,
                title: req.body.title,
                licenceNumber: req.body.licenceNumber,
                university: universities,
                cv: `/files/cv/${cv.name}`,
                motivationLetter: motivationLetter ? `/files/m_letter/${motivationLetter.name}` : '',
                referenceLetter: referenceLetter ? `/files/r_letter/${referenceLetter.name}` : '',
                certificates: '',
                about: '',
                photoUrl: '',
                isVisible: false
            });

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
                subject: 'Your Request to Become a Therapist in Therapy Treasure',
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
                font-family: 'Open Sans', sans-serif;
            }
            .email-container {
                text-align: center;
                padding: 20px;
                background-color: #ffffff;
                max-width: 600px;
                margin: 0 auto;
                border: 1px solid #ccc;
            }
            .title {
                font-size: 24px;
                margin-bottom: 16px;
            }
            .text {
                font-size: 16px;
                line-height: 1.5;
            }
        </style>
        </head>
        <body>
            <div class="email-container">
                <p class="title"><strong>Therapist Application Received</strong></p>
                <p class="text">Thank you for applying to become a therapist on Therapy Treasure. Your application has been received and is under review. We will contact you via email with more information about the next steps.</p>
                <p class="text">Please be patient as we review your application. If you have any questions, you can contact us by replying to this email.</p>
                <p class="text">Thanks for your interest in joining Therapy Treasure!</p>
            </div>
        </body>
        </html>
                `
            };

            await transporter.sendMail(mailOptions);

            await commit(user, therapist);

            req.session.sessionFlash = {
                type: 'alert',
                message: 'Your application has been successfully completed.'
            }

            res.render('site/applicationsent', { user: user });


        } catch (err) {
            console.error(err);
            res.status(500).render('error', { errorMessage: 'Error submitting application' });
        }
    });


router.get("/user", getUserInfo, isUser, async (req, res) => {
    try {
        if (res.locals.user.role !== 'User' || !res.locals.user.emailVerified) {
            return res.status(403).json({ error: "Unauthorized access" });
        }

        const bookings = await Booking.find({ user_id: res.locals.user._id })
            .populate('cancelledBy', 'name surname')
            .populate({
                path: 'therapist_id',
                select: 'user_id',
                populate: {
                    path: 'user_id',
                    select: 'name surname'
                }
            });

        let futureBookings = [], pastBookings = [];
        const currentTime = Date.now();
        bookings.forEach(booking => {
            if (booking.appointmentDate > currentTime) {
                futureBookings.push(booking);
            } else {
                pastBookings.push(booking);
            }
        });

        pastBookings.sort((a, b) => b.appointmentDate - a.appointmentDate);


        const currentTherapist = await Booking
            .findOne({ user_id: res.locals.user._id })
            .sort('-appointmentDate')
            .populate({
                path: 'therapist_id',
                select: 'user_id',
                populate: {
                    path: 'user_id',
                    select: 'name surname'
                }
            });


        res.render('site/user', { user: res.locals.user, futureBookings, pastBookings, currentTherapist });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});


router.post('/cancelBooking/:id', getUserInfo, isUser, async (req, res) => {
    try {
        const bookingId = req.params.id;
        const currentUser = res.locals.user

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).send('Booking not found');
        }

        const updatedBooking = await Booking.findByIdAndUpdate(
            bookingId,
            { status: 'cancelled', cancelledBy: currentUser._id },
            { new: true }
        );

        res.redirect('/user');
    } catch (err) {
        console.log(err);
        res.status(500).send('Error cancelling appointment');
    }
});

router.get('/terms', (req, res) => {
    res.render('terms/termsofservice', { layout: false });
});

router.get('/privacy', (req, res) => {
    res.render('terms/privacy', { layout: false });
});


function getUserInfo(req, res, next) {
    const userId = req.session.userId;
    if (userId) {
        User.findById(userId)
            .then((currentUser) => {
                res.locals.user = currentUser;
                next();
            })
            .catch((err) => next(err));
    } else {
        next();
    }
}


function isUser(req, res, next) {
    if (res.locals.isUser) {
        return next();
    }
    return res.status(403).send('Access denied.');
}


module.exports = router

