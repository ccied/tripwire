exprs = require("./expressions");

var NUM_PASSES           = 5;
var SLEEP_TIME_MS        = 1220;
var AFTER_CLICK_SLEEP_MS = 1500;
var MAX_LINK_LENGTH      = 30;

//var SLEEP_TIME_MS      = 543;
//var SLEEP_TIME_MS        = 10;
//var CLIENT_SCRIPT        = "client_pagefinder.js";

// Used by findApplicableLinks. Returns selectors that we might be able to click
// on that might be useable for finding a registration page.
function clientGetSelectorsForFAL(expr) {
    var aTags =
        $jq("a").
        filter("[href], [onclick]").
        filter("a:iTextContains('" + expr + "')");
        //$jq("a").filter("a:iTextContains('" + expr + "'), " +
        //                "a:iAttrContains(href,'" + expr + "')");

    var inpValTags =
        $jq("input[type='button']").
        filter(":iAttrContains(value, '" + expr + "')");

    //var btnValTags =
    //    $jq("button").filter(":iAttrContains(value,'"+expr+"')");
    //var btnTxtTags =
    //    $jq("button").filter(":iTextContains('" + expr + "')");

    var clickableTags =
        $jq("span,div").
        filter("[onclick]").
        filter(":iTextContains('" + expr + "')");

    var imgTags =
        $jq("a img").
        filter(":iAttrContains(alt,'" + expr + "'), " +
               ":iAttrContains(src,'" + expr + "')");

    console.log("Found " +  aTags.length + "/" +
                            inpValTags.length + "/" +
                            //btnValTags.length + "/" +
                            //btnTxtTags.length + "/" +
                            clickableTags.length + "/" +
                            imgTags.length + " candidates");

    var allTags = aTags.add(inpValTags).add(imgTags).add(clickableTags);
    //var allTags =
    //  aTags.add(inpValTags).add(btnValTags).add(btnTxtTags).add(imgTags);

    var selectors = [];
    allTags.each(function(i, el) {
        selectors.push("#" + addIDIfNeeded(el));
    });
    console.log("Total: " + selectors.length);

    return selectors;
}

function findApplicableLinks(page, links_clicked) {
    page.tw_info("pf", "Entering");
    var links = [];
    var linkMap = {};

    //utils.dump(exprs.linkExprs);

    for (var i = 0; i < exprs.linkExprs.length; ++i) {
        var expr    = exprs.linkExprs[i].expr;
        var weight  = exprs.linkExprs[i].weight;
        page.tw_info("pf", "Considering " + expr + "/" + weight);

        var selectors = page.evaluate(clientGetSelectorsForFAL, expr);

        page.tw_debug("pf", "Found selectors (" + selectors.length + "): ");

        for (var j = 0; j < selectors.length; ++j) {

            if (linkMap[selectors[j]]) {
                page.tw_debug("pf", "Reweighting link: " + selectors[j]);

                if (weight >= 0 && linkMap[selectors[j]].weight >= 0) {
                    // TODO Is this a good reweight? Who the hell knows.
                    linkMap[selectors[j]].weight =
                        Math.max(linkMap[selectors[j]].weight, weight) + 1;
                    //linkMap[selectors[j]].weight += weight;
                }
                else {
                    // Tank the negatives.
                    linkMap[selectors[j]].weight = weight;
                }
                continue;
            }

            var lt = linkText(page, selectors[j]);
            page.tw_debug("pf", "\t" + selectors[j] + " / " + lt, "DEBUG");

            if (lt.length === 0 || lt.length > MAX_LINK_LENGTH) {
                page.tw_info("pf", "\tIgnored link due to length.");
            }
            else if (lt in links_clicked) {
                page.tw_info("pf",
                        "\tIgnored link due to previous attempt (" + lt + ")");
            }
            else {
                page.tw_info("pf", "Found a link: " + selectors[j]);
                linkMap[selectors[j]] = {
                    selector: selectors[j],
                    weight: weight,
                    lt: lt
                };
            }
        }
    }
    for (var sel in linkMap) {
        // Strip out the negatives.
        if (linkMap[sel].weight >= 0) {
            links.push(linkMap[sel]);
        }
    }

    links.sort(function(lhs, rhs) { return rhs.weight - lhs.weight; });


    return links;
}

// Returns some text that we can use to match against. Usually the contents of
// the anchor. If it's a button, it's the button's value. We fall back on alt
// text for images.
function linkText(page, selector) {
    return page.evaluate(function linkTextClient(selector) {
        function definedAndNonzero(val) {
            return val !== undefined && val.length !== 0;
        }

        if (definedAndNonzero($jq(selector).text())) {
            return $jq(selector).text().trim();
        }
        console.log("Undefined/0 text");

        if (definedAndNonzero($jq(selector).val())) {
            console.log("Val: " + $jq(selector).val());
            return $jq(selector).val().trim();
        }
        console.log("Undefined val");

        if (definedAndNonzero($jq(selector).attr('alt'))) {
            console.log("Alt: " + $jq(selector).attr('alt'));
            return $jq(selector).attr('alt').trim();
        }
        console.log("Undefined alt");

        return "";
    }, selector);
}

