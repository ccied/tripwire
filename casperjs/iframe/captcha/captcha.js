
function thenSnapCaptcha(page) {
    pgutils.thenStart();
    page.then(function snapCatch() {
        ccap.snapCaptch.call(this);
    });
    pgutils.thenStop();
}

function snapCaptch() {
    var selector = "#recaptcha_image";
    //var selector = "script[src*='recaptcha']";
    if (this.evaluate(function (s) { return $jq(s).length; }, selector) > 0)
        pgutils.saveSubset(this, selector, "captcha", false);
    else
        this.echo("No recaptcha found", "WARNING");
}

exports.snapCaptch      = snapCaptch;
exports.thenSnapCaptcha = thenSnapCaptcha;

