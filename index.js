const express = require("express");
var request = require("request");
var cheerio = require("cheerio");
const app = express();
const path = require("path");
const port = 3000;

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

var index_html;
request('https://www.kingsmanga.net/', function (error, req, html) {
    if (!error & req.statusCode == 200) {
        index_html = html;
    }
});



app.get('/', function (req, reser) {
    reser.render('index');
});

app.get('/ajax/index/update', async function (req, reser) {
    var image = [];
    try {
        $('div.post-body-alignment').each(function (i, elem) {
            image[i] = $(this).text();
        });
    } catch (error) {
        console.log(error);
    }
});

app.listen(port, function () {
    console.log(`Runnn progame at port : ${port}!`);
});

module.exports = app;