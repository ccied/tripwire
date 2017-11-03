// Fields:
var PTRNS = {};

//  First Name
PTRNS.firstname = [];
PTRNS.firstname.push({
    attr: "all",
    val: /.*first.*name.*/i,
    weight: 3
});
PTRNS.firstname.push({
    attr: "all",
    val: /.*first.*n.*/i,
    weight: 1,
});
PTRNS.firstname.push({
    attr: "all",
    val: /.*f.*name.*/i,
    weight: -1,
});
PTRNS.firstname.push({
    attr: "all",
    val: /.*given.*n.*/i,
    weight: 1
});

//  Last Name
PTRNS.lastname = [];
PTRNS.lastname.push({
    attr: "all",
    val: /.*(last|sur).*n/i,
    weight: 1,
});
PTRNS.lastname.push({
    attr: "all",
    val: /.*(l(ast)?|s(ur)?)[^a-zA-Z]*name/i,
    weight: 1,
});
PTRNS.lastname.push({
    attr: "all",
    val: /.*last.*name.*/i,
    weight: 3,
});

/* Test set
lastname
fullname
lname
surname
sname
*/

//  Name
PTRNS.name = [];
PTRNS.name.push({attr: "all", val: /name/i, weight: 0});
PTRNS.name.push({attr: "all", val: /full.*name/i, weight: 5});
PTRNS.name.push({attr: "all", val: /first.*last.*name/i, weight: 5});
PTRNS.name.push({attr: "all", val: /last.*first.*name/i, weight: 5});
PTRNS.name.push({attr: "all", val: /first.*last/i, weight: 4});
PTRNS.name.push({attr: "all", val: /last.*first/i, weight: 4});

//  Email
PTRNS.email = [];
PTRNS.email.push({
    attr: "all",
    val: /.*e-?mail.*/i,
    weight: 7,
    die_on_fail: true,
});
//PTRNS.email.push({attr: "all", val: /.*email.*/i, weight: 7});
PTRNS.email.push({
    attr: "all",
    val: /.*mail.*/i,
    weight: 1,
    die_on_fail: true,
});
PTRNS.email.push({attr: "type",
    val: /email/i,
    weight: 10,
    die_on_fail: true,
});

//  Username
PTRNS.username = [];
//PTRNS.username.push({attr: "all", val: /user/i, weight: 2});
PTRNS.username.push({attr: "all", val: /user.*name/i, weight: 2});
PTRNS.username.push({attr: "all", val: /uname/i, weight: 2});
PTRNS.username.push({attr: "all", val: /member.*name/i, weight: 2});
PTRNS.username.push({attr: "all", val: /userid/i, weight: 2});
PTRNS.username.push({attr: "all", val: /user.*login/i, weight: 2});
PTRNS.username.push({attr: "all", val: /login.*name/i, weight: 2});
PTRNS.username.push({attr: "all", val: /displayname/i, weight: 2});
PTRNS.username.push({attr: "all", val: /screen.*name/i, weight: 3});
PTRNS.username.push({attr: "all", val: /login/i, weight: -1});

//  Password
PTRNS.password = [];
PTRNS.password.push({
    attr: "type",
    val: /password/i,
    weight: 5,
    die_on_fail: true,
});
// For the few who don't protect their passwords
PTRNS.password.push({
    attr: "all",
    val: /password/i,
    weight: 5,
    die_on_fail: true,
});

//  Phone
PTRNS.phone = [];
PTRNS.phone.push({attr: "all", val: /phone/i, weight: 3});
PTRNS.phone.push({attr: "all", val: /mobile/i, weight: 3});
PTRNS.phone.push({attr: "all", val: /cell/i, weight: 3});

// Area code
PTRNS.areacode = [];
PTRNS.areacode.push({attr: "all", val: /phone.*areacode/i, weight: 4});
PTRNS.areacode.push({attr: "all", val: /mobile.*areacode/i, weight: 4});
PTRNS.areacode.push({attr: "all", val: /cell.*areacode/i, weight: 4});
PTRNS.areacode.push({attr: "all", val: /phone.*area/i, weight: 3.5});
PTRNS.areacode.push({attr: "all", val: /mobile.*area/i, weight: 3.5});
PTRNS.areacode.push({attr: "all", val: /cell.*area/i, weight: 3.5});

