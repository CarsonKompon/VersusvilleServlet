/* RESPONSE CODES
201 - Username successfully added to database
301 - Username contains invalid characters
401 - Username already in database

*/

var express = require("express");
var bodyParser = require("body-parser");
var fs = require("fs");
var http = require("http");
var https = require("https");
var rateLimit = require("express-rate-limit");
var dotenv = require("dotenv");
const { Webhook } = require('discord-webhook-node');
const hook = new Webhook(process.env.DISCORD_WEBHOOK);
var app = express();

var limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 10 Minutes
    max: 80 // Limit each IP to 80 requests per windowMs
});

app.use(limiter);

var apiKey = [ 49, 91, 41, -123, -32, -113, 37, -88, 98, 122, 118, -88, 122, 67, -9, 84, 49, 91, 41, -123, -32, -113, 37, -88 ];

var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
mongoose.connect("mongodb://localhost:27017/kvs-db");

var userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    displayname: {
        type: String,
        required: true
    } 
});
var scoreSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    displayname: { type: String, required: true },
    score: { type: Number, required: true },
    time: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});
var roundScoreSchema = new mongoose.Schema({
    username: { type: String, required: true},
    displayname: { type: String, required: true },
    time: { type: Number, required: true}, 
    score: { type: Number, required: true },
    date: { type: Date, default: Date.now }
});
roundScoreSchema.index( { username: 1, time: 1} )

var User = mongoose.model("User", userSchema);
var WasteballScore = mongoose.model("WasteballScore", roundScoreSchema);
var GraveRaveScore = mongoose.model("GraveRaveScore", roundScoreSchema);
var ResidenceEvilScore = mongoose.model("ResidenceEvilScore", scoreSchema);
var ResidenceEvilTime = mongoose.model("ResidenceEvilTime", scoreSchema);
var KartDart1Score = mongoose.model("KartDart1Score", scoreSchema);
var KartDart2Score = mongoose.model("KartDart2Score", scoreSchema);
var KartDart3Score = mongoose.model("KartDart3Score", scoreSchema);
var KartDart1Time = mongoose.model("KartDart1Time", scoreSchema);
var KartDart2Time = mongoose.model("KartDart2Time", scoreSchema);
var KartDart3Time = mongoose.model("KartDart3Time", scoreSchema);

// Configure express to use body-parser as middle-ware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());



// DISCORD WEBHOOK

function sendWebhook(_action, _type, _username, _score, _time){
    if(_type == "score"){
        var _t = "";
        if(_action.includes("WASTEBALL") || _action.includes("CEMETERY")){
            _t = Math.round(_time/60000).toString() + "min ";
        }
        hook.send(_username + " got a score of " + _score + " in " + _t + getGamemodeName(_action));
    }else{
        hook.send(_username + " got a time of " + _score + "s in " + getGamemodeName(_action));
    }
}

function getGamemodeName(_action){
    if(_action == "WASTEBALL") return "Wasteball";
    if(_action == "CEMETERY") return "Grave Rave";
    if(_action == "RESIDENCE") return "Residence Evil";
    if(_action == "SUPERMARKET_01") return "Supermarket Speedway";
    if(_action == "SUPERMARKET_02") return "Market Madness";
    if(_action == "SUPERMARKET_03") return "Wild in the Aisles";
    return _action;
}




