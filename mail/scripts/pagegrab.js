var casper = require('casper');
var system = require('system');
var utils  = require('utils');
var fs     = require('fs');

var USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/536.30.1 (KHTML, like Gecko) Version/6.0.5 Safari/536.30.1";
var VIEWPORT   = { WIDTH: 1020, HEIGHT: 800 };

var page = casper.create({
    pageSettings: {
        userAgent: USER_AGENT,
    },
    verbose: true,
    logLevel: "debug"
});

page.on('load.failed', function(arg) {
    if (arg.http_status !== null) {
        // Not at all sure why either of these would cause load.failed.
        if (arg.http_status == 200) {
            this.echo("HTTP 200 Failure Status at " + arg.url, 'WARNING');
        }
        else if (arg.http_status == 302) {
            this.echo("HTTP 302 Failure Status at " + arg.url, 'WARNING');
        }
        else {
            this.die("ERROR: Page failed to load! STATUS/URL: " + 
                     arg.http_status + " / " + arg.url, 67);
        }
    }
    else  {
        //this.die("ERROR: Page failed to load! URL: " + arg.url, 68);
        this.echo("URL failed (w/ no status): " + arg.url, 'ERROR');
    }
});

page.on('remote.message', function(message) {
    this.echo("MSG> " + message, 'COMMENT');
});
page.on('remote.alert', function(message) {
    this.echo("PAGE ALERT> " + message, 'WARNING');
});

page.on('complete.error', function(err) {
    this.die("Complete callback has failed: " + err, 69);
});

page.on('step.timeout', function() {
    page.echo("======== STEP TIMEOUT", "ERROR");
    this.die("Die on step timeout", 123);
});

page.on('step.error', function(err, trace) {
    page.echo("======== STEP ERROR: " + err, "ERROR");
    page.echo("======== Trace: ", "ERROR");
    utils.dump(trace);
    pgutils.saveState(this, "error");
    this.die("Die on step error", 61);
});
page.on('page.error', function(err, trace) {
    page.echo("======== PAGE ERROR: " + err, "WARN_BAR");
    page.echo("======== Trace:", "WARN_BAR");
    utils.dump(trace);
});

if (system.args.length != 4 + 2) {
    page.echo('Usage: \n\t' + system.args[3] +
                ' <URL> <outfile_prefix>', "ERROR");
    page.exit();
}

url         = system.args[4];
outprefix   = system.args[5];

page.start(url);
//page.start('test.html');

page.viewport(VIEWPORT.WIDTH, VIEWPORT.HEIGHT);

function saveState(page, prefix) {
    page.echo("Saving state at " + prefix, "INFO");

    page.capture(prefix + ".png");

    var html = page.getHTML();
    fs.write(prefix + ".html", html, 'w');

    var title = page.fetchText("title");
    var text = page.page.plainText + "\n";
    fs.write(prefix + ".txt", title + "\n" + text, 'w');

    page.echo("Done saving state " + prefix, "INFO");
}

page.then(function linkProcessing() {
    saveState(this, outprefix);
    page.exit()
});

page.run();

