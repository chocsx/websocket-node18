import { createServer } from 'node:http'
import crypto from 'crypto'


const PORT = 1337
const WEBSOCKET_MAGIC_STRING_KEY = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const SEVEN_BITS_INTEGER_MARKER = 125
const SIXTEEN_BITS_INTEGER_MARKER = 126
const SIXTYFOUR_BITS_INTEGER_MARKER = 127
const MASK_KEY_BYTES_LENGTH = 4

const FIRST_BIT = 128

const server = createServer((request, response) => {
    response.writeHead(200)
    response.end('hey there')
  })
  .listen(1337, () => console.log('server is listening to', PORT))

  server.on('upgrade', onSocketUpgrade)

function onSocketReadable(socket) {
  socket.read(1)

  const [markerAndPayloadLenght] = socket.read(1)
  const lengthIndicatorInBits = markerAndPayloadLenght - FIRST_BIT

  let messageLength = 0
  if( lengthIndicatorInBits <= SEVEN_BITS_INTEGER_MARKER) {
    messageLength = lengthIndicatorInBits
  } else {
    throw new Error(`your message is too long! we dont handle 64-bits messages`)
  }

  const maskKey = socket.read(MASK_KEY_BYTES_LENGTH)
  const encoded = socket.read(messageLength)
  const decoded = unmask(encoded, maskKey)
}

function unmask(encodedBuffer, maskKey) {
  var finalBuffer = Buffer.from(encodedBuffer);

  for (const index in encodedBuffer) {
    finalBuffer[index] = encodedBuffer[index] ^ maskKey[index % 4]
  }
}

function onSocketUpgrade(req, socket, hand){
  const { 'sec-websocket-key': webClientSocketKey } = req.headers
  console.log(`${webClientSocketKey} connected!`)
  const headers = prepareHandShakeHeaders(webClientSocketKey)

  socket.write(headers);
  socket.on('readable', () => onSocketReadable(socket))
}


function prepareHandShakeHeaders(id) {
  const acceptKey = createSocketAccecpt(id)
  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept:${acceptKey}`,
    ''
  ].map(line => line.concat('\r\n')).join('')
  return headers
}

function createSocketAccecpt(id) {
  const shaum = crypto.createHash('sha1')
  shaum.update(id + WEBSOCKET_MAGIC_STRING_KEY)
  return shaum.digest('base64')
}
;
[
  "uncaughtException",
  "unhandledRejection"
].forEach(event => 
  process.on(event, (err) => {
    console.error(`ferrou mane: ${event}, msg: ${err.stack || err }`)
  })
)