import { createServer } from 'http'
import crypto from 'crypto'


const PORT = 1337
const WEBSOCKET_MAGIC_STRING_KEY = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
const SEVEN_BITS_INTEGER_MARKER = 125
const SIXTEEN_BITS_INTEGER_MARKER = 126
const SIXTYFOUR_BITS_INTEGER_MARKER = 127
const MASK_KEY_BYTES_LENGTH = 4
const OPCODE_TEXT = 0x01 // 1 bit in binary 1

const FIRST_BIT = 128

const server = createServer((request, response) => {
  response.writeHead(200)
  response.end('hey there')
})
.listen(1337, () => console.log('server listening to', PORT))

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
  const received = decoded.toString('utf8')

  const data = JSON.parse(received)
  console.log('message received!', data)

  const msg = JSON.stringify(data)
  sendMessage(msg, socket)
}

function unmask(encodedBuffer, maskKey) {
  var finalBuffer = Buffer.from(encodedBuffer);

  const fillWithEightZeros = (t) => t.padStart(8, "0")
  const toBinary = (t) => t.toString(2)
  const fromBinaryToDecimal = (t) => parseInt(toBinary(t), 2)
  const getCharFromBinary = (t) => String.fromCharCode(fromBinaryToDecimal(t))
  for (let index = 0; index < encodedBuffer.length; index++) {
    finalBuffer[index] = encodedBuffer[index] ^ maskKey[index % 4]

    const logger = {
      unmaskingCalc: `${toBinary(encodedBuffer[index])} ^ ${toBinary(maskKey[index % MASK_KEY_BYTES_LENGTH])} = ${toBinary(finalBuffer[index])}`,
      decoded: getCharFromBinary(finalBuffer[index])
    }
    console.log(logger)
  }

  return finalBuffer
}

function onSocketUpgrade(req, socket, hand){
  const { 'sec-websocket-key': webClientSocketKey } = req.headers
  console.log(`${webClientSocketKey} connected!`)
  const headers = prepareHandShakeHeaders(webClientSocketKey)

  socket.write(headers);
  socket.on('readable', () => onSocketReadable(socket))

}

function sendMessage(msg, socket) {
  const dataFrameBuffer = prepareMessage(msg)
  socket.write(dataFrameBuffer)
}

function prepareMessage(message) {
  const msg = Buffer.from(message)
  const messageSize = msg.length

  let dataFrameBuffer;
  let offset = 2


  const firstByte = 0x80 | OPCODE_TEXT

  if(messageSize <= SEVEN_BITS_INTEGER_MARKER) {
    const bytes = [firstByte]
    dataFrameBuffer = Buffer.from(bytes.concat(messageSize))
  } else {
    throw new Error ('message to long buddy! ')
  }

  const totalLength = dataFrameBuffer.byteLength + messageSize
  const dataFrameResponse = concat([dataFrameBuffer, msg], totalLength)

  return dataFrameResponse
}

function concat(bufferList, totalLength) {
  const target = Buffer.allocUnsafe(totalLength)
  let offset = 0;
  for(const buffer of bufferList) {
    target.set(buffer, offset)
    offset += buffer.length
  }

  return target
}

function prepareHandShakeHeaders(id) {
  const acceptKey = createSocketAccept(id)
  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept:${acceptKey}`,
    ''
  ].map(line => line.concat('\r\n')).join('')
  return headers
}

function createSocketAccept(id) {
  const shaum = crypto.createHash('sha1')
  shaum.update(id + WEBSOCKET_MAGIC_STRING_KEY)
  return shaum.digest('base64')
}

// error handling to keep the server on
;
[
  "uncaughtException",
  "unhandledRejection"
].forEach(event =>
  process.on(event, (err) => {
    console.error(`something bad happened! event: ${event}, msg: ${err.stack || err}`)
  })

)