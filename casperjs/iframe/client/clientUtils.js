
CAPTCHA_PATTERNS = [
        /captcha/i,
        /turing/i,
        /human/i,
        /security/i,
        /code/i,
    ];

CAPTCHA_MIN_HEIGHT = 25;
CAPTCHA_MIN_WIDTH = 50;

CAPTCHA_MAX_HEIGHT = 150;
CAPTCHA_MAX_WIDTH = 400;

// Given a selector, it tries to find a nearby image that is probably a captcha.
// It does that by DOM traversal. It returns a selector to the image.
function findNearbyCaptchaImgSelector(selector) {
    var images;

    //var jq = findJQ();
    var jq = $jq;

    if (jq("img#recaptcha_challenge_image").length == 1) {
        console.log("Found recaptcha. Aborting early and using that. Hooray!");
        console.log("NOT REALLY. Temporarily disabled.");
        //return "img#recaptcha_challenge_image";
    }

    var current = jq(selector);

    function image_filter(index) {
        console.log("Trying to evaluate index " + index);
        var i, j;

        var jq_element = jq(this);
        var check_values = [
            jq_element.attr('id'),
            jq_element.attr('name'),
            jq_element.attr('alt'),
            jq_element.attr('class')];

        var descriptor = check_values[0];
        for (i = 1; i < check_values.length; ++i) {
            descriptor += ', ' + check_values[i];
        }

        // Rule out those that are out of size bounds.
        var width = jq_element.width();
        var height = jq_element.height();
        if (width < CAPTCHA_MIN_WIDTH || width > CAPTCHA_MAX_WIDTH ||
            height < CAPTCHA_MIN_HEIGHT || height > CAPTCHA_MAX_HEIGHT) {
            console.log("Ignoring image for size issues " + descriptor);

            return false;
        }

        // Rule out those that don't match any of our acceptable regexes.
        console.log("Considering image " + descriptor);

        var found_match = false;
        for (i = 0; i < check_values.length; ++i) {
            console.log(" Evaluating part " + check_values[i]);
            for (j = 0; j < CAPTCHA_PATTERNS.length; ++j) {
                console.log("  Evaluating pattern " + CAPTCHA_PATTERNS[j]);
                if (CAPTCHA_PATTERNS[j].test(check_values[i])) {
                    found_match = true;
                    console.log(" - Found match on " + CAPTCHA_PATTERNS[j]);
                    return true;
                }
            }
        }

        return false;
    }

    while (current.length) {
        images = current.find("img").filter(image_filter);

        if (images.length === 0) {
            console.log("Found no images. What the fuck.");
        }

        // If we found one image that matches, thank goodness. Return a selector
        // for it.
        if (images.length == 1) {
            console.log("Found only one image -- " + images.attr("id"));
            addIDIfNeeded(images[0]);
            return "img#" + images.attr("id");
        }

        // If we have more than one, for now just abort. We don't have a great
        // way of choosing which one is best.
        if (images.length >= 1) {
            console.log("Found lots of images. Aborting...");
            break;
        }

        // We must not have found any images, so we go up.
        current = current.parent();
    }
    console.log("Never found a captcha image... returning null.");
    return null;
}


function depickleRegex(str) {
    var pat = /^\/(.*)\/(.*)$/;
    var parts = pat.exec(str);
    return new RegExp(parts[1], parts[2]);
}

/**
 * Function : dump()
 * Arguments: The data - array,hash(associative array),object
 *    The level - OPTIONAL
 * Returns  : The textual representation of the array.
 * This function was inspired by the print_r function of PHP.
 * This will accept some data as the argument and return a
 * text that will be a more readable version of the
 * array/hash/object that is given.
 * Docs: http://www.openjs.com/scripts/others/dump_function_php_print_r.php
 */
