const bcrypt = require("bcrypt");
const SALT_ROUNDS = 10;
const securePassword = async (password) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
};

module.exports = securePassword ;