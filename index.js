var request = require("request");
var cheerio = require("cheerio");
let express = require('express'),
session = require('express-session'),
FileStore = require('session-file-store')(session),
app = express();
const path = require("path");
const port = 3000;

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    store: new FileStore({

        path: './session-store'

    }),
    name: '_fs_demo', // cookie will show up as foo site
    secret: 'imtheshadowiwillfindwhobehidetheshadow',
    resave: false,
    saveUninitialized: false,
    cookie: {
        // five year cookie
        maxAge: 1000 * 60 * 60 * 24 * 365 * 5
    }
}));

var index_html;
var bool_html = false;
function getIndex() {
    console.log('getindex');
    request('https://cumanga.com/', function (error, req, html) {
        if (!error & req.statusCode == 200) {
            index_html = html;
            bool_html = true;
        }
    });
}
getIndex();
setInterval(getIndex, 300000);


app.get('/', function (req, reser) {
    // reser.send(req.session.text);
    reser.render('index');
});

// AJAX 
app.get('/ajax/index/update', async function (req, reser) {

    var image = [];
    var name = [];
    var ep = [];
    var url = [];
    if (bool_html) {
        var $ = await cheerio.load(index_html);
        try {
            console.log($("style").length);
            for (var i = 0; i < 4; i++) {
                var one = ($("style").eq(i).html().substr($("style").eq(i).html().indexOf("'"), $("style").eq(i).html().length));
                image[i] = one.substr(1, one.indexOf("')") - 1);
                name[i] = $(".doujin_name").eq(i).text();
                ep[i] = $('.doujin_t_red').eq(i).text();
                url[i] = $('.col-6').eq(i).attr("href");
            }
            console.log(name);
            reser.render('ajax/index/update', { name: name, image: image, ep: ep, url: url });
        } catch (error) {
            console.log(error);
        }
    }
});
app.get('/ajax/index/updateall', async function (req, reser) {
    var image = [];
    var name = [];
    var ep = [];
    var url = [];
    if (bool_html) {
        var $ = await cheerio.load(index_html);
        try {
            console.log($("style").length);
            for (var i = 0; i < $("style").length; i++) {
                var one = ($("style").eq(i).html().substr($("style").eq(i).html().indexOf("'"), $("style").eq(i).html().length));
                image[i] = one.substr(1, one.indexOf("')") - 1);
                name[i] = $(".doujin_name").eq(i).text();
                ep[i] = $('.doujin_t_red').eq(i).text();
                url[i] = $('.col-6').eq(i).attr("href");
            }
            console.log(name);
            reser.render('ajax/index/updateall', { name: name, image: image, ep: ep, url: url });
        } catch (error) {
            console.log(error);
        }
    }
});

app.listen(port, function () {
    console.log(`Runnn progame at port : ${port}!`);
});

module.exports = app;