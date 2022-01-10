// Vesting Controller Draft

// TODO: 	need reverse logic and limit the LOCKED amount in _transfer() rather than the UNLOCKED
// 			because if a vesting user receives non-vesting RND, it has to be tracked and registered in a variable constantly

pragma solidity 0.8.4;

contract VestingController {

	mapping (address => VestingInvestor) vestingInvestor;

	struct VestingInvestment {
		uint tokenAmount;
		uint vestingPeriod;
		uint vestingStartTime;
		uint cliffStartTime;
		// dailyTokenAmount should be extended with a check to see if vesting period is over allow tokenAmount to be used 
		// e.g.: 10/3 = 3.33, 3.33x3=9.99
		uint dailyTokenAmount;
	}

	struct VestingInvestor {
		uint totalTokenAmount;
		uint totalInvestmentCounter;
		mapping( uint => VestingInvestment) VestingInvestments;
	}

	// Calculates the total of not yet vested amount of a user through all his different vesting schedules
	// Returned amount should be used in _transfer() to prohibit transferring more than this
	function calculateLockedAmount(address investorAddress) public returns (uint256) {

		uint total = vestingInvestor[investorAddress].totalInvestmentCounter;
		uint lockedAmount = 0;

		// Iterate over the investments of a wallet in VestingInvestments
		for (uint i=0; i==total; i++) {

			VestingInvestment memory investment = vestingInvestor[investorAddress].VestingInvestments[i];

			// Check if the cliffStartTime is reached
			if (investment.cliffStartTime >= block.timestamp) {
				uint locked = (investment.vestingPeriod - block.timestamp) * (investment.tokenAmount / investment.vestingPeriod);
				lockedAmount = lockedAmount + locked;
			}

			// If cliffStartTime is not reached skip to the next iteration
			else {
				break;	
			}

		}
		
		// Return total amount locked over all investments
		return lockedAmount;

	}

}

// Scenarios for locked amount calculations
// totalTokenAmount = 1000
// startPeriod = 0
// vestingPeriod = 3
// dailyTokenAmount = 333.33

// Locked on Day 2.
// locked	= ((vestingPeriod - dayToday) * (totalTokenAmount / vestingPeriod))
// 		= (3-2) *  (1000) / 3)
// 		= 1 * 333.33
// 		= 333.33

// All under vesting and transferring twice on first and second days
// Day 1.
// balance  / locked 	/ unlocked 
// 1000 	/ 666.66 	/ 333.33
// 666.66 	/ 666.66  	/ 333.33 // sent 333.33

// Day 2.
// balance  / locked 	/ unlocked 
// 666.66 	/ 333.33 	/ 666.66
// 333.33 	/ 333.33 	/ 666.66 // sent 333.33

// New nonvesting RND received to the already vesting
// Day 1.
// balance  / locked 	/ unlocked 
// 1000 	/ 666.66 	/ 333.33
// 1200 	/ 666.66  	/ 333.33 // received 200 nonvesting RND
// 800		/ 666.66	/ 333.33 // sent 400 RND (200 vested + 200 nonvesting)
// 666.66	/ 666.66	/ 333.33 // sent 133.33 RND (all vested)

// Day 2. 
// 666.66	/ 333.33	/ 666.66
// 333.33	/ 333.33	/ 666.66 // sent 333.33 RND (newly unlocked amount on second day)


// total sent 533.33 vested RND and received 200 nonvesting RND





// Vested amount function is probably not needed as locked amounts should be calculated and applied for checks
// locked should be substracted from total to get vested amount

// // Calculates the total of already vested amount of a user through all his different vesting schedules
// function calculateVestedAmount(address investorAddress) {

// 	uint total = vestingInvestor[investorAddress].totalInvestmentCounter;
// 	uint unlockedAmount = 0;

// 	// Iterate over the investments of a wallet in VestingInvestments
// 	for (i=0; i==total; i++) {

// 		// Check if the cliffStartTime is reached
// 		if (vestingInvestor[investorAddress].VestingInvestments[i].cliffStartTime => block.timestamp) {
// 			uint unlock = vestingInvestor[investorAddress].VestingInvestments[i].
// 			unlockedAmount = unlockedAmount + unlocked
// 		}

// 		// If cliffStartTime is not reached skip to the next iteration
// 		else {
// 			break;	
// 		}

// 	}

// }


