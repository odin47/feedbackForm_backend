const feedbackRoutes = require("./feedback_routes");

module.exports = function(app , db) {
    feedbackRoutes(app,db);
}