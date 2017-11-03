
/*
 * fillFields expects:
 *  - page    - casperjs object
 *  - fields  - array of selectors to form elements
 *  - patterns- array of regexes for potential names for the element(s)
 *  - values  - array of potential values for the element(s)
 *
 * */
var PREFILL_SLEEP_MS = 3200;

// FRAME SET STUFF
// var oldFrame = pgutils.setFrameTo(page, field.frame);
// pgutils.resetFrame(page);

function retryField(page, field, values, requiredSet) {
    results = [];
    var askResults = {};
    page.then(function() {
        pgutils.resetFrame(page);
        page.tw_info("ffill", "Querying user for " + field.selector +
                              " in " + field.frame);

        // Switch which line is commented to enable decaptcha instead. I THINK.
        //
        prompt.askAbout.call(page, field, values, askResults, requiredSet);
        //prompt.decaptchaFill.call(page, field, askResults);
    });

    page.then(function() {
        pgutils.resetFrame(page);
        var oldFrame = pgutils.setFrameTo(page, field.frame);

        var res = askResults.out;
        switch (res) {
            case "ERROR":
                page.tw_warn("ffill", "User returned invalid result!");
                field.success = false;
                break;
            case "IGNORE":
                field.success = true;
                break;
            case "CLEAR":
                field.success = tryPattern(page, field.selector, [""], null);
                break;
            default:
                field.success = tryPattern(page, field.selector, res, null);
        }

        pgutils.resetFrame(page);
    });
}

function field_is_captcha(selector, captcha_patterns) {
    // Skip over the bad ones.
    if (!this.exists(selector)) {
        page.tw_error(
            "ffill", "Selector " + selector + " disappeared. Ignoring.");
        return false;
    }
    var light_patterns = {captcha: captcha_patterns};
    var element_info = this.getElementInfo(selector);
    var applicable = findApplicablePatterns(this, element_info, light_patterns);
    return (applicable.length > 0);
}

/* fill_captcha
 *      Tries to fill the given field with a captcha taken from image_selector.
 *
 * Args:
 *      field - field object with .selector and .success to fill.
 *      img_selector - Selector of thing to try to decipher
 *      exact - boolean for whether or not we think this is THE image. If false,
 *              we will snapshot a region around it before trying to solve.
 * */
function fill_captcha(field, img_selector, exact) {
    var results = {};
    // fields have selectors
    prompt.decaptchaFillSelector.call(this, results, img_selector, exact);

    this.then(function() {
        var res = results.out;
        field.success = tryPattern(this, field.selector, res, null);
    });
}

exports.fill_captchas = function fill_captchas(page, form, patterns) {
    page.tw_info("ffill", "Entering");

    function cliGetCaptchaImgWrap(selector) {
        return findNearbyCaptchaImgSelector(selector);
    }

    for (var i = 0; i < form.elements.length; ++i) {
        var field = form.elements[i];

        if (field.success === true)
            continue;

        if (!field_is_captcha.call(page, field.selector, patterns.captcha))
            continue;

        page.tw_info("ffill", "Trying to fill \"" +
                     getName(page, field.selector) +
                     "\" (" + field.frame + ") as captcha");

        var img_selector = page.evaluate(
            cliGetCaptchaImgWrap, field.selector);

        if (!img_selector) {
            page.tw_warn(
                "ffill", "Found captcha input but no image. Trying context.");
            fill_captcha.call(page, field, field.selector, false);
            return;
        }

        fill_captcha.call(page, field, img_selector, true);
    }
};

exports.fillEmptyFields = function fillEmptyFields(
        page, form, patterns, values, requiredSet) {

    // Assuming that all fields are in the same frame.
    pgutils.resetFrame(page);
    pgutils.setFrameTo(page, form.frame);
    for (var i = 0; i < form.elements.length; ++i) {
        if (getVal(page, form.elements[i].selector) === "")
            form.elements[i].success = false;
    }
    exports.fillFields(page, form, patterns, values, requiredSet);

    pgutils.resetFrame(page);
};


