BINARY_DIR=bin
GOFILES=backend.go deploy.go
BINARIES=$(BINARY_DIR)/backend $(BINARY_DIR)/deploy

.PHONY: all clean build run-backend run-deploy

all: build

build: $(BINARIES)
	cp -r ../config $(BINARY_DIR)/config

$(BINARY_DIR)/backend: backend.go
	mkdir -p $(BINARY_DIR)
	go build -o $@ backend.go

$(BINARY_DIR)/deploy: deploy.go
	mkdir -p $(BINARY_DIR)
	go build -o $@ deploy.go

clean:
	rm -rf $(BINARY_DIR)
