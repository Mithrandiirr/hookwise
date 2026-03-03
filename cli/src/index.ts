#!/usr/bin/env node
import { Command } from "commander";
import { loginCommand } from "./commands/login";
import { eventsCommand } from "./commands/events";
import { forwardCommand } from "./commands/forward";

const program = new Command();

program
  .name("hookwise")
  .description("HookWise CLI — webhook operations from your terminal")
  .version("0.1.0");

program.addCommand(loginCommand);
program.addCommand(eventsCommand);
program.addCommand(forwardCommand);

program.parse();
