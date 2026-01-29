const mongoose = require("mongoose");
const config = require("config");
const dbgr = require("debug")("development:mongoose");

const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;


if (!dbUser || !dbPass) {
	throw new Error(" DB_USER or DB_PASS missing in environment variables");
}


mongoose
	.connect(`mongodb+srv://${dbUser}:${dbPass}@urbanelite.t22ya6z.mongodb.net/scatch?retryWrites=true&w=majority`)

	.then(() => {
		dbgr("Connected");
	})
	.catch((err) => dbgr(err));

    

module.exports = mongoose.connection;