//  DOB
PTRNS.dob = [];
PTRNS.dob.push({attr: "all", val: /.*dob.*/i});
PTRNS.dob.push({attr: "all", val: /.*birthda(te|y).*/i});
PTRNS.dob.push({attr: "all", val: /.*bd.*/i});
PTRNS.dob.push({attr: "type", val: /date/i, weight: 5});

//  DOB month
PTRNS.month = [];
PTRNS.month.push({attr: "all", val: /.*mm/i, weight: 2});
PTRNS.month.push({attr: "all", val: /.*month.*/i, weight: 2});
PTRNS.month.push({attr: "type", val: /month/i, weight: 5});

//  DOB year
PTRNS.year = [];
//PTRNS.year.push({attr: "all", val: /.*yyyy/i});
PTRNS.year.push({attr: "all", val: /.*yy/i, weight: 2});
PTRNS.year.push({attr: "all", val: /.*year.*/i, weight: 2});

//  DOB day
//  additional weighting is because bday should be seen as birth DAY before dob
PTRNS.day = [];
PTRNS.day.push({attr: "all", val: /.*day.*/i, weight: 1});
PTRNS.day.push({attr: "all", val: /.*dd.*/i, weight: 1});

//  Radiobuttons
PTRNS.radiobuttons = [];
PTRNS.radiobuttons.push({attr: "type", val: /radio/i, weight: -1});

//  Checkboxes
PTRNS.checkboxes = [];
PTRNS.checkboxes.push({attr: "type", val: /checkbox/i, weight: 8});

// Selects
PTRNS.selects = [];
PTRNS.selects.push({attr: "tag", val: /select/i, weight: -1});

//  Age
PTRNS.age = [];
PTRNS.age.push({attr: "all", val: /^age/i, weight: 0});
PTRNS.age.push({attr: "all", val: /[^m]age/i, weight: 0});

//  Location (Country)
PTRNS.country = [];
PTRNS.country.push({attr: "all", val: /.*country.*/i});
PTRNS.country.push({attr: "all", val: /.*nation.*/i});

//  Location (Address)
PTRNS.address = [];
PTRNS.address.push({attr: "all", val: /.*address.*/i, weight: 6});
PTRNS.address.push({attr: "all", val: /.*street.*/i, weight: 6});

//  Location (City)
PTRNS.city = [];
PTRNS.city.push({attr: "all", val: /city/i, weight: 2});
PTRNS.city.push({attr: "all", val: /town/i, weight: 2});
PTRNS.city.push({attr: "all", val: /location/i, weight: 0});

//  Location (State)
PTRNS.state = [];
PTRNS.state.push({attr: "all", val: /state/i});
PTRNS.state.push({attr: "all", val: /region/i});

//  Location (Zip)
PTRNS.zip = [];
PTRNS.zip.push({attr: "all", val: /(zip|(post.*code))/i});

//  Sex/Gender
PTRNS.sex = [];
PTRNS.sex.push({attr: "all", val: /(sex|gender)/i});

//  Mother's Maiden (cause why not?)
PTRNS.maidenname = [];
PTRNS.maidenname.push({attr: "all", val: /maiden/i, weight: 6});

// Recaptcha-specific
//PTRNS.recaptcha = [];
//PTRNS.recaptcha.push({attr: "all", val: /recaptcha_response_field/});

// Captcha fields
PTRNS.captcha = [];
PTRNS.captcha.push({attr: "all", val: /captcha/i, weight: 5});
PTRNS.captcha.push({attr: "all", val: /turing/i, weight: 4});
PTRNS.captcha.push({attr: "all", val: /human/i, weight: 3});
PTRNS.captcha.push({attr: "all", val: /security/i, weight: 2});
PTRNS.captcha.push({attr: "all", val: /code/i, weight: -1});

// A random answer to a question
PTRNS.answer = [];
PTRNS.answer.push({attr: "all", val: /secret.*answer/i, weight: 2});
PTRNS.answer.push({attr: "all", val: /answer/i, weight: 0});

//  University? Company?
//  Interested in? URL?
//

exports.PTRNS = PTRNS;
