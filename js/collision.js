"use strict";
define(['class', 'vec'], function(Class, vec) {
	var Collision = Collision || {};

	Collision.List = Class.extend({

		init: function() {
			this.list = [];
		},

		get_all: function() {
			return this.list;
		},

		length: function() {
			return this.list.length;
		},

		pop: function() {
			return this.list.pop();
		},

		insert: function(a,b,result) {
			this.list.push({first:a,second:b, result:result});
		}
	});

	Collision.Detector = Class.extend({
		init: function(objects, quad) {
		 	this.objects = [];
		 	this.originals = objects;
			this.checked_pairs = [];
			this.quad = quad;
			this.collisions = {};
			this.collisionList;
			for(var prop in objects) {
  				this.objects.push(objects[prop]);
			}
		},
		
		test: function() {
			this.collisionList = new Collision.List();
			for (var i = 0; i < this.objects.length; i++) {
				var objectA = this.objects[i];
				var neighbours = this.quad.retrieve({
					x: objectA.position.x,
					y: objectA.position.y,
					height: objectA.size.x,
					width: objectA.size.y
				});
				for (var j = 0; j < neighbours.length ; j++) {
					var objectB = neighbours[j].node;
					if(objectA.name === objectB.name) {
						continue;
					}
					if(objectA.static) {
						continue;
					}
					// dont check the same pair again
					if(!this.should_check(objectA, objectB)) {
						continue;
					}
					
					var result = this.hitTest(objectA, objectB);
					if (result) {
						this.collisionList.insert(objectA, objectB, result);
					}
				}
			}
			return this.collisionList;
		},
		resolve: function() {
			var collision;
			while (collision = this.collisionList.pop()) {
				var a = this.originals[collision.first.name];
				var b = this.originals[collision.second.name]
				var response = collision.result;
				if (b.static) {
					a.position = vec.add(a.position, vec.multiply(response.normal, response.penetration));
					var friction = 0.99;
					var restitution = 0.3;
					var velocityNormal = vec.multiply(response.normal, vec.dot(a.velocity, response.normal));
					var velocityT = vec.subtract(a.velocity, velocityNormal);
					a.velocity = vec.subtract(vec.multiply(velocityT, friction), vec.multiply(velocityNormal, restitution));
					continue;
				}
				a.position = vec.add(a.position, vec.multiply(response.normal, response.penetration * 0.5));
				a.velocity = vec.add(a.velocity, vec.multiply(response.normal, vec.length(a.velocity) * 0.2));
				b.position = vec.add(b.position, vec.multiply(vec.negate(response.normal), response.penetration * 0.5));
				b.velocity = vec.add(b.velocity, vec.multiply(vec.negate(response.normal), vec.length(b.velocity) * 0.2));
			}
		},

		raycast: function(position, ray, radius) {
			var origin;
			if (radius) {
				origin = new Collision.MovingCircle(position, radius, vec.add(position, ray));
			} else {
				origin = new Collision.Segment(vec.add(position, ray), position);
			}
			var neighbours = this.quad.retrieve({
				x: position.x,
				y: position.y,
				height: 10,
				width: 10,
			});
			
			var hitList = new Collision.List();
			for (var i = 0; i < neighbours.length; i++) {
				var object = neighbours[i].node;
				var hitTest = object.get_collision();
				var result = origin.vs_circle(hitTest);
				if (result) {
					hitList.insert(object, null, result);
				}
			}
			return hitList;
		},

		hitTest: function(a, b) {
			var testA = a.get_collision();
			var testB = b.get_collision();

			if(!testA) {
				console.log('No Collision.Shape on A '+a.type);
				return false;
			}

			if(!testB) {
				console.log('No Collision.Shape on B '+b.type);
				return false;
			}

			if(testB instanceof Collision.Circle) {
				return testA.vs_circle(testB);
			} else if(testB instanceof Collision.MovingCircle) {
				return testA.vs_moving_circle(testB);
			} else if(testB instanceof Collision.Null) {
				return false;
			} else {
				throw new Error('Missed to implement a Collision.Shape check');
			}
		},

		should_check: function(a, b) {
			var names = [a.name, b.name].sort();
			var sortedNames = (names[0] + names[1]);
			if (!(sortedNames in this.checked_pairs)) {
				this.checked_pairs[sortedNames] = true;
				return true;
			}
			
			return false;
		},

		reset: function() {
			this.collisions = {};
			this.checked_pairs = [];
		},

		who_collided_with: function(name) {
			if(typeof this.collisions[name] === 'undefined') {
				return {};
			}
			return this.collisions[name];
		},

		get_collisions: function() {
			return this.collisions;
		}

	});

	Collision.Shape = Class.extend({

		epsilon: 0.000001,

		small: function(a,b) {
			return (Math.abs(a - b) <= this.epsilon);
			return (Math.abs(a - b) <= this.epsilon * Math.max(1.0, Math.abs(a), Math.abs(b)));
		},
		get_position: function() {
			return this.position;
		},

		get_has_moved: function() {
			if (this.get_position().x !== this.get_previous_position().x) {
				return true;
			}

			if (this.get_position().y !== this.get_previous_position().y) {
				return true;
			}
			return false;
		},


	});

	Collision.Null = Collision.Shape.extend({
		get_radius: function() {
			return null;
		},
		vs_circle: function() {
			return false;
		},
		vs_moving_circle: function() {
			return false;
		},
		vs_point: function() {
			return false;
		},
		vs_line: function() {

		}
	});

	Collision.Circle = Collision.Shape.extend({

		init: function(position, radius) {
			if(isNaN(radius)) {
				throw new Error('Radius has not been set');
			}
			this.position = position;
			this.radius = radius;
		},
		get_radius: function() {
			return this.radius;
		},
		
		update: function(object) {
			this.position = object.position;
		},

		vs_circle: function(other) {
			var midline = vec.subtract(this.get_position(), other.position);
			var size = vec.length(midline);
			var combinedRadius = this.get_radius() + other.get_radius();
			if (size <= 0 || size >= combinedRadius) {
				return false;
			}
			return {
				position: vec.multiply(vec.add(this.position, midline), 0.5),
				normal: vec.multiply(midline, (1 / size)),
				penetration: (combinedRadius - size)
			};
		},

		vs_point: function(point) {
			var midline = vec.subtract(this.get_position(), point);
			var size = vec.length(midline);

			if (size <= 0 || size >= this.get_radius()) {
				return false;
			}
			return {
				position: {x: point.x, y: point.y},
				normal: vec.multiply(midline, (1 / size)),
				penetration: this.get_radius() - size
			};
		},
		vs_line: function(line) {
			var result = line.vs_circle(this);
			if (!result) {
				return false;
			}
			result.penetration = line.get_length() - result.penetration;
			return result;
		}

	});

	Collision.MovingCircle = Collision.Circle.extend({

		init: function(position, radius, previous_position) {
			if(isNaN(radius)) {
				throw new Error('Radius has not been set');
			}
			this.position = position;
			this.radius = radius;
			this.previous_position = previous_position || position;
		},
		get_radius: function() {
			return this.radius;
		},

		get_previous_position: function() {
			return this.previous_position;
		},

		update: function(object, elapsed) {
			this.position = object.position;
			this.previous_position = {
				x: this.position.x - object.velocity.x * (elapsed / 1000),
				y: this.position.y - object.velocity.y * (elapsed / 1000)
			}
		},

		vs_point: function(point) {
			if(this.get_has_moved()) {
				var bAbsorbedA = new Collision.Circle(point, this.get_radius());
				var travelA = new Collision.Segment(this.previous_position, this.position);
				return travelA.vs_circle(bAbsorbedA);
			}
			return this._super(point);
		},

		vs_circle: function(other) {
			var combinedRadius = this.get_radius() + other.get_radius();
			var midline = vec.subtract(this.get_position(), other.position);
			var size = vec.length(midline);
			var outside = (size <= 0 || size >= combinedRadius);

			if (!outside) {
				return {
					position: vec.multiply(vec.add(this.position, midline), 0.5),
					normal: vec.multiply(midline, (1 / size)),
					penetration: (combinedRadius - size)
				};
			}

			if (outside && !this.get_has_moved()) {
				return false;
			}

			var bAbsorbedA = new Collision.Circle(other.get_position(), combinedRadius);
			var travelA = new Collision.Segment(this.get_previous_position(), this.get_position());
			var collision = travelA.vs_circle(bAbsorbedA);
			if (collision) {
				collision.penetration = vec.length(vec.subtract(this.previous_position, this.position)) - collision.penetration;
				return collision;
			}
			return false;
		},

		vs_moving_circle: function(other) {
			var t = this.vs_circle(other);
			return t;
			var relativePosition = vec.subtract(this.get_previous_position(), other.get_previous_position());
			var otherCircle = new Collision.Circle(other.get_position(), other.get_radius());
			var selfCircle = new Collision.MovingCircle(this.get_position(), this.get_radius(), relativePosition);
			return selfCircle.vs_circle(otherCircle);
		},
	});

	Collision.Segment = Collision.Shape.extend({

		init: function(start, end) {
			this.start = start;
			this.end = end;
		},

		get_start_position: function() {
			return this.start;
		},

		get_end_position: function() {
			return this.end;
		},
		get_length: function() {
			return vec.length(vec.subtract(this.start, this.end));
		},

		vs_circle: function(circle) {
			
			// The line between start and end
			var lineDirVec = vec.subtract(this.start, this.end);
			
			// vector from sphere to start
			var lineCenterVec = vec.subtract(circle.get_position(), this.start);
			
			var lineSqrDist = vec.dot(lineDirVec, lineDirVec);
			var b = 2 * vec.dot(lineCenterVec, lineDirVec);

			var radiusSqr = circle.get_radius() * circle.get_radius();

			var lineCenterDist = vec.dot(lineCenterVec, lineCenterVec) - radiusSqr;

			var discriminant = (b * b) - 4 * lineSqrDist * lineCenterDist;

			// There are no roots, no solution, no touch
			if (discriminant < 0) {
				//console.log('Segment pointing away from circle');
				return false;
			}

			// ray didn't totally miss sphere, so there is a solution to the equation.
			discriminant = Math.sqrt(discriminant);
			
			// either solution may be on or off the ray so need to test both
			// t1 is always the smaller value, because BOTH discriminant and
			// a are nonnegative.
			var t1 = (-b - discriminant) / (2 * lineSqrDist);
			var t2 = (-b + discriminant) / (2 * lineSqrDist);

			var hit = false;

			
			// 3x HIT cases:
			//          -o->             --|-->  |            |  --|->
			// Impale(t1 hit,t2 hit), Poke(t1 hit,t2>1), ExitWound(t1<0, t2 hit),

			// 3x MISS cases:
			//       ->  o                     o ->              | -> |
			// FallShort (t1>1,t2>1), Past (t1<0,t2<0), CompletelyInside(t1<0, t2>1)

			// t1 is an intersection, and if it hits, it's closer than t2 would be Impale, Poke
			
			if (t1 > 0 && t1 < 1 && t1 > t2) {
				//console.log(t1);
				hit = vec.multiply(lineDirVec, t1);
			} else if (t2 > 0 && t2 < 1) {
				// start point inside circle
				hit = vec.multiply(lineDirVec, t2);

			} else if (t1 < 0 && t2 > 0 && t1 === t2) {
				console.log('smack!');
				return false;
			} else if (t1 < 0 && t2 > 0) {
				// totally inside
				return false;
				hit = vec.multiply(lineDirVec, t1);
				//console.log('Fully inside', t1, t2);
			} else if (t1 < 0 && t2 < 0) {
				//console.log('Past',t1,t2);
				return false;
			} else {
				//console.log('Fell short',t1,t2);
				return false;
			}

			var hitPosition = vec.subtract(this.start, hit);
			return {
				position: hitPosition,
				normal: vec.normalize(vec.subtract(hitPosition, circle.get_position())),
				penetration: vec.length(hit)
			};
		}
	});

	return Collision;

});