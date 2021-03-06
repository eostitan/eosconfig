#!/bin/bash

echo Launching nodeos via bash script

nodeos -e --config-dir ~/.local/share/eosio/nodeos/config --plugin eosio::chain_api_plugin --plugin eosio::producer_plugin --plugin eosio::history_api_plugin --plugin eosio::history_plugin --plugin eosio::http_plugin --http-server-address 0.0.0.0:8888 -p eosio