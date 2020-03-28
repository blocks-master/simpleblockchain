const SHA256 = require("crypto-js/sha256");
const BlockClass = require("./block.js");
const bitcoinMessage = require("bitcoinjs-message");

class Blockchain {
	constructor(data) {
		this.chain = [];
		this.height = -1;
		this.initializeChain();
	}

	async initializeChain() {
		if (this.height === -1) {
			let block = new BlockClass.Block({ data: "Genesis Block" });
			await this._addBlock(block);
		}
	}

	/**
     * Utility method that return a Promise that will resolve with the height of the chain
     */
	getChainHeight() {
		return new Promise((resolve, reject) => {
			resolve(this.height);
		});
	}

	/**
     * _addBlock(block) will store a block in the chain
     * @param {*} block 
     
     */
	async _addBlock(block) {
		try {
			let self = this;
			block.height = self.chain.length;
			block.time = new Date().getTime().toString().slice(0, -3);
			if (self.chain.length > 0) {
				block.previousBlockHash = self.chain[self.chain.length - 1].hash;
			}
			block.hash = await SHA256(JSON.stringify(block)).toString();
			self.chain.push(block);
			self.height = self.chain.length - 1;
			return self.chain;
		} catch (err) {
			console.log("Block adding failed", err);
		}
	}

	/**
     * The requestMessageOwnershipVerification(address) method
     * will allow you  to request a message that you will use to
     * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
     * @param {*} address 
     */
	async requestMessageOwnershipVerification(address) {
		return `${address}:${new Date().getTime().toString().slice(0, -3)}:starRegistry`;
	}

	/**
     * The submitStar(address, message, signature, star) method
     * will allow users to register a new Block with the star object
     * into the chain.
     * @param {*} address 
     * @param {*} message 
     * @param {*} signature 
     * @param {*} star 
     */
	async submitStar(address, message, signature, star) {
		let messageTime = parseInt(message.split(":")[1]);
		let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));
		try {
			if (currentTime - messageTime <= 5 * 60 * 1000) {
				if (!bitcoinMessage.verify(message, address, signature)) {
					throw new Error("Invalid submission");
				}
				let block = new BlockClass.Block({ owner: address, star });

				block.owner = address;
				await this._addBlock(block);
				return block;
			}
		} catch (err) {
			console.log("Submission failed", err);
		}
	}

	/**
     * This method will return a Promise that will resolve with the Block
     *  with the hash passed as a parameter.
     * Search on the chain array for the block that has the hash.
     * @param {*} hash 
     */
	getBlockByHash(hash) {
		let self = this;
		return new Promise((resolve, reject) => {
			let block = self.chain.filter((p) => p.hash === hash)[0];
			if (block) {
				resolve(block);
			}
			else {
				resolve(null);
			}
		});
	}

	/**
     * This method will return a Promise that will resolve with the Block object 
     * with the height equal to the parameter `height`
     * @param {*} height 
     */
	getBlockByHeight(height) {
		let self = this;
		return new Promise((resolve, reject) => {
			let block = self.chain.filter((p) => p.height === height)[0];
			if (block) {
				resolve(block);
			}
			else {
				resolve(null);
			}
		});
	}

	/**
     * This method will return a Promise that will resolve with an array of Stars objects existing in the chain 
     * and are belongs to the owner with the wallet address passed as parameter.
     
     * @param {*} address 
     */
	async getStarsByWalletAddress(address) {
		let self = this;
		let stars = [];
		let blocks = self.chain.filter((p) => p.owner === address);
		if (blocks) {
			blocks.forEach(async (block) => {
				const data = await block.getBData();
				stars.push(data);
			});
			return stars;
		}
		else {
			return "No stars found!";
		}
	}

	/**
     * This method will return a Promise that will resolve with the list of errors when validating the chain.
     */
	async validateChain() {
		let errorLog = [];
		self.chain.forEach(async (block, i) => {
			const isValid = await block.validate();
			if (!isValid) {
				errorLog.push(`Error - Block Heigh: ${self.chain[i].height} - Has been Tampered.`);
			}
			else {
				const prevHash = self.chain[i - 1].hash;
				if (block.hash !== prevHash) {
					errorLog.push(`Error - Block Heigh: ${block.height} - Previous Hash Doesn't Match.`);
				}
			}
			if (errorLog.length > 0) {
				return errorLog;
			}
			else {
				return "No error detected";
			}
		});
	}
}

module.exports.Blockchain = Blockchain;
