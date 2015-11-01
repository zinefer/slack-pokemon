var moves = require('./move-types.js'),
    Game = require('./models/Game_mdl.js'),
    Q = require('q');

var redis,
    rtg;

/* For using RedisToGo on Heroku. If you're not using RedisToGo or Heroku,
* feel free to remove this part and just use
* redis = require("redis").createClient();
*/
if(process.env.REDISTOGO_URL) {
  rtg   = require("url").parse(process.env.REDISTOGO_URL);
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

module.exports.choosePokemon = function(playerName, choosingPlayer, pokemonName) {
  var choosePokemon = function(game) {
    game.choosePokemon(choosingPlayer, pokemonName);
    return saveGame(playerName, game);
  };

  getGameObj( playerName )
  .then( choosePokemon );
}

module.exports.addMove = function(data, playerName, addingPlayer, pokemonName) {
  var moveName = data.name.toLowerCase();

  var allowMove = function(game) {
    game.addAllowedMove( addingPlayer, pokemonName, moveName );
    return saveGame(playerName, game);
  };

  cacheMove(moveName, data.power);

  getGameObj( playerName )
  .then( allowMove );
}

module.exports.setPokemonTypes = function(typesArray, playerName, settingPlayer, pokemonName) {
  var addTypes = function(game) {
    game.setPokemonType( settingPlayer, pokemonName, typesArray );
    saveGame(playerName, game);
  };

  getGameObj( playerName )
  .then( addTypes );
}

module.exports.getActivePokemonTypes = function(playerName, gettingPlayer) {
  var getActivePokemonTypes = function(game) {
    return game.getActivePokemonTypes( gettingPlayer );
  };

  return getGameObj( playerName )
  .then( getActivePokemonTypes );
}

module.exports.getActivePokemonAllowedMoves = function(playerName, gettingPlayer) {
  var getActivePokemonAllowedMoves = function(game) {
    return game.getActivePokemonAllowedMoves( gettingPlayer );
  };

  return getGameObj( playerName )
  .then( getActivePokemonAllowedMoves );
}

module.exports.setActivePokemonHP = function(playerName, settingPlayer, hp) {
  var setActivePokemonHP = function(game) {
    hp = game.setActivePokemonHP( settingPlayer, hp );
    saveGame(playerName, game);
    return hp;
  };

  return getGameObj( playerName )
  .then( setActivePokemonHP );
}

module.exports.getActivePokemonHP = function(playerName, gettingPlayer) {
  var getActivePokemonHP = function(game) {
    return game.getActivePokemonHP( gettingPlayer );
  };

  return getGameObj( playerName )
  .then( getActivePokemonHP );
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

//TODO: Fix how this works
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

function cacheMove(name, power){
  return QRedis.hmset("move:"+name,{
    "power": power,
    "type": moves.getMoveType(name)
  });
}
