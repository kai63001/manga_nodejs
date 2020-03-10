var request = require("request");
var cheerio = require("cheerio");
let express = require('express'),
    session = require('express-session'),
    FileStore = require('session-file-store')(session),
    app = express();
var mysql = require('mysql');
const SitemapGenerator = require('sitemap-generator');
const path = require("path");
const bodyParser = require('body-parser')
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
app.use(express.urlencoded());

app.use(express.json());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
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

    if (req.session.follow_name == undefined) {
        req.session.follow_name = [];
    }
    con.query("SELECT * FROM manga_detail ORDER BY md_view DESC LIMIT 10", function (error, reqd) {
        reser.render('index', { session: req.session ,req:reqd});

    });
});

app.get('/manga/page/:page', function (reqer, reser) {
    var image = [];
    var name = [];
    var ep = [];
    var url = [];
    var lastPage = 100;
    var page = reqer.params.page;
    if (!page) {
        page = 1;
    }
    if (page == 1) {
        request('https://cumanga.com/', function (error, res, html) {
            if (!error & res.statusCode == 200) {
                var $ = cheerio.load(html);
                try {
                    console.log($("style").length);
                    for (var i = 0; i < $("style").length; i++) {
                        var one = ($("style").eq(i).html().substr($("style").eq(i).html().indexOf("'"), $("style").eq(i).html().length));
                        image[i] = one.substr(1, one.indexOf("')") - 1);
                        name[i] = $(".doujin_name").eq(i).text();
                        ep[i] = $('.doujin_t_red').eq(i).text();
                        url[i] = $('.col-6').eq(i).attr("href");
                        lastPage = $('select').eq(0).children().length;
                    }
                    reser.render('list/manga_update', { name: name, image: image, ep: ep, url: url, lastPage: lastPage });
                } catch (error) {
                    console.log(error);
                }
            }
        });
    } else {
        request('https://cumanga.com/pages-' + page + '/', function (error, res, html) {
            if (!error & res.statusCode == 200) {
                var $ = cheerio.load(html);
                try {
                    console.log($("style").length);
                    for (var i = 0; i < $("style").length; i++) {
                        var one = ($("style").eq(i).html().substr($("style").eq(i).html().indexOf("'"), $("style").eq(i).html().length));
                        image[i] = one.substr(1, one.indexOf("')") - 1);
                        name[i] = $(".doujin_name").eq(i).text();
                        ep[i] = $('.doujin_t_red').eq(i).text();
                        url[i] = $('.col-6').eq(i).attr("href");
                        lastPage = $('select').eq(0).children().length;
                    }

                    console.log(name);
                    reser.render('list/manga_update', { name: name, image: image, ep: ep, url: url, lastPage: lastPage });
                } catch (error) {
                    console.log(error);
                }
            }
        });
    }

});

