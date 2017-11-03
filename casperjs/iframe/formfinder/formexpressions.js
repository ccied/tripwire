
FORM_ATTRS = [];

FORM_ATTRS.push({expr: /register/i,        weight: 6});
FORM_ATTRS.push({expr: /join/i,            weight: 5});
FORM_ATTRS.push({expr: /create/i,          weight: 4});
FORM_ATTRS.push({expr: /sign.*up/i,        weight: 3});
FORM_ATTRS.push({expr: /account/i,         weight: 1});

FORM_ATTRS.push({expr: /sign.*in/i,        weight: -2});
FORM_ATTRS.push({expr: /log.*in/i,         weight: -2});

//FORM_ATTRS.push({expr: /(log|sign).*in/i,  weight: 1});
//FORM_ATTRS.push({expr: /community/i,       weight: 1});
//FORM_ATTRS.push({expr: /forum/i,           weight: 1});

BUTTON_ATTRS = [];
BUTTON_ATTRS.push({expr: /register/i,      weight: 4});
BUTTON_ATTRS.push({expr: /join/i,          weight: 4});
BUTTON_ATTRS.push({expr: /create/i,        weight: 3});
BUTTON_ATTRS.push({expr: /sign.*up/i,      weight: 2});

// It's possible to overcome these if they have one of the other buttons...
BUTTON_ATTRS.push({expr: /sign.*in/i,      weight: -2});
BUTTON_ATTRS.push({expr: /log.*in/i,       weight: -2});

//BUTTON_ATTRS.push({expr: /account/i,         weight: 1});

exports.FORM_ATTRS = FORM_ATTRS;
exports.BUTTON_ATTRS = BUTTON_ATTRS;

