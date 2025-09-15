const express = require('express')
const router = express.Router()
const Expertise = require('../../models/Expertise')
const Category = require('../../models/Category')
const Therapist = require('../../models/Therapist')
const User = require('../../models/User')
const path = require('path')
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const Booking = require('../../models/Booking')
const Schedule = require('../../models/Schedule');



function isAdmin(req, res, next) {
    if (res.locals.isAdmin) {
        return next();
    }
    return res.status(403).send('Access denied.');
}

function isTherapist(req, res, next) {
    if (res.locals.isTherapist) {
        return next();
    }
    return res.status(403).send('Access denied.');
}

function isTherapistOrAdmin(req, res, next) {
    if (res.locals.isTherapist || res.locals.isAdmin) {
        return next();
    }
    return res.status(403).send('Access denied.');
}

const getUserInfo = (req, res, next) => {
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
};

router.get('/', getUserInfo, isAdmin, async (req, res) => {

    const totalTherapists = await Therapist.countDocuments({ status: 'approved' });
    const totalUsers = await User.countDocuments({ role: 'User', emailVerified: true });
    const totalApplications = await Therapist.countDocuments();
    const totalAppointments = await Booking.countDocuments();

    const currentDate = new Date();
    const completedAppointments = await Booking.countDocuments({
        status: 'approved',
        appointmentDate: { $lt: currentDate }
    });

    const cancelledAppointments = await Booking.countDocuments({ status: 'cancelled' });

    const messageMeetings = await Booking.countDocuments({ meetingType: 'text' });
    const audioCallMeetings = await Booking.countDocuments({ meetingType: 'voice' });
    const videoCallMeetings = await Booking.countDocuments({ meetingType: 'video' });

    const whatsappUsage = await Booking.countDocuments({ platform: 'whatsapp' });
    const skypeUsage = await Booking.countDocuments({ platform: 'skype' });
    const zoomUsage = await Booking.countDocuments({ platform: 'zoom' });

    res.render('admin/index', {
        layout: 'admin', currentUser: res.locals.user, totalTherapists, totalUsers, totalApplications
        , totalAppointments, completedAppointments, cancelledAppointments, messageMeetings,
        audioCallMeetings, videoCallMeetings, whatsappUsage, skypeUsage, zoomUsage
    });


});

router.get('/therapist-index', getUserInfo, isTherapist, async (req, res) => {

    const userId = req.session.userId;
    const therapistId = await Therapist.findOne({ user_id: userId })


    const totalAppointments = await Booking.countDocuments({ therapist_id: therapistId });
    const totalApprovedAppointments = await Booking.countDocuments({ therapist_id: therapistId, status: 'approved' });
    const totalSiteAppointments = await Booking.countDocuments({ status: 'approved' });

    const currentDate = new Date();
    const completedAppointments = await Booking.countDocuments({
        therapist_id: therapistId,
        status: 'approved', appointmentDate: { $lt: currentDate }
    });

    const monthlyAppointments = await Booking.countDocuments({
        therapist_id: userId,
        status: 'approved',
        appointmentDate: {
            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
        }
    });

    const percentageTherapies = ((totalApprovedAppointments / totalSiteAppointments) * 100).toFixed(2);;
    const cancelledByTherapist = await Booking.countDocuments({ therapist_id: therapistId, status: 'cancelled', cancelledBy: userId });
    const cancelledByUser = await Booking.countDocuments({ therapist_id: therapistId, status: 'cancelled', cancelledBy: { $ne: userId } });

    const messageMeetings = await Booking.countDocuments({ therapist_id: therapistId, meetingType: 'text' });
    const audioCallMeetings = await Booking.countDocuments({ therapist_id: therapistId, meetingType: 'voice' });
    const videoCallMeetings = await Booking.countDocuments({ therapist_id: therapistId, meetingType: 'video' });

    const whatsappUsage = await Booking.countDocuments({ therapist_id: therapistId, platform: 'whatsapp' });
    const skypeUsage = await Booking.countDocuments({ therapist_id: therapistId, platform: 'skype' });
    const zoomUsage = await Booking.countDocuments({ therapist_id: therapistId, platform: 'zoom' });

    res.render('admin/therapist-index', {
        layout: 'admin',
        currentUser: res.locals.user,
        totalAppointments,
        completedAppointments,
        monthlyAppointments,
        percentageTherapies,
        cancelledByTherapist,
        cancelledByUser,
        messageMeetings,
        audioCallMeetings,
        videoCallMeetings,
        whatsappUsage,
        skypeUsage,
        zoomUsage
    });
});

