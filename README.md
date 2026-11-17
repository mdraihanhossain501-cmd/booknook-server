# BookNook Server

Express and MongoDB API for the BookNook online library.

**Live API:** https://booknook-server-phi.vercel.app
**Client repository:** https://github.com/mdraihanhossain501-cmd/booknook-client

## Routes

- `GET /books` - all books (public). Supports `?sort=newest&limit=6`, `?email=` and `?category=`
- `GET /books/:id` - one book (public)
- `POST /books` - add a book (JWT)
- `PATCH /books/:id` - update your own book (JWT)
- `DELETE /books/:id` - delete your own book, and its borrow records (JWT)
- `POST /borrows` - borrow a book, copies go down by 1, one borrow per user per book (JWT)
- `GET /borrows` - the logged in user's borrows (JWT)
- `DELETE /borrows/:id` - return a book, copies go up by 1 (JWT)

Protected routes need an `Authorization: Bearer <token>` header. The token is a JWT signed with the shared `JWT_SECRET`.

## Environment variables

- `MONGODB_URI`
- `JWT_SECRET`

## Sample data

Run `node seed.js` once to add 15 sample books (3 per category). Books that already exist are skipped.

## Run locally

1. Run `npm install`
2. Create a `.env` file with the two variables above
3. Run `node index.js` (or `npm run dev` if your `package.json` has a `dev` script)