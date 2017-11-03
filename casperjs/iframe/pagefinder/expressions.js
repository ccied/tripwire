var linkExprs = [];

linkExprs.push({expr: "account",            weight: 3.5 });
linkExprs.push({expr: "sign *in[^g]",       weight: 3 });
linkExprs.push({expr: "sign *in$",          weight: 3 });
linkExprs.push({expr: "log *in",            weight: 3 });
linkExprs.push({expr: "join[^t]",           weight: 4 });
linkExprs.push({expr: "join$",              weight: 4 });
linkExprs.push({expr: "forum",              weight: 2 });
linkExprs.push({expr: "community",          weight: 1 });
linkExprs.push({expr: "regist",             weight: 5 });
linkExprs.push({expr: "sign[ -]*up",        weight: 6 });
linkExprs.push({expr: "create.*account",    weight: 11});

linkExprs.push({expr: "facebook",           weight: -8});
linkExprs.push({expr: "google",             weight: -8});

exports.linkExprs = linkExprs;
