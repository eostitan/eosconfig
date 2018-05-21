const { exec } = require('child_process');
const { spawn } = require('child_process');
var readline = require('readline');
const git = require('simple-git');
var fs = require('fs');

var walletKey;
console.log('Eos setup brought to you by EOSTITAN.com');

const repoPath = process.env['HOME'] + '/EOSTITAN/eos';
git(repoPath).pull('origin', 'master');

var availableTags = [];
var chosenTag;
var currentTag;
var privateKey;
var publicKey;

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

function createKeys(cb){
	exec('cleos create key', (e, stdout, stderr)=> {
		var keys = stdout;
		keys = keys.split('key: ');
		privateKey = keys[1].split('\n')[0].trim();
		publicKey = keys[2].split('\n')[0].trim();
		console.log("privateKey: " + privateKey);
		console.log("publicKey: " +  publicKey);
		exec('echo ' + privateKey + ' > ~/EOSTITAN/privateKey.key');
		exec('echo ' + publicKey + ' > ~/EOSTITAN/publicKey.key');
		console.log('Both keys have been saved to ~/EOSTITAN/')

		exec('cleos wallet import ' + privateKey, (e, stdout, stderr)=> {
			cb();
		});
	});
}

function createGenesis(cb){
	console.log('Creating genesis.json')
	var genesisContent ={
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

	exec('echo ' + genesisContent + ' > ~/.local/share/eosio/nodeeos/config/genesis.json', ()=>{cb()});
}
function createConfig(){
	console.log('Creating config.ini');
	
}

function configureEos(){
	console.log('Configuring EOS');
	//if user wants to create a new network
	createWallet(()=>{unlockWallet(()=>{createKeys(()=>{
		createGenesis(()=>{createConfig(()=>
			{console.log('end');
		})});
	});});});




}
