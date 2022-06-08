const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  signupSchemaValidator,
  loginSchemaValidator,
  changePasswordSchemaValidator,
} = require("../validations/user");
const blog = require("../models").blog;
const users = require("../models").users;

// generate new access token
function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECERT, { expiresIn: "8h" });
}

// signup
router.post("/signup", signupSchemaValidator, async (req, res) => {
  const { id, name, email, password, role } = req.body;
  let errors = [];

  if (!name || !email || !password || !role) {
    errors.push({ msg: "Please enter all fields" });
  }

  if (password.length < 6) {
    errors.push({ msg: "Password must be at least 6 characters" });
  }
  if (errors.length > 0) {
    console.log("error");
    res.send(errors);
  } else {
    const ExistUser = await users.findOne({ where: { email } }).catch((err) => {
      res.send(err);
    });
    if (ExistUser) {
      return res.json({ message: "User with email already exist " });
    }
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      if (role === "basic") {
        await blog.create({
          id,
          name,
        });
      }
      await users.create({
        id,
        name,
        email,
        password: hashedPassword,
        role,
      });
      res.status(200).send(`${name} - Successfully Registered`);
    } catch {
      logger.error.log('error','Error: ',err)
      res.status(500).send(err);
    }
  }
});

router.get("/refreshToken/:id", async (req, res) => {
  const id = req.params.id;
  const user_data = await users.findOne({ where: { id } });
  if (user_data == null) return res.sendStatus(401);
  if (!user_data.refreshtoken) return res.sendStatus(403);

  jwt.verify(user_data.refreshtoken,process.env.REFRESH_TOKEN_SECERT,(err, user) => {
      if (err) return res.sendStatus(403);
      const accessToken = generateAccessToken({ email: user.email });
      res.json({ accessToken: accessToken });
    }
  );
});

// login
router.post("/login", loginSchemaValidator, async (req, res) => {
  const { email, password } = req.body;
  const userWithEmail = await users
    .findOne({ where: { email } })
    .catch((err) => {
      logger.error.log('error','Error: ',err)
      res.status(400).send(err);
    });
  try {
    if (await bcrypt.compare(password, userWithEmail.password)) {
      const user = { email: userWithEmail.email };
      const accessToken = generateAccessToken(user);
      const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECERT, {
        expiresIn: "7d",
      });
      await users.update(
        {
          refreshtoken: refreshToken,
          accesstoken: accessToken,
        },
        { where: { id: userWithEmail.id } }
      );
      res.status(200).json({
        message: `${userWithEmail.name} - Successfully Login`,
        AccessToken: accessToken,
        RefreshToken: refreshToken,
      });
    } else {
      res.status(403).send("Invalid Email or Password");
    }
  } catch {
    res.status(500).send();
  }
});

// changing password
router.put("/changePass",changePasswordSchemaValidator, async function (req, res) {
    const { email, newpassword } = req.body;
    const userWithEmail = await users
      .findOne({ where: { email } })
      .catch((err) => {
        console.log("error ", err);
      });
    try {
      const hashedPassword = await bcrypt.hash(newpassword, 10);
      await users.update({
          password: hashedPassword,
        },{
          where: { id: userWithEmail.id },
        }
      );
      res.status(200).send(`${userWithEmail.name} - Password changed Successfully `);
    } catch {
      logger.error.log('error','Error: ',err)
      res.status(500).send(err);
    }
  }
);

// logout
router.delete("/logout/:id", async (req, res) => {
  const id = req.params.id;
  const user_data = await users.findOne({ where: { id } });
  if (user_data.refreshtoken) {
    users.update({ refreshtoken: null }, { where: { id } });
  }
  res.status(403).send(` ${user_data.name} Successfully Logout`);
});

module.exports = router;