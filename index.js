const express = require("express");
const app = express();

const cors = require("cors");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const ObjectId = require("mongodb").ObjectId;
const { MongoClient, ServerApiVersion } = require("mongodb");

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.m0coh.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//jwt authentication token
const generateJWTToken = (user) => {
  return jwt.sign(user, process.env.JWT_SECRET_KEY, { expiresIn: "500s" });
};

const verifyJWTToken = (req, res, next) => {
  try {
    const { authorization } = req.headers;
    const decoded = jwt.verify(authorization, process.env.JWT_SECRET_KEY);
    req.decodedEmail = decoded.email;
    next();
  } catch {}
};

async function run() {
  try {
    await client.connect();
    const database = client.db("programming_hero");
    const usersCollection = database.collection("users");
    const billingsCollection = database.collection("billing-list");

    //register
    app.post("/api/registration", async (req, res) => {
      const hashedPass = await bcrypt.hash(req.body.password, 10);
      const newUser = {
        displayName: req.body.name,
        password: hashedPass,
        email: req.body.email,
      };
      const result = await usersCollection.insertOne(newUser);
      res.json(result);
    });

    //login
    app.post("/api/login", async (req, res) => {
      const userInfo = req.body;
      const newUser = {
        email: userInfo.email,
        password: "jwttoken",
      };
      const token = generateJWTToken(newUser);
      const query = { email: userInfo.email };
      const user = await usersCollection.findOne(query);

      const matchedUser = {
        displayName: user.displayName,
        email: user.email,
      };
      console.log("match", matchedUser);

      const passValidate = await bcrypt.compare(
        userInfo.password,
        user.password
      );

      if (passValidate) {
        console.log("password is correct");
        res.json({ token: token, status: "login", user: matchedUser });
      } else {
        console.log("password is incorrect");
        res.json({ status: "notlogin" });
      }
    });

    // create bill
    app.post("/api/add-billing", async (req, res) => {
      const newBilling = req.body;
      const result = await billingsCollection.insertOne(newBilling);
      res.send(result);
    });

    // get all billings
    app.get("/api/billing-list", async (req, res) => {
      const query = {};

      const cursor = billingsCollection.find(query);
      const billings = await cursor.toArray();
      res.send(billings);
    });

    // get single bill
    app.get("/api/update-billing/:id", async (req, res) => {
      const result = await billingsCollection
        .find({ _id: ObjectId(req.params.id) })
        .toArray();
      res.send(result[0]);
    });

    // update
    app.put("/api/update-billing/:id", async (req, res) => {
      const id = req.params.id;
      const updatedBill = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          fullName: updatedBill.fullName,
          email: updatedBill.email,
          phone: updatedBill.phone,
          paidAmount: updatedBill.paidAmount,
        },
      };
      const result = await billingsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    //delete bill
    app.delete("/api/delete-billing/:id", async (req, res) => {
      const result = await billingsCollection.deleteOne({
        _id: ObjectId(req.params.id),
      });
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Programming Hero!");
});

app.listen(port, () => {
  console.log(`listening at ${port}`);
});
