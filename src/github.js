var repo = {};

// This provides symbolic names for the octal modes used by git trees.
var modes = require('js-git/lib/modes');

// This only works for normal repos.  Github doesn't allow access to gists as
// far as I can tell.
var githubName = "NAP-GHJ/GithubDatabase";

// Your user can generate these manually at https://github.com/settings/tokens/new
// Or you can use an oauth flow to get a token for the user.
var githubToken = "d56209d009a20999ed2d673a719fd4f79b812352";

// Mixin the main library using github to provide the following:
// - repo.loadAs(type, hash) => value
// - repo.saveAs(type, value) => hash
// - repo.readRef(ref) => hash
// - repo.updateRef(ref, hash) => hash
// - repo.createTree(entries) => hash
// - repo.hasHash(hash) => has
require('js-github/mixins/github-db')(repo, githubName, githubToken);

// This adds in walker algorithms for quickly walking history or a tree.
// - logWalk(ref|hash) => stream<commit>
// - treeWalk(hash) => stream<object>
require('js-git/mixins/walkers')(repo);

// Github has this built-in, but it's currently very buggy so we replace with
// the manual implementation in js-git.
require('js-git/mixins/create-tree')(repo);

// Cache github objects locally in indexeddb
//require('js-git/mixins/add-cache')(repo, require('js-git/mixins/indexed-db'));

// Cache everything except blobs over 100 bytes in memory.
// This makes path-to-hash lookup a sync operation in most cases.
require('js-git/mixins/mem-cache')(repo);

// Combine concurrent read requests for the same hash
require('js-git/mixins/read-combiner')(repo);

// Add in value formatting niceties.  Also adds text and array types.
require('js-git/mixins/formats')(repo);

// I'm using generator syntax, but callback style also works.
// See js-git main docs for more details.
var run = require('gen-run');


/*run(function* () {
	var headHash = yield repo.readRef("refs/heads/master");
	var commit = yield repo.loadAs("commit", headHash);
	var tree = yield repo.loadAs("tree", commit.tree);
	var entry = tree["README.md"];
	//console.log('tree'+tree);
	//console.log('entry'+entry);
	var readme = yield repo.loadAs("text", entry.hash);
	console.log("readme "+readme);
	
	// Build the updates array
	var updates = [
	{
		path: "README.md", // Update the existing entry
		mode: entry.mode,  // Preserve the mode (it might have been executible)
		content: readme.toUpperCase() // Write the new content
	}
	];

	// Based on the existing tree, we only want to update, not replace.
	updates.base = commit.tree;

// Create the new file and the updated tree.
	var treeHash = yield repo.createTree(updates);

	var tree = yield repo.loadAs("tree", treeHash);
	var entry = tree["README.md"];
//  console.log('tree'+tree);
//  console.log('entry'+entry);
	var readme = yield repo.loadAs("text", entry.hash);
	console.log("readme"+readme);

	console.log('headHash '+headHash);

//saveAs
	var blobHash = yield repo.saveAs("blob", "Hello World\n");
	var treeHash = yield repo.saveAs("tree", {
	"subfolder/greeting.txt": { mode: modes.file, hash: blobHash }
	});

	var commitHash = yield repo.saveAs("commit", {
	tree: treeHash,
	author: {
		name: "NAP-GHJ",
		email: "18052095653@189.cn"
	},
	parent: headHash,
	message: "Change README.md to be all uppercase using js-github\n"
	});

	console.log(commitHash);


	// Now we can browse to this commit by hash, but it's still not in master.
	// We need to update the ref to point to this new commit.
 // console.log("COMMIT", commitHash)

	// Save it to a new branch (Or update existing one)
	var new_hash = yield repo.updateRef("refs/heads/master", commitHash);

	// And delete this new branch:
	//yield repo.deleteRef("refs/heads/new-bran");



});*/


//Git commit a file : filePath ,fileContent ,describe
var gitCommit = function ( filePath , fileContent, describe){
run(function*(){

	var headHash = yield repo.readRef("refs/heads/master");
	var commit = yield repo.loadAs("commit", headHash);
	var tree = yield repo.loadAs("tree", commit.tree);

	 // Build the updates array
	var updates = [
		{
			path: filePath, // Update the existing entry
			mode: modes.file,  // Preserve the mode (it might have been executible)
			content: fileContent // Write the new content
		}
	];

	// Based on the existing tree, we only want to update, not replace.
	updates.base = commit.tree;

	// Create the new file and the updated tree.
		var treeHash = yield repo.createTree(updates);
		
		var commitHash = yield repo.saveAs("commit", {
		tree: treeHash,
		author: {
			name: "NAP-GHJ",
			email: "18052095653@189.cn"
		},
		parent: headHash,
		message: describe
		});

		//console.log(commitHash);


	// Now we can browse to this commit by hash, but it's still not in master.
	// We need to update the ref to point to this new commit.


		// Save it to a new branch (Or update existing one)
		var new_hash = yield repo.updateRef("refs/heads/master", commitHash);
});
}

var gitLoad = function ( filePath ){
run(function*(){

	var headHash = yield repo.readRef("refs/heads/master");
	//var commit = yield repo.loadAs("commit", headHash);
	//var tree = yield repo.loadAs("tree", commit.tree);

	//Using walkers
	var logStream = yield repo.logWalk(headHash);

	// Looping through the stream is easy by repeatedly calling waiting on `read`.
	var commit, object,fileContent;
	var found = 0;
	while (commit = yield logStream.read(), commit !== undefined, found == 0) {

	  //console.log(commit);

	  // We can also loop through all the files of each commit version.
	  var treeStream = yield repo.treeWalk(commit.tree);
	  while (object = yield treeStream.read(), object !== undefined) {
	    //console.log(object);
	    if(object.mode === modes.file  && object.path === filePath){
	    	console.log(object);
	    	found = 1;
	    	var fileContent = yield repo.loadAs("text", object.hash);
		console.log("The file content  is \n"+fileContent);
	    	break;
	    }
	  }

	}

 	return fileContent;
});
}

gitLoad("/src/test.txt");

exports.gitLoad = gitLoad;
exports.gitCommit = gitCommit;


