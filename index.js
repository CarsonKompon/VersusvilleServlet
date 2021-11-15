/* RESPONSE CODES
201 - Username successfully added to database
301 - Username contains invalid characters
401 - Username already in database

*/

const express = require("express");
const bodyParser = require("body-parser");
const app = express();

var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost:27017/kvs-db");

var userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true
    } 
});
var scoreSchema = new mongoose.Schema({ username: String });
var User = mongoose.model("User", userSchema);

// Configure express to use body-parser as middle-ware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.post("/servlet", (request, response) => {
    // To access POST variable use req.body() methods
    var _body = request.body;
    var _action = _body.action;
    console.log("Got " + _action + " request:");
    if(_action == "REGISTER"){
        var _username = _body.playerId.substring(0,_body.playerId.length-4);
        if(_username.includes("\\" || _username.includes(" ") || _username.includes(":") || _username.includes("/"))){
            console.log("Username \"" + _username + "\" contains invalid characters...");
            response.status(301).send();
        }else{
            var _data = new User({ username: _username });
            _data.save()
            .then(item => {
                response.status(201).send(); // Added successfully
            })
            .catch(err => {
                response.status(401).send(); // Already exists
            });
    }
    }else{
        response.status(400).send();
    }
});

app.post("/servlet", (request, response) => {
    // To access POST variable use req.body() methods
    var _body = request.body;
    var _action = _body.action;
    if(_action == "REGISTER"){
        var _username = _body.playerId
    }
    console.log(request.body);
    response.status(201);
    response.send();
});

app.listen(3000, function(){
    console.log("Started on PORT 3000");
});