app.post("/servlet", async (request, response) => {
    // To access POST variable use req.body() methods
    var _body = request.body;

    //console.log(_body); //DEBUG OUTPUT REQUEST

    if(_body.action){
        var _action = _body.action.toUpperCase();
        console.log("Got " + _action + " request:");


        // USER NAME REGISTRY

        if(_action == "REGISTER" && _body.playerId && _body.oldId){
            var _displayName = _body.playerId.trim();
            var _username = _displayName.toLowerCase();
            var _oldDisplayName = _body.oldId.trim();
            var _oldUsername = _oldDisplayName.toLowerCase();

            

            if(_username == "guest"){

                //Delete old user
                User.deleteOne({ username: _oldUsername })
                .then(item => {
                    console.log("User \"" + _oldUsername + "\" was un-registered.")
                })

                response.status(201).send(); // Added successfully
                return;
            }

            if(_username.includes(",") || _username.includes("\\") || _username.includes(" ") || _username.includes(":") || _username.includes("/") || _username.includes("\"") || _username.includes("\'")){
                console.log("Username \"" + _displayName + "\" contains invalid characters...");
                response.status(301).send(); //Invalid characters
            }else{
                var _data = new User({ username: _username, displayname: _displayName });
                _data.save()
                .then(item => {

                    //Delete old user
                    if(_oldUsername != "Guest"){
                        User.deleteOne({ username: _oldUsername })
                        .then(item => {
                            console.log("User \"" + _oldDisplayName + "\" was un-registered.")
                        })
                    }

                    console.log("Username \"" + _displayName + "\" added successfully...");
                    response.status(201).send(); // Added successfully
                })
                .catch(err => {
                    console.log("Username \"" + _displayName + "\" already exists in the database...");
                    response.status(401).send(); // Already exists
                });
            }

            
        // HIGH SCORE ENTRY

        }else if((_action == "WASTEBALL" || _action == "CEMETERY" || _action == "RESIDENCE" || _action.includes("SUPERMARKET")) && _body.player1){
            var _array = _body.player1.trim().split(",");

            if(_array.length == 3){
                var _filter = { username: _array[0].toLowerCase() }
                var _update = { displayname: _array[0], score: parseInt(_array[1]), time: parseInt(_array[2]) };

                // FILTER BY TIME FOR WASTEBALL/GRAVERAVE
                if(_action == "WASTEBALL" || _action == "CEMETERY"){
                    _filter.time = _update.time;
                    _update = { displayname: _array[0], score: parseInt(_array[1]) };

                    if(_filter.time % 60000 != 0){
                        console.log("- Ignored score achieved through non-timer round")
                        response.status(201).send();
                        return;
                    }
                }
                
                var _current = null
                if(_action == "WASTEBALL") _current = await WasteballScore.findOne(_filter);
                else if(_action == "CEMETERY") _current = await GraveRaveScore.findOne(_filter);
                else if(_action == "RESIDENCE") _current = await ResidenceEvilScore.findOne(_filter);
                else if(_action == "SUPERMARKET_01") _current = await KartDart1Score.findOne(_filter);
                else if(_action == "SUPERMARKET_02") _current = await KartDart2Score.findOne(_filter);
                else if(_action == "SUPERMARKET_03") _current = await KartDart3Score.findOne(_filter);

                if(_current && _current.score){
                    var _txt = "- User \"" + _filter.username + "\" Score: " + _current.score.toString() + " => " + _update.score.toString()
                    if(_action == "WASTEBALL" || _action == "CEMETERY"){
                        _txt = _txt + " | " + Math.round(_filter.time/60000) + "min";
                    }
                    console.log(_txt);

                    if(_update.score > _current.score){
                        _current.displayname = _update.displayname;
                        _current.score = _update.score;
                        if(_action != "WASTEBALL" && _action != "CEMETERY") _current.time = _update.time;
                        _current.date = Date.now();
                        _current.save()
                        .then(item => {
                            
                            sendWebhook(_action, "score", _update.displayname, _update.score.toString(), _filter.time)

                            console.log("-- Score updated successfully.");
                        })
                        .catch(err => {
                            console.log("-- ERROR:");
                            console.log(err);
                            console.log("-- REQUEST:");
                            console.log(_body);
                            console.log("-- Score could not be updated..? (SEE ABOVE)");
                        });
                    }else{
                        console.log("-- Score was not updated.");
                    }
                }else{
                    var _txt = "- User \"" + _update.displayname + "\" Score: 0 => " + _update.score.toString();
                    if(_action == "WASTEBALL" || _action == "CEMETERY"){
                        _txt = _txt + " | " + Math.round(_filter.time/60000) + "min";
                    }
                    console.log(_txt);

                    var _data = null;
                    if(_action == "WASTEBALL") _data = new WasteballScore({ username: _filter.username, displayname: _update.displayname, score: _update.score, time: _filter.time });
                    else if(_action == "CEMETERY") _data = new GraveRaveScore({ username: _filter.username, displayname: _update.displayname, score: _update.score, time: _filter.time });
                    else if(_action == "RESIDENCE") _data = new ResidenceEvilScore({ username: _filter.username, displayname: _update.displayname, score: _update.score, time: _update.time });
                    else if(_action == "SUPERMARKET_01") _data = new KartDart1Score({ username: _filter.username, displayname: _update.displayname, score: _update.score, time: _update.time });
                    else if(_action == "SUPERMARKET_02") _data = new KartDart2Score({ username: _filter.username, displayname: _update.displayname, score: _update.score, time: _update.time });
                    else if(_action == "SUPERMARKET_03") _data = new KartDart3Score({ username: _filter.username, displayname: _update.displayname, score: _update.score, time: _update.time });
                    if(_data){
                        _data.save()
                        .then(item => {
                            sendWebhook(_action, "score", _update.displayname, _update.score.toString(), item.time)
                            console.log("-- Score added successfully.");
                        })
                        .catch(err => {
                            console.log("-- ERROR:");
                                console.log(err);
                                console.log("-- REQUEST:");
                                console.log(_body);
                            console.log("-- Score could not be updated..? (SEE ABOVE)");
                        });
                    }
                }

                // SUPERMARKET + RESIDENCE EVIL TIMES
                if(_action.includes("SUPERMARKET") || _action == "RESIDENCE"){
                    if(_action == "SUPERMARKET_01") _current = await KartDart1Time.findOne(_filter);
                    else if(_action == "SUPERMARKET_02") _current = await KartDart2Time.findOne(_filter);
                    else if(_action == "SUPERMARKET_03") _current = await KartDart3Time.findOne(_filter);
                    else if(_action == "RESIDENCE") _current = await ResidenceEvilTime.findOne(_filter);

                    if(_current && _current.time){
                        console.log("- User \"" + _filter.username + "\" Time: " + _current.time.toString() + "ms => " + _update.time.toString() + "ms");
                        if(_update.time < _current.time){
                            _current.displayname = _update.displayname;
                            _current.score = _update.score;
                            _current.time = _update.time;
                            _current.date = Date.now();
                            _current.save()
                            .then(item => {
                                sendWebhook(_action, "time", _update.displayname, (_update.time/1000).toFixed(3), _update.time)
                                console.log("-- Time updated successfully.");
                            })
                            .catch(err => {
                                console.log("-- ERROR:");
                                console.log(err);
                                console.log("-- REQUEST:");
                                console.log(_body);
                                console.log("-- Time could not be updated..? (SEE ABOVE)");
                            });
                        }else{
                            console.log("-- Time was not updated.");
                        }
                    }else{
                        console.log("- User \"" + _filter.username + "\" Time: 0ms => " + _update.time.toString() + "ms");
                        var _data = null
                        if(_action == "SUPERMARKET_01") _data = new KartDart1Time({ username: _filter.username, displayname: _update.displayname, score: _update.score, time: _update.time });
                        else if(_action == "SUPERMARKET_02") _data = new KartDart2Time({ username: _filter.username, displayname: _update.displayname, score: _update.score, time: _update.time });
                        else if(_action == "SUPERMARKET_03") _data = new KartDart3Time({ username: _filter.username, displayname: _update.displayname, score: _update.score, time: _update.time });
                        else if(_action == "RESIDENCE") _data = new ResidenceEvilTime({ username: _filter.username, displayname: _update.displayname, score: _update.score, time: _update.time });
                        if(_data){
                            _data.save()
                            .then(item => {
                                sendWebhook(_action, "time", _update.displayname, (_update.time/1000).toFixed(3), _update.time)
                                console.log("-- Time added successfully.");
                            })
                            .catch(err => {
                                console.log("-- ERROR:");
                                console.log(err);
                                console.log("-- REQUEST:");
                                console.log(_body);
                                console.log("-- Time could not be updated..? (SEE ABOVE)");
                            });
                        }
                    }
                }
            }

            // Score.findOne(_filter, function(err, _current) {
            //     console.log("User \"" + _filter.username + "\" Score: " + _current.score.toString() + " => " + _update.score.toString());
            //     if(_update.score > _current.score){
            //         var _data = new Score({ username: _filter.username, score: _update.score, time: _update.time })
            //         _data.save()
            //         .then(item => {
            //             console.log("Score updated successfully.");
            //         })
            //         .catch(err => {
            //             console.log("Score could not be updated..?");
            //             console.log(err);
            //         });
            //     }else{
            //         console.log("Score was not updated.");
            //     }
            // })

            response.status(201).send();
            

        // INVALID REQUEST

        }else{
            console.log("Could not process request:");
            console.log(_body);
            response.status(400).send(); //Invalid call to servlet
        }
    }
});



