
var TIMEOUT           = 120000;
var RETRY_MAX         = 3;

var CESR_ROOT         = "/cesr/tw";

var PATH_TO_DECAPTCHA = CESR_ROOT + "/de-captcher/api_php/question/finder";
var PATH_TO_PROMPT    = CESR_ROOT + "/casperjs/iframe/prompt/promptUserClient";

var REPLACED_STYLES   = ['border-bottom-style', 'border-top-style',
                         'border-left-style', 'border-right-style',
                         'border-bottom-width', 'border-top-width',
                         'border-left-width', 'border-right-width',
                         'border-bottom-color', 'border-top-color',
                         'border-left-color', 'border-right-color',
                         'background-color', 'color'];

PRESET_MAP = {
    'un': 'username',
    'username': 'username',
    'ps': 'password',
    'pw': 'password',
    'pass': 'password',
    'passwd': 'password',
    'password': 'password',
    'fi': 'firstname',
    'fn': 'firstname',
    'first': 'firstname',
    'firstname': 'firstname',
    'ln': 'lastname',
    'lastname': 'lastname',
    'last': 'lastname',
    'na': 'name',
    'name': 'name',
    'full': 'name',
    'fullname': 'name',
    'zi': 'zip',
    'zip': 'zip',
    'zipcode': 'zip',
    'co': 'country',
    'country': 'country',
    'ci': 'city',
    'city': 'city',
    'st': 'state',
    'state': 'state',
    'ag': 'age',
    'age': 'age',
    'do': 'dob',
    'dob': 'dob',
    'birthdate': 'dob',
    'birthday': 'dob',
    'dd': 'day',
    'da': 'day',
    'day': 'day',
    'dm': 'month',
    'mo': 'month',
    'month': 'month',
    'dy': 'year',
    'ye': 'year',
    'year': 'year',
    'se': 'sex',
    'ge': 'sex',
    'sex': 'sex',
    'gender': 'sex',
    'em': 'email',
    'email': 'email',
    'te': 'phone',
    'telephone': 'phone',
    'ph': 'phone',
    'phone': 'phone',
};


exports.promptUser = function promptUser(prmpt) {
    return exports.promptUserWithFile.call(this, "TEXT", prmpt);
};

function spawnClient(bin, args, results) {
    var page = this;

    page.tw_info("prompt", "Entering");

    this.then( function spawnStart() {
        page.tw_info("prompt", "Entering");
        var child = childp.spawn(bin, args);
        page.tw_info("prompt", "Spawned child.");

        child.stdout.on("data", function (data) {
            page.tw_info("prompt", "Received data: " + data.trim());
            if (results.out !== "")
                results.out += "\n";
            results.out += data.trim();
        });

        child.stderr.on("data", function (data) {
            page.tw_warn("prompt", "Received error: " + data.trim());
            if (results.err !== "")
                results.err += "\n";
            results.err += data.trim();
        });

        child.on("exit", function (code) {
            page.tw_info("prompt", "Prompt child exited with code " + code);
            results.complete = true;
            results.errno = code;
        });

    });

    this.waitFor(function isComplete() {
        //page.tw_info("prompt", "Waiting for prompt response...");
        return results.complete;
    }, undefined, function onTimeout() {
        page.tw_info("prompt", "Waiting for prompt timed out...");
        results.err.errno = 167;
    }, TIMEOUT);
}


// Either IMG or TXT for type
exports.decaptcha = function decaptcha(type, query, results) {
    if (results === undefined)
        results = {};
    results.complete = false;
    results.out = results.err = "";
    results.errno = 0;

    if (type == "IMG") {
        this.tw_info("prompt", "sending path " + query);
        query = fs.absolute(query);
    }

    var args = [type, query];

    spawnClient.call(this, PATH_TO_DECAPTCHA, args, results);
};

