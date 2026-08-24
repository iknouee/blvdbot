const db = require("../utils/database");

module.exports = {
    getMember: db.getFamilyMember,
    ensure: db.ensureFamilyMember,
    adopt: db.createAdoption,
    disown: db.removeAdoption,
    getChildren: db.getChildren,
    getParent: db.getParent,
    getFullFamily: db.getFullFamily,
    findRoot: db.findRootAncestor,
    getAllMembers: db.getAllFamilyMembers
};
