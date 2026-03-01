require('dotenv').config();
const mongoose = require('mongoose');
const userModel = require('./models/user-model');

const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;

mongoose.connect(`mongodb+srv://${dbUser}:${dbPass}@urbanelite.t22ya6z.mongodb.net/scatch?retryWrites=true&w=majority`)
    .then(async () => {
        // Find all users with orders
        const users = await userModel.find({ "orders.0": { $exists: true } });
        users.forEach(u => {
            console.log(`User ${u.email}:`);
            if (u.orders && u.orders.length > 0) {
                const lastOrder = u.orders[u.orders.length - 1];
                if (lastOrder && lastOrder.items) {
                    lastOrder.items.forEach((item, idx) => {
                        console.log(` Order Item ${idx} image: `, typeof item.image === 'string' ? item.image.slice(0, 100) : (Buffer.isBuffer(item.image) ? 'Buffer' : typeof item.image));
                    });
                }
            }
        });

        mongoose.disconnect();
    })
    .catch(err => {
        console.error(err);
        mongoose.disconnect();
    });
