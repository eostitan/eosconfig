const { exec } = require('child_process');
const { spawn } = require('child_process');
var readline = require('readline');
const git = require('simple-git');
var fs = require('fs');
var request = require("request");
var cjson = require("canonicaljson");
var eos = require("eosjs-ecc");
var async = require("async");
var path = require("path");
var colors = require("colors");

function main(){

	var configTemplate = fs.readFileSync("./configTemplate", "utf8");

	//console.log("config template", configTemplate);

	var availableTags = [];
	var chosenTag;
	var currentTag;
	var masterPrivateKey;
	var masterPublicKey;

	var keyRing = {};

	var serverURL = "http://discovery.eostitan.com:9273";
	var defaultTag = "dawn-v4.2.0";

	var walletKey;
	
	console.log('EOS.IO configuration utility by eostitan.com'.green);


	const eosTitanPath = path.join(process.env['HOME'], "EOSTITAN");
	const repoPath = path.join(eosTitanPath, "eos");

	const eosioPath = path.join(process.env['HOME'], ".local", "share", "eosio");
	const nodeosPath = path.join(eosioPath, "nodeos");
	const dataPath = path.join(nodeosPath, "data");
	const configPath = path.join(nodeosPath, "config");
	const configFile = path.join(nodeosPath, "config", "config.ini");
	const genesisFile = path.join(nodeosPath, "config", "genesis.json");


	mkdirp.sync(eosioPath);
	mkdirp.sync(nodeosPath);
	mkdirp.sync(configPath);

	function runBuildScript(cb){

/*		if (!fs.existsSync(repoPath)){
			fs.mkdirSync(eosTitanPath);
			fs.mkdirSync(repoPath);
		}
*/
		git(repoPath).pull('origin', 'master');

		//check current tag
		git(repoPath).raw(['describe', '--tags'], (err, res) => {
			currentTag = res.trim();
			console.log("Current tag is :", currentTag);
		});

		//console.log(repoPath)

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
										checkTags(cb);
							});
					}
				});
			}
		});


	}	

	function checkTags(cb){
		if (chosenTag == currentTag){
			var input2 = readline.createInterface(process.stdin, process.stdout);
			input2.setPrompt(chosenTag + ' has been checked out previously, do you want to re-run the eosio_build (y/N)?');
			input2.prompt();
			input2.on('line', function(line) {
				console.log("line", line, line.length)
			    if (line.toLowerCase() == 'y' ||  line.toLowerCase() == 'yes'){
			    	input2.close();
			    	buildEos(cb);
			    }
			    else if  (line == 0 || line.toLowerCase() == 'n' ||  line.toLowerCase() == 'no'){
			    	input2.close();
			    	return cb && cb();
			    }
			    else {
			    	console.log('Please enter y or n')
			    	input2.prompt();
			    }
			}).on('close',function(){
			});

		}
		else{
			buildEos(cb);
		}
	}

	function buildEos(cb){
		console.log('Checking out '+ chosenTag);
		git(repoPath).checkout(chosenTag, ()=>{
			console.log('Checkout of ' + chosenTag  + ' successful')
			console.log('Building EOS ' + chosenTag);

			git(repoPath).submoduleUpdate(["--init", "--recursive"], ()=>{

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
					  		return cb && cb();
							}
					  	else console.log("Error running make install, code: " + code2)
						});

				  }
				 else console.log("Error running make install, code: " + code)
				});
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
				exec('echo ' + walletKey + ' > ' + eosTitanPath + '/defaultWallet.key')
				cb();
			}
			if (stderr){
				if (stderr.includes('Wallet already exists')){
					console.log('Wallet exists, checking for saved key...');

					exec('cat ~/'  + eosTitanPath + '/defaultWallet.key', (e, stdout, stderr)=>{
						if (stderr){
							//TODO prompt user to enter password
							console.log('cant find wallet password')

							promptPassword((password)=>{
								walletKey = password;
								cb();
							});

						}
						else if (stdout){
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

	function createKeys(keyName, cb){
		exec('cleos create key', (e, stdout, stderr)=> {

			var keys = stdout;
			keys = keys.split('key: ');

			if (keyName == "master"){

				masterPrivateKey = keys[1].split('\n')[0].trim();
				masterPublicKey = keys[2].split('\n')[0].trim();

				//console.log("masterPrivateKey: " + masterPrivateKey);
				console.log("masterPublicKey: " +  masterPublicKey);
				exec('echo ' + masterPrivateKey + ' > ~/'  + eosTitanPath + '/masterPrivateKey.key');
				exec('echo ' + masterPublicKey + ' > ~/'  + eosTitanPath + '/masterPublicKey.key');
				//console.log('Both keys have been saved to ~/EOSTITAN/')

				exec('cleos wallet import ' + masterPrivateKey, (e, stdout, stderr)=> {

					console.log("Key imported.");

					keyRing[keyName] = {
						private: masterPrivateKey,
						public: masterPublicKey
					}

					return cb();
				});

			}
			else {

				var privKey = keys[1].split('\n')[0].trim();
				var pubKey = keys[2].split('\n')[0].trim();

				//console.log("privKey: " + privKey);
				console.log("pubKey: " +  pubKey);

				exec('cleos wallet import ' + privKey, (e, stdout, stderr)=> {

					console.log("Key imported.");
					
					keyRing[keyName] = {
						private: privKey,
						public: pubKey
					}

					return cb();

				});

			}

		});
	}

	function createAccount(name, creator, key, cb){
		exec('cleos create account ' + creator + " " + name + " " + key + " " + key, (e, stdout, stderr)=> {

			if (stdout){
				console.log(stdout);
			}
			else if (stderr){
				console.log(stderr);
			}

			return cb();

		});

	}

	function prepareContract(info, cb){
		createKeys(info.name, function(){
			createAccount(info.name, info.creator, keyRing[info.name].public, cb);
		});
	}

	function createGenesis(genesis, cb){
		console.log('Creating genesis.json')

		var genesisContent;

		if (!genesis){

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

			genesisContent.initial_timestamp = JSON.stringify(new Date()).replace('Z', "").replace('"', "").replace('"', "");

			//console.log("genesisContent.initial_timestamp", genesisContent.initial_timestamp);

			genesisContent.initial_key = masterPublicKey;
			genesisContent.initial_chain_id = Date.now().toString();

			var sampleChainId = "0000000000000000000000000000000000000000000000000000000020180511";
			var paddingCount = sampleChainId.length - genesisContent.initial_chain_id.length;

			for (var i=0;i<paddingCount;i++)
				genesisContent.initial_chain_id = '0' + genesisContent.initial_chain_id;

		}
		else genesisContent = genesis;

		fs.writeFileSync(genesisFile, JSON.stringify(genesisContent, null, 2));

		return cb && cb(genesisContent);

/*		exec('echo ' + genesisContent + ' > ~/.local/share/eosio/nodeeos/config/genesis.json', ()=>{
			console.log("Genesis file has been created");
			return cb && cb(genesisContent);
		});*/


	}

	function pushNetworkConfiguration(configuration, cb){

		let data = configuration; //signRequest(configuration, masterPrivateKey, true);

		request({url: serverURL + '/addnetwork', method: 'POST', json: data}, function(err, res, body){
			if (err) console.log("ERROR:", err);

			if (body && !body.error){
				//console.log("");
				console.log("pushed network configuration");
				//console.log(JSON.stringify(body, null, 2));
				return cb && cb(null, body);
			}
			else return cb && cb({error: err || body.error});
		});

	}


	function fetchNetworkConfiguration(name, cb){

		request({url: serverURL + '/networks/' + name, method: 'GET', json:true}, function(err, res, body){

			if (body){
				//console.log("");
				console.log("fetched network configuration");
				//console.log(JSON.stringify(body, null, 2));

				return cb && cb(null, body);
			}
			else return cb && cb({error: "Network not found."});
			
		});

	}

	function createConfig(name, cb){
		console.log('Creating config.ini');

		let configContent = configTemplate;

		configContent += "\nagent-name = " + '"' + name + '"';
		configContent += "\nproducer-name = " + name ; 
		configContent += '\nprivate-key = ["' + masterPublicKey + '","' + masterPrivateKey + '"]'; 
		configContent += "\n";

/*		exec('echo ' + configContent + ' > ~/.local/share/eosio/nodeeos/config/config.ini', ()=>{
			console.log("Configuration file has been created");
			return cb && cb(configContent);
		});*/


		fs.writeFileSync(configFile, configContent);

		return cb && cb(configContent);

	}

	function promptNetworkInfo(cb){
		var input = readline.createInterface(process.stdin, process.stdout);
		input.setPrompt("Do you want to create a new network (y/N)? ");
		input.prompt();
		input.on('line', function(line) {
			console.log("line", line, line.length)
		    if (line.toLowerCase() == 'y' ||  line.toLowerCase() == 'yes'){

				  input.close();
		    	return cb(true);
		    }
		    else if  (line == 0 || line.toLowerCase() == 'n' ||  line.toLowerCase() == 'no'){
				  input.close();
		    	return cb(false);
		    }
		    else {
		    	console.log('Please enter y or n')
		    	input.prompt();
		    }
		}).on('close',function(){
		});
	}

	function promptDeleteData(cb){
		var input = readline.createInterface(process.stdin, process.stdout);
		input.setPrompt("Data folder already exists. Would you like to delete it (Y/n)?");
		input.prompt();
		input.on('line', function(line) {
			console.log("line", line, line.length)
		    if (line == 0 || line.toLowerCase() == 'y' ||  line.toLowerCase() == 'yes'){
				  input.close();
				  return deleteChainData(cb);
		    }
		    else if  (line.toLowerCase() == 'n' ||  line.toLowerCase() == 'no'){
				  input.close();
		    	return cb();
		    }
		    else {
		    	console.log('Please enter y or n')
		    	input.prompt();
		    }
		}).on('close',function(){
		});
	}

	function promptNodeName(cb){
		var input = readline.createInterface(process.stdin, process.stdout);
		input.setPrompt("Please enter your account name (to be created on the network). ");
		input.prompt();
		input.on('line', function(line) {
			input.close();
			return cb(line);
		}).on('close',function(){
		});
	}

	function promptPassword(cb){
		var input = readline.createInterface(process.stdin, process.stdout); //todo: use silent prompt
		input.setPrompt("Please enter your wallet password. ");
		input.prompt();
		input.on('line', function(line) {
			input.close();
			return cb(line);
		}).on('close',function(){
		});
	}

	function promptNetworkName(action, cb){
		var input = readline.createInterface(process.stdin, process.stdout);
		input.setPrompt("Please enter a network name to " + action + ". ");
		input.prompt();
		input.on('line', function(line) {
			input.close();
			return cb(line);
		}).on('close',function(){
		});
	}


	function promptAnyKey(message, cb){
		var input = readline.createInterface(process.stdin, process.stdout);
		input.setPrompt(message + " ");
		input.prompt();
		input.on('line', function(line) {
			input.close();
			return cb(line);
		}).on('close',function(){
		});
	}

	function promptRebuildEOS(cb){
		var input = readline.createInterface(process.stdin, process.stdout);
		input.setPrompt("A previous installation of eosio has been found. Would you like to rebuild (y/N)?");
		input.prompt();
		input.on('line', function(line) {
			console.log("line", line, line.length)
		    if (line.toLowerCase() == 'y' ||  line.toLowerCase() == 'yes'){
				  input.close();
				  return cb(true);
		    }
		    else if  (line == 0 || line.toLowerCase() == 'n' ||  line.toLowerCase() == 'no'){
				  input.close();
		    	return cb(false);
		    }
		    else {
		    	console.log('Please enter y or n')
		    	input.prompt();
		    }
		}).on('close',function(){
		});
	}




	function deleteChainData(cb){
	
		exec('rm -r ' + dataPath, (e, stdout, stderr)=> {

			return cb();

		});

	}

	function configureChainBIOS(boot, cb){

		//console.log("BOOT SEQUENCE: ", boot.sequence);

		let sortedCommands = boot.sequence.sort(function(a, b){
			if (a>b) return 1;
			if (a<b) return -1;
			else return 0;
		});

		async.eachSeries(sortedCommands, executeBIOSCommand, function(err,res){
			console.log("BIOS BOOT SEQUENCE EXECUTION COMPLETED.".green);
			return cb();
		});

	}

	function executeBIOSCommand(command, cb){

		if (command.command=="nodeos"){

			console.log("Starting nodeos...", command);
			command.arguments.unshift("nodeos");

			const nodeos = spawn('nohup', command.arguments);

			nodeos.stderr.setEncoding('utf8');

			nodeos.stderr.on('data', (chunk) => {
				//TODO:
				//trap replay or resync required (error);
				//trap not producing block because I don't have the private key (error)
				//trap Produced block (success)

				console.log(chunk)

			});

			nodeos.on('error', function(err) {
			  console.log('error: ' + err);
			});

			return setTimeout(cb, 5000); //replace by smart stderr handling

		}
		else if (command.command=="generate_contract_keys"){

			console.log("Generating contracts keys and accounts...");
			
			command.keys = command.keys.map(function(k){k.creator = command.account;return k});

			async.eachSeries(command.keys, prepareContract, function(err,res){
				console.log("KEYRING:", keyRing);
				return cb();
			});

		}
		else if (command.command=="set_contract"){

			console.log("Pushing contract...");

      let filepath = path.join(repoPath, "build", "contracts", command.path);

			exec('cleos set contract ' + command.name + " " + filepath, (e, stdout, stderr)=> {

				if (stdout){
					console.log(stdout);
				}
				else if (stderr){
					console.log(stderr);
				}

				return cb();

			});


		}
		else if (command.command=="push_action"){

			console.log("Pushing action...");

			//cleos push action eosio.token issue '[ "eosio", "1000000000.0000 SYS", "memo" ]' -p eosio

			let args = '"' + command.params.join('","') + '"';

			exec('cleos push action ' + command.contract + " " + command.action + " " + args + " -p " + command.signature , (e, stdout, stderr)=> {

				if (stdout){
					console.log(stdout);
				}
				else if (stderr){
					console.log(stderr);
				}

				return cb();

			});

		}	

	}

	function signRequest(rq, key, append){

		let newRq = JSON.parse(JSON.stringify(rq));

		if (append) {
			newRq.signature = eos.sign(cjson.stringify(rq), key);
			return newRq;
		}
		else return eos.sign(cjson.stringify(rq), key);

	}

	function run(){

		console.log('Configuring EOS');

		//todo: allow set up with configuration file instead of prompts
		//todo: no rebuild necessary if we used git pull and are already up to date
		//if (fs.existsSync(repoPath)){

		//	promptRebuildEOS((rebuild)=>{
		//		buildEOS = rebuild;
		//		if (rebuild==true) console.log("Rebuilding flag set to true");
		if (fs.existsSync(dataPath)) {
			promptDeleteData(()=>{
				configureEos(true);
			});
		}
		else configureEos(true);
		//	});

		//}
		//else configureEos(true);

		function configureEos(build){

			promptNetworkInfo((newNetwork)=>{
				//if user wants to join an existing network

				if (newNetwork==true) {

			    promptNetworkName("create", (name)=>{
						//if user wants to create a new network
						if (build){
							
							runBuildScript(()=>{
								completeEOSIOConfiguration();
							});
							
						}
						else completeEOSIOConfiguration();

						function completeEOSIOConfiguration(){

							//todo : check if wallet already exists, if it does, reuse the master key instead of creating a new one
							createWallet(()=>{
								unlockWallet(()=>{
									createKeys("master", ()=>{
										createGenesis(null, (genesis)=>{
											createConfig("eosio", ()=>{

												let config = {
													network_name:name,
													initial_key:masterPublicKey,
													tag:chosenTag || defaultTag,
													genesis: genesis
												}

												pushNetworkConfiguration(config, (err, res)=>{
													if (err) console.log("error:", err); //todo: reprompt

													fetchNetworkConfiguration(name, (err, res)=>{
														if (err) return console.log("error:", err);
													
														console.log("CONFIG:", JSON.stringify(res, null, 2));

														console.log('Node configuration is complete.');

														configureChainBIOS(res.network.boot, ()=>{
															console.log("Blockchain bootstrapping is complete.");
														});

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
				else {

			    promptNetworkName("join", (name)=>{
			    	promptNodeName((nodeName)=>{

							fetchNetworkConfiguration(name, (err, config)=>{

								if (build){
									
									runBuildScript(()=>{
										completeNodeConfiguration();
									});
									
								}
								else completeNodeConfiguration();

								function completeNodeConfiguration(){

									createWallet(()=>{
										unlockWallet(()=>{
											createKeys("master",  ()=>{

												console.log("CONFIG:", JSON.stringify(config, null, 2));

												createGenesis(config.genesis, (genesis)=>{
													createConfig(nodeName, ()=>{
														console.log('Node configuration is complete.');
													});			
												});			
											});
										});
									});

								}

							});
			    	});
			    });
				}

			});

		}

	}

	run();

}

main();