var env = require('system').env;
var Colorizer = function Colorizer() {
    "use strict";
    var options    = { bold: 1, underscore: 4, blink: 5, reverse: 7, conceal: 8 };
    var foreground = { black: 30, red: 31, green: 32, yellow: 33, blue: 34, magenta: 35, cyan: 36, white: 37 };
    var background = { black: 40, red: 41, green: 42, yellow: 43, blue: 44, magenta: 45, cyan: 46, white: 47 };
    var styles     = {
        'ERROR':     { bg: 'red', fg: 'white', bold: true },
        'INFO':      { fg: 'green', bold: true },
        'TRACE':     { fg: 'green', bold: true },
        'PARAMETER': { fg: 'cyan' },
        'COMMENT':   { fg: 'yellow' },
        'WARNING':   { fg: 'red', bold: true },
        'GREEN_BAR': { fg: 'white', bg: 'green', bold: true },
        'RED_BAR':   { fg: 'white', bg: 'red', bold: true },
        'INFO_BAR':  { bg: 'cyan', fg: 'white', bold: true },
        'WARN_BAR':  { bg: 'yellow', fg: 'white', bold: true },
        'SKIP':      { fg: 'magenta', bold: true },
        'SKIP_BAR':  { bg: 'magenta', fg: 'white', bold: true }
    };

    /**
     * Adds a style to provided text.
     *
     * @param   String  text
     * @param   String  styleName
     * @return  String
     */
    this.colorize = function colorize(text, styleName, pad) {
        if ((fs.isWindows() && !env.ANSICON) || !(styleName in styles)) {
            return text;
        }
        return this.format(text, styles[styleName], pad);
    };

    /**
     * Formats a text using a style declaration object.
     *
     * @param  String  text
     * @param  Object  style
     * @return String
     */
    this.format = function format(text, style, pad) {
        if ((fs.isWindows() && !env.ANSICON) || !utils.isObject(style)) {
            return text;
        }
        var codes = [];
        if (style.fg && foreground[style.fg]) {
            codes.push(foreground[style.fg]);
        }
        if (style.bg && background[style.bg]) {
            codes.push(background[style.bg]);
        }
        for (var option in options) {
            if (option in style && style[option] === true) {
                codes.push(options[option]);
            }
        }
        // pad
        if (typeof pad === "number" && text.length < pad) {
            text += new Array(pad - text.length + 1).join(' ');
        }
        return "\u001b[" + codes.join(';') + 'm' + text + "\u001b[0m";
    };
};
//var COLORIZER       = require('colorizer');

COLOR_CODES = {};
COLOR_CODES.error   = {fg: "white", bg: "red", bold: true};
COLOR_CODES.warn    = {fg: "black", bg: "yellow"};
COLOR_CODES.debug   = {fg: "green", bold: true};
COLOR_CODES.note    = {fg: "cyan", bold: true};
COLOR_CODES.alert   = {fg: "magenta", bold: true};
COLOR_CODES.info    = {fg: "cyan", bold: true};
COLOR_CODES.plain   = {fg: "white", bold: false};

MODULE_NAME_COLOR   = { fg: 'cyan', bg: 'black', bold: false };

// These aren't used right now
/*
NAME_CODES = {};
NAME_CODES.error    = "E";
NAME_CODES.warn     = "W";
NAME_CODES.debug    = "D";
NAME_CODES.alert    = "A";
NAME_CODES.note     = "I";
NAME_CODES.info     = "I";
NAME_CODES.plain    = "I";
*/

HIGHLIGHT_CODES = {};
HIGHLIGHT_CODES.error   = true;
HIGHLIGHT_CODES.warn    = true;

var COLOR;

function wraplen(txt, len, chr, first) {
    if ( chr === undefined )
        chr = " ";
    if ( first === undefined )
        first = " ";

    var diff = len - txt.length;
    if (diff < 0) {
        txt = txt.substr(0, len);
    }
    else {
        for (var i = 0; i < diff; ++i) {
            if ( i === 0 )
                txt = txt + first;
            else
                txt = txt + chr;
        }
    }
    return txt;
}

function suffix(txt, len, chr, first) {
    if ( chr === undefined )
        chr = " ";
    if ( first === undefined )
        first = " ";

    var diff = len - txt.length;

    for (var i = 0; i < diff; ++i) {
        if ( i === 0 )
            txt = txt + first;
        else
            txt = txt + chr;
    }

    return txt;
}