// GET TOP 5 FROM ALL SCOREBOARDS REQUEST

app.get("/scores", async (request, response) => {
    console.log("Someone's requesting the Leaderboards");
    response.setHeader("Access-Control-Allow-Origin","*");
    var _count = 5;
    var _s = {
        wasteball5: await WasteballScore.find({time: 5*60*1000}).sort({score: -1}).limit(_count),
        wasteball10: await WasteballScore.find({time: 10*60*1000}).sort({score: -1}).limit(_count),
        wasteball15: await WasteballScore.find({time: 15*60*1000}).sort({score: -1}).limit(_count),
        wasteball20: await WasteballScore.find({time: 20*60*1000}).sort({score: -1}).limit(_count),
        wasteball25: await WasteballScore.find({time: 25*60*1000}).sort({score: -1}).limit(_count),
        graverave5: await GraveRaveScore.find({time: 5*60*1000}).sort({score: -1}).limit(_count),
        graverave10: await GraveRaveScore.find({time: 10*60*1000}).sort({score: -1}).limit(_count),
        graverave15: await GraveRaveScore.find({time: 15*60*1000}).sort({score: -1}).limit(_count),
        graverave20: await GraveRaveScore.find({time: 20*60*1000}).sort({score: -1}).limit(_count),
        graverave25: await GraveRaveScore.find({time: 25*60*1000}).sort({score: -1}).limit(_count),
        residence: await ResidenceEvilScore.find().sort({score: -1}).limit(_count),
        residencet: await ResidenceEvilTime.find().sort({time: 1}).limit(_count),
        kartdart1: await KartDart1Score.find().sort({score: -1}).limit(_count),
        kartdart2: await KartDart2Score.find().sort({score: -1}).limit(_count),
        kartdart3: await KartDart3Score.find().sort({score: -1}).limit(_count),
        kartdart1t: await KartDart1Time.find().sort({time: 1}).limit(_count),
        kartdart2t: await KartDart2Time.find().sort({time: 1}).limit(_count),
        kartdart3t: await KartDart3Time.find().sort({time: 1}).limit(_count)
    }
    response.send(_s);
});

