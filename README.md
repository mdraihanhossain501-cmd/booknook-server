# BookNook Server

Express and MongoDB API for the BookNook online library.

**Live API:** https://booknook-server-phi.vercel.app
**Client repository:** https://github.com/mdraihanhossain501-cmd/booknook-client

## Routes

- `GET /books` - all books (public). Supports `?sort=newest&limit=6` and `?email=`
- `GET /books/:id` - one book (public)
- `POST /books` - add a book (JWT)
- `PATCH /books/:id` - update your own book (JWT)
- `DELETE /books/:id` - delete your own book (JWT)
- `POST /borrows` - borrow a book, copies go down by 1 (JWT)
- `GET /borrows` - the logged in user's borrows (JWT)
- `DELETE /borrows/:id` - return a book, copies go up by 1 (JWT)

## Environment variables

- `MONGODB_URI`
- `JWT_SECRET`

## Run locally

Run `npm install`, then `npm run dev`.