app.get('/manga/:name', function (reqer, reser) {
    con.query("SELECT * FROM lc WHERE lc_url = '" + reqer.params.name + "'", function (error, reqcon) {
        if (reqcon.length > 0) {
            reser.render('lc/lc', { req: reqcon });
        } else {
            if (reqer.session.watchep == undefined) {
                reqer.session.watchep = {};
            }
            if (reqer.session.watchep[reqer.params.name.toString()] == undefined) {
                reqer.session.watchep[reqer.params.name.toString()] = {};
            }
            if (reqer.session.watchep[reqer.params.name.toString()]["1"] == undefined) {
                reqer.session.watchep[reqer.params.name.toString()]["1"] = {};
            }
            if (reqer.params.name.indexOf(' ') >= 0) {
                reser.redirect('/manga/' + reqer.params.name.replace(/ /g, '-'));
            }

            var named = reqer.params.name;
            var image = '';
            var title = '';
            var des = '';
            var status = '';
            var year = '';
            var tags = [];
            var view = 1;
            var follow = 0;
            var like = 0;
            con.query("select * from manga_detail where md_url = '" + reqer.params.name.toString() + "'", async function (err, resquert) {
                if (resquert.length > 0) {
                    // reser.send('added');
                    image = resquert[0].md_image;
                    title = resquert[0].md_name;
                    des = resquert[0].md_des;
                    status = resquert[0].md_status;
                    year = resquert[0].md_year;
                    follow = resquert[0].md_follow;
                    like = resquert[0].md_like;
                    tags = resquert[0].md_tags.split(",");
                    view = parseInt(resquert[0].md_view) + 1;
                    con.query("update manga_detail set md_view = '" + view + "' where  md_url = '" + reqer.params.name.toString() + "'", async function (err, ressss) {

                    });
                    var mangareaded = reqer.session.readedmanga_name;
                    if (mangareaded == undefined) {
                        reqer.session.readedmanga_name = [];
                        reqer.session.readedmanga_image = [];
                        reqer.session.readedmanga_url = [];
                    }
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
                    reser.render('manga_detail', { name: reqer.params.name, image: image, title: title, des: des, tags: tags, view: view, year: year, status: status, session: reqer.session, follow: follow, like: like });


                } else {
                    try {
                        request('https://cumanga.com/manga-' + named + '/', async function (error, req, html) {
                            if (!error & req.statusCode == 200) {
                                try {
                                    var $ = cheerio.load(html);
                                    image = $(".doujin_post").attr("style").substr($(".doujin_post").attr("style").indexOf("('") + 2, $(".doujin_post").attr("style").length);
                                    image = image.replace("');", '');
                                    title = $("title").text().replace('อ่าน: ', '').replace(' | Read Manga: CuManga.com', '').trim();
                                    des = $(".text-light").eq(3).text();
                                    year = $(".text-light").eq(2).text();
                                    status = $(".text-light").eq(1).text();
                                    // console.log('https://www.anime-planet.com/manga/all?name='+title);
                                    var titleed = title.replace(/ /g, '+');

                                    request('https://www.anime-planet.com/manga/all?name=' + titleed, function (errorqqq, reqqq, htmler) {
                                        try {
                                            if (!errorqqq & reqqq.statusCode == 200) {
                                                try {
                                                    var htmled = htmler.substr(htmler.indexOf('<h4>Tags</h4>'), htmler.indexOf('display status0'));
                                                    htmled = htmled.substr(0, htmled.indexOf('myListBar'));
                                                    var $s = cheerio.load(htmled);
                                                    if (htmler.indexOf('<h4>Tags</h4>') >= 0) {
                                                        $s('a').each(function (i, elem) {
                                                            tags[i] = $s(this).text().replace(/\n/g, '');
                                                        });
                                                        console.log(tags);
                                                        con.query('insert into manga_detail (md_url,md_status,md_year,md_view,md_tags,md_des,md_image,md_name) values ("' + reqer.params.name + '","' + status + '","' + year + '","' + view + '","' + tags + '","' + des + '","' + image + '","' + title + '")', function (err, res) {
                                                        });
                                                        reser.render('manga_detail', { name: reqer.params.name, image: image, title: title, des: des, tags: tags, view: view, year: year, status: status, session: reqer.session, follow: follow, like: like });

                                                    } else {
                                                        titleed = titleed.substr(0, titleed.length / 3);
                                                        request('https://www.anime-planet.com/manga/all?name=' + titleed, function (errorqqq, reqqq, htmler) {
                                                            if (!errorqqq & reqqq.statusCode == 200) {
                                                                var htmled = htmler.substr(htmler.indexOf('<h4>Tags</h4>'), htmler.indexOf('display status0'));
                                                                htmled = htmled.substr(0, htmled.indexOf('myListBar'));
                                                                var $s = cheerio.load(htmled);
                                                                if (htmler.indexOf('<h4>Tags</h4>') >= 0) {
                                                                    $s('a').each(function (i, elem) {
                                                                        tags[i] = $s(this).text().replace(/\n/g, '');
                                                                    });
                                                                    console.log('asdasdasdasdasdas');
                                                                    console.log(tags);
                                                                    con.query('insert into manga_detail (md_url,md_status,md_year,md_view,md_tags,md_des,md_image,md_name) values ("' + reqer.params.name + '","' + status + '","' + year + '","' + view + '","' + tags + '","' + des + '","' + image + '","' + title + '")', function (serr, sres) {
                                                                        if (sres) {
                                                                            reser.render('manga_detail', { name: reqer.params.name, image: image, title: title, des: des, tags: tags, view: view, year: year, status: status, session: reqer.session, follow: follow, like: like });
                                                                        }
                                                                        if (serr) {
                                                                            console.log(serr);
                                                                        }
                                                                    });
                                                                } else {
                                                                    console.log('asdasdasdasdasdas2');
                                                                    con.query('insert into manga_detail (md_url,md_status,md_year,md_view,md_tags,md_des,md_image,md_name) values ("' + reqer.params.name + '","' + status + '","' + year + '","' + view + '","' + tags + '","' + des + '","' + image + '","' + title + '")', function (serr, sres) {
                                                                        if (sres) {
                                                                            reser.render('manga_detail', { name: reqer.params.name, image: image, title: title, des: des, tags: tags, view: view, year: year, status: status, session: reqer.session, follow: follow, like: like });
                                                                        }
                                                                        if (serr) {
                                                                            console.log(serr);
                                                                        }
                                                                    });


                                                                }
                                                            }
                                                        });
                                                    }
                                                } catch (errorqqq) {
                                                    console.log(errorqqq);
                                                }
                                            }
                                        } catch (error) {

                                        }

                                    });
                                    var mangareaded = reqer.session.readedmanga_name;
                                    if (mangareaded == undefined) {
                                        reqer.session.readedmanga_name = [];
                                        reqer.session.readedmanga_image = [];
                                        reqer.session.readedmanga_url = [];
                                    }
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
                                    console.log(tags);




                                } catch (error) {
                                    console.log(error);

                                }


                            }
                        });
                    } catch (error) {
                        console.log(error);
                    }
                }
            });
        }
    });



});

