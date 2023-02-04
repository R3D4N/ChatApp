'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');

const session = require('express-session');
const passport = require('passport');

// authentication with Socket.io
const passportSocketIo = require('passport.socketio')
const MongoStore = require('connect-mongo')(session)
const cookieParser = require('cookie-parser')
const URI = process.env.MONGO_URI
const store = new MongoStore({url: URI})


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
    cookie: { secure: false},
    store: store,
    key: 'express.sid'
}));

// config passport
app.use(passport.initialize());
app.use(passport.session());

// define callbacks
function onAuthorizeSuccess(data, accept){
    console.log('successful connection to socket.io');
    accept(null, true)
}

function onAuthorizeFail(data, message, error, accept){
    if (error) {
        throw new Error(message)
    }
    console.log('failed connection to socket.io', message);
    accept(null, false)
}

// config io
io.use(
    passportSocketIo.authorize({
        cookieParser: cookieParser,
        key: 'express.sid',
        secret: process.env.SESSION_SECRET,
        store: store,
        success: onAuthorizeSuccess,
        fail: onAuthorizeFail
    })
)

myDB(async client =>{
    const myDataBase = await client.db('chatApplication').collection('test');

    let currentUsers = 0;

    io.on('connection', socket =>{
        console.log('user '+socket.request.user.username+' has connected');
        ++currentUsers

        socket.on('disconnect', ()=>{
            --currentUsers
            io.emit('user', {
                username: socket.request.user.username,
                currentUsers: currentUsers,
                connected: false}
            )
        })

        // listen message event that is define in client.js
        socket.on('chat message', message=>{
            io.emit('chat message', {
                username: socket.request.user.username,
                message: message
            })
        })

        io.emit('user', {
            username: socket.request.user.username,
            currentUsers,
            connected: true
        })
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
