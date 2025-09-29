BINARY_DIR=bin
GOFILES=pipeline.go
BINARIES=$(BINARY_DIR)/pipeline

.PHONY: all clean build

all: build

build: $(BINARIES)

$(BINARY_DIR)/pipeline: $(GOFILES)
	mkdir -p $(BINARY_DIR)
	go build -o $@ pipeline.go
	# Copy configs into bin so pipeline can find them
	cp -r ../config $(BINARY_DIR)/

clean:
	rm -rf $(BINARY_DIR)
