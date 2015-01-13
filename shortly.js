var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var bcrypt = require('bcrypt-nodejs');
var session = require('express-session');
// var cookieParser = require('cookieParser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
// app.use(cookieParser());
//
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

var checkUser = function(req,res) {
  return req.session.token === 'token';
};

app.get('/',
function(req, res) {
  if (checkUser(req, res)) {
    res.render('index');
  } else {
    res.render('login');
  }
});

app.get('/logout',
  function(req, res) {
    req.session.destroy(function(err) {
      if (err) {
        console.log('logout destroy error');
      } else {
        console.log('logout has destroyed session');
      }
    });
    res.redirect('login');
  });

app.get('/create',
function(req, res) {
  res.render('index');
});

app.get('/signup',
function(req, res) {
  res.render('signup');
});

app.get('/login',
function(req, res) {
  res.render('login');
});

app.get('/links',
function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/signup',
function(req, res){
  var username = req.body.username;
  var password = req.body.password;

  new User({username: username, password: password})
  .fetch()
  .then(function(user){
    if(!user){
      hashPass(password, function(hash) {
        var newUser = new User({username: username, password: hash});
        newUser.save()
        .then(function(newUser) {
          Users.add(newUser);
          console.log('thisisanewUser ', newUser);
          res.redirect('/login');
          res.send(200);
        });
      });
    }
  });
});




var hashPass = function(password, cb) {
  bcrypt.genSalt(10, function(err, salt) {
    bcrypt.hash(password, salt, null, function(error, hash) {
      if (error) {
        throw error;
      } else {
        cb(hash);
      }
    });
  });
};

app.post('/login',
  function(req,res) {
    var username = req.body.username;
    var password = req.body.password;

    new User({username: username})
    .fetch()
    .then(function(user) {
      if (!user) {
        res.redirect('login');
      } else {
        var hashedPassword = user.get('password');
        bcrypt.compare(password, hashedPassword, function(err, resp) {
          if (!resp) {
            res.redirect('login');
          } else {
            req.session.token = 'token';
            res.redirect('index');
          }
        });
      }
    });
  }
  );

// app.post('/login',
// function(req, res) {
//   var username = req.body.username;
//   var password = req.body.password;

//   new User({username: username})
//   .fetch()
//   .then(function(user){
//     if(user === null){
//       res.redirect('login');
//     }
//     // Users.query().where({username: username}).then(function(resp){
//     //   console.log('this is a responseeee ', resp);
//     // });
//     // var x = db.knex('users').where({username: username}).select('users.password');
//     // console.log(x);
//     Users.query(function(qb) {
//       qb.where('id', '=', 2);
//     }).fetch().then(function(collection) {
//       console.log(collection.models[0]);
//     });
//     // var hash = bcrypt.hash();
//     // bcrypt.compare(password, hash, function(err, res) {
//     //   if err ? console.log(err) : console.log(res);
//     // });
//     res.send(200);
//   });
//   // res.send(200);
// });













app.post('/links',
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
