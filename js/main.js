"use strict";
require.config({
	paths: {
		pulse: 'libs/pulse/bin/pulse',
		vector: 'libs/sylvester.src',
		kdTree: 'libs/kd-tree/kdTree',
		vec: 'vector'
	},
	shim: {
		pulse: {
			exports: 'pulse'
		},
		vector: {
			exports: 'vector'
		},
		kdTree: {
			exports: 'kdTree'
		},
		vec: {
			exports: 'vec'
		}
	},
	urlArgs: "version=0.4.4"
});

require(['app'], function(App) {
	App.init();
});

