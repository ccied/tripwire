var casper      = require('casper');
var system      = require('system');
var utils       = require('utils');
var fs          = require('fs');
var childp      = require('child_process');
var formfill    = require('./formfiller/formfiller');
var fillptrns   = require('./formfiller/expressions');
var pgfinder    = require('./pagefinder/pagefinder');
var formfind    = require('./formfinder/formfinder');
var pgsetup     = require('./utils/pageSetup');
var pgutils     = require('./utils/pageUtils');
var ccap        = require('./captcha/captcha');
var prompt      = require('./prompt/prompt');
var contsnap    = require('./context-snap/context-snap');
var submitcheck = require('./submitcheck/submitcheck');
var cleanprint  = require('./cleanprint/cleanprint');

var tripwire    = require('./tripwire');

var argPage = casper.create();
argPage.echo("Arguments and options:");
utils.dump(argPage.cli.args);
utils.dump(argPage.cli.options);

tripwire.run(argPage.cli.get("url"),
             argPage.cli.get("file_prefix"),
             argPage.cli.get("output_directory"),
             argPage.cli.get("identity_config"),
             argPage.cli.get("finder_prompt_min_count"),
             argPage.cli.get("filler_prompt_repair"),
             argPage.cli.get("filler_auto_fill"),
             argPage.cli.get("filler_captcha_fill"),
             argPage.cli.get("submit"));
// For reference, see tripwire.js
