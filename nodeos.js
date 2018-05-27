const { spawn } = require('child_process');
var args = [];

args.push("-e");
args.push("--config-dir");
args.push("~/.local/share/eosio/nodeos/config");
args.push("--plugin");
args.push("eosio::chain_api_plugin");
args.push("--plugin");
args.push("eosio::producer_plugin");
args.push("--plugin");
args.push("eosio::history_api_plugin");
args.push("--plugin");
args.push("eosio::history_plugin");
args.push("--plugin");
args.push("eosio::http_plugin");
args.push("--http-server-address");
args.push("0.0.0.0:8888");
args.push("-p");
args.push("eosio");

spawn("nodeos", args);