exports.promptUserWithFile = function promptUserWithFile(file, prmpt, results) {
    this.tw_info("prompt", "Entering", prmpt);

    if (results === undefined)
        results = {};
    results.out = results.err = "";
    results.errno = 0;
    results.complete = false;

    if (file !== null && file != "TEXT") {
        this.tw_info("prompt", "sending path " + file);
        file = fs.absolute(file);
    }

    var args = [(file !== null ? file : ''), prmpt];

    spawnClient.call(this, PATH_TO_PROMPT, args, results);
};

function firstSplit(str, sep) {
    return [str.split(sep, 1)[0], str.slice(str.indexOf(sep) + 1)];
}

function getPreset(presets, requiredSet, type) {
    if (type in requiredSet) {
        delete requiredSet[type];
    }
    return presets[type];
}

function getPresetChoice(choice, presets, requiredSet) {
    if (typeof(PRESET_MAP[choice]) !== "undefined") {
        preset = PRESET_MAP[choice];
        this.tw_debug("prompt", "Preset: " + preset);
        return getPreset.call(this, presets, requiredSet, preset);
    }

    // We can handle special cases in their own ways here
    switch (choice) {
        case "ca":
        case "captcha":
        case "capha":
            this.tw_debug("prompt", "Preset: Captcha");
            return "CAPTCHA";
        case "ch":
        case "check":
            this.tw_debug("prompt", "Preset: Check");
            return {method: "check"};
        case "ra":
        case "random":
            this.tw_debug("prompt", "Preset: Random");
            return {method: "random"};
        default:
            this.tw_debug("prompt", "Preset: Default");
            return null;
    }
}

function askAboutRetryable(field, presets, outfile, results, requiredSet) {
    //pgutils.announce(this, "askAboutRetryable", field.selector);
    this.tw_info("prompt", "Entering", field.selector);

    if (results === undefined)
        results = {};

    var promptResults = {};

    this.then(function askAboutRetryablePrompt() {
        this.tw_info("prompt", "Entering", outfile);
        identifier = field.selector;
        utils.dump(field);
        if (typeof(field.name) !== 'undefined') {
            identifier += "/" + field.name;
        }
        exports.promptUserWithFile.call(this, outfile, identifier + ": " +
            "(PRESET_CODE | [c]ustom TEXT | [i]gnore | [d]ie | [f]lush | " +
            "[r]elease) - " + this.getCurrentUrl(),
            promptResults);
    });

    this.then(function askAboutParse() {
        if (promptResults.errno) {
            this.tw_die(
                50, "prompt", "error", "Prompt command failed");
        }

        parts = firstSplit(promptResults.out, " ");
                                           //parts[1].toLowerCase(),

        results.out = getPresetChoice.call(this,
                                           promptResults.out,
                                           presets,
                                           requiredSet);
        if (results.out !== null) {
            this.tw_info("prompt", "Preset input chosen");
            return;
        }

        switch (parts[0].toLowerCase()) {
            case "c":
                this.tw_info("prompt", "Custom input: " + parts[1]);
                results.out = [parts[1]];
                break;
            case "i":
                this.tw_info("prompt", "Ignoring field");
                results.out = "IGNORE";
                break;
            case "d":
                this.tw_die(
                    53, "prompt", "info", "Instructed to die!");
                break;
            case "r":
                this.tw_die(
                    54, "prompt", "info", "Instructed to die and release!");
                break;
            case "q":
                this.tw_die(
                    56, "prompt", "info", "Instructed to die and requeue!");
                break;
            case "f":
                this.tw_info("prompt", "Flushing input");
                results.out = "CLEAR";
                break;
            default:
                this.tw_warn("prompt", "Got invalid response...");
                results.out = "ERROR";
        }

    });
    this.tw_info("prompt", "Leaving", field.selector);
}

