var express = require('express');
var passport = require('passport');
var Strategy = require('passport-facebook').Strategy;
const request = require('request-promise');
const mongoose = require('mongoose');

const payload = {
    queryTerm: 'Fiat',
    searchType: 'page'
}

mongoose.connect("mongodb://localhost/fbapi")

var feedSchema = mongoose.Schema({
    feedPageId: String,
    feedId:String,
    feedName:String,
    feed :String,
    user:{
        fbId:String,
        username:String
    }
})

var userSchema = mongoose.Schema({
    username: String,
    fbId: String
})

var User = mongoose.model("User", userSchema)
var Feed = mongoose.model("Feed", feedSchema)


var at
passport.use(new Strategy({
    clientID: 1470526526589578,
    clientSecret: "2f5946a29fac432e9a77f4359e6bfbc1",
    callbackURL: 'http://localhost:3000/login/facebook/return'
  },
  function(accessToken, refreshToken, profile, cb) {

      at = accessToken
      /*console.log("==============================")
      console.log("==============================")
      console.log(profile, accessToken);
      console.log("==============================")
      console.log("==============================")*/


    return cb(null, profile);
  }));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});


// Create a new Express application.
var app = express();

// Configure view engine to render EJS templates.
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());


app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    next();
})

// Define routes.
app.get('/',
  function(req, res) {
    res.render('home', { user: req.user });
  });

app.get('/login',
  function(req, res){
    res.render('login');
  });

app.get('/login/facebook',
  passport.authenticate('facebook', {
      scope: ['publish_actions', 'manage_pages']
  }));

app.get('/login/facebook/return', 
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/profile');
  });

app.get('/profile',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
    // console.log(req.user.displayName)
    // console.log(req.user.id)

      const options = {
          method: 'GET',
          uri: 'https://graph.facebook.com/v2.11/'+req.user.id+'/accounts',
          qs: {
              access_token: at,
              type: "page",
              fields: "feed,name,about"
          }
      };
      const user = new User ({
          username: req.user.displayName,
          fbId: req.user.id
      })
      User.findOne({fbId:req.user.id}, function(err, existingAccount){
          if(err){
              console.log(err)
          }else if(existingAccount){
              console.log("Account already exits")
              feedSave();
          }else{
              user.save(function(err, savedAccount){
                  if(err){
                      console.log(err)
                  }else{
                      // console.log(savedAccount)
                      feedSave();
                  }
              })
          }
      })


        function feedSave(){
            request(options)
                .then(function(res2){
                    var parsedRes = JSON.parse(res2).data;
                    // console.log(parsedRes)
                    // res.json(parsedRes);
                    var i=0
                    while(i<parsedRes.length) {
                        console.log(parsedRes[i]+i)
                        parsedRes[i].feed.data.forEach(function(feedValue){
                          if(feedValue.message){
                              var feed = feedValue.message;
                              var feedPageId = feedValue.id;
                              var owner ={
                                  fbId: req.user.id,
                                  username: req.user.displayName
                              }
                              var feedData = {
                                  feedName: parsedRes[i].name,
                                  feedId: parsedRes[i].id,
                                  feed: feed,
                                  feedPageId: feedPageId,
                                  user:owner
                              }
                              // console.log(feed);
                              Feed.findOne({feedPageId: feedPageId}, function (err, existingFeed) {
                                  if (err) {
                                      console.log(err)
                                  } else if (existingFeed) {
                                      // console.log(feedData)
                                      // console.log("existing Feed")
                                      // console.log("Feed exist's, j = "+j+", i = "+i)
                                  }

                                  else {

                                      Feed.create(feedData, function (err, result) {
                                          if (err) {
                                              console.log(err)
                                          } else {
                                          }
                                      })
                                  }
                              })
                          }
                        })

                        /*for (var j = 0; j < parsedRes[i].feed.data.length; j++) {
                            if (parsedRes[i].feed.data[j].message) {
                                var feed = parsedRes[i].feed.data[j].message;
                                var feedPageIdLocal = parsedRes[i].feed.data[j].id;
                                var feedData = {
                                    feedName: parsedRes[i].name,
                                    feedId: parsedRes[i].id,
                                    feed: feed,
                                    feedPageId: feedPageIdLocal
                                }

                                // console.log(feedData)
                                var l = j
                                function (x){
                                    // var y = x;
                                    // var h = x
                                    Feed.findOne({feedPageId: "401662736711100_425211731022867"}, function (err, existingFeed) {
                                        console.log(x);
                                        // if (err) {
                                        //     console.log(err)
                                        // } else if (existingFeed) {
                                        //     // console.log(feedData)
                                        //     console.log(existingFeed)
                                        //     // console.log("Feed exist's, j = "+j+", i = "+i)
                                        // }
                                        //
                                        // else {
                                        //
                                        //     Feed.create(feedData, function (err, result) {
                                        //         if (err) {
                                        //             console.log(err)
                                        //         } else {
                                        //         }
                                        //     })
                                        // }
                                    })
                                }(j)*/


                        i++
                    }
                    // res.send("Successfully saved to db...");
                    res.redirect('/page');
                })

}

  });

app.get("/page", function (req, res) {
    Feed.find({}, function(err, feed){
        if(err){console.log(err)}else{
            console.log("=========")
            console.log(feed)
            res.render("page", {feed: feed})
        }

    })
})

app.get("/page/:feedId", function(req, res){
        Feed.findOne({feedPageId:req.params.feedId}, function(err, oneFeed){
            if(err){console.log(err)}else{
                res.render("show", {oneFeed: oneFeed})
            }
        })
})

app.get("/page/:feedId/edit",checkPageOwnership, function(req, res){
    Feed.findOne({feedPageId:req.params.feedId}, function(err, oneFeed){
        if(err){console.log(err)}else{
            res.render("edit", {oneFeed: oneFeed})
        }
    })
})

app.post("/page/:feedId/edit",checkPageOwnership, function (req, res) {
    console.log(req.body.feed)
    Feed.findOneAndUpdate({feedPageId:req.params.feedId},{feed:req.body.feed}, function(err, updatedFeed){
        if(err){console.log(err)}else{
            res.redirect("/page/"+req.params.feedId);
        }
    })
})


app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/")
})



//middleware

function checkPageOwnership(req, res, next){
    if(req.isAuthenticated()){
        Feed.findOne({feedPageId: req.params.feedId}, function(err, feed){
            if(err){
                res.redirect("back")
            }else{
                if(feed.user.fbId === req.user.id){
                    next()
                }else{
                    res.redirect("back")
                }
            }
        })
    }else{
        res.redirect("/login");
    }
}

app.listen(3000);
