'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

const session = require('express-session');
const passport = require('passport');
const {ObjectID, ObjectId} = require('mongodb');
const bcrypt = require('bcrypt');

const app = express();

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// setting template engine
app.set('view engine', 'pug');
app.set('views', './views/pug');

// setting Express app session
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false}
}));

// config passport
app.use(passport.initialize());
app.use(passport.session());

myDB(async client =>{
    const myDataBase = await client.db('chatApplication').collection('test');
    const LocalStrategy = require('passport-local');
    
    // serialization of user object
    passport.serializeUser((user, done)=>{
        done(null, user._id);
    });
    
    passport.deserializeUser((id, done)=>{
        myDataBase.findOne({ _id: new ObjectId(id)}, (err, doc) => {
            done(null, doc);
        });
    });

    // find user with passport-local
    passport.use(new LocalStrategy((username, password, done)=>{
        myDataBase.findOne({username: username}, (err, user)=>{
            console.log(`User ${username} attempted to log in.`);
            if (err) return done(err);
            if (!user) return done(null, false);
            if (!bcrypt.compareSync(password, user.password)) return done(null, false);
            return done(null, user);
        })
    }));
    
    // middlewares
    // to do not be accesible just writing the url
    function ensureAuthenticated(req, res, next){
        if (req.isAuthenticated()) {
            return next()
        }
        res.redirect('/');
    }

    // Routing
    app.route('/').get((req, res) => {
        res.render('index', {title: 'Connected to Database', message: 'Please log in', showLogin: true, showRegistration: true});
    });

    app.route('/login').post(passport.authenticate('local', {failureRedirect: '/'}),(req, res)=>{
        res.redirect('/profile');
    });

    app.route('/profile').get(ensureAuthenticated,(req, res)=>{
        res.render('profile', {username: req.user.username})
    });

    app.route('/register').post((req, res, next)=>{
        // encrypt the password to save it
        const hash = bcrypt.hashSync(req.body.password, 12);
        myDataBase.findOne({username: req.body.username}, (err, user)=>{
            if (err) {
                next(err);
            }else if (user) {
                res.redirect('/')
            } else {
                myDataBase.insertOne({
                    username: req.body.username,
                    password: hash
                }, (err, doc)=>{
                    if (err) {
                        res.redirect('/')
                    }else{
                        next(null, doc.acknowledged);
                    }
                })
            }
        })
    }, passport.authenticate('local', {failureRedirect: '/'}), (req, res, next)=>{
        res.redirect('/profile');
    })

    app.route('/logout').get((req, res)=>{
        req.logout((err)=>{
            if (err) return next(err);
            res.redirect('/');
        });
    })

    app.use((req, res, next)=>{
        res.status(404).type('text').send('Url Not Found')
    })
}).catch(error =>{
    app.route('/').get((req, res)=>{
        res.render('index', {title: error, message:'Unable to connect to database'});
    })
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('Listening on port ' + PORT);
});
