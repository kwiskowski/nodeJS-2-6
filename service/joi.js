const Joi = require("joi");

const userSchema = Joi.object({
  password: Joi.string().required(),
  email: Joi.string()
    .email({
      minDomainSegments: 2,
      tlds: { allow: ["com", "net"] },
    })
    .required(),
  subscription: Joi.string()
    .valid("starter", "pro", "business")
    .default("starter"),
  token: Joi.string().default(null),
  avatarURL: Joi.string(),
  verify: Joi.boolean().default(false),
  verificationToken: Joi.string(),
});

const contactSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string()
    .email({
      minDomainSegments: 2,
      tlds: { allow: ["com", "net"] },
    })
    .required(),
  phone: Joi.number().integer().positive().required(),
  favorite: Joi.bool(),
  owner: Joi.string().alphanum().required(),
});

module.exports = { userSchema, contactSchema };
