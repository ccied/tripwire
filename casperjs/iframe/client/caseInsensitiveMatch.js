//var patt1=new RegExp("e");
//patt1.test("The best things in life are free")

$jq.expr[':'].iAttrContains = function(node, stackIndex, properties) {

    //console.log("Called from within iAttrContains");

    // cleans up arguments
    var args = properties[3].split(',').map(function(arg) {
        return arg.replace(/^\s*["']|["']\s*$/g, '');  
    });

    var pattern = new RegExp(args[1], "i");
    if ($jq(node).attr(args[0]) === undefined)
        return false;
    return pattern.test($jq(node).attr(args[0]));
};

$jq.expr[':'].iTextContains = function(node, stackIndex, properties) {

    //console.log("Called from within iTextContains");

    var args = properties[3].split(',').map(function(arg) {
        return arg.replace(/^\s*["']|["']\s*$/g, '');  
    });

    var pattern = new RegExp(args[0], "i");

    return pattern.test($jq(node).text());
};

$jq.expr[':'].attrRegExp = function(node, stackIndex, properties) {
    var args = properties[3].split(',').map(function(arg) {
        return arg.replace(/^\s*["']|["']\s*$/g, '');  
    });

    return args[1].test($jq(node).attr(args[0]));
};

$jq.expr[':'].valRegExp = function(node, stackIndex, properties) {
    var args = properties[3].split(',').map(function(arg) {
        return arg.replace(/^\s*["']|["']\s*$/g, '');  
    });
    return args[0].test($jq(node).text());
};

//var searchInputs = $jq('input:iAttrContains(value, "search")');
//var searchInputs = $jq('input:iTextContains("search")');