function askRepeatedly(field, presets, results, requiredSet, count) {
    if (count === undefined) {
        this.then(function askInitial() {
            askAboutRetryable.call(
                this, field, presets, results.outfile, results, requiredSet);
        });
        count = 0;
    }
    //pgutils.announce(this, "askRepeatedly", field.selector + "/" + count);
    this.tw_info("prompt", "Entering", field.selector + "/" + count);

    this.then(function askLoop1() {
        //pgutils.announce(this, "askRepeatedly(execute)", field.selector + "/" + count);
        this.tw_info("prompt", "Entering", field.selector + "/" + count, "askRepeatedly(execute)");
        pgutils.setFrameTo(this, field.frame);
        if (count <= RETRY_MAX) {
            if (results.out == "ERROR") {
                this.then(function askLoopRetry() {
                    askAboutRetryable.call(
                        this, field, presets,
                        results.outfile, results, requiredSet);
                });
            }
            askRepeatedly.call(
                this, field, presets, results, requiredSet, ++count);
        }
        pgutils.resetFrame(this);
        //this.tw_info("prompt", "Leaving", field.selector + "/" + count);
        //TODO
        pgutils.leave(this, "askRepeatedly(execute)", field.selector + "/" + count);
    });
    pgutils.leave(this, "askRepeatedly", field.selector + "/" + count);
}

exports.decaptchaFillSelector = function decaptchaFillSelector (
        results, snap_selector, exact) {

    this.tw_info("prompt", "Entering", snap_selector);

    if (results === undefined)
        results = {};

    var decaptchaResults = {};

    this.then(function decaptchaPromptCall() {
        if (exact) {
            results.outfile = contsnap.snapTempContextExact(
                this, snap_selector);
        }
        else {
            results.outfile = contsnap.snapTempContext(
                this, snap_selector);
        }
        this.tw_info("prompt", "Generated " + results.outfile);
        exports.decaptcha.call(this, "IMG", results.outfile, decaptchaResults);
    });

    this.then(function askAboutParse() {
        if (decaptchaResults.errno) {
            this.tw_die(
                55, "prompt", "info", "Decaptcha command failed");
        }

        results.out = [decaptchaResults.out];
    });

    this.then(function decaptchaDeleteContext() {
        contsnap.deleteTempContext(this, results.outfile);
    });
};

exports.decaptchaFill = function decaptchaFill (field, results) {
    this.tw_info("prompt", "Entering", field.selector);

    if (results === undefined)
        results = {};

    var decaptchaResults = {};

    this.then(function askAboutOldBorder() {
        //pgutils.announce(this, "askAboutOldBorder", field.selector);
        this.tw_info("prompt", "Entering", field.selector);
        pgutils.resetFrame(this);
        pgutils.setFrameTo(this, field.frame);
        results.styles = this.evaluate( function(selector, styles) {
            var el = $jq(selector);
            var oldStyle = el.css(styles);
            el.css('border', '2px dotted red');
            el.css('background-color', '#faa');
            el.css('color', 'black');
            //console.log("THE OLD STYLE BE: " + oldStyle);
            return oldStyle;
        }, field.selector, REPLACED_STYLES);
        pgutils.resetFrame(this);
        pgutils.leave(this, "askAboutOldBorder", field.selector);
    });
    this.then(function decaptchaSnapContext() {
        //pgutils.announce(this, "decaptchaSnapContext", field.selector);
        this.tw_info("prompt", "Entering", field.selector);
        //pgutils.saveState(this, "prompt", false);
        //results.outfile = this.outdir + "/" + this.sitename + "-prompt.png";
        pgutils.setFrameTo(this, field.frame);
        results.outfile = contsnap.snapTempContext(this, field.selector);
        pgutils.resetFrame(this);
        this.tw_info("prompt", results.outfile);
        pgutils.leave(this, "decaptchaSnapContext", field.selector);
    });

    //askRepeatedly.call(this, field, presets, results);
    ///////////////////////////////////////////////////////////////////////
    this.then(function decaptchaAskAboutRetryablePrompt() {
        exports.decaptcha.call(this, "IMG", results.outfile, decaptchaResults);
    });

    this.then(function askAboutParse() {
        if (decaptchaResults.errno) {
            this.tw_die(
                55, "prompt", "info", "Decaptcha command failed");
        }

        results.out = [decaptchaResults.out];
    });
    // Set results.out = [res.out];
    ///////////////////////////////////////////////////////////////////////

    this.then( function () {
        pgutils.setFrameTo(this, field.frame);
        this.evaluate( function styleReset(selector, oldStyle) {
            var el = $jq(selector);
            console.log("Check 1");
            el.css('border', '');
            for (var i in oldStyle) {
                console.log("\t" + i + ": " + oldStyle[i]);
            }
            console.log("Check 2");
            el.css(oldStyle);
            console.log("Check 3");
        }, field.selector, results.styles);
        pgutils.resetFrame(this);
    });

    this.then(function decaptchaDeleteContext() {
        contsnap.deleteTempContext(this, results.outfile);
    });

    pgutils.leave(this, "decaptchaFill", field.selector);
};

