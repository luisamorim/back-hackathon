require('dotenv').config();
const express = require('express');
const app = express();
const mongo = require('./mongo');
const bodyParser = require('body-parser')

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

async function bootstrap(){
    mongo.connect();
}

app.get('/healthcheck', (req,res)=>{
    res.end('It\'s Alive!');
});

app.get('/webhooks',async(req,res)=>{
    const result = await mongo.getInstance().collection('webhooks').find({}).toArray();
    res.status(200).json(result);
});

app.post('/webhooks',async(req,res)=>{
    const result = await mongo.getInstance().collection('webhooks').insertOne(req.body);
    res.status(201).json(result);
})

const port = process.env.PORT || 3000
app.listen(port, ()=>{
    console.log('Server is running');
});

bootstrap();