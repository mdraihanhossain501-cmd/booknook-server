require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
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

const db = client.db("booknook");
const booksCollection = db.collection("books");
const borrowsCollection = db.collection("borrows");

// Checks the JWT sent in the Authorization header
function verifyJWT(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized access" });
  }

  const token = header.split(" ")[1];
  jwt.verify(
    token,
    process.env.JWT_SECRET,
    { algorithms: ["HS256"] },
    (error, decoded) => {
      if (error) {
        return res.status(401).send({ message: "Invalid or expired token" });
      }
      req.user = decoded;
      next();
    }
  );
}

app.get("/", (req, res) => {
  res.send("BookNook server is running");
});

// GET /books (public)
app.get("/books", async (req, res) => {
  try {
    const { email, sort, limit } = req.query;
    const query = {};
    if (email) query.userEmail = email;

    let cursor = booksCollection.find(query);
    if (sort === "newest") cursor = cursor.sort({ addedAt: -1 });
      if (limit) {
      const limitNumber = Number(limit);
      if (Number.isInteger(limitNumber) && limitNumber > 0) {
        cursor = cursor.limit(Math.min(limitNumber, 50));
      }
    }

    const books = await cursor.toArray();
    res.send(books);
  } catch (error) {
    res.status(500).send({ message: "Failed to load books" });
  }
});

// GET /books/:id (public)
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

// POST /books (protected)
app.post("/books", verifyJWT, async (req, res) => {
  try {
    const { title, author, category, image, description, copies } = req.body;
    const copiesNumber = Number(copies);

    if (!title || !author || !category || !image || !description) {
      return res.status(400).send({ message: "All book fields are required" });
    }
    if (!Number.isInteger(copiesNumber) || copiesNumber < 1) {
      return res
        .status(400)
        .send({ message: "Total copies must be at least 1" });
    }

    const book = {
      title,
      author,
      category,
      image,
      description,
      copies: copiesNumber,
      userName: req.user.name,
      userEmail: req.user.email,
      addedAt: new Date(),
    };
    const result = await booksCollection.insertOne(book);
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to add the book" });
  }
});

// PATCH /books/:id (protected, owner only)
app.patch("/books/:id", verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid book id" });
    }

    const book = await booksCollection.findOne({ _id: new ObjectId(id) });
    if (!book) {
      return res.status(404).send({ message: "Book not found" });
    }
    if (book.userEmail !== req.user.email) {
      return res
        .status(403)
        .send({ message: "You can only edit your own books" });
    }

    const allowed = [
      "title",
      "author",
      "category",
      "image",
      "description",
      "copies",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.copies !== undefined) {
      const copiesNumber = Number(updates.copies);
      if (!Number.isInteger(copiesNumber) || copiesNumber < 0) {
        return res.status(400).send({ message: "Invalid copies value" });
      }
      updates.copies = copiesNumber;
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

// DELETE /books/:id (protected, owner only)
app.delete("/books/:id", verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid book id" });
    }

    const book = await booksCollection.findOne({ _id: new ObjectId(id) });
    if (!book) {
      return res.status(404).send({ message: "Book not found" });
    }
    if (book.userEmail !== req.user.email) {
      return res
        .status(403)
        .send({ message: "You can only delete your own books" });
    }

    const result = await booksCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete the book" });
  }
});

// POST /borrows (protected)
app.post("/borrows", verifyJWT, async (req, res) => {
  try {
    const { bookId } = req.body;
    const userEmail = req.user.email;

    if (!bookId || !ObjectId.isValid(bookId)) {
      return res.status(400).send({ message: "Invalid borrow request" });
    }

    const book = await booksCollection.findOne({ _id: new ObjectId(bookId) });
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

// GET /borrows (protected, returns the logged in user's borrows)
app.get("/borrows", verifyJWT, async (req, res) => {
  try {
    const borrows = await borrowsCollection
      .find({ userEmail: req.user.email })
      .sort({ borrowDate: -1 })
      .toArray();
    res.send(borrows);
  } catch (error) {
    res.status(500).send({ message: "Failed to load borrows" });
  }
});

// DELETE /borrows/:id (protected, user can return their own borrowed books)
app.delete("/borrows/:id", verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid borrow id" });
    }

    const borrow = await borrowsCollection.findOne({ _id: new ObjectId(id) });
    if (!borrow) {
      return res.status(404).send({ message: "Borrow record not found" });
    }
    if (borrow.userEmail !== req.user.email) {
      return res
        .status(403)
        .send({ message: "You can only return your own borrowed books" });
    }

    const result = await borrowsCollection.deleteOne({ _id: new ObjectId(id) });

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

// Run a local server only when not on Vercel
if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`BookNook server listening on port ${port}`);
  });
}

module.exports = app;