const dns = require("node:dns");
dns.setServers(["1.1.1.1", "1.0.0.1"]);

const express = require("express");
const dontenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dontenv.config();
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const { fileURLToPathBuffer } = require("node:url");
const uri = process.env.MONGODB_URI;

const app = express();
const PORT = process.env.PORT;

app.use(
  cors({
    credentials: true,
    origin: [process.env.NEXT_CLIENT_URL],
  }),
);
app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const JWKS = createRemoteJWKSet(
  new URL(`${process.env.NEXT_CLIENT_SIDE_URI}/api/auth/jwks`),
);

// Fixed: correct casing, awaited jwtVerify, async middleware
const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Token missing" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload; // available to downstream routes
    console.log(payload);
    next();
  } catch (error) {
    console.error("JWT verify error:", error.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

async function run() {
  try {
    // await client.connect();
    const db = client.db("ebookdb");
    const ebookcollection = db.collection("ebookdb");
    const paymentcollection = db.collection("payment");
    const usercollection = db.collection("user");
    //get api with limit
    app.get("/limit/ebook", async (req, res) => {
      const result = await ebookcollection.find().limit(8).toArray();
      res.send(result);
    });
    //GET API for single card view
    app.get("/ebook/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const query = {
          _id: new ObjectId(id),
        };
        const result = await ebookcollection.findOne(query);
        if (!result) {
          return res.status(404).send({
            message: "Ebook not found",
          });
        }
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({
          message: "Failed to fetch ebook",
        });
      }
    });
    //POST API for Payment info
    app.post("/payment", async (req, res) => {
      try {
        const { sessionId, userId, productId, title, price } = req.body;
        const userObjectId = new ObjectId(userId);

        const paymentResult = await paymentcollection.insertOne({
          userId: userObjectId,
          sessionId,
          productId,
          title,
          price: Number(price),
        });

        res.status(200).json({
          message: "Subscription created successfully",
          paymentResult,
        });
      } catch (error) {
        console.error("Subscription error:", error);
        res.status(500).json({ message: "Failed to create subscription" });
      }
    });
    //get api for Admin user data
    app.get("/admin/user", async (req, res) => {
      try {
        const result = await usercollection.findOne();
        if (!result) {
          return res.status(404).send({
            message: "Ebook not found",
          });
        }
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({
          message: "Failed to fetch ebook",
        });
      }
    });
    //get api for Admin transaction
    app.get("/admin/ebook", async (req, res) => {
      const result = await ebookcollection.find().toArray();
      res.send(result);
    });
    // POST api for product collection
    app.post("/products", async (req, res) => {
      try {
        const data = req.body;

        const result = await ebookcollection.insertOne({
          ...data,
          price: Number(data.price),
        });

        res.status(201).json({
          success: true,
          message: "Product inserted successfully",
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error("Error inserting product:", error);

        res.status(500).json({
          success: false,
          message: "Failed to insert product",
        });
      }
    });
    //api for search and get product
    app.get("/search/ebook", async (req, res) => {
      const { search } = req.query;
      const query = {};

      if (search && search != "undefined") {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }
      const result = await ebookcollection.find(query).limit(8).toArray();
      res.send(result);
    });

    //Api for pagination
    app.get("/pagination/ebook", async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 8;
        const page = parseInt(req.query.page) || 1;

        const skip = (page - 1) * limit;

        const total_product = await ebookcollection.countDocuments();

        const total_pages = Math.ceil(total_product / limit);

        const result = await ebookcollection
          .find()
          .skip(skip)
          .limit(limit)
          .toArray();

        res.send({
          result,
          total_product,
          total_pages,
          limit,
          page,
          skip,
        });
      } catch (error) {
        console.error("Pagination error:", error);

        res.status(500).send({
          message: "Failed to fetch products",
        });
      }
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server is running fine!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
fileURLToPathBuffer;
