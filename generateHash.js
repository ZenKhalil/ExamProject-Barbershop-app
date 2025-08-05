/*generates hash for the password 
const bcrypt = require("bcrypt");

const password = "admin";
const saltRounds = 10; // or more

bcrypt.hash(password, saltRounds, function (err, hash) {
  if (err) {
    console.error(err);
    return;
  }
  console.log(hash);
});

// generates JWT 
const crypto = require("crypto");
const secret = crypto.randomBytes(64).toString("hex");
console.log(secret);


// nedenunde rbruges til at teste om man har det rigtige hash til det rigtige kodeord type node generateHash.js 

const bcrypt = require("bcrypt");

const passwordToTest = "admin"; // The password you want to test
const storedHash = "$2b$10$VJ/SWc/wSpEIfRE0EKj00ekDuY7nkDJpLhljK.Y60/lW/s9H/V5PS"; 

bcrypt.compare(passwordToTest, storedHash, function (err, isMatch) {
  if (err) {
    console.error(err);
    return;
  }
  console.log("Password matches stored hash:", isMatch);
});
*/