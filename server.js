const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
const { response } = require('express')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track', {useNewUrlParser: true, useUnifiedTopology: true})

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

// Create Schema and Model
const excersiseSchema = new mongoose.Schema({
  description: {type: String, required:true},
  duration:{type: Number, required:true},
  date:String,
});

const userSchema = new mongoose.Schema({
  username:{type:String, required:true},
  logs: [excersiseSchema],
});

const Session = mongoose.model("Sessions", excersiseSchema);
const User = mongoose.model("User", userSchema);

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/exercise/new-user", (req, res) => {
  let newUser = new User({username:req.body.username});
  newUser.save((err, newUsr) => {
    if (err) {
      res.send("Failed to create user");
    } else {
      res.json({"_id":newUsr.id, username:newUsr.username});
    }
  });
});

app.get("/api/exercise/users", (req, res) => {
  User.find({}, (err, arr) => {
    if (err) {
      res.send("No Users");
    } else {
      res.json(arr);
    }
  })
});

app.post("/api/exercise/add", (req, res) => {
  const newSession = new Session({
    description: req.body.description,
    duration: req.body.duration,
  });

  if (req.body.date === '') {
    newSession.date = new Date().toISOString().substring(0, 10);
  } else {
    newSession.date = req.body.date;
  }

  User.findByIdAndUpdate(
    req.body.userId,
    {$push: {logs: newSession}},
    {new: true},
    (err, updatedUser) => {
      if (!err) {
        res.json({
          "_id": updatedUser.id,
          "username": updatedUser.username,
          "date": new Date(newSession.date).toDateString(),
          "duration": newSession.duration,
          "description": newSession.description,
        });
      } else {
        res.send("Excersise creation failed");
      }
    }
    );
});

app.get("/api/exercise/log", (req, res) => {
  User.findById(req.query.userId, (err, usr) => {
      if (err) {
        res.send("Invalid user id");
      } else {
        let response = usr;
        response = response.toJSON(); 
        if (req.query.from || req.query.to) {
          let from = new Date(0);
          let to = new Date();

          if(req.query.from) {
            from = new Date(req.query.from);
          }
          if (req.query.to) {
            to = new Date(req.query.to);
          }

          //from = from.getTime();
          //to = to.getTime();

          response.logs = response.logs.filter((session) => {
            let sessionTime = new Date(session.date).getTime();
            return sessionTime >= from.getTime() && sessionTime <= to.getTime();
          })
        }

        if (req.query.limit) {
          response.logs = response.logs.slice(0, request.query.limit);
        }
        
        response.count = usr.logs.length;
        response.log = usr.logs; // For FCC sake
        response.logs = undefined;
        res.json(response);
      }
    }
  );
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
