const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.sendStatus(401);
  const id = req.params.id;
  
  jwt.verify(token, process.env.ACCESS_TOKEN_SECERT, (err, user) => {
    if (!err && id){
      req.user = user;
      next();
    }else{ 
      return res.sendStatus(403).json({message: "User not authenticated"});
    };
  });
}

module.exports = { authenticateToken };
