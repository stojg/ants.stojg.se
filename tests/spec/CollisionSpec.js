define(['collision', 'gameobject', 'libs/QuadTree'], function(Collision, GameObject) {

	var getResponse = function(x, y, normalX, normalY, penetration) {
		return {
			position: {x: x, y: y},
			normal: {x: normalX, y: normalY},
			penetration: penetration
		}
	}

	var createObject = function(name, posX, posY, velX, velY, sizeX, sizeY, radius, static) {
		var isStatic = static || false;
		return {
			position: {x: posX, y: posY},
			velocity: {x: velX, y: velY},
			size: {x: sizeX, y: sizeY},
			name: name,
			radius: radius,
			static: isStatic,
			get_collision: function() {
				return new Collision.Circle(this.position, this.radius);
			}
		};
	};

	var getCollisionDetector = function() {
		var quad = new QuadTree({x: -500, y: -500, width: 500, height: 500});
		var allObjects = {};
		for (var key in arguments) {
			quad.insert({
				x: arguments[key].position.x,
				y: arguments[key].position.y,
				height: arguments[key].size.x,
				width: arguments[key].size.y,
				node: arguments[key]
			});
			allObjects[arguments[key].name] = arguments[key];
		}
		return new Collision.Detector(allObjects, quad);
	};

	describe("Collision.List", function() {
		it("1. a new list should be empty", function() {
			var list = new Collision.List();
			expect(list.get_all(), []);
			expect(list.length()).toEqual(0);
		});

		it("2. Push new pair to the list", function() {
			var list = new Collision.List();
			list.insert({name: 'a'}, {name: 'b'}, true)
			expect(list.length()).toEqual(1);
		});

		it("3. Get the next pair", function() {
			var list = new Collision.List();
			list.insert({name: 'a'}, {name: 'b'}, true)
			expect(list.pop()).toEqual({first: {name: 'a'}, second: {name: 'b'}, result: true});
			expect(list.length()).toEqual(0);
		});
	});

	describe("Collision.Segment", function() {
		it('1. to small', function() {
			var shape = new Collision.Shape();
			expect(shape.small(1, 1)).toEqual(true);
			expect(shape.small(1 + shape.epsilon, 1)).toEqual(true);
			expect(shape.small(1, 1 + shape.epsilon)).toEqual(true);
			expect(shape.small(1 + (shape.epsilon * 2), 1)).toEqual(false);
			expect(shape.small(1, 1 + (shape.epsilon * 2))).toEqual(false);
		});
	}),
	describe("Collision.Segment", function() {
		it("1. get_start_position() should return correct value", function() {
			var segment = new Collision.Segment({x: 5, y: 5}, {x: 0, y: 0});
			expect(segment.get_start_position()).toEqual({x: 5, y: 5});
		});
		it("2. get_end_position() should return correct value", function() {
			var segment = new Collision.Segment({x: 0, y: 0}, {x: 5, y: 5});
			expect(segment.get_end_position()).toEqual({x: 5, y: 5});
		});

		it("3. vs_circle() should fall short →", function() {
			var circle = new Collision.Circle({x: 10, y: 0}, 4);
			var segment = new Collision.Segment({x: 0, y: 0}, {x: 5, y: 0});
			expect(segment.vs_circle(circle)).toEqual(false);
		});

		it("4. vs_circle() up-down should fall short ↓", function() {
			var circle = new Collision.Circle({x: 0, y: 0}, 4);
			var segment = new Collision.Segment({x: 0, y: 10}, {x: 0, y: 5});
			expect(segment.vs_circle(circle)).toEqual(false);
		});

		it("5. vs_circle() left-right should be past →", function() {
			var circle = new Collision.Circle({x: 0, y: 0}, 4);
			var segment = new Collision.Segment({x: 5, y: 0}, {x: 10, y: 0});
			expect(segment.vs_circle(circle)).toEqual(false);
		});

		it("6. vs_circle() down-up should be past ↑", function() {
			var circle = new Collision.Circle({x: 0, y: 0}, 4);
			var segment = new Collision.Segment({x: 0, y: 5}, {x: 0, y: 10});
			expect(segment.vs_circle(circle)).toEqual(false);
		});

		it("7. vs_circle() left-right should poke →", function() {
			var circle = new Collision.Circle({x: 0, y: 0}, 6);
			var segment = new Collision.Segment({x: -5, y: 0}, {x: -10, y: 0});
			expect(segment.vs_circle(circle)).toEqual(getResponse(-6, 0, -1, 0, 1));
		});

		it("8. vs_circle() down-up should poke ↑", function() {
			var circle = new Collision.Circle({x: 0, y: 0}, 6);
			var segment = new Collision.Segment({x: 0, y: 10}, {x: 0, y: 5});
			expect(segment.vs_circle(circle)).toEqual(getResponse(0, 6, 0, 1, 4));
		});

		it("9. vs_circle() right-left should poke ←", function() {
			var circle = new Collision.Circle({x: 0, y: 0}, 6);
			var segment = new Collision.Segment({x: 10, y: 0}, {x: 5, y: 0});
			expect(segment.vs_circle(circle)).toEqual(getResponse(6, 0, 1, 0, 4));
		});

		it("10. vs_circle() up-down should poke ↓", function() {
			var circle = new Collision.Circle({x: 0, y: 0}, 6);
			var segment = new Collision.Segment({x: 0, y: 10}, {x: 0, y: 5});
			expect(segment.vs_circle(circle)).toEqual(getResponse(0, 6, 0, 1, 4));
		});

		it("11 .vs_circle() left-right should impale →", function() {
			var circle = new Collision.Circle({x: 0, y: 0}, 5);
			var segment = new Collision.Segment({x: -20, y: 0}, {x: 20, y: 0});
			expect(segment.vs_circle(circle)).toEqual(getResponse(-5, 0, -1, 0, 15));
		});

		it("12. vs_circle() right-left should impale ←", function() {
			var circle = new Collision.Circle({x: 0, y: 0}, 5);
			var segment = new Collision.Segment({x: 20, y: 0}, {x: -20, y: 0});
			expect(segment.vs_circle(circle)).toEqual(getResponse(5, 0, 1, 0, 15));
		});

		it("13. vs_circle() segment is inside circle should should not hit startpoint", function() {
			var circle = new Collision.Circle({x: 10, y: 10}, 10);
			var segment = new Collision.Segment({x: 10, y: 10}, {x: 11, y: 10});
			expect(segment.vs_circle(circle)).toEqual(false);
		});

		it("14. vs_circle() segment is has a non integer position", function() {
			var circle = new Collision.Circle({x: 0, y: 0}, 10);
			var segment = new Collision.Segment({x: -20.2, y: 0}, {x: 20.2, y: 0});
			expect(segment.vs_circle(circle)).toEqual(getResponse(-10, 0, -1, 0, 10.2));
		});

		it("15. vs_circle() segment is has a non integer position and circle off center", function() {
			var small = 0.00000000000002842170943040401;
			var circle = new Collision.Circle({x: 10, y: 0}, 10);
			var segment = new Collision.Segment({x: -39.8, y: 0}, {x: 20.2, y: 0});
			expect(segment.vs_circle(circle)).toEqual(getResponse(-small, 0, -1, 0, 39.8 - small));
		});
	});

	describe("Collision.Circle", function() {
		var circleA;
		var circleB;

		var diag = 0.7071067811865476;

		beforeEach(function() {
			circleA = new Collision.Circle({x: 0, y: 0}, 5);
			circleB = new Collision.Circle({x: 9, y: 0}, 3);
		});

		it("get_radius() should return correct value", function() {
			expect(circleA.get_radius()).toEqual(5);
			expect(circleB.get_radius()).toEqual(3);
		});

		it("get_position() should return correct value", function() {
			expect(circleA.get_position()).toEqual({x: 0, y: 0});
			expect(circleB.get_position()).toEqual({x: 9, y: 0});
		});

		it('vs_point() outside circle should not collide', function() {
			expect(circleA.vs_point({x: 6, y: 0})).toEqual(false);
			expect(circleA.vs_point({x: -6, y: 0})).toEqual(false);
			expect(circleA.vs_point({x: 0, y: 6})).toEqual(false);
			expect(circleA.vs_point({x: 0, y: -6})).toEqual(false);
		});

		it('vs_point() on the border of circle should not collide', function() {
			expect(circleA.vs_point({x: 5, y: 0})).toEqual(false);
			expect(circleA.vs_point({x: -5, y: 0})).toEqual(false);
			expect(circleA.vs_point({x: 0, y: 5})).toEqual(false);
			expect(circleA.vs_point({x: 0, y: -5})).toEqual(false);
		});

		it('vs_point() inside the circle should collide', function() {
			expect(circleA.vs_point({x: 3, y: 3})).toEqual(getResponse(3, 3, -diag, -diag, 0.7573593128807152));
			expect(circleA.vs_point({x: -3, y: -3})).toEqual(getResponse(-3, -3, diag, diag, 0.7573593128807152));
			expect(circleA.vs_point({x: -3, y: 3})).toEqual(getResponse(-3, 3, diag, -diag, 0.7573593128807152));
		});

		it('vs_point() circle on top of point should not collide', function() {
			expect(circleA.vs_point({x: 0, y: 0})).toEqual(false);
		});

		it("vs_circle() A should not collide with B", function() {
			circleB = new Collision.Circle({x: 10, y: 0}, 4);
			expect(circleA.vs_circle(circleB)).toEqual(false);
		});

		it("vs_circle() A should collide with B when B is at the right", function() {
			circleA = new Collision.Circle({x: 0, y: 0}, 5);
			circleB = new Collision.Circle({x: 10, y: 0}, 6);
			expect(circleA.vs_circle(circleB)).toEqual(getResponse(-5, 0, -1, 0, 1));
		});

		it("vs_circle() A should collide with B when B is at the left", function() {
			circleB = new Collision.Circle({x: -10, y: 0}, 6);
			expect(circleA.vs_circle(circleB)).toEqual(getResponse(5, 0, 1, 0, 1));
		});

		it("vs_circle() A should collide with B when B is above", function() {
			circleA = new Collision.Circle({x: 0, y: 0}, 5);
			circleB = new Collision.Circle({x: 0, y: -10}, 6);
			expect(circleA.vs_circle(circleB)).toEqual(getResponse(0, 5, 0, 1, 1));
		});

		it("vs_circle() A should collide with B when B is below", function() {
			circleB = new Collision.Circle({x: 0, y: 10}, 6);
			expect(circleA.vs_circle(circleB)).toEqual(getResponse(0, -5, 0, -1, 1));
		});

		it("vs_circle() A should collide with B when B is directly on top (sketchy)", function() {
			circleA = new Collision.Circle({x: 0, y: 0}, 5);
			circleB = new Collision.Circle({x: 0, y: 0}, 4);
			expect(circleA.vs_circle(circleB)).toEqual(false);
		});

		it("vs_circle() A should collide with B when A they overlap ->", function() {
			circleB = new Collision.Circle({x: 6, y: 0}, 3);
			circleA = new Collision.Circle({x: 4, y: 0}, 3);
			expect(circleA.vs_circle(circleB)).toEqual(getResponse(1, 0, -1, 0, 4));
		});

		it("vs_circle() A should collide with B when A they overlap <-", function() {
			circleB = new Collision.Circle({x: 4, y: 0}, 3);
			circleA = new Collision.Circle({x: 6, y: 0}, 3);
			expect(circleA.vs_circle(circleB)).toEqual(getResponse(4, 0, 1, 0, 4));
		});

		it("vs_circle() A should collide with B when A they overlap ^", function() {
			circleB = new Collision.Circle({x: 0, y: 4}, 3);
			circleA = new Collision.Circle({x: 0, y: 6}, 3);
			expect(circleA.vs_circle(circleB)).toEqual(getResponse(0, 4, 0, 1, 4));
		});

		it("vs_circle() A should collide with B when A they overlap down", function() {
			circleB = new Collision.Circle({x: 0, y: 6}, 3);
			circleA = new Collision.Circle({x: 0, y: 4}, 3);
			expect(circleA.vs_circle(circleB)).toEqual(getResponse(0, 1, 0, -1, 4));
		});

		it("vs_circle() A AND C should collide with B when A they overlap", function() {
			circleB = new Collision.Circle({x: 0, y: 6}, 3);
			circleA = new Collision.Circle({x: 0, y: 4}, 3);
			var circleC = new Collision.Circle({x: 0, y: 7}, 3);
			expect(circleA.vs_circle(circleB)).toEqual(getResponse(0, 1, 0, -1, 4));
			expect(circleC.vs_circle(circleB)).toEqual(getResponse(0, 4, 0, 1, 5));
		});
	});

	describe("Collision.MovingCircle", function() {
		var right;
		var left;

		it("1. get_radius() should return correct value", function() {
			right = new Collision.MovingCircle({x: 0, y: 0}, 3, {x: 2, y: 0});
			expect(right.get_radius()).toEqual(3);
		});

		it("2. get_position() should return correct value", function() {
			right = new Collision.MovingCircle({x: 0, y: 0}, 3, {x: 2, y: 0});
			expect(right.get_position()).toEqual({x: 0, y: 0});
		});

		it("3. get_previous_position() should return correct value", function() {
			right = new Collision.MovingCircle({x: 0, y: 0}, 3, {x: 2, y: 0});
			expect(right.get_previous_position()).toEqual({x: 2, y: 0});
		});

		it('4. vs_point() outside circle and no velocity  should not collide', function() {
			right = new Collision.MovingCircle({x: 0, y: 0}, 3, {x: 0, y: 0});
			expect(right.vs_point({x: 4, y: 0})).toEqual(false);
		});

		it('5. vs_point() inside circle and no velocity should collide', function() {
			right = new Collision.MovingCircle({x: 0, y: 0}, 3, {x: 0, y: 0});
			expect(right.vs_point({x: 2, y: 0})).toEqual(getResponse(2, 0, -1, 0, 1));
		});

		it('6. vs_point() with velocity should collide', function() {
			right = new Collision.MovingCircle({x: 10, y: 0}, 3, {x: 2, y: 0});
			expect(right.vs_point({x: 10, y: 0})).toEqual(getResponse(7, 0, -1, 0, 5));
		});

		it("7. vs_circle() left should not collide with right when right is at the right", function() {
			left = new Collision.MovingCircle({x: 0, y: 0}, 5, {x: 0, y: 0});
			right = new Collision.Circle({x: 11, y: 0}, 5);
			expect(left.vs_circle(right)).toEqual(false);
		});

		it("8. vs_circle() left should collide with right when right is at the right", function() {
			left = new Collision.MovingCircle({x: 0, y: 0}, 6, {x: 0, y: 0});
			right = new Collision.Circle({x: 10, y: 0}, 5);
			expect(left.vs_circle(right)).toEqual(getResponse(-5, 0, -1, 0, 1));
		});

		it("9. vs_circle() left should collide with right when starting inside the circle", function() {
			left = new Collision.MovingCircle({x: -1, y: 0}, 6, {x: 1, y: 0});
			right = new Collision.Circle({x: 5, y: 0}, 5);
			expect(left.vs_circle(right)).toEqual(getResponse(-3.5, 0, -1, 0, 5));
		});

		it("10. vs_circle() left should not collide with right when moving to the right", function() {
			left = new Collision.MovingCircle({x: -1, y: 0}, 5, {x: -2, y: 0});
			right = new Collision.Circle({x: 10, y: 0}, 5);
			expect(left.vs_circle(right)).toEqual(false);
		});

		it("11. vs_circle() left should not tunnel through right #1", function() {
			left = new Collision.MovingCircle({x: 20, y: 0}, 5, {x: -2, y: 0});
			right = new Collision.Circle({x: 10, y: 0}, 5);
			expect(left.vs_circle(right)).toEqual(getResponse(0, 0, -1, 0, 20));
		});

		it("12. vs_circle() left should not tunnel through right #2", function() {
			left = new Collision.MovingCircle({x: 20, y: 0}, 5, {x: -10, y: 0});
			right = new Collision.Circle({x: 10, y: 0}, 5);
			expect(left.vs_circle(right)).toEqual(getResponse(0, 0, -1, 0, 20));
		});

		it("13. vs_circle() lower should not tunnel through top", function() {
			var lower = new Collision.MovingCircle({x: 0, y: 40}, 5, {x: 0, y: -41});
			var top = new Collision.Circle({x: 0, y: 10}, 10);
			expect(lower.vs_circle(top)).toEqual(getResponse(0, -5, 0, -1, 45));
		});

	});

	describe("Collision.Detector", function() {

		describe("test()", function() {
			var detector;
			var object1;
			var object2;
			var object3;
			var object4;
			var object5;

			beforeEach(function() {
				object1 = createObject('object1', 4, 0, 0, 0, 3, 3, 3);
				object2 = createObject('object2', 6, 0, 0, 0, 3, 3, 3);
				object3 = createObject('object3', 20, 18, 0, 0, 3, 3, 3);
				object4 = createObject('object4', 20, 20, 0, 0, 3, 3, 3);
				object5 = createObject('object5', 30, 20, 0, 0, 3, 3, 3);
			});

			it('1. should have detected one collision, object1 with object2', function() {
				detector = getCollisionDetector(object1, object2, object3);
				detector.reset();
				var list = detector.test();
				expect(list.length()).toEqual(1);
				expect(list.get_all()).toEqual([{
					first: object1,
					second: object2,
					result: {position: {x: 1, y: 0}, normal: {x: -1, y: 0}, penetration: 4}
				}]);
			});

			it('2. should have detected two collisions, object1 vs object2 and object3 vs object4', function() {
				detector = getCollisionDetector(object1, object2, object3, object4, object5);
				detector.reset();
				var list = detector.test();
				expect(list.length()).toEqual(2);
				expect(list.get_all()).toEqual([
				{first: object1, second: object2, result: {position: {x: 1, y: 0}, normal: {x: -1, y: 0}, penetration: 4}},
				{first: object3, second: object4, result: {position: {x: 10, y: 8}, normal: {x: 0, y: -1}, penetration: 4}}
				]);
			});

			it('3. should have detected 4 collisions', function() {
				var top = createObject('top', 0, 0, 0, 0, 3, 3, 3.1);
				var center = createObject('center', 6, 0, 0, 0, 3, 3, 3.1);
				var right = createObject('right', 6, 6, 0, 0, 3, 3, 3.1);
				var below = createObject('below', 12, 0, 0, 0, 3, 3, 3.1);
				var bottom = createObject('bottom', 15, 0, 0, 0, 3, 3, 3.1);
				detector = getCollisionDetector(top, center, below, right, bottom);
				detector.reset();
				var list = detector.test();
				expect(list.length()).toEqual(4);
				var pair = list.pop();
				expect(pair.first.name).toEqual('below');
				expect(pair.second.name).toEqual('bottom');
				pair = list.pop();
				expect(pair.first.name).toEqual('center');
				expect(pair.second.name).toEqual('right');
				pair = list.pop();
				expect(pair.first.name).toEqual('center');
				expect(pair.second.name).toEqual('below');
				pair = list.pop();
				expect(pair.first.name).toEqual('top');
				expect(pair.second.name).toEqual('center');
			});

			it('4. Raycast should miss circle', function() {
				object1 = createObject('object1', 10, 0, 0, 0, 3, 3, 5);
				detector = getCollisionDetector(object1);
				var hitList = detector.raycast({x: 0, y: 0}, {x: 4, y: 0});
				expect(hitList.length()).toEqual(0);
			});

			it('5. Raycast should hit circle left-right', function() {
				object1 = createObject('object1', 10, 0, 0, 0, 3, 3, 5);
				detector = getCollisionDetector(object1);
				var hitList = detector.raycast({x: 0, y: 0}, {x: 6, y: 0});
				var hit = hitList.pop();
				expect(hit.result).toEqual(getResponse(5, 0, -1, 0, 1));
			});

			it('5. Raycast should hit circle up-down', function() {
				object1 = createObject('object1', 0, 10, 0, 0, 3, 3, 5);
				detector = getCollisionDetector(object1);
				var hitList = detector.raycast({x: 0, y: 0}, {x: 0, y: 6});
				var hit = hitList.pop();
				expect(hit.result).toEqual(getResponse(0, 5, 0, -1, 1));
			});
		});
	});

	describe("resolve()", function() {

		var detector;
		var object1;
		var object2;
		var object3;
		var moving;

		beforeEach(function() {
			
		});

		it('1. should have moved object1 back', function() {
			object1 = createObject('object1', 4, 0, 0, 0, 3, 3, 3);
			object2 = createObject('object2', 6, 0, 0, 0, 3, 3, 3);
			object3 = createObject('object3', 20, 20, 0, 0, 3, 3, 3);
			detector = getCollisionDetector(object1, object2, object3);
			detector.test();
			detector.resolve();
			expect(object1.position).toEqual({x: 2, y: 0});
		});

		it('2. should not have moved object2 back', function() {
			object1 = createObject('object1', 4, 0, 0, 0, 3, 3, 3);
			object2 = createObject('object2', 6, 0, 0, 0, 3, 3, 3);
			object3 = createObject('object3', 20, 20, 0, 0, 3, 3, 3);
			detector = getCollisionDetector(object1, object2, object3);
			detector.test();
			detector.resolve();
			expect(object2.position).toEqual({x: 8, y: 0});
		});

		it('3. shouldn\'t have moved object3', function() {
			object1 = createObject('object1', 4, 0, 0, 0, 3, 3, 3);
			object2 = createObject('object2', 6, 0, 0, 0, 3, 3, 3);
			object3 = createObject('object3', 20, 20, 0, 0, 3, 3, 3);
			detector = getCollisionDetector(object1, object2, object3);
			detector.test();
			detector.resolve();
			expect(object3.position).toEqual({x: 20, y: 20});
		});

		it('4. Moving circle back when inside', function() {
			object1 = createObject('object1', 10, 0, 8, 0, 2, 2, 5, true);
			moving = new GameObject({
				name: "moving",
				position: {x: 8, y: 0}
			}, new Collision.MovingCircle({x: 8, y: 0}, 5, {x: 0, y: 0}));
			detector = getCollisionDetector(moving, object1);
			var list = detector.test();
			expect(list.length()).toEqual(1);
			detector.resolve();
			expect(moving.position).toEqual({x: 0, y: 0});
		});

		it('5. should not tunnel moving circle through obstacle', function() {
			var object1 = createObject('object1', 100, 0, 0, 0, 2, 2, 10, true);
			var moving = new GameObject({
				name: "moving",
				position: {x: 140, y: 0}
			}, new Collision.MovingCircle({x: 140, y: 0}, 5, {x: 80, y: 0}));
			detector = getCollisionDetector(moving, object1);
			var list = detector.test();
			expect(list.length()).toEqual(1);
			detector.resolve();
			expect(moving.position).toEqual({x: 85, y: 0});
		});
	});
});