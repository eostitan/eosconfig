const { exec } = require('child_process');
const { spawn } = require('child_process');
var readline = require('readline');
const git = require('simple-git')

console.log('Eos setup brought to you by EOSTITAN.com');

const repoPath = process.env['HOME'] + '/EOSTITAN/eos';
git(repoPath).pull('origin', 'master');

var availableTags = [];
var chosenTag;
var currentTag;

//check current tag
git(repoPath).raw(['describe', '--tags'], (err, res) => {
	currentTag = res.trim();
});


git(repoPath).tags((err, res)=>{
	for (tag of res.all){
		if (!tag.includes(2017))
			availableTags.push(tag)
	}
	availableTags.sort()

	for (key in availableTags){
    	console.log( key + ": " + availableTags[key]);
	}

	setTimeout(()=>{
		var input = readline.createInterface(process.stdin, process.stdout);
		input.setPrompt('Choose Tag by #: ');
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
		if (chosenTag)
		    checkTags();
		});
	}, 200);
});


function checkTags(){
	if (chosenTag == currentTag){
		console.log('SAME TAG')
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
		 			console.log("Error running make install, code: " _ code2)
			});
		  }
		 else 
		 	console.log("Error running make install, code: " _ code)

		});
	})
}


function createNewChain(){
	console.log('Configuring server for a new chain')
	console.log('Creating new wallet')
	exec('cleos wallet create', (e, stdout, stderr)=> {
	    if (e instanceof Error) {
	        // console.error(e);
	    }
	    console.log('stdout ', stdout);
		if (stderr)
			if (stderr.includes('Wallet already exists'))	
				console.log('Wallet exists')
			else console.log(stderr)
			    
	});

}


function configureEos(){
	console.log('Configuring EOS');
	//if user wants to create a new network
	createNewChain();

	//to start new network
	// cleos wallet create
	//save password to file
	//cleos wallet unlock 
	// cleos create key
	//save it
	//cleos wallet import <private key>
	//test
	//cleos wallet keys
	//search to make sure private key got added

	// create .local/share/eosio/nodeeos/config/genesis.json from template
	// insert bolded items generated while maintaining length


}