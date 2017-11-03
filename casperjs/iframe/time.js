var casper      = require('casper');
var system      = require('system');
var utils       = require('utils');
var fs          = require('fs');
var pgsetup     = require('./utils/pageSetup');
var pgutils     = require('./utils/pageUtils');

function handleRunRequest(page, url, prefix, outdir) {

    page = pgsetup.getPage(url, prefix, outdir);
    page.tw = {};

    function thenSaveState() {
        pgutils.saveState(this);
    }

    for (var i = 0; i < 10; ++i) {
        page.wait(1000);
        page.then(thenSaveState);
    }
    
    page.run();
}

if (system.args.length != 4 + 3) {
    var debugPage = casper.create();
    debugPage.echo('Usage: \n\t' + system.args[3] +
                ' <some URL> <outfile_prefix> <outdir>', "ERROR");
    debugPage.exit();
}

var page;
handleRunRequest(page, system.args[4], system.args[5], system.args[6]);

