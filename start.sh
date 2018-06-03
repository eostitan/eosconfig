#!/bin/bash

echo "Checking if Node is installed..."

if command -v node >/dev/null
then
  echo "Node is already installed"
  echo "Version: $(node --version)"
else
  echo "Installing Node..."
  curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

cd $HOME

if [ -d "./EOSTITAN/eosconfig" ] && [ -d "./EOSTITAN/eos" ]
then
  echo "Initial setup previously completed, updating eosconfig..."

  cd EOSTITAN
  wget https://raw.githubusercontent.com/eostitan/eosconfig/master/nodeos.sh
  chmod +x nodeos.sh

  cd eosconfig
  git pull
  npm install
  node eosconfig.js
else
  echo "Initial setup starting..."

  sudo apt-get update
  sudo apt-get upgrade -y
  sudo apt-get install -y git clang-4.0 lldb-4.0 libclang-4.0-dev cmake make automake libbz2-dev libssl-dev libgmp3-dev autotools-dev build-essential libicu-dev python2.7-dev python3-dev autoconf libtool curl zlib1g-dev doxygen graphviz

  mkdir EOSTITAN
  cd EOSTITAN
  wget https://raw.githubusercontent.com/eostitan/eosconfig/master/nodeos.sh
  chmod +x nodeos.sh

  git clone https://github.com/EOSIO/eos --recursive
  git clone https://github.com/eostitan/eosconfig
  cd eosconfig
  npm install
  node eosconfig.js
fi
