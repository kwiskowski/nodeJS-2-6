const { User } = require("../service/schemas");
const path = require("path");
const fs = require("fs");
const gravatar = require("gravatar");
// const { Jimp } = require("jimp");
const service = require("../service");
const { userSchema } = require("../service/joi");
const auth = require("../service/auth");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const sgMail = require("@sendgrid/mail");
const nodemailer = require("nodemailer");
const secret = process.env.AUTH_SECRET;
sgMail.setApiKey(process.env.API_KEY);
// _________________________________________________________________

const transporter = nodemailer.createTransport({
  service: "SendGrid",
  auth: {
    user: "apikey",
    pass: process.env.API_KEY,
  },
});

const register = async (req, res, next) => {
  const { error } = userSchema.validate(req.body);
  const user = await User.findOne({ email: req.body.email });

  if (error) {
    return res.status(400).json({
      status: "400 Bad Request",
      contentType: "application/json",
      responseBody: error.message,
    });
  }

  if (user) {
    return res.status(409).json({
      status: "409 Conflict",
      contentType: "application/json",
      responseBody: {
        message: "Email in use",
      },
    });
  }

  try {
    const url = gravatar.url(req.body.email, { s: "250", r: "pg", d: "404" });
    const newToken = uuidv4();

    const newUser = new User({
      email: req.body.email,
      subscription: "starter",
      avatarURL: url,
      verificationToken: newToken,
    });
    await newUser.setPassword(req.body.password);
    await newUser.save();

    const mailOptions = {
      from: "krzysztof.wiskowski@gmail.com",
      to: "krzysztof.wiskowski@gmail.com",
      subject: "Email Verification",
      html: `<p>Please verify your email by clicking on the following link: <a href="http://localhost:3000/api/users/verify/${newToken}">Verify Email</a></p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      status: "201 Created",
      contentType: "application/json",
      responseBody: {
        user: {
          email: req.body.email,
          subscription: "starter",
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------------------------------------

const login = async (req, res, next) => {
  const { error } = userSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      status: "400 Bad Request",
      contentType: "application/json",
      responseBody: error.message,
    });
  }

  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res.status(401).json({
      status: "401 Unauthorized",
      responseBody: {
        message: "User with this email doesn't exist",
      },
    });
  }

  if (user.verify === false) {
    return res.status(401).json({
      status: "401 Unauthorized",
      responseBody: {
        message: "User is not verified",
      },
    });
  }

  const isPasswordValid = await user.validatePassword(req.body.password);

  if (!isPasswordValid) {
    return res.status(401).json({
      status: "401 Unauthorized",
      responseBody: {
        message: "Incorrect password",
      },
    });
  }

  try {
    const payload = {
      id: user._id,
      username: user.username,
    };

    const token = jwt.sign(payload, secret, { expiresIn: "12h" });
    user.token = token;
    await user.save();

    return res.json({
      status: "200 OK",
      contentType: "application/json",
      responseBody: {
        token: token,
        user: {
          email: req.body.email,
          subscription: user.subscription,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------------------------------

const logout = async (req, res, next) => {
  try {
    const user = req.user;

    user.token = null;
    await user.save();

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------------------

const current = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        status: "401 Unauthorized",
        contentType: "application/json",
        responseBody: {
          message: "Not authorizedCURRENT",
        },
      });
    }

    res.json({
      status: "200 OK",
      contentType: "application/json",
      responseBody: {
        email: user.email,
        subscription: user.subscription,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------

const updateSub = async (req, res, next) => {
  const { error } = req.body;

  if (error || !req.body.subscription) {
    return res.status(400).json({
      status: "400 Bad Request",
      contentType: "application/json",
      responseBody: {
        message: "Invalid subscription typeUPDATE SUB",
      },
    });
  }

  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        status: "401 Unauthorized",
        contentType: "application/json",
        responseBody: {
          message: "Not authorizedUPDATE",
        },
      });
    }

    user.subscription = req.body.subscription;
    await user.save();

    res.json({
      status: "200 OK",
      contentType: "application/json",
      responseBody: {
        email: user.email,
        subscription: user.subscription,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ----------------------------------------------------------------------------

const updateAvatar = async (req, res, next) => {
  const user = req.user;
  const { error } = req.file;
  const avatarPath = req.file.path;

  if (error || !req.file) {
    return res.status(400).json({
      status: "400 Bad Request",
      contentType: "application/json",
      responseBody: {
        message: "Invalid avatar file.",
      },
    });
  }

  try {
    // const image = await Jimp.read(avatarPath);
    // image.resize(250, 250);

    const uniqueFilename = `${user}-${Date.now()}.png`;
    const avatarsDir = path.join(__dirname, "..", "public", "avatars");
    path.join(avatarsDir, uniqueFilename);

    await fs.promises.mkdir(avatarsDir, { recursive: true });
    // await image.writeAsync(newAvatarPath);
    await fs.promises.unlink(avatarPath);

    if (!user) {
      return res.status(401).json({
        status: "401 Unauthorized",
        contentType: "application/json",
        responseBody: {
          message: "Not authorized",
        },
      });
    }

    user.avatarURL = `/avatars/${uniqueFilename}`;
    await user.save();

    res.json({
      status: "200 OK",
      contentType: "application/json",
      requestBody: {
        avatarURL: user.avatarURL,
      },
    });
  } catch (err) {
    next(err);
  }
};

// -------------------------------------------------------------

const verifyEmail = async (req, res, next) => {
  const verificationToken = req.params.verificationToken;
  const { error } = req.body;

  if (error) {
    return res.status(400).json({
      status: "400 Bad Request",
      contentType: "application/json",
      responseBody: {
        message: error.message,
      },
    });
  }

  try {
    const user = await service.getUserByVerToken(verificationToken);

    if (!user) {
      return res.status(404).json({
        status: "404 Not Found",
        contentType: "application/json",
        responseBody: {
          message: "User not found",
        },
      });
    }

    user.verify = true;
    user.verificationToken = null;
    await user.save();

    res.json({
      status: "200 OK",
      contentType: "application/json",
      responseBody: {
        message: "Verification successful",
      },
    });
  } catch (err) {
    next(err);
  }
};

// --------------------------------------------------------------------------------

const sendVerification = async (req, res, next) => {
  const verificationSchema = userSchema.fork(["password"], (userSchema) =>
    userSchema.optional()
  );
  const { error } = verificationSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      status: "400 Bad Request",
      contentType: "application/json",
      responseBody: {
        message: error.message,
      },
    });
  }

  try {
    const user = await User.findOne({ email: req.body.email });

    if (user.verify === true) {
      return res.status(400).json({
        status: "400 Bad Request",
        contentType: "application/json",
        responseBody: {
          message: "Verification has already been passed",
        },
      });
    }
    const newToken = uuidv4();

    user.verificationToken = newToken;
    await user.save();

    const mailOptions = {
      from: "krzysztof.wiskowski@gmail.com",
      to: "krzysztof.wiskowski@gmail.com",
      subject: "Email Verification",
      html: `<p>Please verify your email by clicking on the following link: <a href="http://localhost:3000/api/users/verify/${newToken}">Verify Email</a></p>`,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      status: "200 OK",
      contentType: "application/json",
      responseBody: {
        message: "Verification email sent",
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  logout,
  auth,
  current,
  updateSub,
  updateAvatar,
  verifyEmail,
  sendVerification,
};
