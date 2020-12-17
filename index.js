const express = require('express');
const app = express();

app.get('/healthcheck',(req,res)=>{
    res.end('It\'s Alive!');
});

const port = process.env.PORT || 3000
app.listen(port, ()=>{
    console.log('Server is running');
});