exports.fillFields = function fillFields(
        page, form, patterns, values, requiredSet) {
    page.tw_info("ffill", "Entering");

    page.wait(PREFILL_SLEEP_MS);
    page.then(function () {
        pgutils.resetFrame(page);
        pgutils.setFrameTo(page, form.frame);
        for (var i = 0; i < form.elements.length; ++i) {
            var field = form.elements[i];

            if (field.success === true)
                continue;

            page.tw_info("ffill", "Trying to fill \"" +
                       getName(page, field.selector) +
                       "\" (" + field.frame + ")");

            field.success = fillField(
                page, form.elements[i], patterns, values, requiredSet);
        }

        for (var fieldIndx = 0; fieldIndx < form.elements.length; ++fieldIndx) {
            var pfield = form.elements[fieldIndx];

            page.tw_log("ffill", (pfield.success ? "debug" : "info"),
                        "Pre-human value for " +
                         page.getElementAttribute(pfield.selector, 'name') +
                         "/"+ pfield.selector + ": " +
                         getVal(page, pfield.selector) + " " +
                         (pfield.success ? "(SET)" : "(FAIL)"));

        }
        pgutils.resetFrame(page);
    });
};

exports.userRepairResults = function userRepairResults(
        page, form, values, requiredSet) {

    page.then(function () {
        for (var fieldIndx = 0; fieldIndx < form.elements.length; ++fieldIndx) {
            var field = form.elements[fieldIndx];
            if (!field.success) {
                page.tw_info("ffill", "Trying " + field.selector);
                retryField(page, field, values, requiredSet);
            }
        }
        /*for (var fieldIndx = 0; fieldIndx < form.elements.length; ++fieldIndx) {
            var field = form.elements[fieldIndx];
            if (!field.success) {
                retryField(page, field, values, requiredSet);
            }
        }*/
    });

    /*page.then(function () {
        for (var fieldIndx = 0; fieldIndx < form.elements.length; ++fieldIndx) {
            var field = form.elements[fieldIndx];
            var oldFrame = pgutils.setFrameTo(page, field.frame);
            page.echo("=== Final Value for " +
                        page.getElementAttribute(field.selector, 'name') +
                        "/"+ field + ": " + getVal(page, field.selector) + " " +
                        (field.success ? "(SET)" : "(FAIL)"),
                        (field.success ? "INFO" : "WARNING"));
            pgutils.resetFrame(page);
        }
    });*/
};

function getName(page, selector) {
    if (selector === undefined)
        return "UNDEFINED_SELECTOR";
    if (!page.exists(selector))
        return "MISSING_ELEMENT";
    if (page.getElementInfo(selector) === undefined)
        return "UNDEFINED_ELEMENT_INFO";
    if (page.getElementInfo(selector).attributes === undefined)
        return "UNDEFINED_ELEMENT_ATTRIBUTES";
    if (page.getElementInfo(selector).attributes.name === undefined)
        return "UNDEFINED_ELEMENT_NAME";
    return page.getElementInfo(selector).attributes.name;
}

function getLabelText(page, name, id) {
    return page.evaluate(function getLabelTextClient(name, id) {
        if (id !== undefined) {
            var labels = $jq("label[for='" + id + "']");
            if (labels.length > 0)
                return labels.first().text();
        }

        var labels2 = $jq("label[for='" + name + "']");
        if (labels2.length > 0)
            return labels2.first().text();

        return "";
    }, name, id);
}

function getAttrList(page, selector) {
    var elInfo = page.getElementInfo(selector);
    var attrs = elInfo.attributes;

    /*
    var BAD_ATTRIBUTES = ["accept", "align", "autocomplete", "autofocus", "checked", "disabled",
     "form", "formaction", "formenctype", "formmethod", "formnovalidate",
     "formtarget", "height", "list", "max", "maxlength", "min", "multiple", "pattern",
     "placeholder", "readonly", "required", "size", "step", "type", "width",];
    var goodAttrs = [];

    for (var attr in attrs) {
        if (!(attr in BAD_ATTRIBUTES))
            goodAttrs[attr] = attrs[attr];
    }
    */
    // TODO
}

