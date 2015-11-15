var Pokemon = require('./Pokemon_mdl.js');

var Player = function(isNpc, name, pokemon) {
  this.name = name || null;
  this.isNpc = isNpc || false;
  this.pokemon = pokemon || [];

  this.getPokemonByName = function(pokemonName) {
    for (var i = 0; i < this.pokemon.length; i++) {
      if(this.pokemon[i].name == pokemonName) {
        return this.pokemon[i];
      }
    }
    return null;
  };

  this.getPokemonIndexByName = function(pokemonName) {
    for (var i = 0; i < this.pokemon.length; i++) {
      if(this.pokemon[i].name == pokemonName) {
        return i;
      }
    }
    return null;
  };

  this.choosePokemon = function(pokemonData){
    var index = this.getPokemonIndexByName(pokemonData.name);
    var pokemon;

    if(index !== null){
      pokemon = this.getPokemonByName(pokemonData.name);
      this.pokemon.slice(index, 1);
    } else {
      pokemon = Pokemon.fromPokeData(pokemonData);
    }

    this.pokemon.unshift(pokemon);
  };

  this.chooseNextPokemon = function() {
    for( var i = 0; i < this.pokemon.length; i++ ) {
      if( this.pokemon[i].hp > 0 ) {
        var temp = this.pokemon[0];
        this.pokemon[0] = this.pokemon[i];
        this.pokemon[i] = temp;

        return this.pokemon[0];
      }
    }

    return null;
  };

  this.addAllowedMove = function(pokemonName, move) {
    return this.getPokemonByName(pokemonName).addAllowedMove(move);
  };

  this.getActivePokemon = function() {
    if(this.pokemon.length > 0) {
      return this.pokemon[0];
    }
  };

  this.getActivePokemonAllowedMoves = function(){
    if(this.pokemon.length > 0) {
      return this.pokemon[0].allowedMoves;
    }
  };

  this.getActivePokemonTypes = function(){
    if(this.pokemon.length > 0) {
      return this.pokemon[0].types;
    }
  };

  this.damageActivePokemon = function(damage) {
    if(this.pokemon.length > 0) {
      return this.pokemon[0].hp -= damage;
    }
  };
};

Player.prototype = new Player();
Player.prototype.constructor = Player;

module.exports.fromNameAndType = function(type, name) {
  return new Player(type, name);
};

module.exports.fromJSON = function(json) {
  if(!json) {
    return null;
  };

  var pokemonList = [];
  json.pokemon.forEach(function (poke) {
    pokemonList.push(Pokemon.fromJSON(poke));
  });

  return new Player(json.isNpc, json.name, pokemonList);
};