// Poor man's Google detector.
function isGooglePage(page) {
    function cliIsGooglePage() {
        var hasGoogleHeader = (
                $jq("div.google-header-bar").length > 0);

        return hasGoogleHeader;
    }

    if (/google\./i.test(page.getCurrentUrl())) {
        return true;
    }

    if (/facebook\.com/i.test(page.getCurrentUrl())) {
        return true;
    }

    return page.evaluate(cliIsGooglePage);
}

function handlePage(page, minLinksToPrompt, links_clicked) {
    if (minLinksToPrompt === undefined)
        minLinksToPrompt = -1;

    page.tw_info("pf", "Entering");
    pgutils.saveState(page);

    /*if (page.tw.regPageFound === undefined)
        page.tw.regPageFound = {};

    if (page.tw.regPageFound[id] !== undefined) {;
        page.echo("=== Already found a registration page", "DEBUG");
        return true;
    }*/

    if (formfind.isRegPage(page)) {
        page.tw_info("pf", "Found a registration page!");
        page.tw.regPageFound = true;
        //page.tw.regPageFound[id] = true;
        return true;
    }

    if ( isGooglePage(page) ) {
        page.tw_warn("pf", "GOOGLE PAGE DETECTED");
        return false;
    }

    var links = findApplicableLinks(page, links_clicked);

    if (links === undefined || links.length === 0) {
        page.tw_info("pf", "NO Applicable links found!");
        return false;
    }

    page.tw_info("pf", "Final links found:");
    for (var linkIndx = 0; linkIndx < links.length; ++linkIndx) {
        page.tw_info("pf", "\t" + links[linkIndx].selector + "(" +
                    links[linkIndx].weight + "): " +
                    links[linkIndx].lt);
    }

    // If we have to prompt the user, do that.
    var chooseResults = {};
    var mustAsk = false;
    if (minLinksToPrompt > 0 && links.length >= minLinksToPrompt) {
        mustAsk = true;
        var options = [];

        for (var i = 0; i < links.length; ++i) {
            options.push({id: links[i].selector, text: links[i].lt});
        }
        options.push({id: "None",  text: "TW: Don't click"});
        options.push({id: "Wait",  text: "TW: Wait a while"});
        options.push({id: "Die",   text: "TW: Give up (releases iid)"});
        options.push({id: "Force", text: "TW: Force reg-page"});

        prompt.choose.call(page, options, chooseResults);
    }

    page.then(function clicker() {
        var link, sel, txt;
        // If we asked, extract the response. Otherwise, just take the 'winner'.
        if (mustAsk) {
            link = chooseResults.out;
            sel  = link.id;
            txt  = link.text;
            page.tw_info("pf", "User chose " + sel);
        }
        else {
            link = links[0];
            sel  = link.selector;
            txt  = link.lt;
        }

        //utils.dump(links);
        if (sel == "None") {
            page.tw_info("pf", "Per request, not clicking");
        }
        else if (sel == "Wait") {
            page.tw_info("pf", "Waiting, per request");
            this.wait(SLEEP_TIME_MS);
        }
        else if (sel == "Die") {
            this.tw_die(
                90, "pf", "info", "Exiting, per request");
        }
        else if (sel == "Force") {
            // We set this mystery global variable, and hope that formfinder
            // will pick up on it.
            page.tw.force_reg_page = true;
        }
        else if (!page.exists(sel)) {
            page.tw_error("pf",
                          "Selector " + sel + " (" + txt + ") disappeared.");
            links.shift();
            page.then(clicker);
        }
        else {
            page.tw_info("pf", "Clicking on " + sel + " (" + txt + ")");
            links_clicked[txt] = true;
            this.click(sel);
            this.wait(AFTER_CLICK_SLEEP_MS);
        }
    });

    return false;
}

function checkForRegPage(page) {
    if (!formfind.isRegPage(page)) {
        page.tw_info("pf", "Unable to find registration page!");
        return false;
    }
    return true;
}

function handlePageWrap(minLinksToPrompt, links_clicked) {
    this.tw_debug("pf", "First check...");
    pgutils.thenStart(this);
    var result = handlePage(this, minLinksToPrompt, links_clicked);
    if (!result) {
        this.wait(SLEEP_TIME_MS);
        this.then(function reinject() {
            pgsetup.allFrameInjectClientUtils(this);
        });
    }
    pgutils.thenStop(this);
    this.tw_debug("pf", "Final check...");
}

exports.scanPage = function scanPage(page, minLinksToPrompt) {
    var links_clicked = {};

    // Inject our specific client javascript
    /*
    page.then(function() {
        this.page.injectJs(CLIENT_SCRIPT);
    });//*/

    function thenHandlePageWrap() {
        handlePageWrap.call(this, minLinksToPrompt, links_clicked);
    }

    for (var i = 0; i < NUM_PASSES; ++i) {
        page.then(thenHandlePageWrap);
    }
    page.then(function checkForRegPageWrap() {
        pgutils.thenStart(this);
        this.tw.regPageFound = checkForRegPage(this);
        pgutils.thenStop(this);
    });
};