router.get('/therapist-statistics', getUserInfo, isAdmin, async (req, res) => {
    try {
        const therapists = await Therapist.find();
        const therapistStats = await Promise.all(therapists.map(async therapist => {
            const therapistId = therapist._id;
            const user = await User.findById(therapist.user_id);

            const totalAppointments = await Booking.countDocuments({ therapist_id: therapistId });
            const totalApprovedAppointments = await Booking.countDocuments({ therapist_id: therapistId, status: 'approved' });
            const totalSiteAppointments = await Booking.countDocuments({ status: 'approved' });

            const currentDate = new Date();
            const completedAppointments = await Booking.countDocuments({ therapist_id: therapistId, status: 'approved', appointmentDate: { $lt: currentDate } });

            const monthlyAppointments = await Booking.countDocuments({
                therapist_id: therapistId,
                status: 'approved',
                appointmentDate: {
                    $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
                }
            });

            const percentageTherapies = ((totalApprovedAppointments / totalSiteAppointments) * 100).toFixed(2);;
            const cancelledByTherapist = await Booking.countDocuments({ therapist_id: therapistId, status: 'cancelled', cancelledBy: therapistId });
            const cancelledByUser = await Booking.countDocuments({ therapist_id: therapistId, status: 'cancelled', cancelledBy: { $ne: therapistId } });

            return {
                therapistId,
                user,
                totalAppointments,
                completedAppointments,
                monthlyAppointments,
                percentageTherapies,
                cancelledByTherapist,
                cancelledByUser,

            };
        }));

        res.render('admin/therapist-statistics', { layout: 'admin', currentUser: res.locals.user, therapists: therapistStats });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }

});


