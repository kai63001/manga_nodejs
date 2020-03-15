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
const robots = require('express-robots-txt');
const translate = require('google-translate-open-api').default;





var con = mysql.createConnection({
    host: "192.168.64.2",
    user: "romeo",
    password: "qw123456",
    database: "manga"
});

// var con = mysql.createConnection({
//     host: "localhost",
//     user: "maloithd",
//     password: "1Pra9nWapgz3",
//     database: "maloithd_manga"
//   });


con.connect();

var header = '';
var footer = '';

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(robots({ UserAgent: '*', CrawlDelay: '5', Sitemap: 'https://257782cf.ngrok.io/sitemap.xml' }))


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
        con.query("SELECT * FROM setting WHERE s_id = '1'", function (error, res) {
            header = res[0].s_header;
            footer = res[0].s_footer;
        });
        request('https://cumanga.com/', function (error, req, html) {
            try {
                if (!error & req.statusCode == 200) {
                    index_html = html;
                    bool_html = true;
                }
            } catch (error) {
                console.log(error);
            }
        });
    } catch (error) {
        console.log(error);
    }

}
getIndex();

con.query("SELECT * FROM setting WHERE s_id = '1'", function (error, res) {
    header = res[0].s_header;
    footer = res[0].s_footer;
});

// app.get('/gettags', function (reqer, reser) {
//     var page = [];
//     for (var i = 1; i <= 16; i++) {
//         page.push(i);
//     }
//     for (i in page) {
//         request('https://www.anime-planet.com/manga/tags?sort=num_likes&order=desc&page=' + i, function (error, res, html) {
//             if (!error & res.statusCode == 200) {
//                 var $ = cheerio.load(html);
//                 for (var s = 0; s < 35; s++) {
//                     con.query("INSERT INTO tags (t_name) VALUES ('" + $("h2.collectionName").eq(s).children("a").text() + "')", function (error, req) {

//                     });
//                 }
//             }
//         });
//     }
//     reser.send('das');
// });


function generate_xml_sitemap(urls, ep_urls) {


    var root_path = 'https://0ac4290f.ngrok.io/';
    var priority = 0.5;
    var freq = 'monthly';
    var xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    for (var i in urls) {
        xml += '<url>';
        xml += '<loc>' + root_path + urls[i] + '</loc>';
        xml += '</url>';
        i++;
    }
    for (var i in ep_urls) {
        xml += '<url>';
        xml += '<loc>' + root_path + ep_urls[i] + '</loc>';
        xml += '</url>';
        i++;
    }
    xml += '</urlset>';
    return xml;
}
var urls = []
var ep_urls = []
function sitemapgen() {
    console.log('runsitemap');
    con.query("SELECT * FROM manga_detail", (error, res) => {
        if (res == undefined) {
            console.log('undefined');
        } else {
            if (res.length > 0) {
                for (var i = 0; i < res.length; i++) {
                    urls.push('manga/' + res[i].md_url);
                }
                con.query("SELECT * FROM ep", (error, res) => {

                    if (res.length > 0) {
                        for (var i = 0; i < res.length; i++) {
                            urls.push('manga/' + res[i].e_url + '/read/' + res[i].e_ep);
                        }

                    }
                });

            }
        }
    });
}
sitemapgen();
// setInterval(() => {
//     sitemapgen();
// }, 30000);

app.get('/sitemap.xml', function (req, reser) {

    var sitemap = generate_xml_sitemap(urls, ep_urls); // get the dynamically generated XML sitemap
    reser.header('Content-Type', 'text/xml');
    reser.send(sitemap);


});


app.get('/', function (req, reser) {
    getIndex();
    con.query("SELECT * FROM setting WHERE s_id = '1'", function (error, res) {
        header = res[0].s_header;
        footer = res[0].s_footer;
    });
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
        reser.render('index', { session: req.session, req: reqd, header: header, footer: footer });

    });
});


app.get('/manga/follow', function (reqer, reser) {
    var mangareaded = reqer.session.readedmanga_name;
    if (mangareaded == undefined) {
        reqer.session.readedmanga_name = [];
        reqer.session.readedmanga_image = [];
        reqer.session.readedmanga_url = [];
    }

    if (reqer.session.follow_name == undefined) {
        reqer.session.follow_name = [];
    }
    reser.render('list/manga_follow', { session: reqer.session, header: header, footer: footer });
});

