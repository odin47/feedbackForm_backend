const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');
const db = require('./config/db');


const app = express();

const port = 8000;

app.use(bodyParser.urlencoded({ extended : true }));



MongoClient.connect(db.url, (err, database) => {

    const myDB = database.db('feedback360DB');
    if(err) return console.log(err);

    require('./app/routes')(app, myDB);
    app.listen(port, () => {
    console.log("You are listining to "+port);
});
    
})