function cliGetNearbyText(selector) {

    // Max and minimum string lengths for the text surrounding a field in order
    // to be considered a possibly valid label.
    //
    // (these must be here as this function runs in the page context)
    var MAX_NEARBY_LENGTH = 26;  // == "E-mail address (required):".length
    var MIN_NEARBY_LENGTH = 3;   // == from my butt

    var jq = findJQ();

    var current = jq(selector);
    var current_text = jq.trim(current.text());

    while (current_text.length < MIN_NEARBY_LENGTH) {
        current = current.parent();
        current_text = jq.trim(current.text());
    }

    if (current_text.length > MAX_NEARBY_LENGTH) {
        return "";
    }
    return current_text;
}

/* findApplicablePatterns:
 *  Iterates through all of the patterns for all of the field types and compares
 *  those patterns against the applicable attributes and properties of the
 *  element.
 *
 * Args:
 *  - page: casper page object
 *  - elInfo: the element to inspect, as returned by page.getElementInfo()
 *  - patterns: the (static) list of patterns stored in expressions.js
 *
 * Returns:
 *  A list of objects, each with 'patternType' (e.g. 'username') and the matched
 *  'pattern' object as attributes.
 *
 * */
function findApplicablePatterns(page, elInfo, patterns) {
    // Collect all of the potential fields/attributes that the patterns can
    // check against.
    var fields      = {};
    fields.id           = elInfo.attributes.id;
    fields.name         = elInfo.attributes.name;
    fields.value        = elInfo.attributes.value;
    fields.type         = elInfo.attributes.type;
    fields.tag          = elInfo.nodeName;
    fields.label        = getLabelText(page, fields.name, fields.id);
    fields.placeholder  = elInfo.attributes.placeholder;
    fields.near_text    = page.evaluate(cliGetNearbyText, "#" + fields.id);

    // This is a 'set' of all that we know how to find.
    var full_set = {id: true, name: true, value: true, type: true,
                    tag: true, label: true, placeholder: true, near_text: true};

    page.tw_info("ffill", "Entering", fields.name + "/" + fields.id);

    var results = [];

    // Check against every pattern type (username, email, etc) in the set.
    for (var patternType in patterns) {
        //page.tw_debug("ffill", "Checking for " + patternType);

        // Check against every pattern in the pattern type
        for (var j in patterns[patternType]) {
            var pattern = patterns[patternType][j];

            // Check which attributes we're suppose to check this pattern
            // against.
            //
            // We start out with the possibility of "all". Note that "all"
            // doesn't mean "all"; it means all except type and tag.
            //
            // If we're given all, then we can replace list of attributes with
            // the actual 'all' list we're going to use.
            if (pattern.attr === "all")
                pattern.attr = [
                    "id", "name", "value", "label", "placeholder", "near_text"];

            // If we didn't receive an array of attribute types, then let's
            // convert what we were given to an array of length 1.
            if (!utils.isArray(pattern.attr))
                pattern.attr = [pattern.attr];

            // Now we can iterate over each of these attribute types.
            for (var attrI in pattern.attr) {
                var patternSuccess = false;

                // If the specified attribute field is in our accepted set, and
                // was defined for the input in question, test it against the
                // pattern's regex and make note of its success.
                if (fields[pattern.attr[attrI]] !== undefined) {
                    patternSuccess = pattern.val.test(
                        fields[pattern.attr[attrI]]);
                }
                else if (full_set[pattern.attr[attrI]] !== undefined) {
                    // In this case, they gave us a valid attribute type, but it
                    // wasn't set for this input field. We need not do anything
                    // in this case.
                }
                else {
                    // They must have given us an attribute type that we don't
                    // understand or collect (or isn't real).
                    page.tw_warn("ffill", "Unknown attribute type " +
                                          pattern.attr[attrI]);
                }

                // If we managed to find a match, add it to the list of
                // successful patterns.
                if (patternSuccess) {
                    page.tw_info(
                        "ffill", "Found " + patternType + " on " +
                        pattern.attr[attrI] + " with " + pattern.val);
                    results.push({type: patternType, pattern: pattern});
                }
            }
        }
    }
    return results;
}

