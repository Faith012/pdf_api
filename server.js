const express = require("express");

const bodyParser = require("body-parser");

const fs = require("fs")

const app = express();
const path = require("path");

app.set("views", path.join(__dirname, "views"));

app.use("/pdf", express.static(path.join(__dirname, "pdf")));

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// app.get("/pdf/:file", (req, res) => {
//   res.sendFile(`${__dirname}/pdf/${req.params.file}`)
// })

app.get("/", (req, res) => {
  res.send("PDF API is running");
});

app.get("/pdf/:id/:file", (req, res) => {
  res.render("pdf", { file: `${req.params.id}/${req.params.file}` });
});

app.get("/getFileNames/:id", (req, res) => {
  const id = req.params.id;
  const folderPath = path.join(__dirname, "pdf", id); // Replace 'your_folder_path' with the path to your folder

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read directory." });
    }

    const fileInfos = files.map((file) => {
      return {
        name: file,
        path: path.join(folderPath, file),
      };
    });

    res.send(fileInfos);
  });
});

app.post("/dummyPost", async (req, res) => {
  const user = {
    username: req.body.username,
    password: req.body.password,
    userLevel: req.body.userLevel,
  };

  res.send({
    message: "Requested POST successfully!",
    user: user,
  });
});

app.get("/dummyGet", async (req, res) => {
  const user = {
    username: req.body.username,
    password: req.body.password,
    userLevel: req.body.userLevel,
  };

  res.send({
    message: "Requested GET successfully!",
    user: user,
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started on port 3000");
});
