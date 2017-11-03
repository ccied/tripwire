//exprs = require("./expressions");

var POST_SUBMIT_SLEEP_MS = 3800;
var PRE_SUBMIT_SLEEP_MS = 3100;

var ERROR_KEYWORDS = [];
ERROR_KEYWORDS.push(/warning/ig);
ERROR_KEYWORDS.push(/error/ig);
ERROR_KEYWORDS.push(/invalid/ig);

var COMEON_KEYWORDS = [];
COMEON_KEYWORDS.push(/regist/ig);
COMEON_KEYWORDS.push(/sign.*in/ig);
COMEON_KEYWORDS.push(/sign.*up/ig);

function client_get_existing_options(candidate_selectors) {
    var good_options = [];
    var jq = findJQ();
    for (i = 0; i < candidate_selectors.length; ++i) {
        //console.log("Considering selector " + candidate_selectors[i]);
        if (jq(candidate_selectors[i]).length > 0) {
            new_selector = "#" + addIDIfNeeded(candidate_selectors[i]);
            console.log(
                "Found selector " + candidate_selectors[i] +
                " labeled " + new_selector);
            good_options.push({
                selector: new_selector,
                type: "natural",
                found_from: candidate_selectors[i]});
        }
    }
    return good_options;
}

function client_get_clickable_options(candidate_selectors) {
    var item, dom_item, i;

    var good_options = [];
    var jq = findJQ();

    for (i = 0; i < candidate_selectors.length; ++i) {
        console.log("Considering selector " + candidate_selectors[i]);
        item = jq(candidate_selectors[i]);

        if (item.length === 0)
            continue;

        dom_item = item.get(0);

        if (    dom_item.onclick ||
                dom_item.onmouseup ||
                dom_item.onmousedown ) {

            new_selector = "#" + addIDIfNeeded(candidate_selectors[i]);

            console.log(
                "Found selector " + candidate_selectors[i] +
                " labeled " + new_selector);

            good_options.push({
                selector: new_selector,
                type: "handler",
                found_from: candidate_selectors[i]});
        }
    }

    return good_options;
}


function get_submit_button_options(form_selector) {
    var i;
    var selector_candidates;
    var options = [];

    // If we see one of these selectors, they're definitely clickable, so we can
    // append them to the list. They're also the most likely, so they get added
    // first.
    selector_candidates = [
        // Prefer firstmost the submits that have appropriate text.
        form_selector + " input[type=submit]:iAttrContains(value, 'sign.*up')",
        form_selector + " input[type=submit]:iAttrContains(value, 'regist')",
        form_selector + " input[type=submit]:iAttrContains(value, 'create')",
        form_selector + " input[type=submit]:iAttrContains(value, 'submit')",

        form_selector + " input[type=submit]",
        form_selector + " button[type=submit]",

        form_selector + " input[type=button]:iAttrContains(value, 'sign.*up')",
        form_selector + " input[type=button]:iAttrContains(value, 'regist')",
        form_selector + " input[type=button]:iAttrContains(value, 'create')",
        form_selector + " input[type=button]:iAttrContains(value, 'submit')",

        form_selector + " input[type=image]:iAttrContains(alt, 'sign.*up')",
        form_selector + " input[type=image]:iAttrContains(alt, 'regist')",
        form_selector + " input[type=image]:iAttrContains(alt, 'create')",
        form_selector + " input[type=image]:iAttrContains(alt, 'submit')",

        // This one may or may not be a great idea...
        form_selector + " input:iAttrContains(name, 'submit')",

        form_selector + " a:iTextContainsAlt('register')",
        form_selector + " a:iTextContainsAlt('sign.*up')",
        form_selector + " a:iTextContainsAlt('create')",
        form_selector + " a:iTextContainsAlt('submit')",
    ];
    options = this.evaluate(client_get_existing_options, selector_candidates);

    // These are also solid options, but they must have click handlers before we
    // are willing to click on them.
    selector_candidates = [
        form_selector + " button:not([type=reset])",
        form_selector + " :iTextContains('register')",
        form_selector + " :iTextContains('sign.*up')",
        form_selector + " :iTextContains('create')",
        form_selector + " :iTextContains('submit')",
        form_selector + " :iAttrContains(alt, 'sign.*up')",
        form_selector + " :iAttrContains(alt, 'register')",
        form_selector + " :iAttrContains(alt, 'create')",
        form_selector + " :iAttrContains(alt, 'submit')",
        form_selector + " input[type=image]",
    ];

    options = options.concat(
        this.evaluate(client_get_clickable_options, selector_candidates));

    return options;
}