function tw_dump(module, code, v, id, fn) {
    if ( fn === undefined || fn === "" )
        fn = arguments.callee.caller.name !== undefined ?
            arguments.callee.caller.name : "?";

    if ( utils.serialize === undefined ) {
        this.tw_error("cleanprint", "SERIALIZE MISSING");
        return;
    }

    var ser = utils.serialize(v, 4);

    if (ser === undefined ) {
        this.tw_error("cleanprint", "SER UNDEFINED", module + "." + fn);
        this.tw_error("cleanprint", ser, module + "." + fn);
        this.tw_error("cleanprint", v, module + "." + fn);
        utils.dump(v);
        return;
    }

    var i = 0;
    while (i < ser.length) {
        var j = ser.indexOf("\\n", i);
        if (j == -1) j = ser.length;

        var line = ser.substr(i, j - i);
        this.tw_log(module, code, line, id, fn);

        i = j + 1;
    }
}

function tw_log(module, code, msg, id, fn) {
    if ( id !== undefined )
        msg = "(" + id + ") " + msg;

    if ( fn === undefined || fn === "" )
        fn = arguments.callee.caller.name !== undefined ?
             arguments.callee.caller.name : "?";

    // Normalize warning to warn
    if (code == "warning")
        code = "warn";

    code = code.toLowerCase();

    // Start using their logging

    module = module + "." + fn;

    // On errors and warnings, pass it up the chain.
    if (code == "error" || code == "warn") {
        system.stderr.write(code + " " + module + ": " + msg + "\n");
    }

    module = COLOR.format(module, MODULE_NAME_COLOR);
    if ( code in COLOR_CODES )
        color = COLOR_CODES[code];
    else
        color = "INFO";

    msg    = COLOR.format(msg, color);

    this.log(msg, code, module);
    // End using their logging



    /*
    if ( code in NAME_CODES )
        prefix = NAME_CODES[code];
    else prefix = code[0];

    if ( code in COLOR_CODES )
        color = COLOR_CODES[code];
    else
        color = "INFO";

    if ( code in HIGHLIGHT_CODES ) {
        msg = suffix(msg, 64, "=");
    }

    module = module + "." + fn + ":";
    module = wraplen(module, 18);

    prefix = COLOR.format(prefix, color);
    module = COLOR.format(module, MODULE_NAME_COLOR);
    msg    = COLOR.format(msg, color);

    total  = prefix + " " + module + " " + msg;
    this.echo(total);
    */

}

function tw_debug(module, msg, id, fn) {
    if ( fn === undefined || fn === "" )
        fn = arguments.callee.caller.name !== undefined ?
             arguments.callee.caller.name : "?";
    tw_log.call(this, module, "debug", msg, id, fn);
}

function tw_info(module, msg, id, fn) {
    if ( fn === undefined || fn === "" )
        fn = arguments.callee.caller.name !== undefined ?
             arguments.callee.caller.name : "?";
    tw_log.call(this, module, "info", msg, id, fn);
}

function tw_warn(module, msg, id, fn) {
    if ( fn === undefined || fn === "" )
        fn = arguments.callee.caller.name !== undefined ?
             arguments.callee.caller.name : "?";
    tw_log.call(this, module, "warn", msg, id, fn);
}

function tw_error(module, msg, id, fn) {
    if ( fn === undefined || fn === "" )
        fn = arguments.callee.caller.name !== undefined ?
             arguments.callee.caller.name : "?";
    tw_log.call(this, module, "error", msg, id, fn);
}

function tw_alert(module, msg, id, fn) {
    if ( fn === undefined || fn === "" )
        fn = arguments.callee.caller.name !== undefined ?
             arguments.callee.caller.name : "?";
    tw_log.call(this, module, "alert", msg, id, fn);
}

function tw_die(exitcode, module, code, msg, id, fn) {
    this.tw_log(module, code, msg, id, fn);
    pgutils.saveState(this, "ec" + exitcode);
    this.exit(exitcode);
    this.bypass(999); // so stupid. https://github.com/n1k0/casperjs/issues/193
}

exports.init = function init(page) {
    page.tw_log     = tw_log;
    page.tw_dump    = tw_dump;
    page.tw_die     = tw_die;

    page.tw_debug   = tw_debug;
    page.tw_info    = tw_info;
    page.tw_warn    = tw_warn;
    page.tw_warning = tw_warn;
    page.tw_error   = tw_error;
    page.tw_alert   = tw_alert;

    COLOR = new Colorizer();
};


