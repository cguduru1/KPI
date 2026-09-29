//backend/bcryptjs.js
import bcrypt from "bcryptjs";

const hash = "$2b$10$6ArubtEE40sb99ygSSdzPebpIjN2f4KGnIdlwWplCGdwGT.vKuXby";

const passwordToTest = "psft123"; // try the candidate password

const match = await bcrypt.compare(passwordToTest, hash);

console.log("Password matches?", match);
