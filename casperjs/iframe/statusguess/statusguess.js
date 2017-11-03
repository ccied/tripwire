
/*
 *
 *
 * REPLACED WITH "SUBMITCHECK"
 *
 *
 *
 *
 *
 * */
var BAD_WORDS = [/error/i, /warning/i, /fail/i];

function countError() {
    var alltext =  this.page.framePlainText;

    var count = 0;
    for (var i = 0; i < BAD_WORDS.length; ++i)
        count += alltext.match(BAD_WORDS[i]).length; 

    return count;
}

exports.precheck = function precheck() { // TODO - Some arguments required...
    results = {};

    results.errCount = countError.call(this);

    return results;
};

exports.getGuess = function getGuess(precheck) { // TODO - Some arguments required...
    // TODO - Do better.
    if (formfind.isRegPage(this))
        return false;

    //newCount = countError();
    //if (newCount > precheck.errCount)
    //    return false;

    return true;
};

//        pgutils.setFrameTo(this, field.frame);
//        pgutils.resetFrame(this);