app.get('/manga/:name/read/:ep', function (reqer, reser) {
    con.query("SELECT * FROM lc WHERE lc_url = '" + reqer.params.name + "'", function (error, reqcon) {
        if (reqcon.length > 0) {
            reser.render('lc/lc', { req: reqcon });
        } else {
            name = reqer.params.name;
            ep = reqer.params.ep;
            var image = [];
            if (reqer.session.watchep == undefined) {
                reqer.session.watchep = {};
            }
            if (reqer.session.watchep[name.toString()] == undefined) {
                reqer.session.watchep[name.toString()] = {};
            }
            if (reqer.session.watchep[name.toString()][ep.toString()] == undefined) {
                reqer.session.watchep[name.toString()][ep.toString()] = {};
            }
            reqer.session.watchep[name.toString()][ep.toString()] = 1;
            // 
            try {
                request('https://cumanga.com/manga-' + reqer.params.name + '/ch-' + reqer.params.ep + '/', function (error, req, html) {
                    if (!error & req.statusCode == 200) {
                        var $ = cheerio.load(html);
                        $('img').each(function (i, elem) {
                            image[i] = $(this).attr('src');
                        });
                        reser.render('detail/read', { title: reqer.params.name.replace(/-/g, ' '), ep: reqer.params.ep, image: image, name: reqer.params.name, session: reqer.session });
                    }
                });
            } catch (error) {
                console.log(error);
            }
        }
    });


});

