# Front door. Real recipes live in app/Makefile; this file only delegates.
.PHONY: setup dev precommit ci

setup:
	bin/setup

dev:
	bin/dev

precommit:
	$(MAKE) -C app check

ci:
	$(MAKE) -C app ci
