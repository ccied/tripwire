var casper      = require('casper');
var system      = require('system');
var utils       = require('utils');
var fs          = require('fs');

var pgfinder    = require('./pagefinder/pagefinder');
var pgsetup     = require('./utils/pageSetup');
var pgutils     = require('./utils/pageUtils');

var formfind    = require('./formfinder/formfinder');

if (system.args.length != 4 + 3) {
    var page = casper.create();
    page.echo('Usage: \n\t' + system.args[3] +
                ' <some URL> <outfile_prefix> <outdir>', "ERROR");
    page.exit();
}

var page = pgsetup.getPage(system.args[4], system.args[5], system.args[6]);

/*page.then(function findRegPages() {
    formfind.isRegPage(this);
});*/

page.then(function () {
    pgutils.thenStart();
    pgutils.saveState(this);
    page.echo("=== Scanning site for registration page...", "INFO_BAR");
    pgutils.thenStop();
});

pgfinder.scanPage(page);

page.then(function linkProcessing() { 
    pgutils.thenStart();

    if (page.regPageFound === undefined) {
        page.echo("=== Scanning page for registration form...", "INFO_BAR");
        var regFormSel = formfind.getRegFormSelector(page);
    
        if (regFormSel === undefined) {
            page.echo("+++ No reg form found!", "ERROR");
            pgutils.thenStop();
            return;
        }
        else {
            page.echo("+++ Found reg form: " + regFormSel, "DEBUG");
        }
    }
    else if (page.regPageFound === false) {
        page.echo("+++ No reg form found! (from previous)", "ERROR");
        pgutils.thenStop();
        return;
    }
    else {
        page.echo("+++ Found reg form (from previous)", "DEBUG");
    }

    pgutils.saveState(this);

    pgutils.thenStop();
});

page.run();


