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
const io_client = require('socket.io-client');
const cv = require('@u4/opencv4nodejs');
const fs = require('fs');
const os = require('os');
const sp = require("serialport");
const Gpio = require('onoff').Gpio;
const config = require('config');

let port = 3000 ; 
let GpioPin = 416 ; 
let FPS = 25; 
console.log("Read config")
if (config.has('server.port')) {
    port = config.get('server.port');
}
if (config.has('gpio.pin')) {
    GpioPin = config.get ('gpio.pin');
} 
if (config.has('video.FPS')) {
    FPS = config.get ('video.FPS'); 
} 

var counter = 0 ; 

var cap = null ; 
var cap2 = null ; 

var SPort = sp.SerialPort;

const serialPort = new SPort({
    path: "/dev/ttyUSB0",
    baudRate: 115200,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowcontrol: false,
    buffersize: 20480
  });

const relay = new Gpio(GpioPin, 'out');

const socket_client = io_client("ws://192.168.0.252:3000", {
reconnectionDelayMax: 10000,
auth: {
    token: "123"
},
query: {
    "info": "info cpu"
}
});
  


app.get('/', (req,res) => {
    res.sendFile(path.join(__dirname,'/static/index.html')); 
}); 

app.use('/static', express.static(path.join(__dirname, '/static')))
app.use('/lib', express.static(path.join(__dirname, '/lib')))


io.on('connection', (socket) => {
    console.log('user connected');

    console.log('chek interface video ');

    const interfaces = [];
    for (let i = 0; i < 10 ; i++) {
        try {
            var camera = new cv.VideoCapture(i);
            if (!!camera) {
                interfaces.push(i);
            } 
            camera.release();
        } catch (e){
            console.log("Couldn't start camera:", e)
        }    
    }

    console.log(interfaces); 
    io.emit('select1_list',interfaces); 
    io.emit('select2_list',interfaces); 
    
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });

    socket.on('select1_change', function (data) {
        try {
            cap.release();
        } catch (e){
            console.log("Couldn't stop stream 1:", e)
        }              
        if (data >= 0) {
            try {
                cap = new cv.VideoCapture(parseInt(data,10));
                cap.set(cv.CAP_PROP_FRAME_WIDTH, 640);
                cap.set(cv.CAP_PROP_FRAME_HEIGHT, 480);
            } catch (e){
                console.log("Couldn't start stream 1:", e)
            }    
        } else
        {
            cap = null ; 
        }
    });
    
    socket.on('select2_change', function (data) {
        try {
            cap2.release();
            delete cap2 ; 
        } catch (e){
            console.log("Couldn't stop stream 1:", e)
        }              
        if (data >= 0) {
            try {
                cap2 = new cv.VideoCapture(parseInt(data,10));
                cap2.set(cv.CAP_PROP_FRAME_WIDTH, 640);
                cap2.set(cv.CAP_PROP_FRAME_HEIGHT, 480);
    
            } catch (e){
                console.log("Couldn't start stream 2:", e)
            }    
        } else 
        {
            cap2 = null
        }
    });

    socket.on ('relay', function (data) {
     if (data === 0 )
     {
        relay.writeSync(0);
     } else
     {
        relay.writeSync(1);

     }

    });
    
    console.log("init serial ")

    serialPort.on('data', function (data_stream) {
        const buf = Buffer.from(data_stream);
        const data = buf.toString('ascii')
        socket.emit ('data',data);         
    });
    

    socket.on('serial_char', function (data) {
    //    console.log('caractere from terminal : ' , data , typeof (data)) ; 
        serialPort.write(data);
    })

    console.log("Set video ")

     setInterval(() => {
        if (!!cap) {
            try {
                const frame = cap.read(); 
                const imagElm = cv.imencode('.jpg', frame).toString('base64') ; 
                io.emit('image1',imagElm); 
            } catch (e){
                console.log("Couldn't get stream 2:", e)
            }
        }
                  
    },1000 / FPS);
    setInterval(() => {
        if (!!cap2) {
            try {           
                const frame = cap2.read(); 
                
                const imagElm = cv.imencode('.jpg', frame).toString('base64') ; 
                io.emit('image2',imagElm); 
            } catch (e){
                console.log("Couldn't get stream 2:", e)
            }         
        }    
    },1000 / FPS);


    setInterval(()=> {
        const cpus = os.cpus();
        var o = {}
        var key='CPU Info'
        
        o[key] = []
        var data = {
            machinetype: os.machine(),
            platform: os.platform(),
            type: os.type(),
            cpumodel : cpuModel = os.cpus()[0].model,
            version : os.version(),
            hostname: os.hostname(),
            uptime: os.uptime()
        } 
        o[key].push(data) ; 
        const json = JSON.stringify(o);
        //console.log(json) ; 
        socket.emit('info',json) ; 
        socket_client.emit('info',json)
    },1000)


  })

serialPort.on("open", function () {
    console.log('serialPort open');
});

server.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})