app.get('/tags/:tags', function (reqer, reser) {

    var perpage = 25;
    var page;
    if (reqer.query.page) {
        page = reqer.query.page;
    } else {
        page = 1;
    }

    var start = (page - 1) * perpage;
    con.query("SELECT * FROM manga_detail WHERE md_tags LIKE '%" + reqer.params.tags.toString() + "%' limit " + start + " , " + perpage, async function (err, resquert) {
        var lastPage = Math.ceil(resquert.length / perpage);
        reser.render('list/manga_tags', { tags: resquert, lastPage: lastPage });

    });
});


// ADMIN

app.get('/_moonlightshadow', async function (req, res) {
    console.log(req.session.admin);
    if (req.session.admin != undefined) {
        con.query("SELECT * FROM report ORDER BY r_id DESC LIMIT 6", function (error, req) {
            res.render('admin/admin', { req: req });
        });
    } else {
        res.render('admin/login');
    }
});

// AJAX 

app.post('/ajax/admin/sendlc', async function (req, res) {
    if (req.session.admin != undefined) {
        con.query("INSERT INTO lc (lc_url,lc_des) VALUES ('" + req.body.lc_url + "','" + req.body.lc_des + "')", function (error, req) {
            res.send('success');
        });
    } else {
        res.render('admin/login');
    }
});

app.post('/ajax/admin/login', async function (req, res) {
    console.log(req.body.username);
    console.log(req.body.password);
    con.query("SELECT * FROM admon WHERE a_username = '" + req.body.username + "' AND a_password = '" + req.body.password + "'", function (error, resq) {
        if (resq.length > 0) {
            req.session.admin = '1';
            res.send('success');
        } else {
            res.send('error');

        }
    });
});

app.post('/ajax/detail/report/:name', async function (req, res) {
    var type = [];
    var name = req.params.name;
    console.log(req.body.des);
    console.log(req.body.lc);
    console.log(req.body.removeit);
    console.log(req.body.other);
    var des = req.body.des;
    if (req.body.lc == "true") {
        type.push(1);
    }
    if (req.body.removeit == "true") {
        type.push(2);
    }
    if (req.body.other == "true") {
        type.push(3);
    }
    console.log('type :' + type);
    if (type != 0) {
        con.query("INSERT INTO report (r_url,r_type,r_des) VALUES ('" + name + "','" + type + "','" + des + "')", function (err, res) {

        });
    }
    res.send('sadas');
});

app.get('/ajax/detail/like/:name', async function (reqer, res) {
    var title = reqer.params.name;
    if (reqer.session.like_name == undefined) {
        reqer.session.like_name = [];
    }

    reqer.session.like_name.push(title);
    console.log(reqer.session.like_name);

    con.query("SELECT * FROM manga_detail WHERE md_url = '" + reqer.params.name.replace(/ /g, '-').toString().toLocaleLowerCase() + "'", function (err, resquert) {
        if (resquert.length > 0) {
            var like = resquert[0].md_like + 1;
            con.query("update manga_detail set md_like = '" + like + "' where  md_url = '" + reqer.params.name.replace(/ /g, '-').toString().toLocaleLowerCase() + "'", async function (err, ressss) {
                res.send('success');
            });
        }
    });
});

