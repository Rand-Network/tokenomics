// Rand.network - Vesting Controller Draft

pragma solidity 0.8.4;

import "hardhat/console.sol";

contract VestingController {

	mapping (address => VestingInvestor) private vestingInvestor;

	struct VestingInvestment {
		uint tokenAmount;
		uint vestingPeriod;
		uint vestingStartTime;
		uint cliffStartTime;
		uint dailyTokenAmount;
	}

	struct VestingInvestor {
		uint totalTokenAmount;
		uint totalInvestmentCounter;
		mapping( uint => VestingInvestment) VestingInvestments;
	}

	// Just to try logic, needs initializer implementation for upgradability
	constructor() {
	}

	function getInvestment(address _investor, uint _investment) 
			public 
			view 
			returns (VestingInvestment memory) {
		VestingInvestment memory investment = vestingInvestor[_investor].VestingInvestments[_investment];
		return investment;
	}

	// Adds a new investment for an investor
	function addInvestment(address _recipient,
							uint _tokenAmount,
							uint _vestingPeriod,
							uint _cliffStartTime) public {


		uint dailyTokenAmount = _tokenAmount / _vestingPeriod;

		VestingInvestment memory investment = VestingInvestment(_tokenAmount, 
																_vestingPeriod,
																block.timestamp,
																_cliffStartTime,
																dailyTokenAmount);
		
		uint total = vestingInvestor[_recipient].totalInvestmentCounter;
		vestingInvestor[_recipient].totalInvestmentCounter = vestingInvestor[_recipient].totalInvestmentCounter + 1;
		vestingInvestor[_recipient].VestingInvestments[total] = investment;
		vestingInvestor[_recipient].totalTokenAmount = vestingInvestor[_recipient].totalTokenAmount + _tokenAmount;
		
	}


	// Calculates the total of not yet vested amount of a user through all his different vesting schedules
	// Returned amount should be used in _transfer() to prohibit transferring more than this
	function calculateLockedAmount(address _investorAddress) public view returns (uint256 _lockedAmount) {

		uint total = vestingInvestor[_investorAddress].totalInvestmentCounter;
		uint lockedAmount = 0;
		uint locked;

		// Loop through investments for the investor
		for (uint i=0; i<total; i++) {

			VestingInvestment memory investment = vestingInvestor[_investorAddress].VestingInvestments[i];
			uint vestedPeriods = block.timestamp - investment.vestingStartTime;
			
			// Check if there is no overflow, else set locked to zero
			if (vestedPeriods <= investment.vestingPeriod) {
				locked = investment.tokenAmount - (vestedPeriods * investment.dailyTokenAmount);
			}
			else {
				locked = 0;
			}
			// Add up locked amounts
			lockedAmount = lockedAmount + locked;
			
			}

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