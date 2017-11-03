var MIN_PERCENT_COMPLETE = 55;

// This should probably be a parameter, but for now, this is how we die when we
// encounter recaptcha.
var die_on_recaptcha = true;

/* handleRunRequest()
 *  Attempts to run the full tripwire subsystem on the URL provided.
 *
 * Args:
 *  page: the casperjs page object to work with
 *  url: the URL to load
 *  prefix: the prefix to use when saving files
 *  outdir: the output directory to store results in
 *  conffile: the input configuration file for the identity to use
 *  promptCount: minimum # of links needed to cause a prompt to the operator to
 *      help find the registration page (-1 is disabled).
 *  validate: True if you want to prompt decaptcha or an operator to fill missed
 *      fields.
 *  tryFill: True if you want to try to automatically fill form fields.
 *  submit: True if you want to hit the 'submit' button when complete.
 *
 * Returns:
 *  Tears.
 *
 */
exports.run = function handleRunRequest(url, prefix, outdir, conffile,
                                        promptCount, validate,
                                        tryFill, captcha_fill, submit) {
    if (promptCount === undefined) {
        promptCount = -1;
    }
    if (validate === undefined) {
        validate = false;
    }
    if (submit === undefined) {
        submit = false;
    }

    var percentage;

    page = pgsetup.getPage(url, prefix, outdir);
    page.tw = {};
    pgutils.init(page);

    page.tw.starturl = url;

    if (typeof url == 'undefined' || typeof prefix == 'undefined' ||
        typeof conffile == 'undefined' || typeof outdir == 'undefined') {
            page.tw_die(5, "tw", "error", "Invalid parameters.");

    }

    var conf = require(conffile);

    page.then(function showParamsAndCheckpoint() {
        // Just dump some meta data to the logs for completeness.
        page.tw_info("tw", "Param URL: " + url);
        page.tw_info("tw", "Param prefix: " + prefix);
        page.tw_info("tw", "Param outdir: " + outdir);
        page.tw_info("tw", "Param conffile: " + conffile);
        page.tw_info("tw", "Param promptCount: " + promptCount);
        page.tw_info("tw", "Param validate: " + validate);
        page.tw_info("tw", "Param tryFill: " + tryFill);
        page.tw_info("tw", "Param submit: " + submit);

        // First thing, we notify that we've at least loaded the first page.
        pgutils.checkpoint(10);
        pgutils.status_update("Loaded initial page.");
    });


    page.then(function injectJQ() {
        pgsetup.allFrameInjectClientUtils(page);
    });

    page.then(function announceScan() {
        pgutils.thenStart(page);
        // Initial load page save
        pgutils.saveState(this);
        page.tw_info("tw", "Scanning site for registration page...");
        pgutils.thenStop(page);
    });

    // Set -1 to something higher to prompt.
    pgfinder.scanPage(page, promptCount);

    page.then(function injectJQ() {
        pgsetup.allFrameInjectClientUtils(page);
    });

    page.then(function gatherFormInfo() {
        pgutils.thenStart(page);
        pgutils.saveState(page);

        if (this.tw.regPageFound === false) {
            pgutils.thenStop(page);
            this.tw_die(
                30, "tw", "warning", "No reg form found! (from previous)");
            return;
        }

        page.tw_info("tw", "Scanning page for registration form");

        var forms = formfind.getRegFormInfo(page);

        if (forms.length === 0 || !forms[0].isRegForm) {
            pgutils.thenStop(page);
            this.tw_die(
                31, "tw", "warning", "No reg form found! (from scan)");
        }

        page.tw.regForm = forms[0];

        page.tw_debug("tw", "Found reg form: " + page.tw.regForm.selector);

        // Notify people that we've found a registration form
        pgutils.checkpoint(100);
        pgutils.status_update("Found a registration form.");
    });

    if (die_on_recaptcha) {
        page.then(function recaptchaChec() {
            page.tw_info("tw", "Looking for recaptchas.");
            pgutils.status_update("Looking for recaptchas.");

            full_body = page.getHTML();
            if (full_body.indexOf("recaptcha") > -1) {
                page.tw_info("tw", "Found recaptcha. Dying")
                this.tw_die(
                    57, "tw", "warning", "Found recaptcha. Dying before fill.");
            }
        });
    }

    page.then(function fillPrep() {
        // First fill all the fields that we can see
        page.tw_info("tw", "Collecting form elements");
        utils.dump(page.tw.regForm);
        page.tw.regForm.elements = pgutils.getFormElementInfo(page,
                                                              page.tw.regForm);

        page.tw_debug("tw", "Number of form elements: " +
                      page.tw.regForm.elements.length);

        utils.dump(page.tw.regForm.elements);
    });

    page.then(function fillPrep() {
        pgutils.checkpoint(1000);
    });

    if (tryFill) {
        page.then(function formFill() {
            //utils.dump(formElements);
            page.tw_info("tw", "Filling form elements");
            pgutils.status_update("Filling form fields.");
            formfill.fillFields(page,
                                page.tw.regForm,
                                fillptrns.PTRNS,
                                conf.fields,
                                conf.requiredSet);
        });

        page.then(function formRefill() {
            // Notify people that we're done filling, and are trying to refill.
            pgutils.checkpoint(1100);
            pgutils.status_update("Refilling form fields.");

            // Then go back through, and fill out any that appeared since then.
            page.tw_info("tw", "Collecting form elements again");
            page.tw.regForm.elements = (
                pgutils.getFormElementInfo(page, page.tw.regForm));

            page.tw_debug("tw", "Num. of form elements nows: " +
                       page.tw.regForm.elements.length);
            formfill.fillEmptyFields(page,
                                     page.tw.regForm,
                                     fillptrns.PTRNS,
                                     conf.fields,
                                     conf.requiredSet);
        });


        page.then(function countFills() {
            var successes = 0;
            var numFields = 0;
            page.tw_alert("tw", "First-fill results:");
            for (var i = 0; i < page.tw.regForm.elements.length; ++i) {
                var field = page.tw.regForm.elements[i];
                if (field.success) {
                    page.tw_alert("tw",
                                  "\tField " + field.selector + " succeeded");
                    ++successes;
                }
                else {
                    page.tw_warn("tw", "\tField " + field.selector + " failed");
                }
                ++numFields;
            }
            percentage = pgutils.makePercentage(successes, numFields);
            page.tw_alert("tw", "First try form totals: " +
                                successes + " / " + numFields + " = " +
                                percentage + "%");

            pgutils.thenStop(page);
        });

        page.then(function savePostFill() {
            pgutils.saveState(this);
        });
    }

    if (captcha_fill) {
        page.then(function formFill() {
            page.tw_info("tw", "Looking for and filling captcha.");
            pgutils.status_update("Looking for and filling captcha.");
            formfill.fill_captchas(page, page.tw.regForm, fillptrns.PTRNS);
        });

        page.then(function() {
            pgutils.saveState(this, "post-captcha");
        });
    }

    if (validate) {

        page.then(function() {
            pgutils.saveState(this);
        });

        page.then(function thenUserRepairResults() {
            page.tw_info("tw", "Repairing form elements");
            pgutils.checkpoint(1300);
            pgutils.status_update("Punting to puny humans for field repair.");
            formfill.userRepairResults(page,
                                       page.tw.regForm,
                                       conf.fields,
                                       conf.requiredSet);
        });

        page.then(function() {

            // Maybe we should do something with this info?
            var successes = 0;
            var numFields = 0;
            page.tw_alert("tw", "Human results:");
            for (var i = 0; i < page.tw.regForm.elements.length; ++i) {
                var field = page.tw.regForm.elements[i];
                if (typeof field.success !== "undefined" && field.success) {
                    page.tw_alert("tw",
                                  "\tField " + field.selector + " succeeded");
                    ++successes;
                }
                else {
                    page.tw_warn("tw", "\tField " + field.selector + " failed");
                }
                ++numFields;
            }
            percentage = pgutils.makePercentage(successes, numFields);
            page.tw_alert("tw", "Assisted form totals: " +
                                successes + " / " + numFields + " = " +
                                percentage + "%");

            pgutils.thenStop(page);
        });
    }

    page.then(function verifyFields() {
        page.tw_info("tw", "Verifying all required fields filled");
        var failed = false;
        for ( var field in conf.requiredSet ) {
            page.tw_error("tw", "Didn't fill required field: " + field);
            failed = true;
        }
        if ( failed ) {
            this.tw_die(
                33, "tw", "error", "Dying due to missing fields");
        }
    });

    page.then(function() {
        if (percentage < MIN_PERCENT_COMPLETE) {
            this.tw_die(
                32, "tw", "error", "Didn't meet percentage threshold");
        }
    });

    if (submit) {
        page.then(function() {
            pgutils.saveState(this, "presubmit");
        });

        page.then(function() {
            page.tw_info("tw", "Submitting form");
            pgutils.checkpoint(1900);
            pgutils.status_update("Trying to submit form.");
            submitcheck.submit_form(page);
            pgutils.checkpoint(2000);
        });
    }
    else {
        page.then(function() {
            pgutils.checkpoint(9999);
            pgutils.status_update("Asked not to submit.");
        });
    }

    /*page.then(function() {
        pgutils.saveState(this);
    });*/

    //ccap.thenSnapCaptcha(page);

    /*
    page.then(function snapCatch() {
        ccap.snapCaptch.call(this);
    });
    */
    page.then(function finalSave() {
        pgutils.saveState(this, "final");
    });

    page.run();
};

