stakeableOnTokenId = [100, 200, 50, 25]
tokenIds = [0, 1, 2, 3]

stake = [50, 100, 200, 300, 325, 350, 360, 375, 400]

stake_dict = { 0: 100, 1: 200, 2: 50, 3: 25 }

console.log(stakeableOnTokenId)

for (toStake of stake) {
    vc_dict = {}
    console.log('\nStake is: ', toStake, '\n')
    console.log(stake_dict)

    if (toStake > stakeableOnTokenId[0]) {
        for (i = 0; i <= tokenIds.length; i++) {
            if (toStake > stakeableOnTokenId[i]) {
                // If investment[i] does not cover toStake amount
                vc_dict[i] = stakeableOnTokenId[i] <= toStake
                    ? stakeableOnTokenId[i]
                    : toStake
                toStake -= stakeableOnTokenId[i];
            } else {
                // If investment[i] can cover toStake amount
                vc_dict[i] = toStake
                toStake -= toStake;
            }
            if (toStake == 0) {
                break;
            }
        }
    } else {
        vc_dict[0] = toStake;
    }
    console.log(vc_dict)
}