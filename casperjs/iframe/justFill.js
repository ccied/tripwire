var casper      = require('casper');
var system      = require('system');
var utils       = require('utils');
var fs          = require('fs');
var childp      = require('child_process');
var formfill    = require('./formfiller/formfiller');
var fillptrns   = require('./formfiller/expressions');
var pgfinder    = require('./pagefinder/pagefinder');
var pgsetup     = require('./utils/pageSetup');
var pgutils     = require('./utils/pageUtils');
var ccap        = require('./captcha/captcha');
var prompt      = require('./prompt/prompt');

var conf        = require('./conf');

var formfind    = require('./formfinder/formfinder');

if (system.args.length != 4 + 3) {
    var page = casper.create();
    page.echo('Usage: \n\t' + system.args[3] +
                ' <some URL> <outfile_prefix> <outdir>', "ERROR");
    page.exit();
}

var page = pgsetup.getPage(system.args[4], system.args[5], system.args[6]);

var fillId = -1;
var formElements = [];

page.then(function linkProcessing() { 
    pgutils.thenStart();

    page.echo("=== Scanning page for registration form...", "INFO_BAR");
    var regFormSel = formfind.getRegFormSelector(page);

    if (regFormSel === undefined) {
        page.echo("+++ No reg form found! (from scan)", "ERROR");
        pgutils.thenStop();
        return;
    }

    page.echo("+++ Found reg form: " + regFormSel, "DEBUG");
    page.echo("=== Collecting form elements...", "INFO_BAR");
    formElements = this.evaluate(function(regFormSel) {
        var formElements = getFormElements(regFormSel);
        var selectors = [];
        formElements.each(function(i, el) {
            selectors.push("#" + addIDIfNeeded(el));
        });
        return selectors;
        //formElements.getSelector();
    }, regFormSel);

    page.echo("+++ Number of form elements: " + formElements.length, "DEBUG");

    //utils.dump(formElements);
    page.echo("=== Filling form elements...", "INFO_BAR");
    fillId = formfill.fillFields(page, formElements,
                                 fillptrns.PTRNS, conf.fields);
});

page.then(function() {
    if (fillId < 0)
        return;

    var statuses = formfill.getFillResults(fillId);
    // Maybe we should do something with this info?
    var successes = 0;
    var numFields = 0;
    for (var i in statuses) {
        if (statuses[i]) {
            page.echo("Status: " + i + " succeeded", "INFO");
            ++successes;
        }
        else {
            page.echo("Status: " + i + " failed", "WARNING");
        }
        ++numFields;
    }
    page.echo("**** Unassisted Form Totals: " +
              successes + " / " + numFields +
              " = " + (successes * 100.0 / numFields) + "%");

    pgutils.thenStop();
});

page.then(function() {
    pgutils.thenStart();
    pgutils.saveState(this);
    pgutils.thenStop();
});

page.run();


