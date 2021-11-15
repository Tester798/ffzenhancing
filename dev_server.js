const fs = require('fs');
const http = require('http');


const host = 'localhost';
const port = 8001;
const url = '/ffzenhancing.js';


function log(msg, error) {
    console.log(new Date().toLocaleTimeString() + ' - ' + (error !== undefined ? error + ' - ' : '') + msg);
}


http.createServer((req, res) => {
    if (req.url === url) {
        return fs.readFile(__dirname + url, (err, data) => {
            if (err) {
                cons
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
