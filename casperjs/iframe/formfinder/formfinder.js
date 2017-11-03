var SCORE_MIN           = 2;
var NO_PASS_PENALTY     = 50; // If there's no password, it's useless to us.
var DOUBLE_PASS_BONUS   = 6;
var BASE_PENALTY        = -3;
var MAX_ELEMENTS_BONUS  = 5;

formexpressions = require("./formexpressions");

function addFormIDs(page) {
    page.tw_info("ffind", "Entering");
    //pgutils.announce(page, "addFormIDs");
    page.evaluate(function cliAddFormIDs() {
        var jq = findJQ();
        jq("form").each(function cliAddFormIDsEach (i, el) {
            console.log("Possibly adding ID to form " + i);
            id = addIDIfNeeded(el);
            console.log("Now has ID: " + id);
        });
    });
}

// Score indicates how likely it is to be a registration form
// Higher is more likely. Lower is less likely.
//
// Scores are totally arbitrary, and mostly came out of thin air, 'cause that's
// how I roll...
function getFormScore(page, selector) {
    var i; // used in counters

    // DEBUGGING - Added 140303 in search of bug
    /*page.evaluate(function() {
        jq = findJQ();
        jq("form").each(function reEnumerate(index, el) {
            console.log("Re-found form#" + jq(el).attr("id"));

            jq.each(this.attributes, function(i, attrib){
                var name = attrib.name;
                var value = attrib.value;
                console.log("\t" + name + ":\t" + value);
                // do your magic :-)
            });
        });
    });*/

    var score = 0;

    page.tw_info("ffind", "Entering", selector);

    if (!page.exists(selector)) {
        page.tw_die(
            40, "ffind", "error", "No element found with selector " + selector);
    }

    var elInfo      = page.getElementInfo(selector);

    page.tw_debug("ffind", "Using elInfo: " + elInfo);

    var elAttrs     = elInfo.attributes;
    var elId        = elAttrs.id;
    var elName      = elAttrs.name;
    var elAction    = elAttrs.action;

    // This function is used to evaluate most inputs for a given form against a
    // provided expression and returns a net score.
    function cliGetButtonScore(selector, exprObj) {
        // Form buttons' names/ids/values
        var selectButtons = selector + " button, " +
                            selector + " input[type=button], " +
                            selector + " input[type=submit]";

        exprObj.expr = depickleRegex(exprObj.expr);

        var score = 0;
        $jq(selectButtons).each(function cliGetFormScoreProcessButton(i, el) {
            //console.log("DEBUG> Considering button:");

            var attrs = ["name", "id", "value", "class"];
            for (var attrIndx = 0; attrIndx < attrs.length; ++attrIndx) {

                var attrType = attrs[attrIndx];

                var checkAttr = $jq(el).attr(attrType);
                //console.log("DEBUG>     Considering element " +
                //            attrType + ": " + checkAttr);

                if (    typeof(checkAttr) !== 'undefined' &&
                        exprObj.expr.test(checkAttr)) {

                    console.log("DEBUG>   Matched on " + attrType);

                    score += exprObj.weight;
                    break;
                }
            }
        });
        
        // TW: TODO: WARNING: This never used to be here, so it just didn't work
        // worth shit. This might break everything.
        return score;
    }

    // Look at each the form's attributes, and compare it against our form
    // attribute expressions.
    for (i = 0; i < formexpressions.FORM_ATTRS.length; ++i) {
        var exprObj = formexpressions.FORM_ATTRS[i];
        page.tw_debug("ffind", "Considering form expression " + exprObj.expr);

        // First just evaluate form-specific attributes
        var attrs = ["action", "id", "name"];
        for (var attrIndx = 0; attrIndx < attrs.length; ++attrIndx) {
            var attrType = attrs[attrIndx];
            page.tw_debug("ffind", "\tConsidering form " +
                          attrType + ": " + elAttrs[attrType]);

            if (    elAttrs[attrType] !== undefined &&
                    exprObj.expr.test(elAttrs[attrType])) {
                page.tw_debug("ffind", "\t\tMatched on " +
                              attrType + ": " + elAttrs[attrType]);
                score += exprObj.weight;
                break;
            }
        }
    }

    // Evaluate each button in the form over our button-specific attribute
    // expressions.
    for (i = 0; i < formexpressions.BUTTON_ATTRS.length; ++i) {
        var exprObj = formexpressions.BUTTON_ATTRS[i];

        page.tw_debug("ffind", "Considering button expression " + exprObj.expr);
        // Evaluate form buttons
        score += page.evaluate(cliGetButtonScore, selector, {
            weight: exprObj.weight,
            expr: pgutils.pickleRegex(exprObj.expr)
        });

    }

    // Penalize forms that don't have a password field and reward forms that
    // have exactly two.
    score += page.evaluate(function checkButtons(selector, exprObj, penalty, bonus) {
        numPass = $jq(selector + " input[type=password]").length;
        if (numPass === 0)
            return -1*penalty;
        else if (numPass == 2)
            return bonus;
    }, selector, NO_PASS_PENALTY, DOUBLE_PASS_BONUS);

    //  Reward forms with more fields.
    //  See that number? I told you things were arbitrary.
    score += BASE_PENALTY + page.evaluate(function formLength(selector, MAX_N) {
        // We *could* do this for more than just input, but whatever.
        var inputSelector = selector + " input:visible";
        var numElements = $jq(inputSelector).length;
        console.log("Found " + numElements + " form fields");
        return Math.max(numElements, MAX_N);
    }, selector, MAX_ELEMENTS_BONUS);


    pgutils.leave(page, "getFormScore", selector + "/" + score);
    return score;

    //TODO
    // Want to check:
    //  Text inside form?
    //  Input types/names/etc.?
}

