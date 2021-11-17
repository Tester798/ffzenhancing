const fs = require('fs');
const http = require('http');


const host = 'localhost';
const port = 8001;
const urls = [
    '/ffzenhancing.js',
    '/notify.ico',
];


function log(msg, error) {
    console.log(new Date().toLocaleTimeString() + ' - ' + (error !== undefined ? error + ' - ' : '') + msg);
}


http.createServer((req, res) => {
    if (urls.includes(req.url)) {
        return fs.readFile(__dirname + req.url, (err, data) => {
            if (err) {
                log(JSON.stringify(err), 500);
                res.writeHead(500);
                return res.end();
            }
            log(req.url + ' - ' + data.length, 200);
            res.writeHead(200);
            return res.end(data);
        });
    }
    log(req.url, 404);
    res.writeHead(404);
    res.end();
}).listen(port, host);
console.log(`Listening on ${host}:${port}`);
