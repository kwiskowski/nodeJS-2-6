const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bCrypt = require("bcryptjs");

const contact = new Schema({
  name: {
    type: String,
    required: [true, "Set name for contact"],
  },
  email: {
    type: String,
  },
  phone: {
    type: String,
  },
  favorite: {
    type: Boolean,
    default: false,
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
});

// -------------------------------------------------------------------------------------------

const user = new Schema({
  password: {
    type: String,
    required: [true, "Password is required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
  },
  subscription: {
    type: String,
    enum: ["starter", "pro", "buisness"],
    default: "starter",
  },
  token: {
    type: String,
    default: null,
  },
  avatarURL: {
    type: String,
  },
});

user.methods.setPassword = async function (password) {
  this.password = await bCrypt.hash(password, 10);
};

user.methods.validatePassword = async function (password) {
  return await bCrypt.compare(password, this.password);
};

const Contact = mongoose.model("contacts", contact);
const User = mongoose.model("users", user);

module.exports = { Contact, User };
