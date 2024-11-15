const crypto = require("crypto");

class DiceConfig {
    // Parses the dice configurations from the command line arguments
    static parse(args) {
        if (args.length < 3) {
            throw new Error("You must provide at least 3 dice configurations.");
        }
        return args.map(arg => {
            const dice = arg.split(",").map(Number);
            if (dice.length !== 6 || dice.some(isNaN)) {
                throw new Error(`Invalid dice configuration: ${arg}. Each dice must have 6 integers.`);
            }
            return dice;
        });
    }
}

class Dice {
    constructor(values) {
        this.values = values;
    }

    // Rolls the dice and returns a random value from the dice
    roll() {
        return this.values[Math.floor(Math.random() * this.values.length)];
    }
}

class RandomGenerator {
    // Generates a secure random number within the specified range
    static generateSecureNumber(rangeEnd) {
        const key = crypto.randomBytes(32); // 256 bits
        const number = crypto.randomInt(0, rangeEnd);
        const hmac = crypto.createHmac("sha3-256", key).update(number.toString()).digest("hex");
        return { number, key, hmac };
    }
}

class ProbabilityCalculator {
    // Calculates the probabilities of each dice winning against each other
    static calculateProbabilities(diceList) {
        return diceList.map(dice1 =>
            diceList.map(dice2 => {
                if (dice1 === dice2) return "N/A";
                const wins = dice1.reduce((count, face1) => count + dice2.filter(face2 => face1 > face2).length, 0);
                const total = dice1.length * dice2.length;
                return `${((wins / total) * 100).toFixed(2)}%`;
            })
        );
    }
}

class Game {
    constructor(diceConfigs) {
        this.diceList = diceConfigs.map(config => new Dice(config));
        this.userDice = null;
        this.computerDice = null;
    }

    // Determines who goes first by generating a secure random number
    async determineFirstTurn() {
        const { number, key, hmac } = RandomGenerator.generateSecureNumber(2);
        console.log(`I generated a random number in the range 0..1 (HMAC=${hmac}).`);
        while (true) {
            console.log("Try to guess my selection:");
            console.log("0 - 0\n1 - 1\nX - exit\n? - help");
            const input = await this.getUserInput("Your selection: ");
            if (input.toLowerCase() === "x") process.exit(0);
            if (input.toLowerCase() === "?") {
                this.showHelp();
                continue;
            }
            const userGuess = parseInt(input, 10);
            if ([0, 1].includes(userGuess)) {
                console.log(`My selection: ${number} (KEY=${key.toString("hex")}).`);
                return userGuess === number;
            }
            console.log("Invalid input. Please choose 0 or 1.");
        }
    }

    // Allows the user to select their dice
    async selectDice() {
        console.log("Choose your dice:");
        this.diceList.forEach((dice, index) => console.log(`${index} - ${dice.values}`));
        console.log("X - exit\n? - help");
        while (true) {
            const input = await this.getUserInput("Your selection: ");
            if (input.toLowerCase() === "x") process.exit(0);
            if (input.toLowerCase() === "?") {
                this.showHelp();
                continue;
            }
            const selection = parseInt(input, 10);
            if (selection >= 0 && selection < this.diceList.length) {
                this.userDice = this.diceList[selection];
                console.log(`You chose the ${this.userDice.values} dice.`);
                this.computerDice = this.diceList.find(dice => dice !== this.userDice);
                console.log(`I chose the ${this.computerDice.values} dice.`);
                return;
            }
            console.log("Invalid selection. Please choose a valid dice index.");
        }
    }

    // Plays a turn of the game
    async playTurn() {
        console.log("It's your turn!");
        const userRoll = this.userDice.roll();
        console.log(`You rolled: ${userRoll}`);

        console.log("It's my turn!");
        const computerRoll = this.computerDice.roll();
        console.log(`I rolled: ${computerRoll}`);

        if (userRoll > computerRoll) {
            console.log("You win!");
        } else if (userRoll < computerRoll) {
            console.log("I win!");
        } else {
            console.log("It's a tie!");
        }
    }

    // Gets user input from the command line
    async getUserInput(prompt) {
        process.stdout.write(prompt);
        return new Promise(resolve => process.stdin.once("data", data => resolve(data.toString().trim())));
    }

    // Shows help information including probabilities
    showHelp() {
        const probabilities = ProbabilityCalculator.calculateProbabilities(this.diceList.map(d => d.values));
        console.log("\nProbabilities:");
        const headers = this.diceList.map((_, index) => `Dice ${index}`);
        console.log([[""].concat(headers)]);
        probabilities.forEach((row, i) => console.log([`Dice ${i}`].concat(row)));
        console.log();
    }
}

// Main function to start the game
async function main() {
    try {
        const args = process.argv.slice(2);
        const diceConfigs = DiceConfig.parse(args);
        const game = new Game(diceConfigs);

        const userGoesFirst = await game.determineFirstTurn();
        console.log(userGoesFirst ? "You make the first move!" : "I make the first move!");

        await game.selectDice();
        await game.playTurn();
        process.exit(0);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        console.log("Example: node game.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3");
        process.exit(1);
    }
}

process.stdin.setEncoding("utf8");
main();cd