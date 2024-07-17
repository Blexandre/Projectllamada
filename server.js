const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

// Rutas a los archivos JSON
const menuFilePath = path.join(__dirname, 'menu.json');
const waitersFilePath = path.join(__dirname, 'waiters.json');
const historyFilePath = path.join(__dirname, 'history.json');

// Directorio para almacenar las imágenes
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Función para cargar el menú desde el archivo
function loadMenu() {
    try {
        if (!fs.existsSync(menuFilePath)) {
            const defaultMenu = {
                "Entrantes": [
                    { name: "Ensalada César", price: "8.50€", description: "Lechuga fresca con pollo a la parrilla, croutons y aderezo César", image: "/uploads/default-caesar-salad.jpg" },
                    { name: "Croquetas de Jamón", price: "7.00€", description: "Croquetas caseras rellenas de jamón ibérico", image: "/uploads/default-ham-croquettes.jpg" },
                    { name: "Gazpacho Andaluz", price: "6.50€", description: "Sopa fría de tomate y verduras, perfecta para el verano", image: "/uploads/default-gazpacho.jpg" }
                ],
                "Platos Principales": [
                    { name: "Paella de Mariscos", price: "18.00€", description: "Arroz con una selección de mariscos frescos", image: "/uploads/default-seafood-paella.jpg" },
                    { name: "Solomillo a la Pimienta", price: "22.50€", description: "Tierno solomillo de ternera con salsa de pimienta", image: "/uploads/default-pepper-steak.jpg" },
                    { name: "Lubina al Horno", price: "20.00€", description: "Lubina fresca al horno con verduras de temporada", image: "/uploads/default-baked-sea-bass.jpg" }
                ],
                "Postres": [
                    { name: "Tarta de Queso", price: "6.00€", description: "Tarta de queso casera con base de galleta", image: "/uploads/default-cheesecake.jpg" },
                    { name: "Crema Catalana", price: "5.50€", description: "Postre tradicional catalán con una capa de azúcar caramelizado", image: "/uploads/default-crema-catalana.jpg" },
                    { name: "Frutas del Bosque", price: "7.00€", description: "Selección de frutas frescas del bosque", image: "/uploads/default-forest-fruits.jpg" }
                ]
            };
            fs.writeFileSync(menuFilePath, JSON.stringify(defaultMenu, null, 2));
            console.log('Archivo menu.json creado con menú por defecto');
            return defaultMenu;
        }
        const data = fs.readFileSync(menuFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error al cargar el menú:', err);
        return {}; // Retorna un objeto vacío en caso de error
    }
}

// Función para guardar el menú en el archivo
function saveMenu(menu) {
    try {
        fs.writeFileSync(menuFilePath, JSON.stringify(menu, null, 2));
        console.log('Menú guardado correctamente');
    } catch (err) {
        console.error('Error al guardar el menú:', err);
    }
}

// Función para cargar los camareros desde el archivo
function loadWaiters() {
    try {
        if (!fs.existsSync(waitersFilePath)) {
            const defaultWaiters = ['Camarero 1', 'Camarero 2'];
            fs.writeFileSync(waitersFilePath, JSON.stringify(defaultWaiters, null, 2));
            console.log('Archivo waiters.json creado con camareros por defecto');
            return defaultWaiters;
        }
        const data = fs.readFileSync(waitersFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error al cargar los camareros:', err);
        return ['Camarero 1', 'Camarero 2']; // Retorna camareros por defecto en caso de error
    }
}

// Función para guardar los camareros en el archivo
function saveWaiters(waiters) {
    try {
        fs.writeFileSync(waitersFilePath, JSON.stringify(waiters, null, 2));
        console.log('Camareros guardados correctamente');
    } catch (err) {
        console.error('Error al guardar los camareros:', err);
    }
}

// Función para cargar el historial desde el archivo
function loadHistory() {
    try {
        if (fs.existsSync(historyFilePath)) {
            const data = fs.readFileSync(historyFilePath, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (err) {
        console.error('Error al cargar el historial:', err);
        return {};
    }
}

// Función para guardar el historial en el archivo
function saveHistory(history) {
    try {
        fs.writeFileSync(historyFilePath, JSON.stringify(history, null, 2));
        console.log('Historial guardado correctamente');
    } catch (err) {
        console.error('Error al guardar el historial:', err);
    }
}

// Cargar el menú, los camareros y el historial al inicio
let menu = loadMenu();
let waiters = loadWaiters();
let dailyHistories = loadHistory();

// Variables globales para manejar el estado del restaurante
let queue = [];
let currentNumber = 1;
let currentServing = { number: 0, table: null, waiter: null };

// Crear el servidor HTTP
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let filePath;
    
    if (parsedUrl.pathname.startsWith('/uploads/')) {
        // Servir imágenes cargadas
        filePath = path.join(__dirname, parsedUrl.pathname);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
            } else {
                const ext = path.extname(filePath);
                const contentType = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.gif': 'image/gif'
                }[ext] || 'application/octet-stream';
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            }
        });
        return;
    }
    
    switch(parsedUrl.pathname) {
        case '/':
            filePath = 'restaurant-auth.html';
            break;
        case '/login':
            filePath = 'login.html';
            break;
        case '/camarero':
            filePath = 'camarero.html';
            break;
        case '/editor':
            filePath = 'editor.html';
            break;
        case '/client':
            filePath = 'index.html';
            break;
        case '/upload':
            handleFileUpload(req, res);
            return;
        default:
            res.writeHead(404);
            return res.end('404 Not Found');
    }

    filePath = path.join(__dirname, filePath);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(500);
            return res.end(`Error loading ${filePath}`);
        }
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(data);
    });
});