app.get('/manga/readed', function (reqer, reser) {
    var mangareaded = reqer.session.readedmanga_name;
    if (mangareaded == undefined) {
        reqer.session.readedmanga_name = [];
        reqer.session.readedmanga_image = [];
        reqer.session.readedmanga_url = [];
    }

    if (reqer.session.follow_name == undefined) {
        reqer.session.follow_name = [];
    }
    reser.render('list/manga_readed', { session: reqer.session, header: header, footer: footer });
});

app.get('/manga', function (req, res) {
    res.redirect('/manga/page/1');
});

app.get('/manga/top', (reqer, reser) => {
    var perpage = 24;
    var page;
    if (reqer.query.page) {
        page = reqer.query.page;
    } else {
        page = 1;
    }
    var start = (page - 1) * perpage;
    con.query("SELECT * FROM manga_detail ORDER BY md_view DESC", async function (err, resquerter) {

        if (err) {
            reser.render('404');
        } else {
            con.query("SELECT * FROM manga_detail ORDER BY md_view DESC limit " + start + " , " + perpage, async function (err, resquert) {
                if (err) {
                    reser.render('404');

                } else {
                    var lastPage = Math.ceil(resquerter.length / perpage);
                    reser.render('list/manga_top', { tags: resquert, lastPage: lastPage, name: reqer.params.tags, header: header, footer: footer });
                }

            });
        }

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
                    reser.render('list/manga_update', { name: name, image: image, ep: ep, url: url, lastPage: lastPage, header: header, footer: footer, nowPage: page });
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
                    reser.render('list/manga_update', { name: name, image: image, ep: ep, url: url, lastPage: lastPage, header: header, footer: footer, nowPage: page });
                } catch (error) {
                    console.log(error);
                }
            }
        });
    }

});

app.get('/tags', function (reqer, reser) {

    var perpage = 50;
    var page;
    if (reqer.query.page) {
        page = reqer.query.page;
    } else {
        page = 1;
    }

    var start = (page - 1) * perpage;
    con.query("SELECT * FROM tags ORDER BY t_id DESC limit " + start + " , " + perpage, async function (err, resquert) {
        var lastPage = Math.ceil(resquert.length / perpage);
        reser.render('list/tags', { tags: resquert, lastPage: lastPage, header: header, footer: footer });

    });
});