function countKeywords(page, patterns) {
    var pagetext = page.page.plainText;
    var sum = 0;
    for (var keyI = 0; keyI < patterns.length; ++keyI) {
        match = pagetext.match(patterns[keyI]);
        //match = ERROR_KEYWORDS[keyI].match(pagetext);
        if ( match !== null ) {
            sum += match.length;
        }
    }
    return sum;
}

exports.submit_form = function submit_form(page) {
    var preURL = "";
    var preCountErrors = 0;
    var preCountComeons = 0;

    var submitOptions = [];

    // Let's just snooze a bit first, eh?
    page.wait(PRE_SUBMIT_SLEEP_MS);

    page.then(function scPresave() {
        // Save off URL for checking later
        preURL = page.getCurrentUrl();
        preCountErrors = countKeywords(page, ERROR_KEYWORDS);
        preCountComeons = countKeywords(page, COMEON_KEYWORDS);
    });

    page.then(function scSubmit() {
        // Actual submission
        //

        var form_selector = page.tw.regForm.selector;

        submitOptions = get_submit_button_options.call(page, form_selector);

        pgutils.saveState(this, "onsubmit");

        page.tw_info("sc", "Found " +
                            submitOptions.length +
                            " submission candidates.");
        utils.dump(submitOptions);

        // TODO - use multiple options if the first one fails?
        if (submitOptions.length > 0) {
            var submitOption = submitOptions.shift();
            // If at least one click candidate existed, try clicking it.
            page.tw_info(
                "sc",
                "Goin' with " + submitOption.selector + " from " +
                    submitOption.found_from);

            page.click(submitOption.selector);
        }
        else {
            // Otherwise, fall-back on submitting the form the old-fashioned
            // way.
            page.tw_info("sc", "Falling back on old-style submission.");
            page.fill(page.tw.regForm.selector, {}, true);
        }
    });

    // Let's really be sure this page has loaded...
    page.wait(POST_SUBMIT_SLEEP_MS);

    page.then(function reClick() {
        // If we still have a reg form, why not try again?
        if (    page.exists(page.tw.regForm.selector) ) {
            page.tw_warn("sc", "Registration form still exists.");

            pgutils.saveState(this, "resubmit");
            if (    submitOptions.length > 0 &&
                    page.exists(submitOptions[0].selector)) {

                var submitOption = submitOptions.shift();
                page.tw_info(
                    "sc",
                    "Trying again with " + submitOption.selector + " from " +
                        submitOption.found_from);
                page.click(submitOption.selector);
            }
            else {
                // Otherwise, fall-back on submitting the form the old-fashioned
                // way.
                page.tw_info("sc", "(Re)trying old-style submission.");
                page.fill(page.tw.regForm.selector, {}, true);
            }

            // Wait again
            page.wait(POST_SUBMIT_SLEEP_MS);
        }
    });

    page.then(function scTests() {
        var all_passed = true;

        // If the form still exists, we failed
        if ( page.exists(page.tw.regForm.selector) ) {
            page.tw_die(70, "sc", "error", "Registration still exists!");
            all_passed = false;
        }

        // If it's still a registration page in general, we still failed
        if ( formfind.isRegPage(page) ) {
            page.tw_die(71, "sc", "error", "Still on a registration page!");
            all_passed = false;
        }

        // Count the number of error-type words. An increase is worrysome.
        if ( countKeywords(page, ERROR_KEYWORDS) > preCountErrors ) {
            page.tw_warn("sc", "The number of errors increased!");
            //page.tw_die(73, "sc", "The number of errors increased!");
            pgutils.status_update("Error words increased.");
            all_passed = false;
        }

        if ( countKeywords(page, COMEON_KEYWORDS) > preCountComeons ) {
            page.tw_warn("sc", "The number of sign-in type words decreased!");
            pgutils.status_update("Sign-in words decreased.");
            all_passed = false;
        }

        // If the URL didn't change, then we *probably* failed.
        if ( page.getCurrentUrl() == preURL ) {
            //page.tw_die(72, "sc", "error", "URL didn't change!");
            pgutils.status_update("URL didn't change.");
            all_passed = false;
        }

        if (all_passed) {
            pgutils.status_update("Submission tests passed!");
        }
    });

};