app.get('/ajax/detail/follow/:name', async function (reqer, res) {
    var title = reqer.params.name;
    var image = reqer.query.image;
    var named = reqer.params.name.replace(/ /g, '-');
    var mangareaded = reqer.session.follow_name;
    if (mangareaded == undefined) {
        reqer.session.follow_name = [];
        reqer.session.follow_image = [];
        reqer.session.follow_url = [];
    }
    if (reqer.session.follow_image == undefined) {
        reqer.session.follow_image = [];
        reqer.session.follow_url = [];
        reqer.session.follow_name = [];
    }
    if (reqer.session.follow_name.indexOf(title) >= 0) {
        var ii = reqer.session.follow_name.indexOf(title);
        reqer.session.follow_name.splice(reqer.session.follow_name.indexOf(title), 1);
        reqer.session.follow_image.splice(reqer.session.follow_image.indexOf(image), 1);
        reqer.session.follow_url.splice(ii, 1);
    }
    if (reqer.session.follow_name[reqer.session.follow_name.length - 1] != title) {
        reqer.session.follow_name.push(title);
        reqer.session.follow_image.push(image);
        reqer.session.follow_url.push(named);
    }
    console.log(reqer.params.name.replace(/ /g, '-').toString().toLocaleLowerCase());
    con.query("SELECT * FROM manga_detail WHERE md_url = '" + reqer.params.name.replace(/ /g, '-').toString().toLocaleLowerCase() + "'", function (err, resquert) {
        if (resquert.length > 0) {
            var follow = resquert[0].md_follow + 1;
            con.query("update manga_detail set md_follow = '" + follow + "' where  md_url = '" + reqer.params.name.replace(/ /g, '-').toString().toLocaleLowerCase() + "'", async function (err, ressss) {
                res.send('success');
            });
        }

    });

});


app.get('/ajax/detail/changesize/:size', async function (req, res) {
    req.session.sizeImage = req.params.size;
    console.log(req.session.sizeImage);
    res.send('success');
});

