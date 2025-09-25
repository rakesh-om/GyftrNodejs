const dotenv = require('dotenv')
dotenv.config();
let server;

if (process.env.STATUS == "staging" || process.env.STATUS == "production") {


    const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

    // Set the AWS region
    const REGION = "ap-south-1";
    const secretName = process.env.secretName;

    // Set up AWS Secrets Manager client
    const client = new SecretsManagerClient({ region: REGION });

    // Set up the command to retrieve the secret value
    const command = new GetSecretValueCommand({ SecretId: secretName });

    // Execute the command
    client.send(command)
        .then(data => {
            if (data.SecretString) {
                // Parse and use the secret value
                const secretObj = JSON.parse(data.SecretString);
                //console.log('sec', secretObj);
                for (const envKey of Object.keys(secretObj)) {
                    process.env[envKey] = secretObj[envKey];
                }

                server = require('./server')

            } else {
                console.log("secret manager not a proper data")
                // Handle binary secret data
                Buffer.from(data.SecretBinary, 'base64');
            }
        })
        .catch(err => {
            console.error("Error fetching secret:", err);
        });

} else {

    server = require('./server');
}
