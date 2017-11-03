var casper = require('casper');
var system = require('system');
var utils  = require('utils');
var fs     = require('fs');
var childp = require('child_process');

var pgsetup     = require('utils/pageSetup');
var pgutils     = require('utils/pageUtils');

var prompt = require('./prompt/prompt');
//var color  = require('./color');

if (system.args.length != 4 + 3) {
    var page = casper.create();
    page.echo('Usage: \n\t' + system.args[3] +
                ' <some URL> <outfile_prefix> <outdir>', "ERROR");
    page.exit();
}

var choices = {
        // Specifics. Ordered list of preference
        month: ["8", "aug"],
        day: ["27"],
        year: ["1973", "73"],
        dob: ["08/27/1973", "08/27/73"],
        username: ["MyFancyUsername34428", "MFU34428"],
        email: ["test@example.com"],
        firstname: ["MyFirstname"],
        lastname: ["MyLastname"],
        name: ["MyFull Name"],
        password: ["mySecretPassword123"],
        phone: ["123-456-7890", "(123) 456-7890", "(123) 4567890"],
        sex: ["(^|[^e])male", "guy", "man", "^m$"],
        recaptcha: ["my recaptcha guess"],
        country: ["United States of America", "USA", "United States"],
        zip: ["01234-5678", "01234"],
        state: ["New York", "NY"],
        city: ["Yonkers", "Albany"],
        age: ["40"],

        // Defaults
        checkboxes: {method: "check"},      // Check all checkboxes
        selects: {method: "random"},        // Randomly choose select inputs
        radiobuttons: {method: "random"},   // Randomly choose radio selections
        // Other OK methods: "first", "nth" (needs 'nth' attribute)
    };


var page = pgsetup.getPage(system.args[4], system.args[5],
                           system.args[6]);

function start() {
    var p1 = prompt.promptUser.call(page,
            "Hello there my child!");
    
    page.then(function() {
        var resp = prompt.getResult(p1);
        if (resp.errno) {
            page.echo("ERROR: Prompt errored out!", "ERROR");
        }
        page.echo("Received: " + resp.out);
    });
    

    var aid;
    page.then(function() {
        aid = prompt.askAbout.call(page, "#password", choices);
    });

    page.then(function() {
        var result = prompt.getAskResult(aid);
        utils.dump(result);
    });

    var options = [];
    options.push({id: "#MOOCOW", text: "This is my first option"});
    options.push({id: "#BOWWOW", text: "This is my second option"});
    options.push({id: "#MEEOWW", text: "This is my third option"});
    options.push({id: "#RROAWR", text: "This is my fourth option"});
    
    var cid;
    page.then(function () {
        cid = prompt.choose.call(page, options);
    });

    page.then(function () {
        var result = prompt.getChooseResult(cid);
        utils.dump(result);
    });
    
    page.run();
}

page.run(start);

