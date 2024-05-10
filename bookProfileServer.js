const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');
const path = require('path');

dotenv.config();

const app = express();
const port = process.argv[2] || 3000;
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

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/apply", (req, res) => {
    res.render("apply", {port: port});
});

app.get("/post", (req, res) => {
    res.render("review"); 
});


app.post("/application", async (req, res) => {
    const currentDate = new Date();
    const formattedDate = "Task completed at " + currentDate.toString();
    const name = req.body.name;
    const email = req.body.email;
    const gpa = req.body.gpa;
    const background = req.body.background;

    const collection = client.db(process.env.MONGO_DB_NAME).collection("applications");

    const application = {
        name: name,
        email: email,
        gpa: parseFloat(gpa),
        background: background,
        submittedAt: new Date()
    };

    const result = await collection.insertOne(application);

    res.render("processApplication", {name: name, email: email, gpa: gpa, background: background, time: formattedDate});
});

app.get("/review", (req, res) => {
    res.render("reviewApplication", {port: port});
});

app.post("/reviewSubmit", async (req, res) => {
    const email = req.body.email;
    const collection = client.db(process.env.MONGO_DB_NAME).collection("applications");
    const application = await collection.findOne({ email: email });
    const formattedDate = "Task completed at " + application.submittedAt;
    res.render("processReviewApplication", {name: application.name, email: application.email, gpa: application.gpa, background: application.background, time: formattedDate});
});

app.get("/gpa", (req, res) => {
    res.render("adminGFA", {port: port});
});

app.post("/gpaSubmit", async (req, res) => {
    const minGPA = parseFloat(req.body.gpa);
    const collection = client.db(process.env.MONGO_DB_NAME).collection("applications");
    const applications = await collection.find({ gpa: { $gte: minGPA } }).toArray();

    output = `<table border='1'><tr><th>Name</th><th>GPA</th></tr>`;
    applications.forEach(appl => {
        output += `<tr><td>${appl.name}</td><td>${appl.gpa}</td></tr>`;
    });
    output += `</table>`;
    res.render("processAdminGFA", {table: output.trim()});
});

app.get("/remove", (req, res) => {
    res.render("adminRemove", {port: port});
});

app.post("/removeSubmit", async (req, res) => {
    const collection = client.db(process.env.MONGO_DB_NAME).collection("applications");
    const result = await collection.deleteMany({});
    res.render("processAdminRemove", {numRemoved: result.deletedCount});
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