app.get('/ajax/detail/allep/:name/:nowep', async function (reqed, reser) {
    var ep = [];

    try {
        request('https://cumanga.com/manga-' + reqed.params.name + '/', async function (error, req, html) {
            if (!error && req.statusCode == 200) {
                try {
                    var $ = cheerio.load(html);
                    var countPage = $('select.form-control').eq(0).children('option').length;
                    var j = 0;
                    console.log("countPage :" + countPage);
                    var loops = 1;
                    if (countPage > 1) {
                        for (var d = 0; d < countPage + 1; d++) {
                            if (d != 1) {
                                request('https://cumanga.com/manga-' + reqed.params.name + '/page-' + d + '/', function (error, req, html) {
                                    if (!error & req.statusCode == 200) {
                                        var $ = cheerio.load(html);
                                        console.log($('.doujin_t_red').length + "doujin_t_red.lenght");
                                        for (var i = 0; i < $('.doujin_t_red').length; i++) {
                                            if (($('.doujin_t_blue').eq(i).text()) != "737886 วัน ที่แล้ว") {
                                                if (isNaN(parseFloat($('.doujin_t_red').eq(i).text().replace('ตอนที่ ', '')))) {

                                                } else {
                                                    ep[j] = parseFloat($('.doujin_t_red').eq(i).text().replace('ตอนที่ ', ''));
                                                    j += 1
                                                }

                                            }
                                        }
                                        loops += 1

                                        if (loops == countPage + 1) {
                                            console.log('asdass');
                                            ep.sort(function (a, b) { return a - b });
                                            console.log(ep);
                                            reser.render('ajax/detail/epall', { ep: ep, FristEp: ep[0], lastEp: ep[ep.length - 1], name: reqed.params.name, session: reqed.session, nowep: reqed.params.nowep });

                                        }


                                    }

                                });
                            }
                        }
                    } else {
                        for (var i = 0; i < $('.doujin_t_red').length; i++) {
                            if (($('.doujin_t_blue').eq(i).text()) != "737886 วัน ที่แล้ว") {
                                ep[j] = $('.doujin_t_red').eq(i).text().replace('ตอนที่ ', '');
                                j += 1
                            }
                        }
                        ep.sort(function (a, b) { return a - b });
                        reser.render('ajax/detail/epall', { ep: ep, FristEp: ep[0], lastEp: ep[ep.length - 1], name: reqed.params.name, session: reqed.session, nowep: reqed.params.nowep });
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        });
    } catch (error) {
        console.log(error);
    }
});



app.get('/ajax/detail/ep/:name', async function (reqed, reser) {
    var ep = [];
    request('https://cumanga.com/manga-' + reqed.params.name + '/', function (error, r, html) {
        if (!error & r.statusCode == 200) {
            var $ = cheerio.load(html);
            var countPage = $('select.form-control').eq(0).children('option').length;
            var j = 0;
            var loops = 1;
            console.log("countPage :" + countPage);
            if (countPage > 1) {
                for (var d = 0; d < countPage + 1; d++) {
                    if (d != 1) {
                        request('https://cumanga.com/manga-' + reqed.params.name + '/page-' + d + '/', function (error, req, html) {
                            if (!error & req.statusCode == 200) {
                                var $ = cheerio.load(html);
                                console.log($('.doujin_t_red').length + "doujin_t_red.lenght");
                                for (var i = 0; i < $('.doujin_t_red').length; i++) {
                                    if (($('.doujin_t_blue').eq(i).text()) != "737886 วัน ที่แล้ว") {
                                        if (isNaN(parseFloat($('.doujin_t_red').eq(i).text().replace('ตอนที่ ', '')))) {

                                        } else {
                                            ep[j] = parseFloat($('.doujin_t_red').eq(i).text().replace('ตอนที่ ', ''));
                                            j += 1
                                        }
                                    }
                                }
                                loops += 1

                                if (loops == countPage + 1) {
                                    console.log('asdass');
                                    ep.sort(function (a, b) { return a - b });
                                    console.log(ep);
                                    reser.render('ajax/detail/ep', { ep: ep, FristEp: ep[0], lastEp: ep[ep.length - 1], name: reqed.params.name, session: reqed.session });
                                }


                            }

                        });
                    }
                }


            } else {
                for (var i = 0; i < $('.doujin_t_red').length; i++) {
                    if (($('.doujin_t_blue').eq(i).text()) != "737886 วัน ที่แล้ว") {
                        ep[j] = $('.doujin_t_red').eq(i).text().replace('ตอนที่ ', '');
                        j += 1
                    }
                }

                ep.sort(function (a, b) { return a - b });
                reser.render('ajax/detail/ep', { ep: ep, FristEp: ep[0], lastEp: ep[ep.length - 1], name: reqed.params.name, session: reqed.session });
            }

        }
    });
});

app.get('/ajax/index/update', async function (req, reser) {

    var image = [];
    var name = [];
    var ep = [];
    var url = [];
    if (bool_html) {
        var $ = await cheerio.load(index_html);
        try {
            for (var i = 0; i < 4; i++) {
                var one = ($("style").eq(i).html().substr($("style").eq(i).html().indexOf("'"), $("style").eq(i).html().length));
                image[i] = one.substr(1, one.indexOf("')") - 1);
                name[i] = $(".doujin_name").eq(i).text();
                ep[i] = $('.doujin_t_red').eq(i).text();
                url[i] = $('.col-6').eq(i).attr("href");
            }

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
            for (var i = 0; i < $("style").length; i++) {
                var one = ($("style").eq(i).html().substr($("style").eq(i).html().indexOf("'"), $("style").eq(i).html().length));
                image[i] = one.substr(1, one.indexOf("')") - 1);
                name[i] = $(".doujin_name").eq(i).text();
                ep[i] = $('.doujin_t_red').eq(i).text();
                url[i] = $('.col-6').eq(i).attr("href");
            }
            reser.render('ajax/index/updateall', { name: name, image: image, ep: ep, url: url });
        } catch (error) {
            console.log(error);
        }
    }
});

app.get('/sitemap_get', function (req, res) {
    // create generator
    var generator = SitemapGenerator('https://fc0ce971.ngrok.io', {
        maxDepth: 0,
        maxEntriesPerFile: 50000,
        stripQuerystring: true
    });

    // register event listeners
    generator.on('done', () => {
        console.log('finish');
        res.send('finsish');
    });

    // start the crawler
    generator.start();
})

app.listen(port, function () {
    console.log(`Runnn progame at port : ${port}!`);
});

module.exports = app;