// GET TOP 5 FROM ALL SCOREBOARDS REQUEST

app.get("/wasteball", async (request, response) => {
    console.log("Someone's requesting the Wasteball Leaderboards");
    response.setHeader("Access-Control-Allow-Origin","*");
    var _s = {
        wasteball5: await WasteballScore.find({time: 5*60*1000}).sort({score: -1}),
        wasteball10: await WasteballScore.find({time: 10*60*1000}).sort({score: -1}),
        wasteball15: await WasteballScore.find({time: 15*60*1000}).sort({score: -1}),
        wasteball20: await WasteballScore.find({time: 20*60*1000}).sort({score: -1}),
        wasteball25: await WasteballScore.find({time: 25*60*1000}).sort({score: -1})
    }
    response.send(_s);
});

app.get("/graverave", async (request, response) => {
    console.log("Someone's requesting the Grave Rave Leaderboards");
    response.setHeader("Access-Control-Allow-Origin","*");
    var _s = {
        graverave5: await GraveRaveScore.find({time: 5*60*1000}).sort({score: -1}),
        graverave10: await GraveRaveScore.find({time: 10*60*1000}).sort({score: -1}),
        graverave15: await GraveRaveScore.find({time: 15*60*1000}).sort({score: -1}),
        graverave20: await GraveRaveScore.find({time: 20*60*1000}).sort({score: -1}),
        graverave25: await GraveRaveScore.find({time: 25*60*1000}).sort({score: -1})
    }
    response.send(_s);
});

app.get("/residence", async (request, response) => {
    console.log("Someone's requesting the Residence Evil Leaderboards");
    response.setHeader("Access-Control-Allow-Origin","*");
    var _s = {
        residence: await ResidenceEvilScore.find().sort({score: -1}),
        residencet: await ResidenceEvilTime.find().sort({time: 1}),
    }
    response.send(_s);
});

app.get("/kartdart1", async (request, response) => {
    console.log("Someone's requesting the Kart Dart 1 Leaderboards");
    response.setHeader("Access-Control-Allow-Origin","*");
    var _s = {
        kartdart1: await KartDart1Score.find().sort({score: -1}),
        kartdart1t: await KartDart1Time.find().sort({time: 1})
    }
    response.send(_s);
});

app.get("/kartdart2", async (request, response) => {
    console.log("Someone's requesting the Kart Dart 2 Leaderboards");
    response.setHeader("Access-Control-Allow-Origin","*");
    var _s = {
        kartdart2: await KartDart2Score.find().sort({score: -1}),
        kartdart2t: await KartDart2Time.find().sort({time: 1})
    }
    response.send(_s);
});

app.get("/kartdart3", async (request, response) => {
    console.log("Someone's requesting the Kart Dart 3 Leaderboards");
    response.setHeader("Access-Control-Allow-Origin","*");
    var _s = {
        kartdart3: await KartDart3Score.find().sort({score: -1}),
        kartdart3t: await KartDart3Time.find().sort({time: 1})
    }
    response.send(_s);
});

http.createServer(app).listen(3000, function(){
    console.log("Started http on PORT 3000")
})
https.createServer({
    key: fs.readFileSync(process.env.CERT_DIRECTORY + "/privkey.pem", "utf8"),
    cert: fs.readFileSync(process.env.CERT_DIRECTORY + "/cert.pem", "utf8"),
    ca: fs.readFileSync(process.env.CERT_DIRECTORY + "/chain.pem", "utf8"),
}, app)
.listen(3001, function(){
    console.log("Started https on PORT 3001");
});
