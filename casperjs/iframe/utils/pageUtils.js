
var DEBUG = true;

exports.getFormElementInfo = function getFormElementInfo(page, form) {
    page.tw_debug("pageUtils", "Entering (" + form.selector + ")");
    var oldFrame = exports.setFrameTo(page, form.frame);

    function cliGetFormElements (formSelector, frame) {
        var formElements = getGoodFormElements(formSelector);
        var info = [];
        formElements.each(function(i, el) {
            info.push({
                selector: "#" + addIDIfNeeded(el),
                frame: frame,
                name: $jq(el).attr("name"),
            });
        });
        return info;
    }

    var formElements = page.evaluate(cliGetFormElements,
                                     form.selector, form.frame);

    exports.setFrameTo(page, oldFrame);
    return formElements;
};


exports.pickleRegex = function pickleRegex(regex) {
    return regex.toString();
};

exports.saveState = function saveState(page, suffix, txt) {
    txt = typeof txt !== 'undefined' ? txt : true;
    this.suffix = typeof this.suffix === 'undefined' ? 0 : this.suffix;
    ++this.suffix;
    suffix = ((typeof suffix !== 'undefined') ?
                this.suffix + "-" + suffix : this.suffix);

    page.tw_info("pu", "Saving state at " + suffix);

    page.evaluate(function() {
        if ($jq("body").css('background-color') === undefined ||
            $jq("body").css('background-color') === '' ||
            $jq("body").css('background-color') === 'rgba(0, 0, 0, 0)') {

            $jq("body").css('background-color', 'white');
        }
    });

    var prefix = page.outdir + "/" + page.sitename + "-" + suffix;

    page.capture(prefix + ".png");

    var html = page.getHTML();
    fs.write(prefix + ".html", html, 'w');

    if (txt) {
        var title = page.fetchText("title");
        var text = page.page.plainText;
        fs.write(prefix + ".txt", title + " " + text, 'w');
    }

    page.tw_debug("pu", "Done @ " + suffix + " / " + page.getCurrentUrl());

    return suffix;
};

exports.saveSubset = function saveSubset(page, selector, suffix) {
    txt = typeof txt !== 'undefined' ? txt : true;
    page.tw_info("pu", "Saving state of " + selector + " at " + suffix);
    //page.echo("Saving state of " + selector + " at " + suffix, "INFO");

    var prefix = page.outdir + "/" + page.sitename + "-" + suffix;

    page.captureSelector(prefix + ".png", selector);

    var html = page.getHTML(selector);
    fs.write(prefix + ".html", html, 'w');

    if (txt) {
        var title = page.fetchText("title");
        var text = page.page.plainText;
        fs.write(prefix + ".txt", title + " " + text, 'w');
    }

    page.tw_debug("pu", "Done saving subset state " + suffix);
    //page.echo("Done saving subset state " + suffix, "INFO");
};

exports.announce = function announce(page, fnName, id) {
    if (DEBUG) {
        page.tw_info("*", "Entering", id, fnName);
        //page.echo( "+++ " + "Entering " + fnName +
        //            (id === undefined ? "" : ": " + id) + " +++", "PARAMETER");
    /*
        page.echo(  "======================================================" +
                    "\n" + "Entering " + fnName + "(): " +
                    (id === undefined ? "" : (" (" + id + ")")) + "\n" +
                    "======================================================",
                  "PARAMETER");
                  */
    }
};
exports.leave = function leave(page, fnName, id) {
    if (DEBUG) {
        page.tw_info("*", "Leaving", id, fnName);
        //page.echo( "+++ " + "Leaving " + fnName +
        //            (id === undefined ? "" : ": " + id) + " +++", "PARAMETER");
    }
};

var clean = true;
exports.thenStart = function thenStart(page) {
    if (!clean) {
        page.tw_error("pu", "Previous step didn't complete");
        //page.echo("======== ERROR: DID NOT COMPLETE PREVIOUS STEP ========", "RED_BAR");
        page.exit(1);
    }
    clean = false;
};
exports.thenStop = function thenStop(page) {
    clean = true;
};

exports.makePercentage = function makePercentage(num, den, sigfigs) {
    if (sigfigs === undefined)
        sigfigs = 1;
    var mult = Math.pow(10.0, sigfigs + 2);
    var div  = mult / 100.0;
    return Math.round(num * mult / den)/div;
};

exports.combineResults = function combineResults(res1, res2) {
    var combined = {};

    for (var i in res2) {
        combined[i] = res2[i];
    }
    for (var j in res1) {
        if (!(j in res2))
            combined[j] = res1[j];
    }

    return combined;
};

exports.setFrameTo = function setFrameTo(page, newFrame) {
    page.tw_info("pu", "Skipping setting frame to " + newFrame);
    return 0;
    /*var val = page.page.frameName;
    page.page.switchToFrame(newFrame);
    page.echo(val, "RED_BAR");
    return val;*/
};

exports.resetFrame = function resetFrame(page) {
    page.page.switchToMainFrame();
    //page.page.switchToParentFrame();
};

exports.checkpoint = function checkpoint(point_num) {
    system.stderr.write("checkpoint " + point_num + "\n");
};

exports.status_update = function status_update(update) {
    system.stderr.write("status_update " + update.replace("\n", " \\ ") + "\n");
};

exports.init = function init(page) {
    // Nothing yet to do.
};

