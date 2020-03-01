var request = require("request");
var cheerio = require("cheerio");
let express = require('express'),
    session = require('express-session'),
    FileStore = require('session-file-store')(session),
    app = express();
var mysql = require('mysql');
const path = require("path");
const port = 3000;

var con = mysql.createConnection({
    host: "192.168.64.2",
    user: "romeo",
    password: "qw123456",
    database: "manga"
});


con.connect();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
    store: new FileStore({
        path: './session-store'
    }),
    name: '_fs_demo',
    secret: 'imtheshadowiwillfindwhobehidetheshadow',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 5
    }
}));

var index_html;
var bool_html = false;
function getIndex() {
    console.log('getindex');
    try {
        request('https://cumanga.com/', function (error, req, html) {
            if (!error & req.statusCode == 200) {
                index_html = html;
                bool_html = true;
            }
        });
    } catch (error) {
        console.log(error);
    }

}
getIndex();
setInterval(getIndex, 300000);


app.get('/', function (req, reser) {
    // reser.send(req.session.text);
    var mangareaded = req.session.readedmanga_name;
    if (mangareaded == undefined) {
        req.session.readedmanga_name = [];
        req.session.readedmanga_image = [];
        req.session.readedmanga_url = [];
    }
    reser.render('index', { session: req.session });
});

app.get('/manga/:name', function (req, reser) {
    reser.render('manga_detail', { name: req.params.name });
});


// AJAX 

app.get('/ajax/detail/onpage/:name', async function (reqer, reser) {
    var named = reqer.params.name;
    var image = '';
    var title = '';
    var des = '';
    try {
        request('https://cumanga.com/manga-' + named + '/', async function (error, req, html) {
            if (!error & req.statusCode == 200) {
                try {
                    var $ = cheerio.load(html);
                    image = $(".doujin_post").attr("style").substr($(".doujin_post").attr("style").indexOf("('") + 2, $(".doujin_post").attr("style").length);
                    image = image.replace("');", '');
                    title = $("title").text().replace('อ่าน: ', '').replace(' | Read Manga: CuManga.com', '').trim();
                    des = $(".text-light").eq(3).text();
                    var mangareaded = reqer.session.readedmanga_name;
                    console.log(mangareaded);
                    if (mangareaded == undefined) {
                        reqer.session.readedmanga_name = [];
                        reqer.session.readedmanga_image = [];
                        reqer.session.readedmanga_url = [];
                    }
                    console.log(reqer.session.readedmanga_name.indexOf(title));
                    if (reqer.session.readedmanga_name.indexOf(title) >= 0) {
                        var ii = reqer.session.readedmanga_name.indexOf(title);
                        console.log('runn');
                        reqer.session.readedmanga_name.splice(reqer.session.readedmanga_name.indexOf(title), 1);
                        reqer.session.readedmanga_image.splice(reqer.session.readedmanga_image.indexOf(image), 1);
                        reqer.session.readedmanga_url.splice(ii, 1);
                    }
                    if (reqer.session.readedmanga_name[reqer.session.readedmanga_name.length - 1] != title) {
                        reqer.session.readedmanga_name.push(title);
                        reqer.session.readedmanga_image.push(image);
                        reqer.session.readedmanga_url.push(named);

                    }
                    // reqer.session.destroy();
                    // reqer.session = null;
                    console.log(reqer.session.readedmanga_name);
                    reser.render('ajax/detail/onPage', { name: reqer.params.name, image: image, title: title, des: des });


                } catch (error) {
                    console.log(error);

                }


            }
        });
    } catch (error) {
        console.log(error);
    }
});

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