function handleCheckbox(page, elInfo, selector, spec) {
    page.tw_info("ffill", "Entering", elInfo.attributes.name);

    if (typeof(spec.method) == 'undefined') {
        page.tw_warn("ffill",
                     "No method specified for checkbox handling. Ignoring");
        return false;
    }

    switch(spec.method) {
        case "click":
            page.click(selector);
            return true;
        case "check":
            if (!page.evaluate(function(elem) {
                return $jq( elem ).prop( "checked" );
            }, selector))
                page.click(selector);
            return true;
        case "uncheck":
            if (page.evaluate(function(elem) {
                return $jq( elem ).prop( "checked" );
            }, selector))
                page.click(selector);
            return true;
        case "random":
            if (Math.random() > 0.5)
                page.click(selector);
            return true;
        default:
            page.tw_error("ffill", "Unknown method " + spec.method);
            return false;
    }
}

function handleRadio(page, elInfo, selector, spec) {
    var elName  = elInfo.attributes.name;
    var elValue = elInfo.attributes.value;
    var elId    = elInfo.attributes.id;
    var elLabel = getLabelText(page, elId);

    page.tw_info("ffill", "Entering", elName);

    if (this.radioCount === undefined)
        this.radioCount = {};
    if (this.radioCount[elName] === undefined)
        this.radioCount[elName] = -1;

    if (this.radioChecked === undefined)
        this.radioChecked = {};
    if (this.radioChecked[elName] === undefined)
        this.radioChecked[elName] = false;

    if (this.radioChecked[elName])
        return true;

    if (spec.method === undefined) { // Assume we want to set by value.
        page.tw_info("ffill", "Selected byValue: " +
                     elValue + "/" + elId + "/" + elLabel);

        for (var i in spec) {
            searchValue = spec[i];

            var pattern = new RegExp(searchValue, "i");
            page.tw_info("ffill", "Searching for " + searchValue);
            if (    pattern.test(elValue)   ||
                    pattern.test(elId)      ||
                    pattern.test(elLabel)   ) {
                page.tw_info("ffill", "Found " +
                      searchValue + "/" +
                      elValue + "/" +
                      elId + "/" +
                      elLabel);
                this.radioChecked[elName] = true;
                page.click(selector);
                return true;
            }
        }
        return false;
    }
    else {
        ++this.radioCount[elName];
        switch(spec.method) {
            case "first":
                page.tw_info("ffill", "Selected first");
                if (this.radioCount[elName] === 0)
                    page.click(selector);
                return true;
            case "nth":
                page.tw_info("ffill", "Selected nth");
                if (spec.nth === undefined) {
                    page.tw_error("ffill", "Unspecified nth");
                    return false;
                }

                if (this.radioCount[elName] === spec.nth)
                    page.click(selector);
                return true;
            case "random":
                page.tw_info("ffill", "Selected random");
                if (this.radioCount[elName] === 0) {
                    var numRadio = page.evaluate(function(name) {
                        return $jq("input[name=" + name + "]").length;
                    }, elName);

                    if (this.radioChoice === undefined)
                        this.radioChoice = {};
                    var choice = Math.floor(Math.random() * numRadio);
                    this.radioChoice[elName] = choice;

                    page.tw_info("ffill", "Chose " + choice);
                }

                if (this.radioCount[elName] === this.radioChoice[elName]) {
                    page.tw_info("ffill", "Found pattern " +
                              this.radioChoice[elName]);
                    page.click(selector);
                }
                return true;
            default:
                page.tw_info("ffill", "Unknown method " + spec.method);
                return false;
        }
    }
}

