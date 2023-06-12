const express = require('express');
require('dotenv').config()
const bodyParser = require('body-parser')
const app = express();
app.use(bodyParser.json())

var mysql = require('mysql');
var connection = mysql.createConnection({
  host: 'localhost',
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: 'logger'
});

connection.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

const MAX_BUFFER_SIZE = 10485760
//const MIN_BUFFER_SIZE = 71
let BUFFER_VAR = Buffer.from('', 'utf-8');
//A replica to handle read and write at the same time
let BUFFER_VAR_COPY = Buffer.from('', 'utf-8');
let REPLICA_STATE = 'sync'

const flushDataToDb = async () => {
  BUFFER_VAR = Buffer.from('', 'utf-8')
  REPLICA_STATE = 'lock'
  const str = BUFFER_VAR_COPY.toString();
  const insertArr = str.split('\n').filter(ele => ele != '');
  console.log(insertArr)
  const queryString = insertArr.map(() => `(?)`)
  const query = `insert into logs (log) values ${queryString.join(',')}`
  console.log(query)
  connection.query(query, [...insertArr]);
  REPLICA_STATE = 'sync'
}

app.post('/log', (req, res) => {
  const logObject = req.body;
  const logString = JSON.stringify(logObject) + '\n';
  const buff = Buffer.from(logString, 'utf-8');
  BUFFER_VAR = Buffer.concat([BUFFER_VAR, buff])
  if (REPLICA_STATE == 'sync') {
    BUFFER_VAR_COPY = Buffer.from(BUFFER_VAR.toString());
  }
  const bufferSize = Buffer.byteLength(BUFFER_VAR);
  console.log(bufferSize)
  if (bufferSize > MAX_BUFFER_SIZE) {
    flushDataToDb();
    return res.sendStatus(200);
  } //fire function
  return res.sendStatus(200);
})

app.get('/log', (req, res) => {
  res.send(BUFFER_VAR.toString())
})

const port = 8081;
app.listen(port, () => {
  console.log('port is active', port);
})
