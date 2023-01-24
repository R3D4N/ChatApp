const passport = require('passport');
const bcrypt = require('bcrypt');

// to do not be accesible just writing the url
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }
    res.redirect('/');
}

module.exports = function (app, myDataBase) {
    // Routing
    app.route('/').get((req, res) => {
        res.render('index', { title: 'Connected to Database', message: 'Please log in', showLogin: true, showRegistration: true });
    });

    app.route('/login').post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
        res.redirect('/profile');
    });

    app.route('/profile').get(ensureAuthenticated, (req, res) => {
        res.render('profile', { username: req.user.username })
    });

    app.route('/register').post((req, res, next) => {
        // encrypt the password to save it
        const hash = bcrypt.hashSync(req.body.password, 12);
        myDataBase.findOne({ username: req.body.username }, (err, user) => {
            if (err) {
                next(err);
            } else if (user) {
                res.redirect('/')
            } else {
                myDataBase.insertOne({
                    username: req.body.username,
                    password: hash
                }, (err, doc) => {
                    if (err) {
                        res.redirect('/')
                    } else {
                        next(null, doc.acknowledged);
                    }
                })
            }
        })
    }, passport.authenticate('local', { failureRedirect: '/' }), (req, res, next) => {
        res.redirect('/profile');
    })

    app.route('/logout').get((req, res) => {
        req.logout((err) => {
            if (err) return next(err);
            res.redirect('/');
        });
    })

    app.use((req, res, next) => {
        res.status(404).type('text').send('Url Not Found')
    })
};