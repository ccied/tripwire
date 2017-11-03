var SUB_X = 300;
var ADD_X = 140;
var SUB_Y = 100;
var ADD_Y = 100;

var TMPFILE_PREFIX      = "/tmp/tw-context-snap-";
var TMPFILE_EXTENSION   = ".jpg";
var TMPFILE_ID_LEN      = 7;

function makeId() {
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < TMPFILE_ID_LEN; ++i )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

function getTempFilename(selector) {
    return TMPFILE_PREFIX + makeId() + TMPFILE_EXTENSION;
}

exports.getWindow = function getWindow(page, selector) {
    var obounds = page.getElementBounds(selector);

    if (obounds === null)
        return null;

    var lshift = Math.min(SUB_X, obounds.left);
    var tshift = Math.min(SUB_Y, obounds.top);

    obounds.left   = obounds.left - lshift;
    obounds.top    = obounds.top - tshift;

    obounds.width  = obounds.width  + lshift + ADD_X;
    obounds.height = obounds.height + tshift + ADD_Y;

    return obounds;
};

exports.snapContext = function snapWindow(page, filename, selector) {
    return page.capture(filename, exports.getWindow(page, selector));
};

exports.snapTempContext = function snapTempContext(page, selector) {
    filename = getTempFilename(selector);
    page.capture(filename, exports.getWindow(page, selector));
    return filename;
};

exports.snapTempContextExact = function snapTempContextExact(page, selector) {
    filename = getTempFilename(selector);
    page.captureSelector(filename, selector);
    return filename;
};

exports.deleteTempContext = function deleteTempContext(page, filename) {
    return fs.remove(filename);
};