function handleSelect(page, elInfo, selector, spec, tType) {
    var elName = elInfo.attributes.name;

    page.tw_info("ffill", "Entering", elName + "/" + tType);

    if (tType !== "selects") { // Not generic
        page.tw_info("ffill", "Non generic");
        return page.evaluate(function fillSelect(selector, spec) {
            return changeSelectTo(selector, spec);
        }, selector, spec);
    }

    page.tw_info("ffill", "Generic");
    switch(spec.method) {
        case "first":
            page.tw_debug("ffill", "Selected first");

            return page.evaluate(function fillSelect(selector) {
                return changeSelectToNth(selector, 1);
            }, selector);

        case "nth":
            page.tw_debug("ffill", "Selected nth");

            return page.evaluate(function fillSelect(selector, n) {
                return changeSelectToNth(selector, n);
            }, selector, spec.nth);

        case "random":
            page.tw_debug("ffill", "Selected random");

            var numOptions = page.evaluate(function cliSelRandLenGet(selector) {
                return $jq(selector + " option").length;
            }, selector);

            // Ignore the default choice.
            var choice = Math.floor(Math.random() * numOptions - 1) + 1;

            return page.evaluate(function fillSelect(selector, n) {
                return changeSelectToNth(selector, n);
            }, selector, choice);

        default:
            page.tw_error("ffill", "Unknown method " + spec.method);
    }
    return false;
}

function getVal(page, selector) {
    var val = page.evaluate(function cliGetVal(selector) {
        return $jq(selector).val();
    }, selector);
    return val;
}

function validateValue(page, selector, values, index) {
    if (index < 0 || index >= values.length)
        return false;
    return values[index] === getVal(page, selector);
}

function handleTextInput(page, elInfo, selector, values) {
    page.tw_info("ffill", "Entering", elInfo.attributes.name);
    //var current = -1;

    function cliHandleTextInputClearVal(selector) {
        $jq(selector).val("");
    }

    var current;
    for (   current = 0;
            current < values.length &&
                !validateValue(page, selector, values, current - 1);
            ++current) {

        page.tw_info("ffill", "Trying to set val to " + values[current]);
        page.evaluate(cliHandleTextInputClearVal, selector);
        page.tw_debug("ffill", "\tCleared value");
        page.click(selector);
        page.tw_debug("ffill", "\tClicked");
        page.sendKeys(selector, values[current]);
        page.tw_debug("ffill", "\tTyped");
    }

    page.tw_debug("ffill", "Current Value: \"" +
            getVal(page, selector) + "\"");
    page.tw_debug("ffill", "Desired Value: \"" +
            (current < 1 || current > values.length ?
                "N/A" : values[current - 1]) + "\"");
    if ( validateValue(page, selector, values, current - 1) )
        return true;
    return false;
}

function handleInputTag(page, elInfo, selector, values) {
    page.tw_info("ffill", "Entering", elInfo.attributes.name);

    var elType = (elInfo.attributes.type !== undefined ?
            elInfo.attributes.type.toLowerCase() : undefined);

    if (values === undefined) {
        page.tw_warn("ffill", "Can't fill input tag with undefined values!");
        return false;
    }

    switch (elType) {
        case "hidden":
            page.tw_debug("ffill", "Ignoring hidden input field");
            return true;
        case "checkbox":
            page.tw_debug("ffill", "Found checkbox");
            return handleCheckbox(page, elInfo, selector, values);
        case "radio":
            page.tw_debug("ffill", "Found radio button");
            return handleRadio(page, elInfo, selector, values);
        case "submit":
        case "reset":
        case "button":
        case "image":
            page.tw_debug("ffill", "Trivially satisfied on buttons");
            return true;
        case "text":
        case "password":
        case "date":
        case "datetime":
        case "email":
        case "month":
        case "number":
        case "tel":
        case "time":
        case "url":
        case "week":
        case undefined:
            page.tw_debug("ffill", "Found possible textbox");
            return handleTextInput(page, elInfo, selector, values);
        default:
            page.tw_warn(
                "ffill",
                "NO HANDLER FOR " + elType +
                "! Falling back on handleTextInput");
            return handleTextInput(page, elInfo, selector, values);
    }
    return false;
}

