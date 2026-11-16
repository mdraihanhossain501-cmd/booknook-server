require("dotenv").config();
const { MongoClient } = require("mongodb");

const OWNER = { userName: "Raihan", userEmail: "mdraihanhossain501@gmail.com" };
const cover = (isbn) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

const books = [
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    category: "Fiction",
    isbn: "9780141439518",
    copies: 4,
    description:
      "A sharp, witty story of Elizabeth Bennet and Mr Darcy, and how first impressions can mislead.",
  },
  {
    title: "A Brief History of Time",
    author: "Stephen Hawking",
    category: "Science",
    isbn: "9780553380163",
    copies: 3,
    description:
      "A clear introduction to black holes, the Big Bang and the nature of time for general readers.",
  },
  {
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    category: "History",
    isbn: "9780062316110",
    copies: 5,
    description:
      "Follows the story of our species from early hunter-gatherers to the modern world.",
  },
  {
    title: "Charlotte's Web",
    author: "E. B. White",
    category: "Kids",
    isbn: "9780064400558",
    copies: 4,
    description:
      "A gentle tale of friendship between a pig named Wilbur and a clever spider named Charlotte.",
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    category: "Others",
    isbn: "9780735211292",
    copies: 5,
    description:
      "Practical ideas for building good habits and breaking bad ones through small daily changes.",
  },
  {
    title: "1984",
    author: "George Orwell",
    category: "Fiction",
    isbn: "9780451524935",
    copies: 3,
    description:
      "A dystopian novel about surveillance, control and the struggle to think freely.",
  },
  {
    title: "Cosmos",
    author: "Carl Sagan",
    category: "Science",
    isbn: "9780345539434",
    copies: 3,
    description:
      "A journey through the universe and the story of how people came to understand it.",
  },
  {
    title: "Guns, Germs, and Steel",
    author: "Jared Diamond",
    category: "History",
    isbn: "9780393317558",
    copies: 2,
    description:
      "Explores why some societies grew powerful while others did not, from geography to disease.",
  },
  {
    title: "Matilda",
    author: "Roald Dahl",
    category: "Kids",
    isbn: "9780142410370",
    copies: 4,
    description:
      "A bright girl who loves books uses her wits and special powers to stand up to unkind adults.",
  },
  {
    title: "Deep Work",
    author: "Cal Newport",
    category: "Others",
    isbn: "9781455586691",
    copies: 3,
    description:
      "Why focused, distraction-free work is rare and valuable, and how to train for it.",
  },
  {
    title: "The Alchemist",
    author: "Paulo Coelho",
    category: "Fiction",
    isbn: "9780062315007",
    copies: 4,
    description:
      "A shepherd boy travels in search of treasure and learns to follow his dreams.",
  },
  {
    title: "The Selfish Gene",
    author: "Richard Dawkins",
    category: "Science",
    isbn: "9780198788607",
    copies: 2,
    description:
      "A classic look at evolution from the point of view of genes rather than whole animals.",
  },
  {
    title: "The Diary of a Young Girl",
    author: "Anne Frank",
    category: "History",
    isbn: "9780553296983",
    copies: 3,
    description:
      "The diary of a young girl hiding with her family during the Second World War.",
  },
  {
    title: "The Very Hungry Caterpillar",
    author: "Eric Carle",
    category: "Kids",
    isbn: "9780399226908",
    copies: 5,
    description:
      "A tiny caterpillar eats his way through a week of food and turns into a butterfly.",
  },
  {
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    category: "Others",
    isbn: "9780374533557",
    copies: 2,
    description:
      "How two systems of thinking shape our judgments, and why we often make errors.",
  },
];

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const collection = client.db("booknook").collection("books");
    const now = Date.now();
    let added = 0;

    for (let i = 0; i < books.length; i++) {
      const { isbn, ...book } = books[i];
      const exists = await collection.findOne({
        title: book.title,
        userEmail: OWNER.userEmail,
      });
      if (exists) continue;

      await collection.insertOne({
        ...book,
        image: cover(isbn),
        ...OWNER,
        addedAt: new Date(now - i * 60 * 60 * 1000),
      });
      added++;
    }
    console.log(`Added ${added} books`);
  } finally {
    await client.close();
  }
}

run().catch((error) => {
  console.error("Seeding failed:", error.message);
  process.exit(1);
});