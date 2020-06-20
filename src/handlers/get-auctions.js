import AWS from 'aws-sdk';
import createError from 'http-errors';
import commonMiddleware from '../lib/common-middleware';
import validator from '@middy/validator';
import getAuctionsSchema from '../lib/schemas/get-auctions-schema';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function getAuctions(event, context) {
    let auctions;
    const { status } = event.queryStringParameters;

    const params = {
        TableName: process.env.AUCTIONS_TABLE_NAME,
        IndexName: 'statusAndEndDate',
        // # is needed cause status is a reserved word
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeValues: {
            ':status': status,
        },
        // here #status is replaced with status
        ExpressionAttributeNames: {
            '#status': 'status',
        }
    };

    try {
        const result = await dynamodb.query(params).promise();

        auctions = result.Items;
    } catch (error) {
        console.error(error);
        throw new createError.InternalServerError(error);
    }

    return {
        statusCode: 200,
        body: JSON.stringify(auctions),
    };
}

export const handler = commonMiddleware(getAuctions)
    .use(validator( { inputSchema: getAuctionsSchema, useDefaults: true }));


