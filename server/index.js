/* 
Copyright (C) 2023 BARTHELEMY Stephane

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/

const express = require('express'); 
const path = require('path'); 
const app = express(); 
const server = require('http').Server(app);
const io = require('socket.io')(server);
const cv = require('@u4/opencv4nodejs');
const fs = require('fs');
const os = require('os');
const { info } = require('console');

const port = 3000;

app.get('/', (req,res) => {
    res.sendFile(path.join(__dirname,'/index.html')); 
});

io.on('connection', (socket) => {
    console.info(`Socket ${socket.id} has connected.`);


    socket.on('disconnect', function () {
        console.info(`Socket ${socket.id} has disconnected.`);
    });

    socket.on('info', function (data) {
        console.log('info:', data);
    });
})

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})