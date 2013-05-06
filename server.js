

var fs       = require('fs'),
    path     = require('path'),
    http     = require('http'),
    qs       = require('querystring'),
    static   = require('node-static'),
    template = require('./template'),
    designs  = require('./conf/designs.json').reverse(),
    render   = template.compile(fs.readFileSync('./conf/garden.html', 'utf8')),
    staticServer = new static.Server('./designs'),
    
    NUM_DESIGNS = 8;

http.createServer(function (req, res) {
    var path   = req.url.indexOf('?') === -1 ? req.url : req.url.split('?')[0],
        query  = qs.parse(req.url.split('?')[1]),
        css = '/001/001.css',
        page   = 0,
        model  = {};


    if(path === '/') {
        if(query.cssfile) {
            css = query.cssfile;
        }
        if(query.page) {
            page = +query.page;
        }
        
        model.page = page;
        model.currentDesign = css;
        model.designs = designs.slice(page * NUM_DESIGNS, (page + 1) * NUM_DESIGNS);
        model.hasMore = (page + 1) * NUM_DESIGNS < designs.length;
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(render(model));
    } else {
        staticServer.serve(req, res, function(err) {
            if(err) {
                res.writeHead(404);
                res.end();
            }
        });
    }
}).listen(8080, '127.0.0.1');