function handleFileUpload(req, res) {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString();
    });
    req.on('end', () => {
        const match = body.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (match) {
            const type = match[1];
            const data = Buffer.from(match[2], 'base64');
            const extension = type.split('/')[1];
            const fileName = `${crypto.randomBytes(16).toString('hex')}.${extension}`;
            const filePath = path.join(uploadDir, fileName);
            fs.writeFile(filePath, data, err => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error saving file');
                } else {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ url: `/uploads/${fileName}` }));
                }
            });
        } else {
            res.writeHead(400);
            res.end('Invalid file data');
        }
    });
}

// Crear el servidor WebSocket
const wss = new WebSocket.Server({ server });

// Manejar conexiones WebSocket
wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        const msg = JSON.parse(message);
        switch(msg.type) {
            case 'join':
                const ticketNumber = currentNumber++;
                queue.push({ ws, ticketNumber, table: msg.table });
                ws.send(JSON.stringify({ type: 'ticket', number: ticketNumber }));
                broadcastQueueStatus();
                break;
            case 'leave':
                queue = queue.filter(client => client.table !== msg.table);
                broadcastQueueStatus();
                break;
            case 'next':
                if (queue.length > 0) {
                    const served = queue.shift();
                    currentServing = { number: served.ticketNumber, table: served.table, waiter: msg.waiter };
                    const historyEntry = { ...currentServing, time: new Date() };
                    const today = new Date().toISOString().split('T')[0];
                    if (!dailyHistories[today]) {
                        dailyHistories[today] = [];
                    }
                    dailyHistories[today].unshift(historyEntry);
                    saveHistory(dailyHistories);  // Guarda el historial actualizado
                    served.ws.send(JSON.stringify({ type: 'served' }));
                    broadcastQueueStatus();
                    broadcastHistoryUpdate(historyEntry);
                }
                break;
            case 'getHistory':
                const date = msg.date || new Date().toISOString().split('T')[0];
                ws.send(JSON.stringify({ type: 'history', data: dailyHistories[date] || [] }));
                break;
            case 'getMenu':
                ws.send(JSON.stringify({ type: 'menuUpdate', menu: menu }));
                break;
            case 'updateMenu':
                menu = msg.menu;
                saveMenu(menu);
                broadcastMenuUpdate();
                break;
            case 'getWaiters':
                ws.send(JSON.stringify({ type: 'waitersList', waiters: waiters }));
                break;
            case 'addWaiter':
                if (!waiters.includes(msg.name)) {
                    waiters.push(msg.name);
                    saveWaiters(waiters);
                    broadcastWaitersList();
                }
                break;
        }
    });

    ws.on('close', function() {
        queue = queue.filter(client => client.ws !== ws);
        broadcastQueueStatus();
    });

    // Enviar estado inicial
    broadcastQueueStatus();
    ws.send(JSON.stringify({ type: 'menuUpdate', menu: menu }));
});

function broadcastQueueStatus() {
    const status = {
        queue: queue.map(client => ({ number: client.ticketNumber, table: client.table })),
        currentServing: currentServing
    };
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'queueUpdate', status }));
        }
    });
}

function broadcastMenuUpdate() {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'menuUpdate', menu: menu }));
        }
    });
}

function broadcastHistoryUpdate(historyEntry) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'historyUpdate', data: historyEntry }));
        }
    });
}

function broadcastWaitersList() {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'waitersList', waiters: waiters }));
        }
    });
}

server.listen(8080, '192.168.0.11', () => {
    console.log('Servidor ejecutándose en http://192.168.0.11:8080');
    console.log('Autenticación de restaurante en http://192.168.0.11:8080');
    console.log('Inicio de sesión de camareros en http://192.168.0.11:8080/login');
    console.log('Interfaz del camarero en http://192.168.0.11:8080/camarero');
    console.log('Editor de carta en http://192.168.0.11:8080/editor');
    console.log('Página de cliente en http://192.168.0.11:8080/client');
});