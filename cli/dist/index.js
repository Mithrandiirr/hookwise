#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const login_1 = require("./commands/login");
const events_1 = require("./commands/events");
const forward_1 = require("./commands/forward");
const program = new commander_1.Command();
program
    .name("hookwise")
    .description("HookWise CLI — webhook operations from your terminal")
    .version("0.1.0");
program.addCommand(login_1.loginCommand);
program.addCommand(events_1.eventsCommand);
program.addCommand(forward_1.forwardCommand);
program.parse();
