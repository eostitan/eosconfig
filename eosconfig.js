const { exec } = require('child_process');
const { spawn } = require('child_process');
var readline = require('readline');
const git = require('simple-git');
var fs = require('fs');
var request = require("request");

function main(){

	var availableTags = [];
	var chosenTag;
	var currentTag;
	var masterPrivateKey;
	var masterPublicKey;

	var keyRing = {};

	var serverURL = "http://127.0.0.1:3000";

	var walletKey;
	console.log('Eos setup brought to you by EOSTITAN.com');

	const repoPath = process.env['HOME'] + '/EOSTITAN/eos';

	function run(){

		git(repoPath).pull('origin', 'master');

		//check current tag
		git(repoPath).raw(['describe', '--tags'], (err, res) => {
			currentTag = res.trim();
		});

		console.log(repoPath)

		exec('cd ' + repoPath + ' && git  tag', (e, stdout, stderr)=>{
			console.log('d')
			console.log(stdout)
			if(stderr)
				console.log(stderr);
			if (stdout){
				var tags = stdout.split('\n');
				console.log(tags)

				for (tag of tags){
					if (!tag.includes(2017)){
						console.log(tag)
						availableTags.push(tag)
					}
				}
				availableTags.sort()
				var content ="";
				for (key in availableTags)
						content += key + ": " + availableTags[key] + '\n';

				var input = readline.createInterface(process.stdin, process.stdout);
				input.setPrompt(content + 'Choose tag #:');
				input.prompt();
				input.on('line', function(line) {
				    if (availableTags[line]) {
				    	chosenTag = availableTags[line].trim();
				    	input.close();
				    }
				    else{
				    	console.log('Please enter a number from 0 to ' + (availableTags.length - 1))
				    	input.prompt();
				    }
				}).on('close',function(){
					if (chosenTag){

							const whereis = spawn('whereis', ['cleos']);
							whereis.stdout.setEncoding('utf8');
							whereis.stdout.on('data', (chunk) => {
								console.log(chunk)
							});
							whereis.on('close', function (code) {
							    console.log('exit code : ' + code);
									if (code == 0)
										checkTags();
							});
					}
				});
			}
		});


	}	

	function checkTags(){
		if (chosenTag == currentTag){
			var input2 = readline.createInterface(process.stdin, process.stdout);
			input2.setPrompt(chosenTag + ' has been checked out previously, do you want to re-run the eosio_build? (N)');
			input2.prompt();
			input2.on('line', function(line) {
				console.log("line", line, line.length)
			    if (line.toLowerCase() == 'y' ||  line.toLowerCase() == 'yes')
			    	buildEos();
			    else if  (line == 0 || line.toLowerCase() == 'n' ||  line.toLowerCase() == 'no')
			    	configureEos()
			    else {
			    	console.log('Please enter y or n')
			    	input2.prompt();
			    }
			}).on('close',function(){
			});

		}
		else{
			buildEos();
		}
	}

	function buildEos(){
		console.log('Checking out '+ chosenTag);
		git(repoPath).checkout(chosenTag, ()=>{
			console.log('Checkout of ' + chosenTag  + ' successful')
			console.log('Building EOS ' + chosenTag);
			process.chdir(repoPath);
			const eosbuild = spawn('bash',['./eosio_build.sh']);

			eosbuild.stdout.setEncoding('utf8');
			eosbuild.stdout.on('data', (chunk) => {
				console.log(chunk)
			});

			eosbuild.on('close', (code) => {
			  if (code == 0){
			  	console.log('Build process completed successfully')
			  	process.chdir(repoPath + '/build')
				const eosMakeInstall = spawn('sudo',['make', 'install']);
			  	eosMakeInstall.stdout.setEncoding('utf8');
				eosMakeInstall.stdout.on('data', (chunk) => {
					console.log(chunk)
				});
				eosMakeInstall.on('close', (code2) => {
					if (code2 == 0){
			  			console.log('Make install process completed successfully')
			  			configureEos();
					}
			  		else
			 			console.log("Error running make install, code: " + code2)
				});
			  }
			 else
			 	console.log("Error running make install, code: " + code)

			});
		})
	}


	function createWallet(cb){
		console.log('Configuring server for a new chain')
		console.log('Creating new wallet')
		exec('cleos wallet create', (e, stdout, stderr)=> {
			if (stdout){
				walletKey = stdout.split('"');
				walletKey = walletKey[1];
				console.log("walletKey", walletKey)
				exec('echo ' + walletKey + ' > ~/EOSTITAN/defaultWallet.key')
				cb();
			}
			if (stderr){
				if (stderr.includes('Wallet already exists')){
					console.log('Wallet exists, checking for saved key...');

					exec('cat ~/EOSTITAN/defaultWallet.key', (e, stdout, stderr)=>{
						if (stderr){
							//TODO prompt user to enter password
							console.log('cant find wallet password')
						}
						if (stdout){
							walletKey = stdout;
							cb();
						}

					});
				}
				else console.log(stderr)
			}
		});

	}

	function unlockWallet(cb){
			exec('cleos wallet unlock --password ' + walletKey, ()=> {cb();});
	}

	function createKeys(keyName, isInitialKey, cb){
		exec('cleos create key', (e, stdout, stderr)=> {

			var keys = stdout;
			keys = keys.split('key: ');

			if (keyName == "master"){

				masterPrivateKey = keys[1].split('\n')[0].trim();
				masterPublicKey = keys[2].split('\n')[0].trim();

				console.log("masterPrivateKey: " + masterPrivateKey);
				console.log("masterPublicKey: " +  masterPublicKey);
				exec('echo ' + masterPrivateKey + ' > ~/EOSTITAN/masterPrivateKey.key');
				exec('echo ' + masterPublicKey + ' > ~/EOSTITAN/masterPublicKey.key');
				console.log('Both keys have been saved to ~/EOSTITAN/')

				exec('cleos wallet import ' + masterPrivateKey, (e, stdout, stderr)=> {
					
					if (isInitialKey){
						promptAnyKey("Please copy this public key into eosio-server/config/server.json on your server and then press any key to continue.")
					}
					
					return cb();

				});

			}
			else {

				var privKey = keys[1].split('\n')[0].trim();
				var pubKey = keys[2].split('\n')[0].trim();

				console.log("privKey: " + privKey);
				console.log("pubKey: " +  pubKey);

				exec('cleos wallet import ' + privKey, (e, stdout, stderr)=> {
					
					keyRing[keyName] = {
						private: privKey,
						public: pubKey
					}

					return cb();

				});

			}

		});
	}

	function createGenesis(genesis, cb){
		console.log('Creating genesis.json')


		var genesisContent;

		if (genesis){

			genesisContent = {
				"initial_configuration": {
					"base_per_transaction_net_usage": 100,
					"base_per_transaction_cpu_usage": 500,
					"base_per_action_cpu_usage": 1000,
					"base_setcode_cpu_usage": 2097152,
					"per_signature_cpu_usage": 100000,
					"per_lock_net_usage": 32,
					"context_free_discount_cpu_usage_num": 20,
					"context_free_discount_cpu_usage_den": 100,
					"max_transaction_cpu_usage": 10485760,
					"max_transaction_net_usage": 104857,
					"max_block_cpu_usage": 104857600,
					"target_block_cpu_usage_pct": 1000,
					"max_block_net_usage": 1048576,
					"target_block_net_usage_pct": 1000,
					"max_transaction_lifetime": 3600,
					"max_transaction_exec_time": 0,
					"max_authority_depth": 6,
					"max_inline_depth": 4,
					"max_inline_action_size": 4096,
					"max_generated_transaction_count": 16,
					"max_transaction_delay": 3888000
				}
			};

			genesisContent.initial_timestamp = new Date();
			genesisContent.initial_key = publicKey;
			genesisContent.initial_chain_id = Date.now().toString();

			var sampleChainId = "0000000000000000000000000000000000000000000000000000000020180511";
			var paddingCount = sampleChainId.length - genesisContent.initial_chain_id.length;

			for (var i=0;i<paddingCount;i++)
				genesisContent.initial_chain_id = '0' + genesisContent.initial_chain_id;

		}
		else genesisContent = genesis;

		exec('echo ' + genesisContent + ' > ~/.local/share/eosio/nodeeos/config/genesis.json', ()=>{cb()});

		return cb && cb(genesisContent);

	}

	function pushNetworkConfiguration(configuration, cb){
		
	}


	function fetchNetworkConfiguration(name, cb){
		
	}

	function createConfig(cb){
		console.log('Creating config.ini');
		return cb();
	}

	function promptNetworkInfo(cb){
		var input = readline.createInterface(process.stdin, process.stdout);
		input.setPrompt("Do you want to create a new network (y/N)?");
		input.prompt();
		input.on('line', function(line) {
			console.log("line", line, line.length)
		    if (line.toLowerCase() == 'y' ||  line.toLowerCase() == 'yes')
		    	return cb(true)
		    else if  (line == 0 || line.toLowerCase() == 'n' ||  line.toLowerCase() == 'no')
		    	return cb(false)
		    else {
		    	console.log('Please enter y or n')
		    	input.prompt();
		    }
		});
	}

	function promptNetworkName(action, cb){
		var input = readline.createInterface(process.stdin, process.stdout);
		input.setPrompt("Please enter a network name to " + action);
		input.prompt();
		input.on('line', function(line) {
			return cb(line);
		});
	}


	function promptAnyKey(message, cb){
		var input = readline.createInterface(process.stdin, process.stdout);
		input.setPrompt(message);
		input.prompt();
		input.on('line', function(line) {
			return cb(line);
		});
	}


	function deleteChainData(){
		
	}

	function configureEos(){

		console.log('Configuring EOS');

		promptNetworkInfo((newNetwork)=>{
			//if user wants to join an existing network

			if (newNetwork) {

		    promptNetworkName("create", (name)=>{
					//if user wants to create a new network
					createWallet(()=>{
						unlockWallet(()=>{
							createKeys("master", true, ()=>{
								createGenesis(null, (genesis)=>{
									createConfig(()=>{

										let config = {
											name:name,
											tag:chosenTag,
											genesis: genesis
										}

										pushNetworkConfiguration(config, ()=>{
											fetchNetworkConfiguration((config)=>{
												console.log("CONFIG:", config);
												console.log('end');
											});
										});
						
									});				
								});
							});
						});
					});

		    });

			}
			else {
				   
		    promptNetworkName("join", (name)=>{

					createWallet(()=>{
						unlockWallet(()=>{
							createKeys("master", false, ()=>{

								fetchNetworkConfiguration((config)=>{

									createGenesis(config.genesis, (genesis)=>{
										createConfig(()=>{

											console.log('end');
										
										});			
									});			

								});

							});
						});
					});
					
		    });

			}

		});

	}

	//run();
	configureEos();

}

main();