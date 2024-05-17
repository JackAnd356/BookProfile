const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');
const path = require('path');

dotenv.config();

const app = express();
const port = 3000;
const prompt = "Stop to shutdown the server: ";

app.set('view engine', 'ejs');
app.set("views", path.resolve(__dirname, "templates"));

app.use(bodyParser.urlencoded({ extended: true }));

const matildaUri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.ffhbi5b.mongodb.net/${process.env.MONGO_DB_NAME}`;
const jackUri = `mongodb+srv://jackanderson124680:Karate77@cluster0.ffhbi5b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
console.log(jackUri);

let client;
(async () => {
    try {
        client = new MongoClient(jackUri);
        await client.connect();

        app.listen(port, () => {
            console.log(`Server is running on port ${port}`);
            process.stdout.write(prompt);
        });
    } catch (err) {
        console.error("Error connecting to MongoDB:", err);
        process.exit(1);
    }
})();

/*Render home/"index" page*/
app.get("/", (req, res) => {
    res.render("index");
});

/*Render lookup page*/
app.get("/lookup", (req, res) => {
    res.render("lookup", {port: port}); 
});

/*To display API lookup and insert user's input to mongo*/
app.post('/lookupRequest', async (req, res) => {
    const title = req.body.title;
    const author = req.body.author;

    try {
        const response = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`);
        const data = await response.json();

        if (data.docs.length === 0) {
            res.send('No books found.');
        } else {
            const book = data.docs[0];

            async function mongoInsert() {
                try {

                    let bookData = {
                        title: book.title,
                        author: book.author_name ? book.author_name.join(', ') : 'N/A',
                        first_publish_year: book.first_publish_year || 'N/A',
                        publisher: book.publisher ? book.publisher[0] : 'N/A',
                        isbn: book.isbn ? book.isbn[0] : 'N/A'
                    };

                    await insertData(client, bookData);
                } catch (e) {
                    console.error(e);
                } finally {
                    await client.close();
                }
            }

            async function insertData(client, newData) {
                const database = client.db(process.env.MONGO_DB_NAME);
                const collection = database.collection("bookProfile");
                await collection.insertOne(newData);
            }

            await mongoInsert().catch(console.error);

            res.send(`
                <h1>Book Information</h1>
                <p><strong>Title:</strong> ${book.title}</p>
                <p><strong>Author:</strong> ${book.author_name ? book.author_name.join(', ') : 'N/A'}</p>
                <p><strong>First Published Year:</strong> ${book.first_publish_year || 'N/A'}</p>
                <p><strong>Publisher:</strong> ${book.publisher ? book.publisher[0] : 'N/A'}</p>
                <p><strong>ISBN:</strong> ${book.isbn ? book.isbn[0] : 'N/A'}</p>
                <a href="/">Search another book</a>
            `);
        }
    } catch (error) {
        res.send('Error occurred while searching for the book.');
    }
});

/*To display user's read books*/
app.get("/profile", async (req, res) => {
    const collection = client.db(process.env.MONGO_DB_NAME).collection("bookProfile");
    const applications = await collection.find({}).toArray();

    output = `<table border='1' style="double"><tr><th>Title</th><th>Book</th></tr>`;
    applications.forEach(appl => {
        output += `<tr><td>${appl.title}</td><td>${appl.author}</td></tr>`;
    });
    output += `</table>`;
    res.render("profile", {profileTable: output.trim()});
});

process.stdin.on("readable", function () {
    const dataInput = process.stdin.read();
    if (dataInput !== null) {
      const command = dataInput.toString().trim();
      if (command === "stop") {
          process.stdout.write("Shutting down the server\n");
          client.close(); 
          process.exit(0);
      } else {
          process.stdout.write(`Invalid command: ${command}\n`);
      }
      process.stdout.write(prompt);
      process.stdin.resume();
    }
});
