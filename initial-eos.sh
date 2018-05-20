#!/bin/bash

echo Eos Initial Setup brought to you by EOSTITAN.com


function program_is_installed {
  local return_=1
  type $1 >/dev/null 2>&1 || { local return_=0; }
  echo "$return_"
}

if program_is_installed node -eq 1 && -d ~/EOSTITAN/eosnodejs && -d ~/EOSTITAN/eos 
then
	echo "Inital setup previously completed";
	cd ~;
	cd EOSTITAN;
	cd eosconfig;
	git pull;
	npm install;
	node eosconfig.js;
else

	curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -;

	sudo apt-get upgrade -y;

	sudo apt-get install -y git automake nodejs clang-4.0 lldb-4.0 libclang-4.0-dev cmake make libbz2-dev libssl-dev libgmp3-dev autotools-dev build-essential libicu-dev python2.7-dev python3-dev autoconf libtool curl zlib1g-dev doxygen graphviz ;

	cd ~;

	mkdir EOSTITAN;

	cd EOSTITAN;

	git clone https://github.com/EOSIO/eos --recursive;
	git clone https://github.com/cryptomechanics/eosconfig;
	cd eosconfig;
	npm install;
	node eosconfig.js;

fi