router.get('/manageadmins', getUserInfo, isAdmin, async (req, res) => {
    try {
        const users = await User.find({}).select('email');
        const admin = await User.find({ role: 'Admin' }).sort({ $natural: -1 });
        const isSingleAdmin = admin.length === 1;
        res.render('admin/manageadmins', { layout: 'admin', currentUser: res.locals.user, users: users, admin: admin, isSingleAdmin });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.post('/add-admin', isAdmin, async (req, res) => {
    try {
        const userEmail = req.body['user-email'];
        await User.updateOne({ email: userEmail }, { role: 'Admin', emailVerified: true });

        res.redirect('/admin/manageadmins')
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.delete('/manageadmins/:id', isAdmin, async (req, res) => {
    try {
        const adminCount = await User.countDocuments({ role: 'Admin' });

        if (adminCount <= 1) {
            return res.status(400).send("There must be at least one admin.");
        }

        await User.deleteOne({ _id: req.params.id });
        res.redirect('/admin/manageadmins');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/editadmin/:id', getUserInfo, isAdmin, async (req, res) => {
    try {
        if (req.params.id !== res.locals.user._id.toString()) {
            res.status(403).send('You are not authorized to edit other admins.');
            return;
        }

        const admin = await User.findById(req.params.id);
        res.render('admin/editadmin', { layout: 'admin', currentUser: res.locals.user, admin });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.post('/editadmin/:id', getUserInfo, isAdmin,
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters').optional({ checkFalsy: true }),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),

    async (req, res) => {
        if (req.params.id !== res.locals.user._id.toString()) {
            res.status(403).send('You are not authorized to edit other admins.');
            return;
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map(error => ({
                param: error.param,
                msg: error.msg
            }));
            return res.status(400).render('admin/editadmin/:id', {
                layout: 'admin',
                currentUser: res.locals.user,
                errors: errorMessages,
                values: req.body
            });
        }
        try {
            const { name, surname, email, password } = req.body;
            const adminId = req.params.id;

            const updatedAdmin = {
                name,
                surname,
                email
            };

            if (password.trim() !== '') {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                const user = await User.findById(req.params.id);
                const isSamePassword = await bcrypt.compare(hashedPassword, user.password);


                if (isSamePassword) {
                    req.session.sessionFlash = {
                        type: 'alert-danger',
                        message: 'New password cannot be the same as the old one.'
                    };
                    return res.redirect(`/admin/editadmin/${req.params.id}`);
                }


                updatedAdmin.password = hashedPassword;
            }



            await User.findByIdAndUpdate(adminId, updatedAdmin);
            res.redirect('/admin/manageadmins');
        } catch (err) {
            console.error(err);
            res.status(500).send('Server error');
        }
    });



router.get('/therapists', getUserInfo, isAdmin, async (req, res) => {
    try {
        const therapists = await Therapist.find({ status: 'approved' }).populate('user_id', 'name surname email')
            .sort({ $natural: -1 });
        res.render('admin/therapists', { layout: 'admin', currentUser: res.locals.user, therapists: therapists });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error listing therapists');
    }
});


router.get('/users', getUserInfo, isAdmin, async (req, res) => {
    try {
        const users = await User.find({ role: 'User', emailVerified: true }).sort({ $natural: -1 });
        res.render('admin/users', { layout: 'admin', currentUser: res.locals.user, users: users });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error listing users');
    }
});

router.get('/user/:id', getUserInfo, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        res.render('admin/userdetails', { layout: 'admin', currentUser: res.locals.user, user: user });
    } catch (error) {
        console.log(error);
        res.status(500).send('An error occurred.');
    }
});

router.delete('/deleteuser/:id', isAdmin, (req, res) => {

    User.deleteOne({ _id: req.params.id }).then(() => {
        res.redirect('/admin/users')
    })
})

router.get('/edituser/:id', getUserInfo, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        res.render('admin/edituser', { layout: 'admin', currentUser: res.locals.user, user: user });
    } catch (error) {
        console.log(error);
        res.status(500).send('An error occurred.');
    }
});

router.post('/edituser/:id', getUserInfo, isAdmin,
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters').optional({ checkFalsy: true }),
    body('confirmPassword')
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
            return res.status(400).render('admin/edituser/:id', {
                layout: 'admin',
                user: res.locals.user,
                errors: errorMessages,
                values: req.body
            });
        }
        try {
            const { name, surname, email, password } = req.body;
            const updatedUser = { name, surname, email };

            if (password.trim() !== '') {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                updatedUser.password = hashedPassword;
            }

            await User.findByIdAndUpdate(req.params.id, updatedUser);
            res.redirect('/admin/users');
        } catch (error) {
            console.log(error);
            res.status(500).send('An error occurred while updating the user.');
        }
    });



router.get('/expertises', getUserInfo, isAdmin, (req, res) => {

    Expertise.find({}).sort({ $natural: -1 }).then(expertises => {
        res.render('admin/expertises', { layout: 'admin', currentUser: res.locals.user, expertises: expertises })
    })
})

router.post('/expertises', isAdmin, async (req, res) => {
    try {
        const expertise = await Expertise.create(req.body);
        res.redirect('expertises');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while creating the expertise.');
    }
});

router.delete('/expertises/:id', isAdmin, (req, res) => {

    Expertise.deleteOne({ _id: req.params.id }).then(() => {
        res.redirect('/admin/expertises')
    })
})

router.put('/expertises/:id', isAdmin, async (req, res) => {
    try {
        const { name } = req.body;
        const expertiseId = req.params.id;

        await Expertise.findByIdAndUpdate(expertiseId, { name });
        res.redirect('/admin/expertises');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while updating the expertise.');
    }
});


router.get('/categories', getUserInfo, isAdmin, (req, res) => {

    Category.find({}).sort({ $natural: -1 }).then(categories => {
        res.render('admin/categories', { layout: 'admin', currentUser: res.locals.user, categories: categories })
    })
})

router.post('/categories', isAdmin, async (req, res) => {
    try {
        const category = await Category.create(req.body);
        res.redirect('categories');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while creating the category.');
    }
});

router.delete('/categories/:id', isAdmin, (req, res) => {

    Category.deleteOne({ _id: req.params.id }).then(() => {
        res.redirect('/admin/categories')
    })
})



router.get('/profile', getUserInfo, isTherapist, async (req, res) => {
    const userId = req.session.userId;
    const user = await User.findById(userId)

    try {
        const therapist = await Therapist.findOne({ user_id: userId })
            .populate('user_id', 'name surname email createdAt lastUpdate')
            .populate('expertiseAreas', 'name')
            .populate('categoryAreas', 'name');

        const cvName = therapist.cv.split('/').pop();
        const motivationName = therapist.motivationLetter.split('/').pop();
        const referenceName = therapist.referenceLetter.split('/').pop();

        res.render('admin/profile', { layout: 'admin', currentUser: res.locals.user, isTherapist: true, therapist: therapist, cvName, motivationName, referenceName });
    } catch (error) {
        console.log(error);
        res.status(500).send('An error occurred.');
    }
});


router.get('/editprofile/:id', getUserInfo, isTherapist, async (req, res) => {
    try {
        const therapist = await Therapist.findById(req.params.id).populate('user_id').populate('expertiseAreas');

        const expertises = await Expertise.find();
        const categories = await Category.find();

        expertises.forEach(expertise => {
            expertise.isSelected = therapist.expertiseAreas.some(selected => selected._id.equals(expertise._id));
        });

        categories.forEach(category => {
            category.isSelected = therapist.categoryAreas.some(selected => selected._id.equals(category._id));
        });


        res.render('admin/editprofile', { layout: 'admin', currentUser: res.locals.user, therapist, expertises, categories });
    } catch (error) {
        console.log(error);
        res.status(500).send('An error occured.');
    }
});

router.post('/editprofile/:id', (req, res) => {
    Therapist.findById(req.params.id).populate('user_id').then(async therapist => {
        if (!therapist) {
            res.status(404).send('No such a therapist');
        } else {
            therapist.user_id.name = req.body.name;
            therapist.user_id.surname = req.body.surname;
            therapist.user_id.email = req.body.email;
            therapist.phone = req.body.phone;
            therapist.title = req.body.title;
            therapist.licenceNumber = req.body.licenceNumber;
            therapist.certificates = req.body.certificates;
            therapist.about = req.body.about;
            therapist.expertiseAreas = req.body.expertiseAreas;
            therapist.categoryAreas = req.body.categoryAreas;
            therapist.isVisible = req.body.isVisible === 'on';


            if (req.files) {
                let { photoUrl, cv, motivationLetter, referenceLetter } = req.files;

                if (photoUrl && photoUrl.name) {
                    const photoPath = path.resolve('./public/files/photo');
                    photoUrl.mv(path.join(photoPath, photoUrl.name));
                    therapist.photoUrl = `/files/photo/${photoUrl.name}`;

                }

                if (cv && cv.name) {
                    const cvPath = path.resolve('./public/files/cv');
                    cv.mv(path.join(cvPath, cv.name));
                    therapist.cv = `/files/cv/${cv.name}`;


                }

                if (motivationLetter && motivationLetter.name) {
                    const motivationLetterPath = path.resolve('./public/files/m_letter');
                    motivationLetter.mv(path.join(motivationLetterPath, motivationLetter.name));
                    therapist.motivationLetter = `/files/m_letter/${motivationLetter.name}`;

                }

                if (referenceLetter && referenceLetter.name) {
                    const referenceLetterPath = path.resolve('./public/files/r_letter');
                    referenceLetter.mv(path.join(referenceLetterPath, referenceLetter.name));
                    therapist.referenceLetter = `/files/r_letter/${referenceLetter.name}`;

                }
            }


            therapist.save().then(updatedTherapist => {
                res.redirect('/admin/profile');
            }).catch(error => {
                console.log(error);
                res.status(500).send('An error occured while updating the therapist');
            });
        }
    }).catch(error => {
        console.log(error);
        res.status(500).send('An error occured.');
    })
});

router.get('/applications', getUserInfo, isAdmin, async (req, res) => {
    try {
        const therapists = await Therapist.find({}).populate('user_id', 'name surname email').sort({ $natural: -1 });
        res.render('admin/applications', { layout: 'admin', currentUser: res.locals.user, therapists: therapists });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error listing applications');
    }
});

router.get('/therapistprofile/:id', getUserInfo, isAdmin, async (req, res) => {
    Therapist.findById(req.params.id)
        .populate('user_id', 'name surname email createdAt lastUpdate')
        .populate('expertiseAreas', 'name')
        .populate('categoryAreas', 'name')
        .then(therapist => {
            if (!therapist) {
                res.status(404).send('No such a therapist');
            } else {
                const cvName = therapist.cv.split('/').pop();
                const motivationName = therapist.motivationLetter.split('/').pop();
                const referenceName = therapist.referenceLetter.split('/').pop();
                res.render('admin/therapistprofile', { layout: 'admin', currentUser: res.locals.user, therapist: therapist, cvName, motivationName, referenceName })
            }
        })
        .catch(error => {
            console.log(error);
            res.status(500).send('An error occured.');
        })
})


router.post('/approve/:id', async (req, res) => {
    try {
        const therapistId = req.params.id;
        const therapist = await Therapist.findById(therapistId);
        const userId = therapist.user_id;
        await Therapist.findByIdAndUpdate(therapistId, { status: 'approved' });
        await User.findByIdAndUpdate(userId, { emailVerified: true });
        const user = await User.findById(userId);

        const userEmail = user.email

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
            subject: 'Your Therapy Treasure Account Has Been Approved',
            text: `Congratulations! Your Therapy Treasure account has been approved. You can now log in and enjoy our services.`,
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
                        <p class="title"><strong>Congratulations!</strong></p>
                        <p>Your Therapy Treasure account has been approved.</p>
                        <p>You can now log in and enjoy our services.</p>
                    </div>
                </body>
                </html>`
        };


        await transporter.sendMail(mailOptions);
        res.redirect('/admin/therapists');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error approving therapist');
    }
});

router.post('/reject/:id', async (req, res) => {
    try {
        const therapistId = req.params.id;
        const therapist = await Therapist.findById(therapistId);
        const userId = therapist.user_id;
        await Therapist.findByIdAndUpdate(therapistId, { status: 'rejected' });
        await User.findByIdAndUpdate(userId, { emailVerified: true });
        const user = await User.findById(userId);

        const userEmail = user.email

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
            subject: 'Your Therapy Treasure Account Application',
            text: `We regret to inform you that your Therapy Treasure account application has been rejected. If you have any questions or concerns, please contact us.`,
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
                <p class="title"><strong>Therapy Treasure Account Application</strong></p>
                <p>We regret to inform you that your Therapy Treasure account application has been rejected.</p>
                <p>If you have any questions or concerns, please contact us.</p>
            </div>
        </body>
        </html>`
        };

        await transporter.sendMail(mailOptions);

        res.redirect('/admin/applications');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error rejecting therapist');
    }
});


router.get('/appointments', getUserInfo, isTherapist, async (req, res) => {
    try {
        currentUser = res.locals.user
        const therapist = await Therapist.findOne({ user_id: currentUser._id })

        if (!therapist) {
            return res.status(404).send('Therapist not found');
        }

        const bookings = await Booking.find({ therapist_id: therapist._id })
            .populate('user_id')
            .populate('cancelledBy', 'role name surname')
            .sort({ $natural: -1 });

        res.render('admin/appointments', { layout: 'admin', currentUser: res.locals.user, bookings: bookings });

    } catch (err) {
        console.log(err);
        res.status(500).send('Error listing appointmnets');

    }

})

router.post('/cancel/:id', getUserInfo, isTherapistOrAdmin, async (req, res) => {
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

        if (res.locals.isAdmin) {
            res.redirect('/admin/allappointments');
        } else if (res.locals.isTherapist) {
            res.redirect('/admin/appointments');
        } else {
            return res.status(403).send('Access denied.');
        }

    } catch (err) {
        console.log(err);
        res.status(500).send('Error cancelling appointment');
    }
});

router.get('/allappointments', getUserInfo, isAdmin, async (req, res) => {
    try {
        const bookings = await Booking.find({})
            .populate('user_id', 'name surname')
            .populate({
                path: 'therapist_id',
                populate: {
                    path: 'user_id',
                    select: 'name surname'
                }
            })
            .populate('cancelledBy', 'role name surname')
            .sort({ $natural: -1 });

        res.render('admin/allappointments', { layout: 'admin', currentUser: res.locals.user, bookings: bookings });

    } catch (err) {
        console.log(err);
        res.status(500).send('Error listing all appointments');
    }
});

router.post('/approve-appointment/:id', getUserInfo, isTherapistOrAdmin, async (req, res) => {
    try {
        const bookingId = req.params.id;
        currentUser = res.locals.user;
        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).send('Booking not found');
        }

        const updatedBooking = await Booking.findByIdAndUpdate(bookingId, { status: 'approved' }, { new: true });

        res.redirect('/admin/appointments');
    } catch (err) {
        console.log(err);
        res.status(500).send('Error approving appointment');
    }
});


