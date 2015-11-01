var Pokemon = require('./Pokemon_mdl.js');

var Player = function(name, pokemon) {
  this.name = name || null;
  this.pokemon = pokemon || [];

  this.getPokemonByName = function(pokemonName) {
    for (var i = 0; i < this.pokemon.length; i++) {
      if(this.pokemon.name == pokemonName) {
        return this.pokemon;
      }
    }
    return null;
  };

  this.getPokemonIndexByName = function(pokemonName) {
    for (var i = 0; i < this.pokemon.length; i++) {
      if(this.pokemon.name == pokemonName) {
        return i;
      }
    }
    return null;
  };

  this.choosePokemon = function(pokemonName){
    var index = this.getPokemonIndexByName(pokemonName);
    var pokemon;

    if(index !== null){
      pokemon = this.getPokemonByName(pokemonName);
      this.pokemon.split(index, 1);
    } else {
      pokemon = Pokemon.fromName(pokemonName);
    }

    this.pokemon.unshift(pokemon);
  };

  this.setPokemonType = function(pokemonName, typeArray) {
    return this.getPokemonByName(pokemonName).types = typesArray;
  };

  this.getAllowedMoves = function(pokemonName){
    return this.getPokemonByName(pokemonName).availableMoves;
  };

  this.addAllowedMove = function(pokemonName, move) {
    return this.getPokemonByName(pokemonName).availableMoves.push(move);
  };

  this.setActivePokemonHP = function(hp) {
    if(this.pokemon.length > 0) {
      this.pokemon[0].hp = hp;
    }
  };

  this.getActivePokemonHP = function(hp) {
    if(this.pokemon.length > 0) {
      return this.pokemon[0].hp;
    }
  };

  this.damageActivePokemon = function(damage) {
    return this.pokemon[0].hp -= damage;
  };
};

Player.prototype = new Player();
Player.prototype.constructor = Player;

module.exports.fromName = function(name) {
  return new Player(name);
};

module.exports.fromJSON = function(json) {
  if(!json) {
    return null;
  };

  return new Player(json.name, Pokemon.fromJSON(json.pokemon));
};
