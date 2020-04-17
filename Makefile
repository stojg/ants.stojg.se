dev:
	docker run -it --rm -v $(shell pwd):/srv/http:ro -p 8043:8043 pierrezemb/gostatic

build:
	docker build . -t stojg/ants.stojg.se

run: build
	docker run --rm -it -p 8043:8043 stojg/ants.stojg.se

push: build
	docker build . -t stojg/ants.stojg.se:latest -t stojg/ants.stojg.se:$(shell git rev-parse --verify HEAD)
	docker push stojg/ants.stojg.se