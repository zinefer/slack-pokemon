var moves = require('./file-system.js'),
    Game = require('./models/Game_mdl.js'),
    Q = require('q');

/* For using RedisToGo on Heroku. If you're not using RedisToGo or Heroku,
* feel free to remove this part and just use
* redis = require("redis").createClient();
*/
var redis;
if(process.env.REDISTOGO_URL) {
  var rtg   = require("url").parse(process.env.REDISTOGO_URL);
  redis = require("redis").createClient(rtg.port, rtg.hostname);

  redis.auth(rtg.auth.split(":")[1]);
} else {
  //then we're running locally
  redis = require("redis").createClient();
}

/* Turn Redis Methods Into Promise-returning Ones */
QRedis = {};
QRedis.exists = Q.nbind(redis.exists, redis);
QRedis.set = Q.nbind(redis.set, redis);
QRedis.get = Q.nbind(redis.get, redis);
QRedis.del = Q.nbind(redis.del, redis);
QRedis.hmset = Q.nbind(redis.hmset, redis);
QRedis.hgetall = Q.nbind(redis.hgetall, redis);

module.exports = {};

module.exports.newBattle = function(playerName, channel) {
  var tryStartGame = function(exists) {
    if(!exists) {
      getGameObj(playerName).then( createNewGame );
    } else {
      throw new Error("Battle exists");
    }
  };

  var createNewGame = function(game) {
    game.id = playerName;
    game.channel = channel;
    return saveGame(playerName, game);
  };

  return QRedis.exists(playerName).then( tryStartGame );
}

module.exports.getBattle = function(playerName) {
  return getGameObj(playerName);
}

module.exports.endBattle = function(playerName) {
  return QRedis.del( playerName )
}

module.exports.choosePokemon = function(playerName, trainerName, pokemonData) {
  var choosePokemon = function(game) {
    game.choosePokemon(trainerName, pokemonData);
    return saveGame(playerName, game);
  };

  return getGameObj( playerName )
  .then( choosePokemon );
}

module.exports.chooseNextPokemon = function(playerName, trainerName) {
  var nextPokemon;
  var chooseNextPokemon = function(game) {
     nextPokemon = game.chooseNextPokemon(trainerName)
     return saveGame(playerName, game);
  };

  return getGameObj( playerName )
  .then( chooseNextPokemon )
  .then(function() { return nextPokemon; })
}

module.exports.addMove = function(data, playerName, trainerName, pokemonName) {
  var moveName = data.name.toLowerCase();

  var allowMove = function(game) {
    game.addAllowedMove( trainerName, pokemonName, moveName );
    return saveGame(playerName, game);
  };

  cacheMove(moveName, data);

  return getGameObj( playerName )
  .then( allowMove );
}

module.exports.getActivePokemon = function(playerName, trainerName) {
  var getActivePokemon = function(game) {
    return game.getActivePokemon( trainerName );
  };

  return getGameObj( playerName )
  .then( getActivePokemon );
}

module.exports.getActivePokemonTypes = function(playerName, trainerName) {
  var getActivePokemonTypes = function(game) {
    return game.getActivePokemonTypes( trainerName );
  };

  return getGameObj( playerName )
  .then( getActivePokemonTypes );
}

module.exports.getActivePokemonAllowedMoves = function(playerName, trainerName) {
  var getActivePokemonAllowedMoves = function(game) {
    return game.getActivePokemonAllowedMoves( trainerName );
  };

  return getGameObj( playerName )
  .then( getActivePokemonAllowedMoves );
}

module.exports.doDamageToActivePokemon = function(playerName, attackedPlayer, damage) {
  var doDamage = function(game) {
    hp = game.damageActivePokemon( attackedPlayer, damage );
    saveGame(playerName, game);
    return hp;
  };

  return getGameObj( playerName )
  .then( doDamage );
}

module.exports.getSingleMove = function(moveName) {
  return QRedis.hgetall("move:"+moveName.toLowerCase());
}


/////////////////////////////////////////
//       Private Methods            /////
/////////////////////////////////////////

function getGameObj(playerName) {
  var formGameObject = function(json) {
    var game = Game.fromName(playerName);
    if(json) {
      game = Game.fromJSON(JSON.parse(json));
    }

    return game;
  };

  return QRedis.get(playerName).then( formGameObject )
}

function saveGame(playerName, game) {
  return QRedis.set(playerName, JSON.stringify(game))
};

function cacheMove(name, data){
  return QRedis.hmset("move:"+name,{
    "power": data.power,
    "accuracy": data.accuracy,
    "pp": data.pp,
    "description": data.description,
    "type": moves.getMoveType(name)
  });
}
