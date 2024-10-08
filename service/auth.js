const passport = require("passport");

const auth = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (!user || err) {
      return res.status(401).json({
        status: "401 Unauthorized",
        contentType: "application/json",
        responseBody: { message: "Not authorizedAUTH" },
      });
    }

    req.user = user;
    next();
  })(req, res, next);
};

module.exports = auth;
