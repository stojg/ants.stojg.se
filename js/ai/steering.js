define(['class', 'vec', 'vector'], function(Class, vec) {

	// shorthand for vector create
	var sylVec = Vector.create;

	ai = {};
	ai.steering = ai.steering || {};

	/**
	 * Kinematics is what get passed in to the steering behaviour. It's a struct
	 * that tells the behaviours about the character and targets internals. With
	 * this information it can return a steering output
	 */
	ai.steering.Kinematics = Class.extend({
		init: function(args) {
			args = args || {};
			// current state
			this.position = args.position || sylVec([0, 0]);
			this.velocity = args.velocity || sylVec([0, 0]);
			this.orientation = args.orientation || 0;
			this.rotation = args.rotation || 0;
			// speed / velocity limits
			this.max_velocity = args.max_velocity || 0;
			this.max_acceleration = args.max_acceleration || 0,
			// rotation limits
			this.max_angular_velocity = args.max_angular_velocity || 0;
			this.max_angular_acceleration = args.max_angular_acceleration || 0;
			this.radius = args.radius || 0;
			this.name = args.name || 'undefined';
			this.type = args.type || 'undefined';
		}
	});

	/**
	 * Output is a struct that is the return value from any steering behaviour
	 */
	ai.steering.Output = Class.extend({
		init: function() {
			this.linear = sylVec([0, 0]);
			this.angular = 0;
		},
		acceleration: function() {
			return this.linear;
		},
		rotation: function() {
			return this.angular;
		}
	});

	/**
	 * Bleended steering blends a bunch of steering behaviours with a weight.
	 */
	ai.steering.BlendedSteering = Class.extend({
		init: function() {
			this.behaviours = [];
		},
		push: function(behaviour, weight) {
			this.behaviours.push([behaviour, weight]);
		},
		get: function() {
			var steering = new ai.steering.Output();
			for (var i = this.behaviours.length - 1; i >= 0; i--) {
				var steer = this.behaviours[i][0].get();
				steering.linear = steering.linear.add(steer.linear.multiply(this.behaviours[i][1]));
				steering.angular = steer.angular * this.behaviours[i][1];
			}
			return steering;
		}
	});

	/**
	 * Priority testing test one behaviour at a time and returns the first one
	 * that have a non zero output.
	 */
	ai.steering.PrioritySteering = Class.extend({
		init: function() {
			this.behaviours = [];
		},
		push: function(behaviour) {
			this.behaviours.push(behaviour);
		},
		get: function() {
			for (var i = 0; i < this.behaviours.length; i++) {
				var steeringResult = this.behaviours[i].get();
				if (steeringResult.linear.length() > 0 || steeringResult.angular !== 0) {
					return steeringResult;
				}
			}
			return new ai.steering.Output();
		}
	});

	/**
	 * Seek tries to get as fast as possible in a direction and will not brake
	 * when getting close.
	 */
	ai.steering.Seek = Class.extend({
		init: function(character, target) {
			this.character = character;
			this.target = target;
		},
		get: function() {
			var steering = new ai.steering.Output();
			steering.linear = this.target.position.subtract(this.character.position);
			steering.linear = steering.linear.normalize(steering.linear);
			// Give full acceleration
			steering.linear = steering.linear.multiply(this.character.max_acceleration);
			return steering;
		}
	});

	/**
	 * Flee is the opposite to Seek, full speed away from a target
	 */
	ai.steering.Flee = ai.steering.Seek.extend({
		get: function() {
			var steering = new ai.steering.Output();
			steering.linear = this.character.position.subtract(this.target.position);
			steering.linear = steering.linear.normalize(steering.linear);
			// Give full acceleration
			steering.linear = steering.linear.multiply(this.character.max_acceleration);
			return steering;
		}
	});

	/**
	 * Arrive is like seek with the addition that it slows down the character
	 * when it gets closer.
	 */
	ai.steering.Arrive = Class.extend({
		init: function(character, target) {
			this.character = character;
			this.target = target;
			this.targetRadius = 6;
			this.slow_radius = 20;
			this.time_to_target = 0.1;
		},
		get: function() {
			var steering = new ai.steering.Output();

			var direction = this.target.position.subtract(this.character.position);
			var distance = direction.length();

			// We're there, we're there!
			if (distance < this.targetRadius) {
				return steering;
			}

			// Go max speed
			var target_speed = this.character.max_velocity;

			// unless we're in the slowRadius
			if (distance < this.slow_radius) {
				target_speed = this.character.max_velocity * distance / this.slow_radius;
			}

			// The target velocity combines speed and direction
			var targetVelocity = direction;
			targetVelocity = targetVelocity.normalize();
			targetVelocity = targetVelocity.multiply(target_speed);

			// acceleration tries to get to the target velocity
			steering.linear = targetVelocity.subtract(this.character.velocity);
			// within the time to target
			steering.linear = steering.linear.multiply(1 / this.time_to_target);
			if (steering.linear.length() > this.character.max_acceleration) {
				steering.linear = steering.linear.normalize();
				steering.linear = steering.linear.multiply(this.character.max_acceleration);
			}
			return steering;
		}
	});

	/**
	 * Align imitates the current rotation of the target.
	 */
	ai.steering.Align = Class.extend({
		init: function(character, target) {
			this.character = character;
			this.target = target;
			this.max_rotation = 0.2;
			this.target_radius = 5;
			this.slow_radius = 20;
			this.time_to_target = 0.1;
		},
		get: function() {
			var steering = new ai.steering.Output();

			var rotation = this.target.orientation - this.character.orientation;

			rotation = this.mapToRange(rotation);
			var rotation_size = Math.abs(rotation);

			if (rotation_size < this.target_radius) {
				return steering;
			}

			var target_rotation = this.max_rotation;
			if (rotation_size < this.slow_radius) {
				target_rotation = this.max_rotation * rotation_size / this.slow_radius;
			}
			target_rotation *= rotation / rotation_size;

			steering.angular = target_rotation - this.character.rotation;
			steering.angular /= this.time_to_target;

			var angular_acceleration = Math.abs(steering.angular);
			if (angular_acceleration > this.character.max_angular_acceleration) {

				steering.angular /= angular_acceleration;
				steering.angular *= this.character.max_angular_acceleration;
			}
			return steering;
		},
		/**
		 * Make sure that the degree passed in always are in the range of 0-360
		 *
		 * @param {int} rotation
		 * @returns {int}
		 */
		mapToRange: function(rotation) {
			if (Math.abs(rotation) > 180) {
				if (rotation < 0) {
					rotation += 360;
				} else {
					rotation -= 360;
				}
			}
			return rotation;
		}
	});

	/**
	 * Face will output a angular rotation where the target is to look straight 
	 * at the target.
	 */
	ai.steering.Face = ai.steering.Align.extend({
		get: function() {
			var direction = this.target.position.subtract(this.character.position);
			if (direction.length() === 0) {
				return new ai.steering.Output();
			}
			var radians = Math.atan2(-direction.e(1), direction.e(2));
			this.target.orientation = radians * 180 / Math.PI;
			// I have a wierd coordinate system, zero is that-a-way ->
			this.target.orientation += 90;
			return this._super();
		}
	});

	/**
	 * The character tries to separate from close targets. Works best with
	 * targets that are aligned to the character. For example groups of agent
	 * going in the same direction.
	 */
	ai.steering.Separation = Class.extend({
		init: function(character, targets) {
			this.character = character;
			this.targets = targets;
			this.threshold = 6;
		},
		get: function() {
			var steering = new ai.steering.Output();
			for (var i = this.targets.length - 1; i >= 0; i--) {
				var direction = this.character.position.subtract(this.targets[i].position);
				var distance = direction.length();
				if (distance < this.threshold) {
					var strength = this.character.max_acceleration * (this.threshold - distance) / this.threshold;
					steering.linear = steering.linear.add(direction.normalize().multiply(strength));
				}
			}
			return steering;
		}
	});

	/**
	 * Wander does what it sounds, it lets the character wandering around
	 * randomly.
	 */
	ai.steering.Wander = ai.steering.Face.extend({
		init: function(character) {
			this._super(character, new ai.steering.Kinematics());
			// holds the radius and forward offset of the wander circle
			this.wanderOffset = 80;
			this.wanderRadius = 30;
			// max change
			this.wanderRate = 3;
			this.wanderOrientation = 0;
		},
		get: function() {
			// 1. Calculate the target to delegate to game.Face
			// Update the wander orientation
			this.wanderOrientation += (Math.random() - Math.random()) * this.wanderRate;

			// Calculate the center of the wander cirle
			var target = this.character.position;
			target = target.add($V([this.wanderOffset, this.wanderOffset]));
			target = target.add(this.asVector(this.character.orientation));

			// Calculate the combined target orientation
			var targetOrientation = this.wanderOrientation + this.character.orientation;
			// Calculate the target location
			var temp = this.asVector(targetOrientation).multiply(this.wanderRadius);

			this.target.position = target.add(temp);

			// 2. Delegate to Face
			var steering = this._super();
			// 3. Now we set the linear acceleration
			steering.linear = this.asVector(this.character.orientation).multiply(this.character.max_acceleration);
			steering.angular = 0;
			return steering;
		},
		asVector: function(orientation) {
			return $V([Math.cos(orientation), Math.sin(orientation)]);
		}
	});

	/**
	 * CollisionAvoidance calculates the closest future collision for the 
	 * targets and flees from that collision point.
	 */
	ai.steering.CollisionAvoidance = Class.extend({
		init: function(character, targets) {
			this.character = character;
			this.targets = targets;
		},
		get: function() {

			// 1. Find the target that's closest to collision

			// Anything furtjer away then the below value will be disregarded
			var shortestTime = 0.40;
			var steering = new ai.steering.Output();

			// Store the target that collides then, and other data
			// that we will need and can avoid recalc
			var firstTarget = false;
			var firstMinSeparation = false;
			var firstDistance = false;
			var firstRelativePos = false;
			var firstRelativeVel = false;
			var firstRadius = 0;

			var characterVel = {
				x: this.character.velocity.e(1),
				y: this.character.velocity.e(2)
			};

			var objects = window.engine.graph[this.targets].nearest({x: this.character.position.e(1), y: this.character.position.e(2)}, 3);
			var targets = [];
			for (var key in objects) {
				var object = objects[key][0].node;
				if (object.name !== this.character.name) {
					targets.push(object.kinematics());
				}
			}
			
			// Loop through each target
			for (var i = targets.length - 1; i >= 0; i--) {
				var target = targets[i];
				var radius = target.radius + this.character.radius;
				var relative_velocity = target.velocity.subtract(this.character.velocity);
				var relative_speed = relative_velocity.length();
				var relative_pos = this.closest_collision_point(this.character, target, radius);
				var time_to_collision = relative_pos.dot(relative_velocity) / (relative_speed * relative_speed);
				var distance = relative_pos.length();
				
				var targetRelPos = {
					x: relative_pos.e(1),
					y: relative_pos.e(2)
				}
				if (vec.angle(characterVel, targetRelPos) > 0) {
					continue;
				}

				// This value represents the gap between character and target when
				// they are closest to eachother
				var minimum_separation = distance - (relative_speed * shortestTime);

				// The character passes througth the gap, so no collision
				if (minimum_separation > radius) {
					continue;
				}

				// If the time to collision is negative, target and character is
				// moving in opposite direction.
				if (time_to_collision < 0) {
					continue;
				}

				// The collision happens so long in the future so we dont care
				if (time_to_collision > shortestTime) {
					continue;
				}

				// Store the time, target and other data
				shortestTime = time_to_collision;
				firstTarget = target;
				firstMinSeparation = minimum_separation;
				firstDistance = distance;
				firstRelativePos = relative_pos;
				firstRelativeVel = relative_velocity;
				firstRadius = radius;
			}

			// If we haven't found a collisionable target within shortestTime
			// character we dont have anything to dodge
			if (!firstTarget) {
				return steering;
			}

			var targetRelativePos = Vector.Zero(2);
			// if we're going to hit exactly, or if we're already colliding,
			// then do the steering based on current position
			if (firstMinSeparation <= 0 || firstDistance < firstRadius) {
				targetRelativePos = firstTarget.position.subtract(this.character.position);
				// otherwise calculate the future relative position
			} else {
				targetRelativePos = firstRelativePos.add(firstRelativeVel.multiply(shortestTime));
			}

			// calculate the target to evade
			var evade_target = new ai.steering.Kinematics({
				position: this.character.position.add(targetRelativePos),
				velocity: firstRelativeVel
			});

			var evade = new ai.steering.Evade(this.character, evade_target);
			return evade.get();
		},
				
		closest_collision_point: function(point, target, target_radius) {
			// calculate the collision point on the target collision circle
			var relative_pos = point.position.subtract(target.position);
			var magV = Math.sqrt(relative_pos.e(1) * relative_pos.e(1) + relative_pos.e(2) * relative_pos.e(2));
			var aX = target.position.e(1) + relative_pos.e(1) / magV * target_radius;
			var aY = target.position.e(2) + relative_pos.e(2) / magV * target_radius;
			// This is the collision relative position
			return point.position.subtract($V([aX, aY]));
		}
	});

	ai.steering.ObstacleAvoidance = ai.steering.Arrive.extend({
		init: function(character, type, avoidDistance, lookahead) {
			this.avoidDistance = avoidDistance;
			this.lookahead = lookahead;
			this.type = type;
			this._super(character, new ai.steering.Kinematics());
		},
		get: function() {
			var steering = new ai.steering.Output();
			var character = this.character;

			var rayVector = character.velocity;
			rayVector = rayVector.normalize().multiply(this.lookahead);

			var nicePosition = {x: character.position.e(1), y: character.position.e(2)};
			var niceRay = {x: rayVector.e(1), y: rayVector.e(2)};
			var collisions = window.detector.raycast(nicePosition, niceRay, this.avoidDistance);
			var list = collisions.get_all();

			var closestDistance = 0;
			var closestResult = false;
			for (var i = 0; i < list.length; i++) {
				var nodeName = list[i].first.name;
				if (character.name === nodeName) {
					continue;
				}
				if (list[i].first.type !== this.type) {
					continue;
				}
				if (list[i].result.penetration > closestDistance) {
					closestDistance = list[i].result.penetration;
					closestResult = list[i].result;
				}
			}
			if (!closestResult) {
				return steering;
			}
			var b = vec.multiply(closestResult.normal, this.avoidDistance);
			var brupp = vec.add(closestResult.position, b);
			this.target.position = sylVec([brupp.x, brupp.y]);
			return this._super();
		}
	});

	/**
	 * Pursue seeks to where a target is going. Using a simple seek the character
	 * will only go there where the target was (if its moving).
	 */
	ai.steering.Pursue = ai.steering.Seek.extend({
		init: function(character, target) {
			this.maxPrediction = 0.5;
			this._super(character, target);
		},
		get: function() {
			var direction = this.target.position.subtract(this.character.position);
			var distance = direction.length();
			var speed = this.character.velocity.length();
			var prediction = 0;
			if (speed <= distance / this.maxPrediction) {
				prediction = this.maxPrediction;
			} else {
				prediction = distance / speed;
			}
			this.target.position.add(this.target.velocity.multiply(prediction));
			return this._super();
		}
	});

	/**
	 * Evade a target that is chasing this one. It's basically Pursuit, but
	 * delegate to flee instead of Seek. 
	 */
	ai.steering.Evade = ai.steering.Flee.extend({
		init: function(character, target) {
			this.maxPrediction = 0.5;
			this._super(character, target);
		},
		get: function() {
			var direction = this.target.position.subtract(this.character.position);
			var distance = direction.length();
			var speed = this.character.velocity.length();
			var prediction = 0;
			if (speed <= distance / this.maxPrediction) {
				prediction = this.maxPrediction;
			} else {
				prediction = distance / speed;
			}
			this.target.position.add(this.target.velocity.multiply(prediction));
			return this._super();
		}
	});
});