require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB");

    const db = client.db("booknook");
    const booksCollection = db.collection("books");

    // GET /books  (public)
    // ?sort=newest&limit=6  -> latest books
    // ?email=someone@mail.com -> books added by that user
    app.get("/books", async (req, res) => {
      try {
        const { email, sort, limit } = req.query;
        const query = {};
        if (email) query.userEmail = email;

        let cursor = booksCollection.find(query);
        if (sort === "newest") cursor = cursor.sort({ addedAt: -1 });
        if (limit) cursor = cursor.limit(Number(limit));

        const books = await cursor.toArray();
        res.send(books);
      } catch (error) {
        res.status(500).send({ message: "Failed to load books" });
      }
    });

    // GET /books/:id
    app.get("/books/:id", async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid book id" });
        }
        const book = await booksCollection.findOne({ _id: new ObjectId(id) });
        if (!book) {
          return res.status(404).send({ message: "Book not found" });
        }
        res.send(book);
      } catch (error) {
        res.status(500).send({ message: "Failed to load the book" });
      }
    });

    // POST /books
    app.post("/books", async (req, res) => {
      try {
        const book = {
          ...req.body,
          copies: Number(req.body.copies),
          addedAt: new Date(),
        };
        const result = await booksCollection.insertOne(book);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to add the book" });
      }
    });

    // PATCH /books/:id
    app.patch("/books/:id", async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid book id" });
        }
        const updates = { ...req.body };
        delete updates._id;
        if (updates.copies !== undefined) {
          updates.copies = Number(updates.copies);
        }
        const result = await booksCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updates }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update the book" });
      }
    });

    // DELETE /books/:id
    app.delete("/books/:id", async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid book id" });
        }
        const result = await booksCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete the book" });
      }
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }
}
run();

app.get("/", (req, res) => {
  res.send("BookNook server is running");
});

app.listen(port, () => {
  console.log(`BookNook server listening on port ${port}`);
});