app.get('/manga/:name', function (reqer, reser) {
    con.query("SELECT * FROM lc WHERE lc_url = '" + reqer.params.name + "'", function (error, reqcon) {
        if (error) {
            reser.render('404');
        } else {
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
                        reser.render('manga_detail', { name: reqer.params.name, image: image, title: title, des: des, tags: tags, view: view, year: year, status: status, session: reqer.session, follow: follow, like: like, header: header, footer: footer });


                    } else {
                        try {
                            request('https://cumanga.com/manga-' + named + '/', async function (error, req, html) {
                                if (!error & req.statusCode == 200) {
                                    try {
                                        if (html.indexOf('ไม่มีมังงะเรื่องนี้ในระบบ !!') >= 0) {
                                            reser.render('404');

                                        } else {
                                            var $ = cheerio.load(html);
                                            image = $(".doujin_post").attr("style").substr($(".doujin_post").attr("style").indexOf("('") + 2, $(".doujin_post").attr("style").length);
                                            image = image.replace("');", '');
                                            title = $("title").text().replace('อ่าน: ', '').replace(' | Read Manga: CuManga.com', '').trim();
                                            des = $(".text-light").eq(3).text();
                                            year = $(".text-light").eq(2).text();
                                            status = $(".text-light").eq(1).text();
                                            // console.log('https://www.anime-planet.com/manga/'+title);
                                            var titleed = title.replace(/ /g, '+');
                                            request('https://www.anime-planet.com/manga/' + title.replace(/ /g, '-').toLocaleLowerCase(), function (errorqqq, reqqq, htmler) {
                                                try {
                                                    if (!errorqqq & reqqq.statusCode == 200) {
                                                        try {
                                                            var htmled = htmler.substr(htmler.indexOf('<h4>Tags</h4>'), htmler.indexOf('display status0'));
                                                            htmled = htmled.substr(0, htmled.indexOf('myListBar'));
                                                            var $s = cheerio.load(htmled);
                                                            if (htmler.indexOf('User Stats') >= 0) {
                                                                console.log('111111');
                                                                console.log('https://www.anime-planet.com/manga/' + title.replace(/ /g, '-'));

                                                                $s('a').each(function (i, elem) {
                                                                    tags[i] = $s(this).text().replace(/\n/g, '');
                                                                });
                                                                console.log(tags);
                                                                con.query('insert into manga_detail (md_url,md_status,md_year,md_view,md_tags,md_des,md_image,md_name) values ("' + reqer.params.name + '","' + status + '","' + year + '","' + view + '","' + tags + '","' + des.replace(/"/, '') + '","' + image + '","' + title + '")', function (err, res) {
                                                                });
                                                                reser.render('manga_detail', { name: reqer.params.name, image: image, title: title, des: des, tags: tags, view: view, year: year, status: status, session: reqer.session, follow: follow, like: like, header: header, footer: footer });

                                                            } else {
                                                                console.log('else 2');
                                                                request('https://www.anime-planet.com/manga/all?name=' + titleed +'&exclude_tags=334', function (errorqqq, reqqq, htmler) {
                                                                    if (!errorqqq & reqqq.statusCode == 200) {
                                                                        var htmled = htmler.substr(htmler.indexOf('<h4>Tags</h4>'), htmler.indexOf('display status0'));
                                                                        htmled = htmled.substr(0, htmled.indexOf('myListBar'));
                                                                        var $s = cheerio.load(htmled);
                                                                        if (htmler.indexOf('User Stats') >= 0) {
                                                                            $s('a').each(function (i, elem) {
                                                                                tags[i] = $s(this).text().replace(/\n/g, '');
                                                                            });
                                                                            console.log('asdasdasdasdasdas');
                                                                            console.log(tags);
                                                                            con.query('insert into manga_detail (md_url,md_status,md_year,md_view,md_tags,md_des,md_image,md_name) values ("' + reqer.params.name + '","' + status + '","' + year + '","' + view + '","' + tags + '","' + des.replace(/"/, '') + '","' + image + '","' + title + '")', function (serr, sres) {
                                                                                if (sres) {
                                                                                    reser.render('manga_detail', { name: reqer.params.name, image: image, title: title, des: des, tags: tags, view: view, year: year, status: status, session: reqer.session, follow: follow, like: like, header: header, footer: footer });
                                                                                }
                                                                                if (serr) {
                                                                                    console.log(serr);
                                                                                }
                                                                            });
                                                                        } else {
                                                                            titleed = titleed.substr(0, titleed.length / 3);
                                                                            request('https://www.anime-planet.com/manga/all?name=' + titleed +'&exclude_tags=334', function (errorqqq, reqqq, htmler) {
                                                                                if (!errorqqq & reqqq.statusCode == 200) {
                                                                                    var htmled = htmler.substr(htmler.indexOf('<h4>Tags</h4>'), htmler.indexOf('display status0'));
                                                                                    htmled = htmled.substr(0, htmled.indexOf('myListBar'));
                                                                                    var $s = cheerio.load(htmled);
                                                                                    if (htmler.indexOf('User Stats') >= 0) {
                                                                                        $s('a').each(function (i, elem) {
                                                                                            tags[i] = $s(this).text().replace(/\n/g, '');
                                                                                        });
                                                                                        console.log('asdasdasdasdasdas');
                                                                                        console.log(tags);
                                                                                        con.query('insert into manga_detail (md_url,md_status,md_year,md_view,md_tags,md_des,md_image,md_name) values ("' + reqer.params.name + '","' + status + '","' + year + '","' + view + '","' + tags + '","' + des.replace(/"/, '') + '","' + image + '","' + title + '")', function (serr, sres) {
                                                                                            if (sres) {
                                                                                                reser.render('manga_detail', { name: reqer.params.name, image: image, title: title, des: des, tags: tags, view: view, year: year, status: status, session: reqer.session, follow: follow, like: like, header: header, footer: footer });
                                                                                            }
                                                                                            if (serr) {
                                                                                                console.log(serr);
                                                                                            }
                                                                                        });
                                                                                    } else {
                                                                                        console.log('asdasdasdasdasdas2');
                                                                                        con.query('insert into manga_detail (md_url,md_status,md_year,md_view,md_tags,md_des,md_image,md_name) values ("' + reqer.params.name + '","' + status + '","' + year + '","' + view + '","' + tags + '","' + des.replace(/"/, '') + '","' + image + '","' + title + '")', function (serr, sres) {
                                                                                            if (sres) {
                                                                                                reser.render('manga_detail', { name: reqer.params.name, image: image, title: title, des: des, tags: tags, view: view, year: year, status: status, session: reqer.session, follow: follow, like: like, header: header, footer: footer });
                                                                                            }
                                                                                            if (serr) {
                                                                                                console.log(serr);
                                                                                            }
                                                                                        });


                                                                                    }
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




                                        }

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
        }

    });



});

app.get('/manga/:name/read/:ep', function (reqer, reser) {
    con.query("SELECT * FROM ep WHERE e_url = ? AND e_ep = ?", [reqer.params.name, reqer.params.ep], function (error, reqcon) {
        if (reqcon == undefined) {
            console.log('error');
        } else {
            if (reqcon.length == 0) {
                con.query("INSERT INTO ep (e_url,e_name,e_ep) VALUES (?,?,?)", [reqer.params.name, reqer.params.name.replace(/-/g, ' '), reqer.params.ep], (error, reqer) => {
                    console.log("INSERT SUCCESS");
                });
            }
        }
    });
    con.query("SELECT * FROM lc WHERE lc_url = '" + reqer.params.name + "'", function (error, reqcon) {
        if (reqcon == undefined) {
            reser.render('404');
        } else {
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
                try {
                    request('https://cumanga.com/manga-' + reqer.params.name + '/ch-' + reqer.params.ep + '/', function (error, req, html) {
                        if (!error & req.statusCode == 200) {
                            var $ = cheerio.load(html);
                            $('img').each(function (i, elem) {
                                image[i] = $(this).attr('src');
                            });
                            reser.render('detail/read', { title: reqer.params.name.replace(/-/g, ' '), ep: reqer.params.ep, image: image, name: reqer.params.name, session: reqer.session, header: header, footer: footer });
                        }
                    });
                } catch (error) {
                    console.log(error);
                }
            }
        }

    });


});

app.get('/tags/:tags', function (reqer, reser) {

    var perpage = 24;
    var page;
    if (reqer.query.page) {
        page = reqer.query.page;
    } else {
        page = 1;
    }
    var start = (page - 1) * perpage;
    con.query("SELECT * FROM manga_detail WHERE md_tags LIKE '%" + reqer.params.tags.toString() + "%'", async function (err, resquerter) {

        if (err) {
            reser.render('404');
        } else {
            con.query("SELECT * FROM manga_detail WHERE md_tags LIKE '%" + reqer.params.tags.toString() + "%' limit " + start + " , " + perpage, async function (err, resquert) {
                if (err) {
                    reser.render('404');

                } else {
                    var lastPage = Math.ceil(resquerter.length / perpage);
                    reser.render('list/manga_tags', { tags: resquert, lastPage: lastPage, name: reqer.params.tags, header: header, footer: footer });
                }

            });
        }

    });

});

app.get('/dmca', function (reqer, reser) {
    reser.render('footer/dmca');
});

app.get('/term', function (reqer, reser) {
    reser.render('footer/term');
});
app.get('/privacy', function (reqer, reser) {
    reser.render('footer/privacy');
});

// ADMIN

app.get('/_moonlightshadow', async function (req, res) {
    console.log(req.session.admin);
    if (req.session.admin != undefined) {
        con.query("SELECT * FROM report ORDER BY r_id DESC LIMIT 6", function (error, req) {
            res.render('admin/admin', { req: req, header: header, footer: footer });
        });
    } else {
        res.render('admin/login');
    }
});

// AJAX 
async function translatetothai(text, url) {
    const result = await translate(text, {
        tld: "cn",
        to: "th",
    });
    const data = result.data[0];
    console.log(data);
    con.query("UPDATE manga_detail SET md_des = ? WHERE md_url = ?", [data, url], (erorr, reqers) => {
        console.log('update Success translate');
    });
}



app.get('/ajax/detail/transplate/:name', async function (reqer, reser) {
    var titleed = reqer.params.name.replace(/-/g, '+');
    console.log('ssssss');
    request('https://www.anime-planet.com/manga/' + reqer.params.name.toLocaleLowerCase(), function (errorqqq, reqqq, htmler) {
        try {
            if (!errorqqq & reqqq.statusCode == 200) {
                try {
                    var htmled = htmler.substr(htmler.indexOf('<div class="pure-1 md-3-5">'), htmler.indexOf('display status0'));
                    htmled = htmled.substr(0, htmled.indexOf('<div class="tags ">'));
                    var $s = cheerio.load(htmled);
                    if (htmler.indexOf('User Stats') >= 0) {
                        console.log('111111');
                        var deser = $s('p').text();
                        console.log("des1 : " + deser);
                        translatetothai(deser, reqer.params.name);
                        reser.send('success');

                    } else {
                        console.log('else 2');
                        request('https://www.anime-planet.com/manga/all?name=' + titleed +'&exclude_tags=334', function (errorqqq, reqqq, htmler) {
                            if (!errorqqq & reqqq.statusCode == 200) {
                                var htmled = htmler.substr(htmler.indexOf('<div class="pure-1 md-3-5">'), htmler.indexOf('display status0'));
                                htmled = htmled.substr(0, htmled.indexOf('<div class="tags ">'));
                                var $s = cheerio.load(htmled);
                                if (htmler.indexOf('User Stats') >= 0) {
                                    var deser = $s('p').text();
                                    console.log("des2 : " + deser);
                                    translatetothai(deser, reqer.params.name);
                                    reser.send('success');
                                } else {
                                    titleed = titleed.substr(0, titleed.length / 3);
                                    request('https://www.anime-planet.com/manga/all?name=' + titleed +'&exclude_tags=334', function (errorqqq, reqqq, htmler) {
                                        if (!errorqqq & reqqq.statusCode == 200) {
                                            var htmled = htmler.substr(htmler.indexOf('<div class="pure-1 md-3-5">'), htmler.indexOf('display status0'));
                                            htmled = htmled.substr(0, htmled.indexOf('<div class="tags ">'));
                                            var $s = cheerio.load(htmled);
                                            if (htmler.indexOf('User Stats') >= 0) {
                                                var deser = $s('p').text();
                                                console.log("des3 : " + deser);
                                                translatetothai(deser, reqer.params.name);
                                                reser.send('success');
                                            } else {
                                                var deser = $s('p').text();
                                                console.log("des4 : " + deser);
                                                translatetothai(deser, reqer.params.name);
                                                reser.send('success');
                                            }
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


});

app.post('/ajax/admin/sends', async function (req, res) {
    if (req.session.admin != undefined) {
        console.log(req.body.s_header);
        console.log(req.body.s_footer);
        con.query("UPDATE setting SET s_header = '" + req.body.s_header.replace(/'/g, '"') + "' , s_footer = '" + req.body.s_footer.replace(/'/g, '"') + "' WHERE s_id = '1'", function (error, resq) {
            console.log(error);
            res.send('success');
        });
    } else {
        res.render('admin/login');
    }
});


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
    con.query("SELECT * FROM admon WHERE a_username = ? AND a_password = ?", [req.body.username, req.body.password], function (error, resq) {
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
                        for (var d = 1; d < countPage + 1; d++) {
                            var link = 'https://cumanga.com/manga-' + reqed.params.name + '/page-' + d + '/';
                            if (d == 1) {
                                link = 'https://cumanga.com/manga-' + reqed.params.name + '/';
                            }
                            if (d != 0) {
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



app.get('/ajax/detail/ep/:name', function (reqed, reser) {
    var ep = [];
    request('https://cumanga.com/manga-' + reqed.params.name + '/', function (error, r, html) {
        if (error) {
            console.log('error');
        }
        if (!error & r.statusCode == 200) {
            var $ = cheerio.load(html);
            var countPage = $('select.form-control').eq(0).children('option').length;
            var j = 0;
            var loops = 1;
            console.log("countPage :" + countPage);
            if (countPage > 1) {
                var listd = [];
                for (var d = 1; d < countPage + 1; d++) {
                    var link = 'https://cumanga.com/manga-' + reqed.params.name + '/page-' + d + '/';
                    if (d == 1) {
                        link = 'https://cumanga.com/manga-' + reqed.params.name + '/';
                    }
                    if (d != 0) {
                        request(link, function (error, req, html) {
                            console.log('d = ' + d);
                            loops += 1;
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
                                console.log(loops + " : loop");
                                console.log(countPage + 1);

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
                for (d in listd) {


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
    var generator = SitemapGenerator('https://257782cf.ngrok.io', {
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

app.get('*', function (req, res) {
    res.status(404).render('404');
});
app.listen(port, function () {
    console.log(`Runnn progame at port : ${port}!`);
});

module.exports = app;