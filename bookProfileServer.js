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

const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.ffhbi5b.mongodb.net/${process.env.MONGO_DB_NAME}`;

let client;
(async () => {
    try {
        client = new MongoClient(uri);
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
    res.render("lookup"); 
});

/*To display API lookup and insert user's input to mongo*/
app.post("/lookupResults", async (req, res) => {
    const title = req.body.title;
    const author = req.body.author;

    async function main() {
        const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
        try {
            await client.connect();
        
            /* Inserting user data*/
            let data = {title: title, author: author};
            await insertData(client, databaseAndCollection, data);

        } catch (e) {
            console.error(e);
        } finally {
            await client.close();
        }
    }

    async function insertData(client, databaseAndCollection, newData) {
        const database = client.db(databaseAndCollection.db); 
        const collection = database.db(process.env.MONGO_DB_NAME).collection("bookProfile");

        const result = await collection.insertOne(newData); 
    }

    main().catch(console.error); 

    res.render("processApplication", {title: title, author: author});
});

/*To display user's read books*/
app.post("/profile", async (req, res) => {
    const minGPA = parseFloat(req.body.gpa);
    const collection = client.db(process.env.MONGO_DB_NAME).collection("applications");
    const applications = await collection.find({ gpa: { $gte: minGPA } }).toArray();

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
