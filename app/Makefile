.PHONY: install server check ci

install:
	npm ci

server:
	npm start

# Local gate. Formats in place.
check:
	npm run precommit

# CI gate. Same checks, nothing mutates.
ci:
	npm ci
	npm run typecheck
	npm run format:check