exports.askAbout = function askAbout (field, presets, results, requiredSet) {
    //pgutils.announce(this, "askAbout", field.selector);
    this.tw_info("prompt", "Entering", field.selector);

    if (results === undefined)
        results = {};

    this.then(function askAboutOldBorder() {
        //pgutils.announce(this, "askAboutOldBorder", field.selector);
        this.tw_info("prompt", "Entering", field.selector);
        pgutils.resetFrame(this);
        pgutils.setFrameTo(this, field.frame);
        results.styles = this.evaluate( function(selector, styles) {
            var el = $jq(selector);
            var oldStyle = el.css(styles);
            el.css('border', '2px dotted red');
            el.css('background-color', '#faa');
            el.css('color', 'black');
            //console.log("THE OLD STYLE BE: " + oldStyle);
            return oldStyle;
        }, field.selector, REPLACED_STYLES);
        pgutils.resetFrame(this);
        pgutils.leave(this, "askAboutOldBorder", field.selector);
    });
    this.then(function askAboutSavePrompt() {
        this.tw_info("prompt", "Entering", field.selector);
        //pgutils.saveState(this, "prompt", false);
        //results.outfile = this.outdir + "/" + this.sitename + "-prompt.png";
        pgutils.setFrameTo(this, field.frame);
        results.outfile = contsnap.snapTempContext(this, field.selector);
        pgutils.resetFrame(this);
        pgutils.leave(this, "askAboutSavePrompt", field.selector);
    });

    // Don't remove this. You have to do it once. Because I'm a dumbass.
    /*this.then(function () {
        askAboutRetryable.call(this, field, presets, results, requiredSet);
    });*/

    // TODO - Does this need to be in its own this.then?
    askRepeatedly.call(this, field, presets, results, requiredSet);

    this.then( function () {
        pgutils.setFrameTo(this, field.frame);
        this.evaluate( function styleReset(selector, oldStyle) {
            var el = $jq(selector);
            console.log("Check 1");
            el.css('border', '');
            for (var i in oldStyle) {
                console.log("\t" + i + ": " + oldStyle[i]);
            }
            console.log("Check 2");
            el.css(oldStyle);
            console.log("Check 3");
        }, field.selector, results.styles);
        pgutils.resetFrame(this);
    });

    this.then(function askAboutSavePrompt() {
        this.tw_error("prompt", results.outfile);
        contsnap.deleteTempContext(this, results.outfile);
    });

    pgutils.leave(this, "askAbout", field.selector);
};

function getQuestion(options, question) {
    var response = question + "\n";
    for (var i = 0; i < options.length; ++i) {
        response += "\t[" + i + "] - " + options[i].text +
                    " (" + options[i].id + ")\n";
    }
    return response;
}

exports.choose = function (options, results) {
    var promptResults = {};
    var question = getQuestion(
            options, "Please select an option for " + this.twURL);

    this.then(function chooseSavePrompt() {
        pgutils.saveState(this, "prompt", false);
        outfile = this.outdir + "/" + this.sitename + "-prompt.png";
        exports.promptUserWithFile.call(this, outfile, question, promptResults);
    });

    this.then(function chooseGetChoice() {
        res = promptResults.out;
        if (res.errno) {
            this.tw_die(
                51, "prompt", "error", "Didn't receive choice from user");
        }

        var num = parseInt(res, 10);
        if (isNaN(num) || num > options.length) {
            this.tw_die(
                52, "prompt", "error",
                "User provided non-choice (" + res + ")");
        }

        results.out = options[num];
    });
};

