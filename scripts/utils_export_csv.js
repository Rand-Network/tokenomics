const fs = require('fs');
const path = require('path');

async function convertToCSV(arr) {
    const array = [Object.keys(arr[0])].concat(arr);

    return array.map(it => {
        return Object.values(it).toString();
    }).join('\n');
}

async function export_csv_data(data, filename = 'deployment.csv') {
    // Convert JSON to array
    const arr = await convertToCSV(data);
    // Get project root path
    const project_root = path.resolve(process.cwd(), filename);
    await fs.writeFileSync(project_root, arr, 'utf8');
}

async function append_csv_data(data, filename = 'deployment.csv') {
    // Convert JSON to array
    const arr = await convertToCSV(data);
    // Get project root path
    const project_root = path.resolve(process.cwd(), filename);
    // Append to file
    fs.appendFileSync(project_root, arr, 'utf8');
}

module.exports = { export_csv_data, append_csv_data }
