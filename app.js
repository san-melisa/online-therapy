const path = require('path')
const express = require('express')
const exphbs = require('express-handlebars')
const app = express()
const moment = require('moment')
const expressSession = require('express-session')
const methodOverride = require('method-override')
const User = require('./models/User')
require('dotenv').config()


app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const fileUpload = require('express-fileupload')


const mongoose = require('mongoose');

async function createAdminUserIfNeeded() {
  const adminUser = await User.findOne({ email: process.env.ADMIN_EMAIL });

  if (!adminUser) {
    const admin = new User({
      name: 'name',
      surname: 'surname',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'Admin',
      emailVerified: true,
    });
    await admin.save();
    console.log('Admin user has been created successfully');
  } else {
    console.log('Admin user already exists');
  }
}
mongoose.connect('mongodb://127.0.0.1/therapy_db')
  .then(() => {
    console.log('Connected to the Database successfully');
    createAdminUserIfNeeded();
  });

const mongoStore = require('connect-mongo')

const cookieParser = require('cookie-parser');
app.use(cookieParser());

app.use(expressSession({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  store: mongoStore.create({ mongoUrl: 'mongodb://localhost/therapy_db' })
}))

app.use((req, res, next) => {
  if (req.session.sessionFlash) {
    res.locals.sessionFlash = req.session.sessionFlash;
    delete req.session.sessionFlash;
  }
  next();
});

app.use(fileUpload())
app.use(methodOverride('_method'))


const hbs = exphbs.create({
  helpers: {
    generateDate: (date, format) => {
      return moment(date).format(format)
    },
    timeFromNow: (date) => {
      return moment(date).fromNow();
    },
    arrayIncludes: (arr, val) => {
      if (!arr) {
        return false;
      }
      return arr.map(item => item.toString()).includes(val.toString());
    },
    statusClass: (status) => {
      switch (status) {
        case 'approved':
          return 'status-approved';
        case 'rejected':
          return 'status-rejected';
        default:
          return '';
      }
    },
    eq: function (arg1, arg2) {
      return arg1 === arg2;
    },
    truncate: function (str, len) {
      if (str.length > len) {
        return str.substring(0, len) + '...';
      } else {
        return str;
      }
    },
    areasToString: function (areas) {
      return areas.map(area => area._id).join(',');
    },
    json: function (context) {
      return JSON.stringify(context);
    },
    sortByStartTime: (slots) => {
      return slots.sort((a, b) => {
        const startTimeA = new Date(`1970/01/01 ${a.startTime}`);
        const startTimeB = new Date(`1970/01/01 ${b.startTime}`);
        return startTimeA.getTime() - startTimeB.getTime();
      });
    },isFutureDate: (date) => {
      return moment(date).isAfter(moment());
    },

  },
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  }
});
app.engine('handlebars', hbs.engine)
app.set('view engine', 'handlebars')


app.use((req, res, next) => {
  const { userId } = req.session
  if (userId) {
    User.findById(userId).then(user => {
      if (user) {
        res.locals = {
          isAdmin: user.role === 'Admin',
          isTherapist: user.role === 'Therapist',
          isUser: user.role === 'User',
          display: true
        }
      }
      next();
    }).catch(() => {
      res.locals = {
        isAdmin: false,
        isTherapist: false,
        isUser: false,
        display: false
      }
      next();
    });
  } else {
    res.locals = {
      isAdmin: false,
      isTherapist: false,
      display: false
    }
    next();
  }
});

const main = require('./routes/main')
app.use('/', main)

const users = require('./routes/users')
app.use('/users', users)

const admin = require('./routes/admin/index')
app.use('/admin', admin)

const contact = require('./routes/contact')
app.use('/contact', contact)

const booking = require('./routes/booking');
app.use('/booking', booking);

const port = 4000
const hostname = '127.0.0.1'

app.use(express.static('public'))

app.listen(port, hostname, () =>
  console.log(`Server is working, http://${hostname}:${port}/`)
)
