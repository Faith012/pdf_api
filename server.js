const express = require("express")
const app = express()
const path = require("path")

app.set("views", path.join(__dirname, "views"))

app.use("/pdf", express.static(path.join(__dirname, "pdf")))

app.set("view engine", "ejs")

// app.get("/pdf/:file", (req, res) => {
//   res.sendFile(`${__dirname}/pdf/${req.params.file}`)
// })

app.get("/", (req, res) => {
  res.send("PDF API is running")
})

app.get("/pdf/:id/:file", (req, res) => {
  res.render("pdf", { file: `${req.params.id}/${req.params.file}`})
})

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started on port 3000")
})
