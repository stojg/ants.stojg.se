"use strict";
define(['class'], function() {

	var Scheduler = Scheduler || {};

	Scheduler.BehaviourRecord = Class.extend({
		init: function(thingToRun, frequency, phase) {
			this.thingToRun = thingToRun;
			this.frequency = frequency;
			this.phase = phase;
		}
	});
	Scheduler.Frequency = Class.extend({
		init: function() {
			this.frame = 0;
			this.behaviours = [];
		},
		add_behaviour: function(func, frequency, phase) {
			var record = new Scheduler.BehaviourRecord(func, frequency, phase);
			this.behaviours.push(record);
		},

		run: function() {
			this.frame += 1;
			for (var i = 0; i < this.behaviours.length; i++) {
				var behaviour = this.behaviours[i];
				if ((this.frame - behaviour.phase) % behaviour.frequency === 0) {
					behaviour.thingToRun();
				}
			}
		}
	});

	return Scheduler;

});