exports.isRegPage = function isRegPage(pg) {
    var info = getRegFormInfo(pg);
    if (info.length === 0)
        return false;
    return info[0].isRegForm;
};

function getRegFormInfoInFrame(page, frame) {
    //pgutils.announce(page, "getRegFormInfoInFrame", frame);
    page.tw_info("ffind", "Entering", frame);
    addFormIDs(page);
    //page.echo("Done with adding IDs", "DEBUG");

    // If you enable these lines, it will break. WHY MAKES NO SENSE.
    //pgutils.resetFrame(page, i);
    //var oldFrame = pgutils.setFrameTo(page, i);

    var selectors = page.evaluate(function cliGetRegFormSelector() {
        var selectors = [];

        var jq = findJQ();

        if (jq === undefined) {
            console.log("ERROR: No JQ Found");
            return [];
        }

        console.log("Finding form selectors");
        jq("form").each(function cliGetRegFormSelectorEach(index, el) {
            console.log("Found form#" + jq(el).attr("id"));
            selectors.push("form#" + jq(el).attr("id"));
        });
        return selectors;
    });
    //page.echo("getRegFormInfo check 0.5", "WARNING");
    page.tw_info("ffind", "Found selectors: (" + selectors.length + ")");
    page.tw_dump("ffind", "info", selectors);
    //utils.dump(selectors);

    //page.echo("getRegFormInfo check 1", "WARNING");

    var scores = [];
    if (selectors !== undefined) {
        for (var i = 0; i < selectors.length; ++i) {
            var selector = selectors[i];
            page.tw_debug("ffind", "check 2 " + selector);
            var score = getFormScore(page, selector);
            scores.push({
                selector: selector,
                score: score,
                frame: frame,
                isRegForm: score >= SCORE_MIN,
            });
        }
    }

    //page.echo("getRegFormInfo check 3", "WARNING");
    //scores.sort(function regFormScoreSort(lhs, rhs) {
    //    return rhs.score - lhs.score; });
    //utils.dump(scores);

    pgutils.leave(page, "getRegFormInfoInFrame", frame);
    return scores;
}

function getRegFormInfo(page) {
    //pgutils.announce(page, "getRegFormInfo");
    page.tw_info("ffind", "Entering");

    pgutils.resetFrame(page);

    var forms = [];

    // ADDED 14-03-19 as a workaround for removed code below
    forms = forms.concat(getRegFormInfoInFrame(page, 0));
    /* // DISABLED 14-03-19 because of errors
    for (var i = 0; i < page.page.framesCount + 1; ++i) {
        var oldFrame = pgutils.setFrameTo(page, i);
        page.echo("%%%%%%%% FRAME " + i + " (old: " + oldFrame + ")", "WARNING");
        forms = forms.concat(getRegFormInfoInFrame(page, i));
        pgutils.resetFrame(page);
        //page.page.switchToParentFrame();
        //pgutils.setFrameTo(page, oldFrame);
    }
    */

    //page.echo("getRegFormInfo check 3", "WARNING");
    forms.sort(function regFormScoreSort(lhs, rhs) {
        return rhs.score - lhs.score; });

    page.tw_info("ffind", "Form scores: ");
    page.tw_dump("ffind", "info", forms);
    //page.echo("Form scores: ");
    //utils.dump(forms);

    // If needed, we'll force the most probable form to be a registration form.
    if (    forms.length !== 0 &&
            typeof(page.tw.force_reg_page) !== 'undefined' &&
            page.tw.force_reg_page) {
        forms[0].isRegForm = true;
    }

    return forms;
}

exports.getRegFormInfo  = getRegFormInfo;

