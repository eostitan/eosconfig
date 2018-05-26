#!/bin/bash

echo EOS.IO configuration utility by eostitan.com


function program_is_installed {
  local return_=1
  type $1 >/dev/null 2>&1 || { local return_=0; }
}

cd ~;

# if (program_is_installed node -eq 1) 
# 	then echo nodejs is already installed
# fi

# if [ -d './EOSTITAN/eosconfig' ]
# 	then echo eosconfig repository already cloned
# fi

# if [ -d './EOSTITAN/eos' ]
# 	then echo eos repository already cloned
# fi

if (program_is_installed node -eq 1) && [ -d './EOSTITAN/eosconfig' ] && [ -d './EOSTITAN/eos' ]
then
	echo Inital setup previously completed, launching eos config;
	cd EOSTITAN;
	cd eosconfig;
	git pull;
	npm install;
	node eosconfig.js;
else
	echo "Inital setup starting...";

	curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -;

	sudo apt-get upgrade -y;

	sudo apt-get install -y git automake nodejs clang-4.0 lldb-4.0 libclang-4.0-dev cmake make libbz2-dev libssl-dev libgmp3-dev autotools-dev build-essential libicu-dev python2.7-dev python3-dev autoconf libtool curl zlib1g-dev doxygen graphviz ;

	mkdir EOSTITAN;

	cd EOSTITAN;

	git clone https://github.com/EOSIO/eos --recursive;
	git clone https://github.com/eostitan/eosconfig;
	cd eosconfig;
	npm install;
	node eosconfig.js;

fi


