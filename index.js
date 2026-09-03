const dns = require("node:dns");
dns.setServers(["1.1.1.1", "1.0.0.1"]);

const express = require("express");
const dontenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
dontenv.config();

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

async function run() {
  try {
    // await client.connect();
    const db = client.db("ebookdb");
    const ebookcollection = db.collection("ebookdb");
    const paymentcollection = db.collection("payment");
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
