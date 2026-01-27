const mongoose = require("mongoose");
const config = require("config");
const dbgr = require("debug")("development:mongoose");

mongoose
	.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@urbanelite.t22ya6z.mongodb.net/scatch`)
	.then(() => {
		dbgr("Connected");
	})
	.catch((err) => dbgr(err));

module.exports = mongoose.connection;