router.get('/schedule', getUserInfo, isTherapist, async (req, res) => {

    const userId = req.session.userId;
    const therapistId = await Therapist.findOne({ user_id: userId })

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const schedule = await Schedule.find({ therapistId })
        .where('date').gt(currentDate)
        .sort({ date: 1 });

    res.render('admin/schedule', { layout: 'admin', currentUser: res.locals.user, schedule })

})

router.post('/schedule', getUserInfo, async (req, res) => {
    try {
        const userId = req.session.userId;

        const therapistId = await Therapist.findOne({ user_id: userId })

        const { date, slots } = req.body;
        
        let schedule = await Schedule.findOne({ therapistId, date });

        console.log(date)
        if (schedule) {
            slots.forEach(async (slot) => {
                const slotExists = schedule.slots.some((existingSlot) => {
                    return existingSlot.startTime === slot.startTime && existingSlot.endTime === slot.endTime;
                });
                console.log("schedule exists")

                if (!slotExists) {
                    await Schedule.updateOne(
                        { _id: schedule._id },
                        { $push: { slots: slot } }
                    );
                    console.log("slot exists")

                }
            });
        } else {
            schedule = new Schedule({ therapistId, date, slots });
            await schedule.save();
            console.log("slot not exists")

        }
        res.status(200).json({ success: true, message: "Schedule saved successfully" });


    } catch (error) {
        res.status(500).json({ success: false, message: "Error saving schedule", error });

    }
});

router.get('/categories', getUserInfo, isAdmin, (req, res) => {

    Category.find({}).sort({ $natural: -1 }).then(categories => {
        res.render('admin/categories', { layout: 'admin', currentUser: res.locals.user, categories: categories })
    })
})



router.get('/statistics', getUserInfo, isAdmin, async (req, res) => {

    const therapists = await Booking.find({}).populate({
        path: 'therapist_id',
        populate: {
            path: 'user_id'
        }
    })

    const users = await Booking.find({}).populate('user_id')

    res.render('admin/therapiststatistics', { layout: 'admin', currentUser: res.locals.user, therapists, users })

})

module.exports = router