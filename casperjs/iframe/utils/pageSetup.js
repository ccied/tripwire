//var USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_4) AppleWebKit/536.30.1 (KHTML, like Gecko) Version/6.0.5 Safari/536.30.1";
var USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X)";
var VIEWPORT   = { width: 1020, height: 800 };

var CLIENT_SCRIPTS = [
        "client/jquery.js",
        "client/remapJQuery.js",
        "client/caseInsensitiveMatch.js",
        "client/clientUtils.js",
];

exports.CLIENT_SCRIPTS = CLIENT_SCRIPTS;

function getPage(url, sitename, outdir, prefix) {

    var client_scripts = [];
    if (prefix !== undefined)
        for (var i = 0; i < CLIENT_SCRIPTS.length; ++i) {
            client_scripts.push(prefix + "/" + CLIENT_SCRIPTS[i]);
        }
    else
        client_scripts = CLIENT_SCRIPTS;

    var page = casper.create({
        clientScripts: client_scripts,
        pageSettings: {
            userAgent: USER_AGENT,
        },
        verbose: true,
        logLevel: "debug",
        viewportSize: VIEWPORT,
    });

    page.sitename   = sitename;
    page.outdir     = outdir;

    page.on('load.failed', function loadFailed(arg) {
        utils.dump(arg);

        if (arg.http_status == 200) {
            //this.tw_die(66, "ps", "error", "Received load-fail on HTTP 200. " +
            //    "URL: " + arg.url);
            this.tw_warn("ps", "Received load-fail on HTTP 200. " +
                               " Trying to ignore. URL: " + arg.url);
        }
        else if (arg.http_status !== null) {
            this.tw_die(67, "ps", "error", "Page failed to load: " +
                arg.http_status + " / " + arg.url);
            //this.die("ERROR: Page failed to load! STATUS/URL: " +
            //         arg.http_status + " / " + arg.url, 67);
        }
        else {
            //this.die("ERROR: Page failed to load! URL: " + arg.url, 68);
            this.tw_die(68, "ps", "error",
                        "Page failed to load (null http): " + arg.url);
        }
    });

    page.on('remote.message', function clientMsg(message) {
        page.tw_info("ps", message);
    });
    page.on('remote.alert', function clientAlert(message) {
        page.tw_alert("ps", message);
    });

    page.on('complete.error', function completeError(err) {
        this.tw_die(
            69, "ps", "error", err);
        //this.die("Complete callback has failed: " + err, 69);
    });

    page.on('step.timeout', function stepTimeout() {
        page.tw_error("ps", "STEP TIMEOUT");
    });
    page.on('error', function stepError(err, trace) {
        page.tw_error("ps", "GENERAL ERROR: " + err);
        page.tw_error("ps", "Trace: " + err);
        page.tw_dump("ps", "error", trace);
        this.tw_die(62, "ps", "error", "Die on general error: " + err);
    });
    page.on('step.error', function stepError(err) {
        this.tw_die(61, "ps", "error", "STEP ERROR: " + err);
    });
    page.on('step.complete', function stepComplete() {
        page.tw_debug("ps", "STEP COMPLETE");
    });
    page.on('step.start', function stepStart(msg) {
        page.tw_debug("ps", "STEP START");
    });
    page.on('page.error', function pageError (err, trace) {
        page.tw_info("ps", "PAGE ERROR: " + err);
        page.tw_info("ps", "Trace: ");
        page.tw_dump("ps", "info", trace);
        //this.die("Die on page error", 60)
    });

    cleanprint.init(page);

    page.start(url);
    page.twURL = url;

    page.then(function cliFrameInsert() {
        allFrameInjectClientUtils(page);
    });

    return page;
}

function injectClientUtilsIfNeeded(page, frame) {
    var needsJQ = page.evaluate(function jQTest() {
        return typeof $jq === "undefined";
    });
    if (needsJQ)
        for (var i = 0; i < pgsetup.CLIENT_SCRIPTS.length; ++i)
            page.page.injectJs(pgsetup.CLIENT_SCRIPTS[i]);
}

function allFrameInjectClientUtils(page) {
    for (var i = 0; i < page.page.framesCount; ++i) {
        page.tw_debug("ps", "(Re?)injecting JQ into frame " + i);
        pgutils.setFrameTo(page, i);
        injectClientUtilsIfNeeded(page, i);
        pgutils.resetFrame(page);
    }
}

exports.injectClientUtilsIfNeeded = injectClientUtilsIfNeeded;
exports.allFrameInjectClientUtils = allFrameInjectClientUtils;
exports.getPage = getPage;
