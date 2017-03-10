var path = require('path')
var fs = require('fs')
var Router = require('koa-router')
var RELOAD_FILE = path.join(__dirname, './reload-client.js')
var router = new Router()

module.exports = function reload (httpServer, verboseLogging) {
  var reloadCode = fs.readFileSync(RELOAD_FILE, 'utf8')

  var conn

  var WebSocketServer = require('ws').Server
  var wss = new WebSocketServer({ server: httpServer })

  wss.on('connection', (ws) => {
    // Take the current web socket connection and save it to webSocketConnetion so we can use it later in the returned reload function for manually firing reload events.
    conn = ws

    if (verboseLogging) {
      console.log('Reload client connected to server')
    }
  })

  if (verboseLogging) {
    reloadCode = reloadCode.replace('verboseLogging = false', 'verboseLogging = true')
  }

  router.get('/reload/reload.js', (ctx, next) => {
    ctx.type = 'text/javascript'
    ctx.body = reloadCode
  })


  // Return an object, so that the user can manually reload the server by calling the returned function reload. Using the web socket connection from above, we provide a function called reload which passes the command 'reload' to the function sendMessage. sendMessage sends the message 'reload' over the socket (if the socket is connected) to the client. The client then recieves the messages checks to see if the message is reload and then reloads the page.
  return {
    'Reloadrouter': router,
    'server': reload,
    'connection': conn,
    'reload': function () {
      this.sendMessage('reload')
    },
    'sendMessage': function (command) {
      if (conn) {
        conn.send(command, function (error) {
          if (error) {
            console.error(error)
          }
        })
      } else {
        if (verboseLogging) {
          console.log('Cannot send "' + command + '" to client: still not connected')
        }
      }
    }
  }
}
