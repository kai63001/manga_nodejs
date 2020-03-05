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

app.get('/manga/:name', function (reqer, reser) {
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
    con.query("select * from manga_detail where md_url = '" + reqer.params.name.toString() + "'", async function (err, resquert) {
        if (resquert.length > 0) {
            // reser.send('added');
            image = resquert[0].md_image;
            title = resquert[0].md_name;
            des = resquert[0].md_des;
            status = resquert[0].md_status;
            year = resquert[0].md_year;
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
            reser.render('manga_detail', { name: reqer.params.name, image: image, title: title, des: des, tags: tags, view: view, year: year, status: status, session: reqer.session });


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
                                            reser.render('manga_detail', { name: reqer.params.name, image: image, title: title, des: des, tags: tags, view: view, year: year, status: status, session: reqer.session });

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
                                                                reser.render('manga_detail', { name: reqer.params.name, image: image, title: title, des: des, tags: tags, view: view, year: year, status: status, session: reqer.session });
                                                            }
                                                            if (serr) {
                                                                console.log(serr);
                                                            }
                                                        });
                                                    } else {
                                                        console.log('asdasdasdasdasdas2');
                                                        con.query('insert into manga_detail (md_url,md_status,md_year,md_view,md_tags,md_des,md_image,md_name) values ("' + reqer.params.name + '","' + status + '","' + year + '","' + view + '","' + tags + '","' + des + '","' + image + '","' + title + '")', function (serr, sres) {
                                                            if (sres) {
                                                                reser.render('manga_detail', { name: reqer.params.name, image: image, title: title, des: des, tags: tags, view: view, year: year, status: status, session: reqer.session });
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

});

app.get('/manga/:name/read/:ep', function (reqer, reser) {
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
                reser.render('detail/read', { title: reqer.params.name.replace(/-/g, ' '), ep: reqer.params.ep, image: image });
            }
        });
    } catch (error) {
        console.log(error);
    }
    // reser.send(req.params.name + '-' + req.params.ep);
    
});


// AJAX 

app.get('/ajax/detail/ep/:name', async function (reqed, reser) {
    var ep = [];
    request('https://cumanga.com/manga-' + reqed.params.name + '/', async function (error, r, html) {
        if (!error & r.statusCode == 200) {
            var $ = cheerio.load(html);
            var lastEp = parseInt($('.doujin_p_tag3').eq(0).children('span').text().replace('ตอนที่ ', '').trim());
            var FristEp = 1;
            var countPage = $('select.form-control').eq(0).children('option').length;
            var j = 0;
            console.log("countPage :" + countPage);
            if (countPage > 1) {
                request('https://cumanga.com/manga-' + reqed.params.name + '/page-' + countPage + '/', async function (error, req, html) {
                    if (!error & req.statusCode == 200) {
                        var $ = cheerio.load(html);
                        FristEp = (parseInt($('.doujin_p_tag3').eq($('.doujin_p_tag3').length - 1).children('span').text().replace('ตอนที่ ', '').trim()));
                        if (FristEp > 1) {
                            FristEp = 1;
                        }
                        if (FristEp > lastEp) {
                            FristEp = 1;
                        }
                        if (isNaN(FristEp)) {
                            FristEp = 1;
                        }
                        console.log(countPage);
                        for (var i = FristEp; i <= lastEp; i++) {

                            ep[j] = i;
                            j += 1
                        }
                        console.log(lastEp + "lastEP");
                        console.log(FristEp + "FristEp");
                        reser.render('ajax/detail/ep', { ep: ep, FristEp: FristEp, lastEp: lastEp, name: reqed.params.name, session: reqed.session });
                    }
                });
            } else {
                FristEp = (parseInt($('.doujin_p_tag3').eq($('.doujin_p_tag3').length - 1).children('span').text().replace('ตอนที่ ', '').trim()));
                console.log(lastEp + "lastEP");
                console.log(FristEp + "FristEp");
                console.log(countPage);
                if (FristEp > lastEp) {
                    FristEp = 1;
                }
                if (isNaN(FristEp)) {
                    FristEp = 1;
                }
                for (var i = FristEp; i <= lastEp; i++) {
                    ep[j] = i;
                    j += 1

                }
                console.log(lastEp);
                reser.render('ajax/detail/ep', { ep: ep, FristEp: FristEp, lastEp: lastEp, name: reqed.params.name, session: reqed.session });
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