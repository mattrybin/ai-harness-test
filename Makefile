# Front door. Real recipes live in app/Makefile; this file only delegates.
.PHONY: setup dev stt stt-model precommit ci

setup:
	bin/setup

dev:
	bin/dev

stt:
	bin/stt

stt-model:
	bin/stt --model-only

precommit:
	$(MAKE) -C app check

ci:
	$(MAKE) -C app ci
