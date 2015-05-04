require.config({
	baseUrl: "../js/",
	urlArgs: 'cb=' + Math.random(),
	paths: {
		pulse: 'libs/pulse/bin/pulse',
		jasmine: '../tests/lib/jasmine-1.3.1/jasmine',
		vec: 'vector',
		'jasmine-html': '../tests/lib/jasmine-1.3.1/jasmine-html',
		sinon: '../tests/lib/sinon-1.7.3',
		'jasmine-sinon': '../tests/lib/jasmine-sinon',
		spec: '../tests/spec/',
	},
	shim: {
		'pulse': {
			exports: 'pulse'
		},
		jasmine: {
			exports: 'jasmine'
		},
		'jasmine-html': {
			deps: ['jasmine'],
			exports: 'jasmine'
		},
		'jasmine-sinon': {
			deps: ['sinon', 'jasmine-html'],
			exports: 'jasmine-sinon'
		},
		vec: {
			exports: 'vec'
		}
	}
});

require(['jasmine-html', 'jasmine-sinon'], function(jasmine) {

	var jasmineEnv = jasmine.getEnv();
	jasmineEnv.updateInterval = 1000;

	var htmlReporter = new jasmine.HtmlReporter();

	jasmineEnv.addReporter(htmlReporter);

	jasmineEnv.specFilter = function(spec) {
		return htmlReporter.specFilter(spec);
	};

	var specs = [];

	specs.push('spec/CollisionSpec');

	require(specs, function() {
		jasmineEnv.execute();
	});


});
