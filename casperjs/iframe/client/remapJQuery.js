
if (jQuery === undefined)
    console.log("ERROR: jQuery missing!");
else {
    $jq = jQuery.noConflict();
    //window.$jq = twJQ;
    console.log("jQuery remapped");

    // Add the case-insensitive contains operator.
    // Modified from http://jsfiddle.net/bipen/dyfRa/
    $jq.extend($jq.expr[":"], {
        "icontains": function(elem, i, match, array) {
            var body = (elem.textContent || elem.innerText || "").toLowerCase();
            return body.indexOf((match[3] || "").toLowerCase()) >= 0;
        }
    });

    //
    /*$jq.extend($jq.expr[':'], {
        "contains_regex_i": function (a, i, m) {
            var sText   = (a.textContent || a.innerText || "");
            var zRegExp = new RegExp (m[3], 'i');
            return zRegExp.test (sText);
        }
    });*/

    $jq.extend($jq.expr[':'], {
        "iAttrContains": function(node, stackIndex, properties) {

            //console.log("Called from within iAttrContains");

            // cleans up arguments
            var args = properties[3].split(',').map(function(arg) {
                return arg.replace(/^\s*["']|["']\s*$/g, '');
            });

            var pattern = new RegExp(args[1], "i");
            if ($jq(node).attr(args[0]) === undefined)
                return false;
            return pattern.test($jq(node).attr(args[0]));
        }
    });
    //use as: var searchInputs = $jq('input:iAttrContains(value, "search")');

    $jq.extend($jq.expr[':'], {
        "iTextContains": function(elem, stackIndex, properties) {
            var pattern = new RegExp(properties[3], "i");
            return pattern.test(elem.textContent || elem.innerText || "");
        }
    });
    //use as: var searchInputs = $jq('input:iTextContains("search")');

    $jq.extend($jq.expr[':'], {
        "iTextContainsAlt": function(elem, stackIndex, properties) {
            var alts = "";
            $jq(elem).children("img").each(function (index, image_element) {
                var alt = $jq(image_element).attr("alt");
                if (typeof alt != "undefined")
                    alts += " " + alt;
            });
            var body = elem.textContent || elem.innerText || "";
            var pattern = new RegExp(properties[3], "i");
            return pattern.test(body + alts);
        }
    });
}
