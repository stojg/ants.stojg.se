"use strict";
define(['class'], function () {

	var State = State || {};
	var Transition = Transition || {};

	/**
	 * This is a simple state machine that can be used by entities.
	 *
	 * The constructor takes a starting state with transitions to other states.
	 */
	State.Machine = Class.extend({
		init: function(owner, initial_state) {
			this.owner = owner;
			this.initial_state = initial_state;
			this.current_state = new this.initial_state(this.owner);
		},
		update: function() {
			var triggered_transition = false;

			// Walk through all the transitions for the first one that triggers
			var transitions = this.current_state.get_transitions();
			for (var i = 0; i < transitions.length; i++) {
				var transition = transitions[i];
				if (transition.is_triggered()) {
					triggered_transition = transition;
					break;
				}
			}

			// no transitions to other states, keep doing what you're doing
			if (triggered_transition === false) {
				return [this.current_state.get_action()];
			}

			var actions = [];
			var target_state = triggered_transition.get_target_state();
			actions.push(this.current_state.get_exit_action());
			actions.push(triggered_transition.get_action());
			actions.push(target_state.get_entry_action());
			this.current_state = target_state;
			return actions;
		}
	});

	State.state_pickup_food = Class.extend({
		init: function(owner) {
			this.owner = owner;
		},
		get_entry_action: function() {
			return 'starting_pickup_food_action';
		},
		get_action: function() {
			return 'pickup_food_action';
		},
		get_exit_action: function() {
			return 'exiting_pickup_food_action';
		},
		get_transitions: function() {
			return [
				new Transition.carries_food(this.owner)
			];
		}
	});

	State.find_food = Class.extend({
		init: function(owner) {
			this.owner = owner;
		},
		get_entry_action: function() {
			return 'starting_seek_food_action';
		},

		get_action: function() {
			return 'seek_food_action';
		},

		get_exit_action: function() {
			return 'exiting_seek_food_action';
		},

		get_transitions: function() {
			return [
				new Transition.found_food(this.owner)
			];
		}
	});

	State.state_go_home = Class.extend({
		init: function(owner) {
			this.owner = owner;
		},
		get_entry_action: function() {
			return 'starting_seek_home_action';
		},
		get_action: function() {
			return 'seek_home_action';
		},
		get_exit_action: function() {
			return 'exiting_seek_home_action';
		},
		get_transitions: function() {
			return [
				new Transition.is_home(this.owner)
			];
		}
	});

	Transition.found_food = Class.extend({
		init: function(owner) {
			this.owner = owner;
		},
		is_triggered: function() {
			var food_items = this.owner.get_closest('food');
			for(var key in food_items) {
				var distance = food_items[key].position.distanceFrom(this.owner.kinematics().position);
				if(distance < 8) {
					return true;
				}
			}
			return false;
		},
		get_target_state: function() {
			return new State.state_pickup_food(this.owner);
		},
		get_action: function() {
			return 'found_food_action';
		}
	});

	Transition.carries_food = Class.extend({
		init: function(owner) {
			this.owner = owner;
		},
		is_triggered: function() {
			return this.owner.carries('food');
		},
		get_target_state: function() {
			return new State.state_go_home(this.owner);
		},
		get_action: function() {
			return 'have_food_action';
		}
	});

	Transition.is_home = Class.extend({
		init: function(owner) {
			this.owner = owner;
		},
		is_triggered: function() {
			var homes = this.owner.get_closest('home');
			for(var key in homes) {
				var distance = homes[key].position.distanceFrom(this.owner.kinematics().position);
				if(distance < 10) {
					return true;
				}
			}
			return false;

		},
		get_target_state: function() {
			return new State.find_food(this.owner);
		},
		get_action: function() {
			return 'is_home_action';
		}
	});

	return State;

});