function dump(arr,level) {
    var dumped_text = "";
    if(!level) level = 0;

    //The padding given at the beginning of the line.
    var level_padding = "";
    for(var j=0;j<level+1;j++) level_padding += "    ";

    if(typeof(arr) == 'object') { //Array/Hashes/Objects
        for(var item in arr) {
            var value = arr[item];

            if(typeof(value) == 'object') { //If it is an array,
                dumped_text += level_padding + "'" + item + "' ...\n";
                dumped_text += dump(value,level+1);
            } else {
                dumped_text += level_padding + "'" + item + "' => \"" + value + "\"\n";
            }
        }
    } else { //Stings/Chars/Numbers etc.
        dumped_text = "===>"+arr+"<===("+typeof(arr)+")";
    }
    return dumped_text;
}

function getFormElements(formselector) {
    return $jq(formselector + " input[type!='hidden'], select, textarea");
}

function tryWrap(f, args) {
    try {
        return f.apply(this, args);
    }
    catch(err) {
        console.log("Logged " + err + " on a wrapped function call");
    }
    return undefined;
}

function getGoodFormElements(formselector) {
    var start = $jq(formselector + " input[type!='hidden'], select, textarea");
    start = start.not("input[type='submit']");
    start = start.not(":button");
    start = start.filter(":visible");
    return start;
}

function changeSelectToNth(selector, n) {
    var select = $jq(selector);
    tryWrap.call(this, select.trigger, ["focus"]);
    tryWrap.call(this, select.trigger, ["click"]);

    var options = $jq(selector + " option");

    var chosenOption = options.slice(n - 1, n);

    tryWrap.call(this, chosenOption.trigger, ["click"]);
    tryWrap.call(this, chosenOption.prop, ["selected", "true"]);

    tryWrap.call(this, select.trigger, ["change"]);
    tryWrap.call(this, select.trigger, ["blur"]);

    return true;
}

function changeSelectTo(selector, targets) {
    var select = $jq(selector);
    var success = false;
    tryWrap.call(this, select.trigger, ["focus"]);
    tryWrap.call(this, select.trigger, ["click"]);

    var options = $jq(selector + " option");
    //console.log("Length: " + options.length);
    for (var i = 0; i < targets.length; ++i) {
        console.log("\tchangeSelectTo Considering " + targets[i]);

        //var subOptions = options.filter("[name*='" + targets[i] + "'], " +
        //                                "[value*='" + targets[i] + "'], " +
        //                                ":iTextContains(" + targets[i] + ")");
        var subOptions = options.filter(":iAttrContains('name', '" +
                                            targets[i] + "'), " +
                                        ":iAttrContains('value', '" +
                                            targets[i] + "'), " +
                                        ":iTextContains(" + targets[i] + ")");

        if (subOptions.length !== 0) {
            var chosenOption = subOptions.first();

            tryWrap.call(this, chosenOption.trigger, ["click"]);
            //chosenOption.prop("selected", "true");
            tryWrap.call(this, select.val, [chosenOption.val()]);

            console.log("\t\tFound one");
            success = true;
            break;
        }
    }
    tryWrap.call(this, select.trigger, ["change"]);
    tryWrap.call(this, select.trigger, ["blur"]);

    // TODO - Return false on failure.
    return success;
}

function makeID() {
    var text = "";
    var LENGTH = 10;
    var options = "abcdefghijklmnopqrstuvwxyz";

    for( var i=0; i < LENGTH; i++ )
        text += options.charAt(Math.floor(Math.random() * options.length));

    return text;
}

function addIDIfNeeded(element) {
    var oid = $jq(element).attr("id");
    if (oid === undefined || oid.trim() === "") {
        newID = makeID();
        $jq(element).attr("id", newID);
        return newID;
    }
    return $jq(element).attr("id");
}

function findJQ() {
    var jq;
    if (typeof $jq !== "undefined") {
        console.log("Found $jq");
        jq = $jq;
    }
    else if (typeof twJQ !== "undefined") {
        console.log("Found twJQ (no $jq)");
        jq = twJQ;
    }
    else if (typeof $ !== "undefined") {
        console.log("Found $ (no $jq)");
        jq = $;
    }
    else if (typeof jQuery !== "undefined") {
        console.log("Found jQuery (no $jq or $)");
        jq = jQuery;
    }
    else {
        console.log("ERROR: NO JQUERY FOUND");
        return undefined;
    }
    return jq;
}

function getElementInfo(selector) {
    console.log("ERROR: My version of getElementInfo not yet implemented");
}
