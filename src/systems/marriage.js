const db = require("../utils/database");

module.exports = {
    get: db.getMarriage,
    create: db.createMarriage,
    update: db.updateMarriage,
    remove: db.removeMarriage
};
