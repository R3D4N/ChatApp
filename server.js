'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

const session = require('express-session');
const passport = require('passport');

// requiring modules
const routes = require('./routes.js');
const auth = require('./auth.js');

const app = express();

// socket config
const http = require('http').createServer(app);
const io= require('socket.io')(http);

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

    io.on('connection', socket =>{
        console.log('A user has connected');
    })
    // module routes
    auth(app, myDataBase);
    routes(app, myDataBase);

}).catch(error =>{
    app.route('/').get((req, res)=>{
        res.render('index', {title: error, message:'Unable to connect to database'});
    })
})

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log('Listening on port ' + PORT);
});
