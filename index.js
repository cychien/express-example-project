var express = require('express');
var hbs = require('hbs');
var path = require('path');
var fortune = require('./lib/fortune.js');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'hbs');
app.set('view options', {layout: './layout/main.hbs'});

app.set('port', process.env.PORT || 3000);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
	res.render('home');
});
app.get('/about', function(req,res){
	res.render('about', {fortune: fortune.getFortune()});
});
app.get('/tours/hood-river', function(req, res){
	res.render('tours/hood-river');
});
app.get('/tours/oregon-coast', function(req, res){
	res.render('tours/oregon-coast');
});
app.get('/tours/request-group-rate', function(req, res){
	res.render('tours/request-group-rate');
});

// 404 catch-all handler (middleware)
app.use(function(req, res, next){
	res.status(404);
	res.render('404');
});

// 500 error handler (middleware)
app.use(function(err, req, res, next){
	console.error(err.stack);
	res.status(500);
	res.render('500');
});

app.listen(app.get('port'), function(){
    console.log( 'Express started on http://localhost:' + 
      app.get('port') + '; press Ctrl-C to terminate.' );
});