function tryPattern(page, selector, value, tType) {
    if (!page.exists(selector)) {
        page.tw_error("ffill",
                   selector + " disappeared! - Can't set to value." +
                   " Trying to ignore.");
        return false;
    }
    var elInfo = page.getElementInfo(selector);
    var type = (elInfo.nodeName !== undefined ?
            elInfo.nodeName.toLowerCase() : undefined);
    var elName = elInfo.attributes.name;
    var elType = elInfo.attributes.type;
    var elID = elInfo.attributes.id;

    page.tw_info("ffill", "Entering", elName + "/" + value);
    page.tw_debug("ffill", "s: " + selector +
                "\tv: " + value + "\ttT: " + tType);

    switch (type) {
        case "input":
        case "password":
            page.tw_debug("ffill", "input/password tag");
            return handleInputTag(page, elInfo, selector, value);
        case "select":
            page.tw_debug("ffill", "select tag");
            return handleSelect(page, elInfo, selector, value, tType);
        default:
            page.tw_warn("ffill", "NO HANDLER FOR " + type);
            return false;
    }
}

function tryPatterns(page, field, patterns, values, requiredSet) {
    var elInfo = page.getElementInfo(field.selector);
    var type = elInfo.nodeName;
    var elName = elInfo.attributes.name;
    var elType = elInfo.attributes.type;
    var elID = elInfo.attributes.id;

    page.tw_info("ffill", "Entering", elName);

    //utils.dump(patterns);

    if (type == "button" ||
       (type == "input" && (elType == "submit" || elType == "reset"))) {
        page.tw_info("ffill", field.selector + " trivial (button)");
        return true;
    }
    else if (patterns.length === 0) {
        page.tw_warn("ffill", "No idea how to fill field " + elID);
        return false;
    }

    // Sort the patterns so we try our favorite first
    patterns.sort(function patternSort(lhs, rhs) {
        if (lhs.pattern.weight === undefined)
            lhs.pattern.weight = 0;
        if (rhs.pattern.weight === undefined)
            rhs.pattern.weight = 0;
        return rhs.pattern.weight - lhs.pattern.weight;
    });

    //utils.dump(patterns);

    for (var i = 0; i < patterns.length; ++i) {
        var tType = patterns[i].type;
        var required = patterns[i].pattern.die_on_fail;

        if (typeof (values[tType]) == "undefined") {
            page.tw_warn("ffill", "No values defined for " + tType);
            continue;
        }

        if (tryPattern(page, field.selector, values[tType], tType)) {
            page.tw_info("ffill", "Success in setting value");

            if (tType in requiredSet) {
                delete requiredSet[tType];
            }
            return true;
        }

        // If that pattern was marked as a do-or-die pattern, die.
        if (required !== undefined && required) {
            //page.tw_die(
            //    80, "ffill", "error",
            //    "DYING ON REQUIRED INFO FAILURE: " + elName + "/" + elID);
            page.tw_error(
                "ffill", "Required pattern failed. Failing on field: " +
                    elName + "/" + elID);
            break;
        }
    }

    page.tw_warn("ffill", "Unable to set value for " +
                                  elName + "/" + elID);
    return false;
}

function fillField(page, field, patterns, values, requiredSet) {
    if (!page.exists(field.selector)) {
        page.tw_error("ffill", field.selector +
                   " disappeared! - Can't fill field. Trying to ignore.");
        return false;
    }
    var elInfo = page.getElementInfo(field.selector);
    var elName = elInfo.attributes.name;
    var elID   = elInfo.attributes.id;

    page.tw_info("ffill", "Entering", elName + "/" + elID);

    var specificPatterns = findApplicablePatterns(page, elInfo, patterns);

    if (specificPatterns === undefined)
        return false;

    if (tryPatterns(page, field, specificPatterns, values, requiredSet))
        return true;

    return false;
}

