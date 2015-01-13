var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

  initialize: function(){
    this.on('creating', function(model, resp, options) {
      var username = model.get('username');
      var password = model.get('password');
      bcrypt.genSalt(10, function(err, salt) {
        console.log(salt);
        bcrypt.hash(password, salt, null, function(error, hash) {
          if (error) {
            console.log(error);
          } else {
            model.set('username', username);
            model.set('password', hash);
          }
        });
      });
    });
  }
});



module.exports = User;
