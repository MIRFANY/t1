const express = require('express');
const path = require('path');

const { Pool } = require('pg');
const axios = require('axios');
const store = require('./db/store');

const app = express();


require('dotenv').config();
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Helper: get cover url from open library
async function getCoverUrl(isbn) {
    if (!isbn) return null;
    return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
}

// List all books
app.get('/books', async (req, res) => {
    try {
        const sort = req.query.sort || 'date_read DESC';
        const books = await store.getAll(sort);
        res.render('books', { books, dbError: store.isUsingFallback && store.isUsingFallback() });
    } catch (err) {
        console.error(err);
        res.render('books', { books: [], dbError: true });
    }
});

// Show form to add a book
app.get('/books/new', (req, res) => {
    res.render('form', { book: null });
});

// Add a new book
app.post('/books', async (req, res) => {
    try {
        const { title, author, review, rating, date_read, isbn } = req.body;
        const cover_url = await getCoverUrl(isbn);
        await store.create({ title, author, review, rating, date_read, isbn, cover_url });
        res.redirect('/books');
    } catch (err) {
        console.error(err);
        res.redirect('/books');
    }
});

// Show form to edit a book
app.get('/books/:id/edit', async (req, res) => {
    try {
        const book = await store.getById(req.params.id);
        res.render('form', { book });
    } catch (err) {
        console.error(err);
        res.redirect('/books');
    }
});

// Update a book
app.post('/books/:id', async (req, res) => {
    try {
        const { title, author, review, rating, date_read, isbn } = req.body;
        const cover_url = await getCoverUrl(isbn);
        await store.update(req.params.id, { title, author, review, rating, date_read, isbn, cover_url });
        res.redirect('/books');
    } catch (err) {
        console.error(err);
        res.redirect('/books');
    }
});

// Delete a book
app.post('/books/:id/delete', async (req, res) => {
    try {
        await store.remove(req.params.id);
        res.redirect('/books');
    } catch (err) {
        console.error(err);
        res.redirect('/books');
    }
});

// Home route
app.get('/', (req, res) => {
    res.render('index');
});

// 404 handler
app.use((req, res) => {
    res.status(404).send('Page not found');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
