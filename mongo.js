const MongoClient = require('mongodb').MongoClient;
const url = process.env.MONGO_URL

var _database;

module.exports = {
  connect: ( ) => {
    MongoClient.connect( url,  { useUnifiedTopology: true }, function( err, client ) {
        if(err) throw err;
        _database  = client.db('test');
        console.log('databse created');
    } );
  },

  getInstance: () => {
    return _database;
  }
};