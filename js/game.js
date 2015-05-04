"use strict";
define(function() {
	//Do setup work here
	var game = game || {};

	game.world = { width: 0, height: 0};

	game.collision = function(object) {
		return false;
	};

	game.init = function(canvasID) {
		// Create an engine.
		var engine = new pulse.Engine({
			gameWindow: canvasID,
			size: {width: game.world.width, height: game.world.height}
		});

		return engine;
	};

	return game;
});