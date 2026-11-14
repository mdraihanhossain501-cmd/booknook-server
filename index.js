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
    const borrowsCollection = db.collection("borrows");

    // GET /books
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

    // POST /borrows
    app.post("/borrows", async (req, res) => {
      try {
        const { bookId, userEmail } = req.body;
        if (!bookId || !userEmail || !ObjectId.isValid(bookId)) {
          return res.status(400).send({ message: "Invalid borrow request" });
        }

        const book = await booksCollection.findOne({
          _id: new ObjectId(bookId),
        });
        if (!book) {
          return res.status(404).send({ message: "Book not found" });
        }

        // No double borrow
        const alreadyBorrowed = await borrowsCollection.findOne({
          bookId,
          userEmail,
        });
        if (alreadyBorrowed) {
          return res
            .status(409)
            .send({ message: "You have already borrowed this book" });
        }

        // Take one copy only if at least one is left
        const decrement = await booksCollection.updateOne(
          { _id: new ObjectId(bookId), copies: { $gt: 0 } },
          { $inc: { copies: -1 } }
        );
        if (decrement.modifiedCount === 0) {
          return res
            .status(400)
            .send({ message: "This book is not available right now" });
        }

        const borrowDate = new Date();
        const returnDate = new Date(borrowDate);
        returnDate.setDate(returnDate.getDate() + 7);

        const borrow = {
          bookId,
          bookTitle: book.title,
          bookImage: book.image,
          userEmail,
          borrowDate,
          returnDate,
        };

        try {
          const result = await borrowsCollection.insertOne(borrow);
          res.status(201).send(result);
        } catch (insertError) {
          // Give the copy back if saving the borrow failed
          await booksCollection.updateOne(
            { _id: new ObjectId(bookId) },
            { $inc: { copies: 1 } }
          );
          throw insertError;
        }
      } catch (error) {
        res.status(500).send({ message: "Failed to borrow the book" });
      }
    });

    // GET /borrows?email=...
    app.get("/borrows", async (req, res) => {
      try {
        const { email } = req.query;
        if (!email) {
          return res.status(400).send({ message: "Email is required" });
        }
        const borrows = await borrowsCollection
          .find({ userEmail: email })
          .sort({ borrowDate: -1 })
          .toArray();
        res.send(borrows);
      } catch (error) {
        res.status(500).send({ message: "Failed to load borrows" });
      }
    });

    // DELETE /borrows/:id  (return a book)
    app.delete("/borrows/:id", async (req, res) => {
      try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
          return res.status(400).send({ message: "Invalid borrow id" });
        }

        const borrow = await borrowsCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!borrow) {
          return res.status(404).send({ message: "Borrow record not found" });
        }

        const result = await borrowsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        if (result.deletedCount === 1) {
          await booksCollection.updateOne(
            { _id: new ObjectId(borrow.bookId) },
            { $inc: { copies: 1 } }
          );
        }
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to return the book" });
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