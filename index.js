var express = require('express');
var hbs = require('hbs');
var path = require('path');
var fortune = require('./lib/fortune.js');
var formidable = require('formidable');
var cookie = require('cookie');
var cook = require('cookie-parser');

var app = express();

var credentials = require('./credentials.js');

app.set('views', __dirname + '/views');
app.set('view engine', 'hbs');
app.set('view options', {
    layout: './layouts/main.hbs'
});

app.set('port', process.env.PORT || 3000);

app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
    resave: false,
    saveUninitialized: false,
    secret: credentials.cookieSecret,
}));

hbs.registerPartials(__dirname + '/views/partials');

//section Helper
hbs.registerHelper('section', function (name, options) {
    if (!this._sections)
        this._sections = {};
    this._sections[name] = options.fn(this);
});

app.use(express.static(path.join(__dirname, 'public')));

app.use(require('body-parser')());

// mocked weather data
function getWeatherData() {
    return {
        locations: [{
                name: 'Portland',
                forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
                iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
                weather: 'Overcast',
                temp: '54.1 F (12.3 C)',
            },
            {
                name: 'Bend',
                forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
                iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
                weather: 'Partly Cloudy',
                temp: '55.0 F (12.8 C)',
            },
            {
                name: 'Manzanita',
                forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
                iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
                weather: 'Light Rain',
                temp: '55.0 F (12.8 C)',
            },
        ],
    };
}

// flash message middleware
app.use(function (req, res, next) {
    // if there's a flash message, transfer
    // it to the context, then clear it
    res.locals.flash = req.session.flash;
    delete req.session.flash;
    next();
});

//加入weather data
app.use(function (req, res, next) {
    res.locals = getWeatherData();
    next();
});

app.get('/', function (req, res) {
    res.render('home');
});

//cookie test
app.get('/set-cookie', function (req, res) {
    res.cookie('monster', {
        "name": "Joe"
    });
    res.cookie('signed_monster', 'nom nom', {
        signed: true
    });
    res.send('Cookies is set successfully!!');
});
app.get('/get-cookie', function (req, res) {
    var monster = req.cookies.monster;
    var signedMonster = req.signedCookies.signed_monster;
    res.send(monster + '\n' + signedMonster);
});
app.get('/get-cookie2', function (req, res) {
    console.log(req.headers.cookie);
    var monster = req.headers.cookie;
    var newMonster = cookie.parse(monster, {});
    var s = cook.signedCookies(newMonster, "123");
    var rst = cook.JSONCookies(newMonster);
    console.log(typeof newMonster["monster"]);
    console.log(typeof newMonster);
    console.log(newMonster);
    console.log(s);
    console.log(newMonster["monster"].substr(0, 2) === 'j:');
    console.log(rst);
    console.log(rst["monster"].substr(0, 2) === 'j:');
    var signedMonster = req.signedCookies.signed_monster;
    res.send('\n' + signedMonster);
});
app.get('/clear-cookie', function (req, res) {
    res.clearCookie('monster');
    res.clearCookie('signed_monster');
    res.send('Cookies is clear successfully!!');
});

app.get('/about', function (req, res) {
    res.render('about', {
        fortune: fortune.getFortune()
    });
});

app.get('/tours/hood-river', function (req, res) {
    res.render('tours/hood-river');
});
app.get('/tours/oregon-coast', function (req, res) {
    res.render('tours/oregon-coast');
});
app.get('/tours/request-group-rate', function (req, res) {
    res.render('tours/request-group-rate');
});
app.get('/nursery-rhyme', function (req, res) {
    res.render('nursery-rhyme');
});

app.get('/data/nursery-rhyme', function (req, res) {
    res.json({
        animal: 'squirrel',
        bodyPart: 'tail',
        adjective: 'bushy',
        noun: 'heck'
    });
});

app.get('/thank-you', function (req, res) {
    res.render('thank-you');
});

app.get('/newsletter', function (req, res) {
    res.render('newsletter', {
        csrf: 'CSRF token goes here'
    });
});

// for now, we're mocking NewsletterSignup:
function NewsletterSignup() {}
NewsletterSignup.prototype.save = function (cb) {
    cb();
};

var VALID_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

app.post('/newsletter', function (req, res) {
    var name = req.body.name || '',
        email = req.body.email || '';
    //input validation
    if (!email.match(VALID_EMAIL_REGEX)) {
        if (req.xhr) {
            return res.json({
                error: 'Invalid name email address.'
            });
        }
        req.session.flash = {
            type: 'danger',
            intro: 'Validation error!',
            message: 'The email address you entered was  not valid.'
        }
        return res.redirect(303, '/newsletter/archive');
    }

    new NewsletterSignup({
        name: name,
        email: email
    }).save(function (err) {
        if (err) {
            if (req.xhr) return res.json({
                error: 'Database error.'
            });
            req.session.flash = {
                type: 'danger',
                intro: 'Database error!',
                message: 'There was a database error; please try again later.',
            };
            return res.redirect(303, '/newsletter/archive');
        }
        if (req.xhr) return res.json({
            success: true
        });
        req.session.flash = {
            type: 'success',
            intro: 'Thank you!',
            message: 'You have now been signed up for the newsletter.',
        };
        return res.redirect(303, '/newsletter/archive');
    });
});

app.get('/newsletter/archive', function (req, res) {
    res.render('newsletter/archive');
});

//普通表單處理
// app.post('/process', function(req, res) {
//     console.log('Form (from querystring): ' + req.query.form);
//     console.log('CSRF token (from hidden form field): ' + req.body._csrf);
//     console.log('Name (from visible form field): ' + req.body.name);
//     console.log('Email (from visible from field): ' + req.body.email);
//     res.redirect(303, 'thank-you');
// });

//AJAX表單處理
app.post('/process', function (req, res) {
    if (req.xhr || req.accepts('json,html') === 'json') {
        // if there were an error, we would send { error: 'error description' }
        res.send({
            success: true
        });
    } else {
        // if there were an error, we would redirect to an error page
        res.redirect(303, '/thank-you');
    }
});

app.get('/contest/vacation-photo', function (req, res) {
    var now = new Date();
    res.render('contest/vacation-photo', {
        year: now.getFullYear(),
        month: now.getMonth()
    });
});

app.post('/contest/vacation-photo/:year/:month', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        if (err) return res.redirect(303, '/error');
        console.log('received fields:');
        console.log(fields);
        console.log('received files:');
        console.log(files);
        res.redirect(303, '/thank-you');
    });
});

// 404 catch-all handler (middleware)
app.use(function (req, res, next) {
    res.status(404);
    res.render('404');
});

// 500 error handler (middleware)
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500);
    res.render('500');
});

app.listen(app.get('port'), function () {
    console.log('Express started on http://localhost:' +
        app.get('port') + '; press Ctrl-C to terminate.');
});