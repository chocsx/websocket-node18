import { createServer } from 'node:http'
const PORT = 1337

createServer((request, response) => {
    response.writeHead(200)
    throw new Error('teste')
    response.end('hey there')
  })
  .listen(1337, () => console.log('server is listening to', PORT))

;
[
  "uncaughtException",
  "unhandledRejection"
].forEach(event => 
  process.on(event, (err) => {
    console.error(`ferrou mane: ${event}, msg: ${err.stack || err }`)
  })
)