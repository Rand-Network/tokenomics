// Generate sample URI JSONs
var json_1 = require('./sample_folder/1.json');
var json_2 = require('./sample_folder/2.json');
var json_3 = require('./sample_folder/3.json');
var json_4 = require('./sample_folder/4.json');
var json_1_ = require('./sample_folder/1_.json');
var json_2_ = require('./sample_folder/2_.json');
var json_3_ = require('./sample_folder/3_.json');
var json_4_ = require('./sample_folder/4_.json');
var fs = require('fs');

map_dict = {
    1: [json_1, json_1_],
    2: [json_2, json_2_],
    3: [json_3, json_3_],
    4: [json_4, json_4_],
};

out_file_path = "./sample_to_deploy_ipfs_generated/";
if (!fs.existsSync(out_file_path)) {
    fs.mkdirSync(out_file_path);
}

// copy images
function copyfunction(item) {
    dst = out_file_path + item.split("/")[2];
    fs.copyFileSync(item, dst);
    //fs.copyFile(item, dst);
}

file_arr = [
    // './sample_folder/Rand_Blue-active.png',
    // './sample_folder/Rand_Black-active.png',
    // './sample_folder/Rand_Red-active.png',
    // './sample_folder/Rand_Gold-active.png',
    // './sample_folder/Rand_Empty.png',
    './sample_folder/contract_uri'
];

file_arr.forEach(copyfunction);

// iterate over all
counter = 1;
for (let step = 1; step < 26; step++) {
    console.log(step);
    // iterate over investor levels
    for (let step_sub = 1; step_sub < 5; step_sub++) {
        console.log(counter);
        console.log(map_dict[step_sub][0].name);
        console.log(map_dict[step_sub][1].name);
        tokenId = counter;
        filename = out_file_path + tokenId;
        filename_ = out_file_path + tokenId + "_";
        fs.writeFile(filename, JSON.stringify(map_dict[step_sub][0]), function (err) {
            if (err) {
                console.log(err);
            }
        });
        fs.writeFile(filename_, JSON.stringify(map_dict[step_sub][1]), function (err) {
            if (err) {
                console.log(err);
            }
        });
        counter += 1;
    }
}
