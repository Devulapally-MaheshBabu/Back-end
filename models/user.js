const { createHmac, randomBytes } = require("crypto");
const { Schema, model } = require("mongoose");
const { createTokenForUser } = require('../services/authentication');

const UserSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    salt: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    profileImageURL: {
      type: String,
      default: "/default.png",
    },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
      default: "USER",
    },
  },
  { timestamps: true }
);

UserSchema.pre("save", function (next) {
  const user = this;

  if (!user.isModified("password")) return;


  const salt = randomBytes(16).toString( )
  const hashedPassword = createHmac("sha256", salt)
    .update(user.password)
    .digest("hex");

  this.salt = salt;
  this.password = hashedPassword;

  next();
});

UserSchema.static("matchPasswordAndGenerateToken",async function(email,password){
    const user=await this.findOne({email})
    if(!user) throw new Error('user not found')

    const salt =user.salt
    const hashedPassword=user.password

    const userProvidedHash=createHmac("sha256", salt)
    .update(password)
    .digest("hex")

     if(userProvidedHash!==hashedPassword)
         throw new Error('user incorrect password')

     const token=createTokenForUser({
    _id: user._id,
    fullName: user.fullName, 
    email: user.email,
  });


    return token
})


 const User=model('user',UserSchema)

 module.exports=User