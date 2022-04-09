const fs = require('fs').promises;

async function readfileasync(input) {
    const data = await fs.readFile(input, "utf8");
    return JSON.parse(data);
}
async function writefileasync(output, data) {
    await fs.writeFile(output, data, encoding = 'utf8');
}

async function getInOrOut(type, inputs, methodMutability) {
    let out = '';
    for (let i = 0; i < inputs.length; i += 1) {
        out += inputs[i].type;
        //if ((inputs[i].type == 'string' || inputs[i].type == 'bytes') && methodMutability !== 'view') {
        if ((inputs[i].type == 'string' ||
            inputs[i].type == 'bytes' ||
            inputs[i].type == 'address[]' ||
            inputs[i].type == 'string[]' ||
            inputs[i].type == 'bytes[]' ||
            inputs[i].type == 'bytes')) {
            out += ' memory';
        }

        if (inputs[i].name) {
            out += ` ${inputs[i].name}`;
        }
        if (i !== inputs.length - 1) {
            out += ', ';
        }
    }
    return out;
}

async function getMethodInterface(method) {
    const out = [];
    // Type
    // Interfaces limitation: https://solidity.readthedocs.io/en/v0.4.24/contracts.html#interfaces
    if (method.type !== 'function') {
        return null;
    }
    out.push(method.type);

    // Name
    if (method.name) {
        out.push(method.name);
    }

    // Inputs
    out.push('(');
    out.push(await getInOrOut('inputs', method.inputs, method.stateMutability));
    out.push(')');

    // Functions in ABI are either public or external and there is no difference in the ABI
    out.push('external');

    // State mutability
    if (method.stateMutability === 'pure') {
        out.push('pure');
    } else if (method.stateMutability === 'view') {
        out.push('view');
    }
    // Payable
    if (method.payable) {
        out.push('payable');
    }
    // Outputs
    if (method.outputs && method.outputs.length > 0) {
        out.push('returns');
        out.push('(');
        out.push(await getInOrOut('returns', method.outputs, ''));
        out.push(')');
    }
    return out.join(' ');
}

async function ABI2Solidity(abi, name) {
    const LICENSE = '// SPDX-License-Identifier: MIT\n';
    const PRAGMA = 'pragma solidity ^0.8.0;\n\n';
    const HEADER = 'interface I' + name + '{\n';
    const FOOTER = '}\n';
    const jsonfile = JSON.parse(abi);
    let out = LICENSE + PRAGMA + HEADER;
    for (let i = 0; i < jsonfile.length; i += 1) {
        const method = jsonfile[i];
        const methodString = await getMethodInterface(method);
        if (methodString) {
            out += `  ${await getMethodInterface(method)};\n`;
        }
    }
    return out + FOOTER;
}

async function abi2sol(filepath) {
    console.log('Converting ABI to an interface contract');
    project_path = process.mainModule.paths[0].split('node_modules')[0].slice(0, -1);

    contract_name = filepath.split('/')[filepath.split('/').length - 1].split('.sol')[0];
    input = project_path + '/artifacts/' + filepath + '/' + contract_name + '.json';
    jsonfile = await readfileasync(input);
    jsonfile = JSON.stringify(jsonfile['abi']);

    output = input.replace('.json', '_abi.json');
    await writefileasync(output, jsonfile);

    outputFileSolidity = project_path + '/contracts/interfaces/I' + filepath.split('/')[filepath.split('/').length - 1];
    console.log('Project path:', project_path);
    console.log('Input path:  ', input);
    console.log('ABIo path:   ', output);
    console.log('Output path: ', outputFileSolidity);
    abi = await ABI2Solidity(jsonfile, contract_name);
    await writefileasync(outputFileSolidity, abi);
    console.log('Abi2Sol converted.');
}

async function abi2json(filepath) {
    project_path = process.mainModule.paths[0].split('node_modules')[0].slice(0, -1);
    //input = project_path + '/artifacts/contracts/' + filepath + '.sol/' + filepath + '.json';
    input = project_path + '/artifacts/' + filepath + '/' + filepath.split('/')[filepath.split('/').length - 1].split('.sol')[0] + '.json';
    jsonfile = await readfileasync(input);
    jsonfile = JSON.stringify(jsonfile['abi']);
    //jsonfile = JSON.parse(jsonfile['abi']);
    return jsonfile;
}

module.exports = { abi2sol, abi2json };