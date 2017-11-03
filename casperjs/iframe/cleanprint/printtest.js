
var casper      = require('casper');
var system      = require('system');
var utils       = require('utils');
var fs          = require('fs');

var cleanprint  = require('cleanprint');


function goodName(page) {
    page.tw_warn("myModule", "Something's not right");
}

function main() {
    var page = casper.create();
    cleanprint.init(page);

    goodName(page);
    page.tw_error("myModule", "OH GOD IT'S BURNING");
    page.tw_warn("myModule", "SUPER LONG WARNING THAT IS LONG ENOUGH TO CAUSE PROBLEMS GOODNESS GRACIUOS ME HOW EVER WILL WE GET ON even though there are such errors? I don't know!");
    page.tw_debug("myModule", "Info about debugging");
    page.tw_alert("importantModuleOfDeath", "This is evidently important");
    page.tw_info("myModule", "Just FYI");
    page.tw_log("yourModule", "plain", "Simple", "myID");

    page.exit(1);
}

main();


